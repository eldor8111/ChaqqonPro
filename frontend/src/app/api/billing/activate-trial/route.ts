export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

// POST /api/billing/activate-trial
// Tenant o'zi sinov muddatini faollashtirishi uchun
// Faqat hech qachon obuna bo'lmagan yoki trial holatda bo'lgan tenantlar uchun
export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } }) as any;
        if (!tenant) {
            return NextResponse.json({ error: "Tashkilot topilmadi" }, { status: 404 });
        }

        // Tekshirish: faol to'liq obunasi bo'lsa, sinov berilmaydi
        const now = new Date();
        const expiresAt = tenant.expiresAt ? new Date(tenant.expiresAt) : null;
        const isActiveNonTrial = expiresAt && expiresAt > now && !tenant.isTrial;
        if (isActiveNonTrial) {
            return NextResponse.json({ error: "Sizda faol obuna mavjud. Sinov berib bo'lmaydi." }, { status: 400 });
        }

        // Tekshirish: oldin sinov olganmi (BalanceLog orqali)
        const hadTrial = await prisma.balanceLog.findFirst({
            where: { tenantId: session.tenantId, logType: "trial" },
        });
        if (hadTrial) {
            return NextResponse.json({ error: "Siz allaqachon sinov muddatidan foydalangansiz." }, { status: 400 });
        }

        const currentExpiry = expiresAt && expiresAt > now ? expiresAt : now;
        const newExpiry = new Date(currentExpiry);
        newExpiry.setDate(newExpiry.getDate() + 7);

        await prisma.$transaction([
            prisma.tenant.update({
                where: { id: session.tenantId },
                data: {
                    expiresAt: newExpiry,
                    status: "active",
                    isTrial: true,
                },
            }),
            prisma.balanceLog.create({
                data: {
                    tenantId: session.tenantId,
                    amount: 0,
                    logType: "trial",
                    note: "7 kunlik sinov muddati faollashtirildi (tenant tomonidan)",
                    createdByName: tenant.shopName,
                },
            }),
        ]);

        return NextResponse.json({
            ok: true,
            newExpiry: newExpiry.toISOString(),
            message: "7 kunlik sinov muddati muvaffaqiyatli faollashtirildi!",
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
