export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

// POST /api/billing/buy-tariff
// Body: { tariffId, months }
export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { tariffId, months } = await req.json();
        if (!tariffId || !months || Number(months) < 1) {
            return NextResponse.json({ error: "Barcha maydonlar to'g'ri kiritilishi kerak" }, { status: 400 });
        }

        const tenantId = session.tenantId;

        // 1. Fetch tenant and tariff
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        const tariff = await prisma.tariff.findUnique({ where: { id: tariffId } });

        if (!tenant || !tariff) {
            return NextResponse.json({ error: "Tenant yoki Tarif topilmadi" }, { status: 404 });
        }

        // 2. Calculate costs
        let monthCount = Number(months);
        let unitPrice = Number(tariff.pricePerMonth || 0);
        let totalPrice = unitPrice * monthCount;

        // 12 oy olganda 10 oy narxi yechiladi
        if (monthCount === 12) {
            totalPrice = unitPrice * 10; 
        }

        const currentBalance = Number(tenant.balance ?? 0);
        if (currentBalance < totalPrice && totalPrice > 0) {
            return NextResponse.json({ error: `Balansda yetarli mablag' yo'q! Kerakli: ${totalPrice.toLocaleString("uz-UZ")} so'm, Balansda: ${currentBalance.toLocaleString("uz-UZ")} so'm` }, { status: 400 });
        }

        // 3. Calculate new expiry
        const now = new Date();
        const currentExpiry = tenant.expiresAt && tenant.expiresAt > now ? tenant.expiresAt : now;
        const newExpiry = new Date(currentExpiry);
        const daysToAdd = monthCount * Number(tariff.durationDays || 30);
        newExpiry.setDate(newExpiry.getDate() + daysToAdd);

        // 4. Update Database
        const [updatedTenant] = await prisma.$transaction([
            prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    balance: currentBalance - totalPrice, 
                    tariffId: tariff.id,
                    expiresAt: newExpiry,
                    status: "active",
                    isTrial: false,
                },
            }),
            prisma.balanceLog.create({
                data: {
                    tenantId,
                    amount: -totalPrice,
                    logType: "subscription",
                    note: `Mijoz o'z balansidan obunani uzaytirdi: ${tariff.name} (${monthCount} oy, +${daysToAdd} kun)`,
                    createdByName: tenant.shopName || "Tenant",
                },
            }),
        ]);

        return NextResponse.json({
            ok: true,
            newExpiry: newExpiry.toISOString(),
            newBalance: updatedTenant.balance,
            message: `Obuna muvaffaqiyatli faollashtirildi! Yangi muddat: ${newExpiry.toLocaleDateString("uz-UZ")}`,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
