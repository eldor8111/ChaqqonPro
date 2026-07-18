/**
 * /api/smart/print-kitchen — Oshxona chekini SERVER tomonda ishonchli chiqarish.
 *
 * Nega kerak: avval kitchen print frontend holatiga (local tableOrders + printedQty)
 * bog'liq edi. Stol qayta ochilganda DB-dan yuklash bilan local qo'shilgan zakaz
 * orasidagi poyga (race) tufayli ikkinchi zakaz ba'zida yo'qolardi yoki sekin chiqardi.
 *
 * Bu endpoint DB-dagi ISHONCHLI holatni o'qiydi: chiqarilmagan (qty - printedQty)
 * taomlarni hisoblab, printerga yuboradi va printedQty ni atomik yangilaydi.
 * Frontend faqat { tableId, shotId } yuboradi.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";
import { PrinterService } from "@/lib/services/PrinterService";

async function resolveAuth(request: NextRequest): Promise<{ tenantId: string; waiterName?: string } | null> {
    try {
        const session = await getSession();
        if (session?.tenantId) return { tenantId: session.tenantId };
    } catch {}
    const auth = request.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET);
            if (payload.tenantId) return { tenantId: payload.tenantId as string, waiterName: payload.name as string | undefined };
        } catch {}
    }
    return null;
}

export async function POST(request: NextRequest) {
    try {
        const auth = await resolveAuth(request);
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { tableId, shotId, waiterName, clientPrint } = await request.json();
        if (!tableId) return NextResponse.json({ error: "tableId kerak" }, { status: 400 });
        const shot = Number(shotId) || 1;
        // clientPrint=true → server O'ZI chop ETMAYDI, chek topshiriqlarini qaytaradi.
        // Monoblok (EXE) ularni lokal server orqali DARHOL chiqaradi (VPS→agent round-trip yo'q).
        // Planshet/brauzer bu flagni yubormaydi → server avvalgidek agent orqali chop etadi.

        // 1. Stolning barcha "cart" KDSOrder yozuvlarini o'qib, taomlarni birlashtirish
        const kdsOrders = await prisma.kDSOrder.findMany({
            where: { tenantId: auth.tenantId, tableId, status: { not: "served" }, priority: "cart" },
            orderBy: { createdAt: "desc" },
        });

        // Barcha shotlardagi taomlar (printedQty ni saqlash uchun); qty va printedQty yig'iladi
        const merged: Record<string, any> = {};
        for (const ord of kdsOrders) {
            try {
                const parsed = JSON.parse(ord.description);
                const items = Array.isArray(parsed) ? parsed : (parsed.items ?? []);
                for (const entry of items) {
                    const id = entry.item?.id || entry.id;
                    if (!id) continue;
                    const itemShot = entry.shotId || 1;
                    const key = `${id}-${!!entry.isSaboy}-${itemShot}`;
                    if (merged[key]) {
                        merged[key].qty += (entry.qty || 1);
                        merged[key].printedQty += (entry.printedQty || 0);
                    } else {
                        merged[key] = { ...entry, qty: entry.qty || 1, printedQty: entry.printedQty || 0 };
                    }
                }
            } catch {}
        }
        const allItems = Object.values(merged);
        for (const m of allItems) if (m.printedQty > m.qty) m.printedQty = m.qty;

        // 2. Faqat SHU shotning chiqarilmagan taomlari
        const targetShotItems = allItems.filter((m: any) => (m.shotId || 1) === shot);
        const unprinted = targetShotItems
            .map((m: any) => ({ ...m, _unprinted: m.qty - (m.printedQty || 0) }))
            .filter((m: any) => m._unprinted > 0);

        if (unprinted.length === 0) {
            return NextResponse.json({ success: true, printed: 0, note: "Yangi taom yo'q" });
        }

        // 3. Har taomning printerIp si (Product jadvalidan)
        const ids = unprinted.map((m: any) => m.item?.id || m.id).filter(Boolean);
        let products: any[] = [];
        if (ids.length > 0) {
            products = await prisma.$queryRawUnsafe(
                `SELECT id, "printerIp" FROM \"Product\"" WHERE "tenantId" = $1 AND id IN (${ids.map((_: any, i: number) => '$' + (i + 2)).join(",")})`,
                auth.tenantId, ...ids
            );
        }
        const ipMap = new Map<string, string | null>();
        products.forEach((p: any) => ipMap.set(p.id, p.printerIp || null));

        // 4. Fallback printer — oshxona roli, bo'lmasa birinchisi
        let fallbackIp: string | null = null;
        try {
            const fp: any[] = await prisma.$queryRawUnsafe(
                `SELECT "ipAddress", role FROM "SmartPrinter" WHERE "tenantId" = $1 AND ("isActive" IS NULL OR "isActive" = 1) ORDER BY (role = 'kitchen') DESC, "createdAt" ASC LIMIT 1`,
                auth.tenantId
            );
            if (fp.length > 0) fallbackIp = fp[0].ipAddress || null;
        } catch {}

        // 5. Printer bo'yicha guruhlash
        const groups: Record<string, { name: string; qty: number; price: number; unit: string }[]> = {};
        for (const m of unprinted) {
            const id = m.item?.id || m.id;
            const ip = ipMap.get(id) || fallbackIp;
            if (!ip) continue;
            (groups[ip] = groups[ip] || []).push({
                name: m.isSaboy ? `[SABOY] ${m.item?.name || m.name || ""}` : (m.item?.name || m.name || ""),
                qty: m._unprinted,
                price: m.item?.price || m.price || 0,
                unit: m.item?.unit || m.unit || "ta",
            });
        }

        if (Object.keys(groups).length === 0) {
            return NextResponse.json({ success: false, error: "Printer topilmadi" }, { status: 404 });
        }

        // 6. Stol nomi + chop etish
        const table = await prisma.smartTable.findUnique({
            where: { id: tableId, tenantId: auth.tenantId },
            select: { tableNumber: true },
        });
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const tableNameToPrint = (table?.tableNumber || "Stol") + (shot > 1 ? ` · ${shot}-Hisob` : "");
        const orderNum = Math.floor(Math.random() * 9000) + 1000;

        // 6b. Chek topshiriqlarini yig'amiz. clientPrint bo'lsa — mijozga qaytaramiz
        //     (monoblok lokal server orqali darhol chiqaradi). Aks holda SERVER o'zi
        //     FIRE-AND-FORGET chop etadi (javobni kutmaymiz — tugma qotmaydi; agent ACK/retry fonda).
        const builtJobs = Object.entries(groups).map(([printerIp, pItems]) => ({
            printerIp, port: 9100,
            receiptType: "kitchen" as const,
            tableName: tableNameToPrint,
            waiter: waiterName || auth.waiterName || "",
            time: timeStr,
            items: pItems,
            total: pItems.reduce((s, c) => s + c.price * c.qty, 0),
            orderNum,
            tenantId: auth.tenantId,
        }));
        if (!clientPrint) {
            for (const job of builtJobs) {
                PrinterService.print(job).catch((e: any) => console.warn(`[print-kitchen] ${job.printerIp}:`, e?.message || e));
            }
        }

        // 7. printedQty ni optimistik yangilash (navbatga qo'yildi → chiqarilgan deb belgilaymiz;
        //    agent ACK/retry bilan yetkazadi). Cart yozuvlarini bittaga birlashtiramiz.
        for (const m of allItems) {
            if ((m.shotId || 1) === shot) {
                const id = m.item?.id || m.id;
                const ip = ipMap.get(id) || fallbackIp;
                if (ip && groups[ip]) m.printedQty = m.qty;
            }
        }
        await prisma.kDSOrder.deleteMany({
            where: { tenantId: auth.tenantId, tableId, priority: "cart", status: { not: "served" } },
        });
        await prisma.kDSOrder.create({
            data: {
                tenantId: auth.tenantId,
                tableId,
                description: JSON.stringify({ waiterName: waiterName || auth.waiterName || "", items: allItems }),
                status: "pending",
                priority: "cart",
            },
        });

        return NextResponse.json({ success: true, printed: unprinted.length, jobs: clientPrint ? builtJobs : undefined });
    } catch (e: any) {
        console.error("[print-kitchen]", e);
        return NextResponse.json({ error: e?.message || "Server xatosi" }, { status: 500 });
    }
}
