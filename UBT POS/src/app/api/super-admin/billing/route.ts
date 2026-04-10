import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSuperSession } from "@/lib/backend/auth";

// GET billing info for all tenants (generated from tenant plan data)
export async function GET(req: NextRequest) {
    try {
        const session = await getSuperSession();
        if (session?.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const tenantId = searchParams.get("tenantId");

        const where: any = {};
        if (tenantId) where.id = tenantId;

        const tenants = await prisma.tenant.findMany({
            where,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                shopCode: true,
                billingId: true,
                shopName: true,
                plan: true,
                status: true,
                createdAt: true,
                expiresAt: true,
            },
        });

        const PLAN_PRICES: Record<string, number> = {
            starter: 0,
            basic: 99000,
            pro: 199000,
            enterprise: 300000,
        };

        const billing = tenants.map((t: any) => {
            const price = PLAN_PRICES[t.plan] || 0;
            const now = new Date();
            const created = new Date(t.createdAt);
            const monthsDiff = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
            const expiresAt = t.expiresAt ? new Date(t.expiresAt) : null;
            const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

            const paymentStatus = t.status === "suspended" ? "overdue"
                : t.status === "trial" ? "trial"
                : (daysLeft !== null && daysLeft < 0) ? "overdue"
                : "paid";

            return {
                tenantId: t.id,
                shopCode: t.shopCode,
                billingId: t.billingId,
                shopName: t.shopName,
                plan: t.plan,
                status: t.status,
                monthlyPrice: price,
                totalPaid: price * Math.max(0, monthsDiff),
                createdAt: t.createdAt,
                expiresAt: expiresAt?.toISOString() || null,
                daysLeft,
                nextBillingDate: expiresAt?.toISOString() || new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
                paymentStatus,
            };
        });

        const totalRevenue = billing.reduce((s: number, b: any) => s + b.monthlyPrice, 0);

        return NextResponse.json({ billing, totalRevenue, total: billing.length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
