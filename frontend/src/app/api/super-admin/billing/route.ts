export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSuperSession } from "@/lib/backend/auth";

function formatBilling(t: any) {
    const now = new Date();
    const expiresAt = t.expiresAt ? new Date(t.expiresAt) : null;
    const isActive = expiresAt ? expiresAt > now : false;
    const daysLeft = expiresAt
        ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const paymentStatus = t.status === "suspended"
        ? "overdue"
        : t.status === "trial" || t.isTrial
        ? "trial"
        : daysLeft !== null && daysLeft < 0
        ? "overdue"
        : "paid";

    return {
        tenantId:           t.id,
        shopCode:           t.shopCode,
        billingId:          t.billingId,
        shopName:           t.shopName,
        ownerName:          t.ownerName,
        phone:              t.phone,
        plan:               t.plan,
        tariffId:           t.tariffId,
        tariffName:         t.tariff?.name ?? null,
        pricePerMonth:      t.tariff?.pricePerMonth ?? 0,
        balance:            t.balance ?? 0,
        status:             t.status,
        isTrial:            t.isTrial,
        expiresAt:          expiresAt?.toISOString() ?? null,
        subscriptionActive: isActive,
        daysLeft,
        paymentStatus,
        createdAt:          t.createdAt,
    };
}

// GET /api/super-admin/billing — barcha tenantlar billing holati
export async function GET(req: NextRequest) {
    try {
        const session = await getSuperSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const tenants = await prisma.tenant.findMany({
            orderBy: { createdAt: "desc" },
            include: { tariff: true },
        });

        const billing = tenants.map(formatBilling);
        const totalRevenue = billing.reduce((s, b) => s + (b.pricePerMonth ?? 0), 0);

        return NextResponse.json({ billing, totalRevenue, total: billing.length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
