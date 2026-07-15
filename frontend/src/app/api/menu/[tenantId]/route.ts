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
            select: { id: true, name: true, settings: true }
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
             FROM Product
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
                `SELECT id, name FROM UbtCategory WHERE tenantId=? ORDER BY createdAt ASC`,
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
                name: tenant.name,
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
