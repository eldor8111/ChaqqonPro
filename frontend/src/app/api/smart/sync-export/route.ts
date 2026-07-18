/**
 * /api/smart/sync-export — Offline rejim uchun tenant ma'lumotlarini eksport qiladi.
 *
 * VPS da ishlaydi. EXE (agent/kiosk) buni online paytda chaqirib, natijani
 * lokal serverning /api/smart/sync-import ga yozadi. Shunda offline'ga o'tganda
 * menyu/stol/xodim/printer ma'lumotlari tayyor bo'ladi.
 *
 * FAQAT ma'lumotnoma (reference) ma'lumotlar eksport qilinadi — buyurtma/to'lov EMAS
 * (ular offline'da yaratiladi va alohida push qilinadi).
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getAuthTenantId } from "@/lib/backend/tenantAuth";

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const [tenant, staff, products, tables, printers] = await Promise.all([
            prisma.tenant.findUnique({ where: { id: tenantId } }),
            prisma.staff.findMany({ where: { tenantId } }),
            prisma.product.findMany({ where: { tenantId } }),
            prisma.smartTable.findMany({ where: { tenantId } }),
            prisma.smartPrinter.findMany({ where: { tenantId } }),
        ]);

        // Kategoriyalar UbtCategory jadvalidan (Prisma client'da accessor yo'q — raw SQL)
        let categories: any[] = [];
        try {
            categories = await prisma.$queryRawUnsafe(`SELECT * FROM \"UbtCategory\"" WHERE "tenantId" = $1`, tenantId) as any[];
        } catch { /* jadval bo'lmasa skip */ }

        return NextResponse.json({
            ok: true,
            tenantId,
            exportedAt: Date.now(),
            tenant,
            staff,
            products,
            categories,
            tables,
            printers,
        });
    } catch (e: any) {
        console.error("[sync-export]", e);
        return NextResponse.json({ error: e?.message || "Server xatosi" }, { status: 500 });
    }
}
