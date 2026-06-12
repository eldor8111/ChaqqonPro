export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

// GET /api/billing/my-tenant
// Tenant panel (dashboard) uchun joriy billing holati va sozlamalari
export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: session.tenantId },
            include: { tariff: true },
        });

        if (!tenant) {
            return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
        }

        // Fetch platform settings for payment info (card, telegram)
        const settingsRaw = await prisma.platformSettings.findMany();
        const settings = settingsRaw.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});

        const now = new Date();
        const expiresAt = tenant.expiresAt ? new Date(tenant.expiresAt) : null;
        const daysLeft = expiresAt
            ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null;

        const paymentStatus = tenant.status === "suspended"
            ? "overdue"
            : tenant.status === "trial" || tenant.isTrial
            ? "trial"
            : daysLeft !== null && daysLeft < 0
            ? "overdue"
            : "paid";

        const tenantData = {
            id: tenant.id,
            shopName: tenant.shopName,
            shopCode: tenant.shopCode,
            billingId: tenant.billingId,
            plan: tenant.plan,
            tariffName: tenant.tariff?.name ?? tenant.plan,
            balance: tenant.balance ?? 0,
            isTrial: tenant.isTrial,
            status: tenant.status,
            expiresAt: expiresAt?.toISOString() ?? null,
            daysLeft,
            paymentStatus,
        };

        return NextResponse.json({ tenant: tenantData, platformSettings: settings });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
