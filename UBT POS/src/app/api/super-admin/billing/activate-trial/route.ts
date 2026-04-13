export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSuperSession } from "@/lib/backend/auth";

// POST /api/super-admin/billing/activate-trial
// Body: { tenantId }
export async function POST(req: NextRequest) {
    try {
        const session = await getSuperSession();
        if (!session || session.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Faqat Super Admin uchun" }, { status: 403 });
        }

        const { tenantId } = await req.json();
        if (!tenantId) return NextResponse.json({ error: "tenantId kerak" }, { status: 400 });

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) return NextResponse.json({ error: "Tashkilot topilmadi" }, { status: 404 });

        const now = new Date();
        const currentExpiry = tenant.expiresAt && tenant.expiresAt > now ? tenant.expiresAt : now;
        const newExpiry = new Date(currentExpiry);
        newExpiry.setDate(newExpiry.getDate() + 7);

        await prisma.$transaction([
            prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    expiresAt: newExpiry,
                    status: "active",
                    isTrial: true,
                },
            }),
            prisma.balanceLog.create({
                data: {
                    tenantId,
                    amount: 0,
                    logType: "trial",
                    note: "7 kunlik sinov muddati faollashtirildi",
                    createdByName: "Super Admin",
                },
            }),
        ]);

        return NextResponse.json({
            ok: true,
            newExpiry: newExpiry.toISOString(),
            message: "7 kunlik sinov muddati faollashtirildi",
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
