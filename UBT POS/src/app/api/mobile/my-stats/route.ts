export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { jwtVerify } from "jose";

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not set");
    return new TextEncoder().encode(secret);
}

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization") || "";
        const token = authHeader.replace("Bearer ", "").trim();
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let payload: any;
        try {
            const result = await jwtVerify(token, getJwtSecret());
            payload = result.payload;
        } catch {
            return NextResponse.json({ error: "Token yaroqsiz" }, { status: 401 });
        }

        const { tenantId, name } = payload;
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

        // Ofitsiant zakazlari: KDSOrder.description ichida waiterName bo'ladi
        // "served" + "pending" — ikkalasini ham hisoblash (kassir to'lov qilsa "served" bo'ladi)
        const allKdsOrders = await prisma.kDSOrder.findMany({
            where: {
                tenantId,
                priority: "cart",
                createdAt: { gte: monthStart, lte: todayEnd },
                // status filter yo'q — served ham, pending ham hisoblanadi
            },
            select: { description: true, createdAt: true },
            orderBy: { createdAt: "desc" },
        });

        // Faqat ushbu xodimning zakazlarini ajratib olish
        type KdsEntry = { total: number; count: number; createdAt: Date };
        const myKdsAll: KdsEntry[] = [];

        for (const ord of allKdsOrders) {
            try {
                const parsed = JSON.parse(ord.description);
                // Yangi format: {waiterName, items}
                if (!Array.isArray(parsed) && parsed.waiterName === name) {
                    const items: any[] = parsed.items || [];
                    const total = items.reduce((s: number, ci: any) => {
                        const price = ci.item?.price ?? ci.price ?? 0;
                        const qty = ci.qty ?? 1;
                        return s + price * qty;
                    }, 0);
                    myKdsAll.push({ total, count: 1, createdAt: new Date(ord.createdAt) });
                }
            } catch {}
        }

        // Bugun
        const todayOrders = myKdsAll.filter(o => o.createdAt >= todayStart && o.createdAt <= todayEnd);
        const weekOrders = myKdsAll.filter(o => o.createdAt >= weekStart && o.createdAt <= todayEnd);

        const todayTotal = todayOrders.reduce((s, o) => s + o.total, 0);
        const weekTotal = weekOrders.reduce((s, o) => s + o.total, 0);
        const monthTotal = myKdsAll.reduce((s, o) => s + o.total, 0);

        // Soatlik timeline
        const hourlyMap: Record<string, number> = {};
        for (const o of todayOrders) {
            const h = `${String(o.createdAt.getHours()).padStart(2, "0")}:00`;
            hourlyMap[h] = (hourlyMap[h] || 0) + o.total;
        }
        const hourlyTimeline = Object.entries(hourlyMap)
            .map(([hour, total]) => ({ hour, total }))
            .sort((a, b) => a.hour.localeCompare(b.hour));

        // Oxirgi 5 ta zakaz
        const recentOrders = todayOrders.slice(0, 5).map(o => ({
            amount: o.total,
            method: "Zakaz",
            table: "—",
            time: o.createdAt.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
        }));

        // Kassir tranzaksiyalari ham bo'lishi mumkin (kassir rolida ishlasa)
        const [todayTx, weekTx, monthTx] = await Promise.all([
            prisma.transaction.findMany({
                where: { tenantId, kassirName: name, status: "completed", createdAt: { gte: todayStart, lte: todayEnd } },
                select: { amount: true, method: true, createdAt: true, notes: true },
            }),
            prisma.transaction.findMany({
                where: { tenantId, kassirName: name, status: "completed", createdAt: { gte: weekStart, lte: todayEnd } },
                select: { amount: true },
            }),
            prisma.transaction.findMany({
                where: { tenantId, kassirName: name, status: "completed", createdAt: { gte: monthStart, lte: todayEnd } },
                select: { amount: true },
            }),
        ]);

        const txTodayTotal = todayTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const txWeekTotal = weekTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const txMonthTotal = monthTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);

        const todayCash = todayTx.filter(t => t.method?.toLowerCase().includes("naqd") || t.method?.toLowerCase() === "cash").reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const todayCard = todayTx.filter(t => t.method?.toLowerCase().includes("karta") || t.method?.toLowerCase().includes("card")).reduce((s, t) => s + (Number(t.amount) || 0), 0);

        // Tranzaksiya bo'lsa undan ham qo'shish (hourly)
        for (const tx of todayTx) {
            const h = `${String(new Date(tx.createdAt).getHours()).padStart(2, "0")}:00`;
            hourlyMap[h] = (hourlyMap[h] || 0) + (Number(tx.amount) || 0);
        }
        const mergedTimeline = Object.entries(hourlyMap)
            .map(([hour, total]) => ({ hour, total }))
            .sort((a, b) => a.hour.localeCompare(b.hour));

        // Recent tranzaksiyalar ham qo'shish
        const txRecent = todayTx.slice(-5).reverse().map(t => ({
            amount: Number(t.amount),
            method: t.method || "—",
            table: (t as any).notes || "—",
            time: new Date(t.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
        }));
        const allRecent = [...txRecent, ...recentOrders].slice(0, 5);

        return NextResponse.json({
            name,
            today: {
                total: todayTotal + txTodayTotal,
                count: todayOrders.length + todayTx.length,
                cash: todayCash,
                card: todayCard,
                orders: todayOrders.length,
            },
            week: { total: weekTotal + txWeekTotal, count: weekOrders.length + weekTx.length },
            month: { total: monthTotal + txMonthTotal, count: myKdsAll.length + monthTx.length },
            hourlyTimeline: mergedTimeline,
            recentOrders: allRecent,
        });

    } catch (e: any) {
        return NextResponse.json({ error: "Server xatoligi", details: e.message }, { status: 500 });
    }
}
