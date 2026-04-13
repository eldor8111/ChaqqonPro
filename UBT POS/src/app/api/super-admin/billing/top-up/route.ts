export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSuperSession } from "@/lib/backend/auth";

// POST /api/super-admin/billing/top-up
// Body: { tenantId, amount, note? }
export async function POST(req: NextRequest) {
    try {
        const session = await getSuperSession();
        if (!session || session.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Faqat Super Admin uchun" }, { status: 403 });
        }

        const { tenantId, amount, note } = await req.json();
        if (!tenantId || !amount || Number(amount) <= 0) {
            return NextResponse.json({ error: "tenantId va musbat amount kerak" }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) return NextResponse.json({ error: "Tashkilot topilmadi" }, { status: 404 });

        const newBalance = Number(tenant.balance ?? 0) + Number(amount);

        const [updated] = await prisma.$transaction([
            prisma.tenant.update({
                where: { id: tenantId },
                data: { balance: newBalance },
            }),
            prisma.balanceLog.create({
                data: {
                    tenantId,
                    amount: Number(amount),
                    logType: "top_up",
                    note: note || `Balans to'ldirildi: +${Number(amount).toLocaleString("uz-UZ")} so'm`,
                    createdByName: "Super Admin",
                },
            }),
        ]);

        return NextResponse.json({
            ok: true,
            newBalance,
            message: `Balans +${Number(amount).toLocaleString("uz-UZ")} so'm qo'shildi`,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
