export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";

// ─── Public Menu API ────────────────────────────────────────────────────────
// Bu endpoint autentifikatsiya talab ETMAYDI.
// Mijozlar QR kod orqali ushbu endpointga murojaat qilishadi.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
    request: NextRequest,
    { params }: { params: { tenantId: string } }
) {
    try {
        const { tenantId } = params;

        if (!tenantId) {
            return NextResponse.json({ error: "tenantId kerak" }, { status: 400 });
        }

        // Tenant mavjudligini tekshirish va restoran ma'lumotlarini olish
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, shopName: true, settings: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Restoran topilmadi" }, { status: 404 });
        }

        // Restoran settings'dan qo'shimcha ma'lumotlar
        let restaurantInfo: {
            logo?: string;
            phone?: string;
            address?: string;
            wifi?: string;
            wifiPassword?: string;
            description?: string;
            workingHours?: string;
            instagram?: string;
            telegram?: string;
        } = {};
        try {
            const parsed = JSON.parse(tenant.settings as string || "{}");
            restaurantInfo = parsed.restaurantInfo || {};
        } catch { }

        // Stol ID bo'yicha stol ma'lumotlarini olish (ixtiyoriy)
        const tableId = request.nextUrl.searchParams.get("tableId");
        let tableInfo: { tableNumber?: string; section?: string } = {};
        if (tableId) {
            try {
                const table = await prisma.smartTable.findFirst({
                    where: { id: tableId, tenantId },
                    select: { tableNumber: true, section: true }
                });
                if (table) {
                    tableInfo = { tableNumber: table.tableNumber, section: table.section ?? undefined };
                }
            } catch { }
        }

        // Menyu mahsulotlari (faqat inStock=1 bo'lganlar)
        const products: any[] = await prisma.$queryRawUnsafe(
            `SELECT id, name, category, sellingPrice,
                    CASE WHEN image IS NOT NULL THEN image ELSE NULL END as image,
                    COALESCE(type, 'taom') as type,
                    COALESCE(inStock, 1) as inStock
             FROM \"Product\"
             WHERE tenantId = ?
               AND COALESCE(inStock, 1) = 1
               AND COALESCE(type, 'taom') = 'taom'
             ORDER BY category ASC, name ASC`,
            tenantId
        );

        // Kategoriyalarni olish
        let explicitCategories: any[] = [];
        try {
            explicitCategories = await prisma.$queryRawUnsafe(
                `SELECT id, name FROM \"UbtCategory\" WHERE tenantId=? ORDER BY createdAt ASC`,
                tenantId
            );
        } catch { }

        const stableId = (s: string) =>
            s.split("").reduce((a, c) => ((a * 31 + c.charCodeAt(0)) & 0xfffffff), 5381).toString(36);

        const categoriesMap = new Map<string, { id: string; name: string }>();
        explicitCategories.forEach(c => categoriesMap.set(c.name, { id: c.id, name: c.name }));

        products.forEach((p: any) => {
            if (p.category && !categoriesMap.has(p.category)) {
                categoriesMap.set(p.category, { id: stableId(p.category), name: p.category });
            }
        });

        const categories = Array.from(categoriesMap.values());
        const catNameToId = Object.fromEntries(categories.map((c: any) => [c.name, c.id]));

        const items = products.map((p: any) => ({
            id: p.id,
            name: p.name,
            categoryId: catNameToId[p.category] ?? "0",
            category: p.category,
            price: Number(p.sellingPrice),
            image: p.image ?? null,
        }));

        return NextResponse.json({
            restaurant: {
                id: tenant.id,
                name: tenant.shopName,
                ...restaurantInfo,
            },
            table: tableInfo,
            categories,
            items,
        });
    } catch (error) {
        console.error("Public menu GET error:", error);
        return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { tenantId: string } }
) {
    try {
        const { tenantId } = params;
        const { tableId, items } = await request.json();

        if (!tenantId || !tableId || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Stol va buyurtma taomlari tanlanishi shart" }, { status: 400 });
        }

        // Tenant mavjudligini tekshirish
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true }
        });
        if (!tenant) {
            return NextResponse.json({ error: "Restoran topilmadi" }, { status: 404 });
        }

        // Stol mavjudligini tekshirish
        const table = await prisma.smartTable.findFirst({
            where: { id: tableId, tenantId },
            select: { id: true, tableNumber: true, amount: true, since: true }
        });
        if (!table) {
            return NextResponse.json({ error: "Stol topilmadi" }, { status: 404 });
        }

        // Hisoblanadigan total summa
        const runningTotal = items.reduce((sum: number, ci: any) => {
            const price = ci.item?.price ?? ci.price ?? 0;
            const qty = ci.qty ?? 1;
            return sum + price * qty;
        }, 0);

        // KDSOrder yaratish (priority: "cart", status: "pending", waiterName: "Mijoz (Online)")
        const descPayload = JSON.stringify({
            waiterName: "Mijoz (Online)",
            items,
            suffix: "",
            shotId: 1
        });

        const order = await prisma.kDSOrder.create({
            data: {
                tenantId,
                tableId,
                description: descPayload,
                status: "pending",
                priority: "cart",
            },
        });

        // Stol statusini yangilash
        const prevAmount = Number(table.amount ?? 0);
        await prisma.smartTable.update({
            where: { id: tableId, tenantId },
            data: {
                status: "occupied",
                amount: prevAmount + Math.round(runningTotal),
                waiter: "Mijoz (Online)",
                since: table.since || new Date().toISOString(),
            },
        });

        // --- AUTO-PRINT KITCHEN RECEIPT FOR DINE-IN ORDERS ---
        try {
            const itemIds = items.map((c: any) => c.item?.id || c.id).filter(Boolean);
            let products: any[] = [];
            if (itemIds.length > 0) {
                products = await prisma.$queryRawUnsafe(
                    `SELECT id, printerIp FROM \"Product\" WHERE tenantId = ? AND id IN (${itemIds.map(() => '?').join(',')})`,
                    tenantId, ...itemIds
                );
            }
            const printerIpMap = new Map<string, string | null>();
            products.forEach((p: any) => printerIpMap.set(p.id, p.printerIp || null));

            let fallbackPrinterIp: string | null = null;
            try {
                const fallbackPrinters: any[] = await prisma.$queryRawUnsafe(
                    `SELECT ipAddress FROM \"SmartPrinter\" WHERE tenantId = ? ORDER BY createdAt ASC LIMIT 1`,
                    tenantId
                );
                if (fallbackPrinters.length > 0) {
                    fallbackPrinterIp = fallbackPrinters[0].ipAddress || null;
                }
            } catch {}

            const printerGroups: Record<string, any[]> = {};
            const noIpItems: any[] = [];

            for (const c of items) {
                const id = c.item?.id || c.id;
                const ip = printerIpMap.get(id) || null;
                if (ip) {
                    if (!printerGroups[ip]) printerGroups[ip] = [];
                    printerGroups[ip].push(c);
                } else {
                    noIpItems.push(c);
                }
            }

            if (noIpItems.length > 0 && fallbackPrinterIp) {
                if (!printerGroups[fallbackPrinterIp]) printerGroups[fallbackPrinterIp] = [];
                printerGroups[fallbackPrinterIp].push(...noIpItems);
            }

            if (Object.keys(printerGroups).length > 0) {
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
                const tableNameToPrint = table.tableNumber;
                const orderNumShort = Math.floor(Math.random() * 9000) + 1000;

                const PrinterServiceModule = await import("@/lib/services/PrinterService");
                for (const [printerIp, pItems] of Object.entries(printerGroups)) {
                    const printItems = pItems.map((c: any) => ({
                        name: c.item?.name || c.name || "",
                        qty: c.qty || 1,
                        price: c.item?.price || c.price || 0,
                        unit: c.item?.unit || c.unit || "ta",
                    }));
                    const total = printItems.reduce((s, c) => s + c.price * c.qty, 0);

                    PrinterServiceModule.PrinterService.print({
                        printerIp,
                        port: 9100,
                        receiptType: "kitchen",
                        tableName: tableNameToPrint,
                        waiter: "Mijoz (Online)",
                        time: timeStr,
                        items: printItems,
                        total,
                        orderNum: orderNumShort,
                        tenantId,
                    }).catch(() => {});
                }
            }
        } catch {}

        return NextResponse.json({ success: true, orderId: order.id });
    } catch (error) {
        console.error("Public menu POST order error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
