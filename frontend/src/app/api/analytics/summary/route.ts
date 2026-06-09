/**
 * /api/analytics/summary — Dashboard uchun asosiy ko'rsatkichlar
 * Bugungi savdo, oy savdosi, top mahsulotlar, kassir reytingi
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { cacheGet, cacheSet } from "@/lib/cache";

const ANALYTICS_TTL = 2 * 60_000; // 2 daqiqa cache

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const tenantId = session.tenantId;

        // Branch filter (agar query param berilsa)
        const branch = req.nextUrl.searchParams.get("branch") ?? undefined;
        const cacheKey = `analytics:${tenantId}:${branch ?? "all"}`;

        const cached = cacheGet<Record<string, unknown>>(cacheKey);
        if (cached) return NextResponse.json({ success: true, ...cached });

        // ─── Vaqt chegaralari ────────────────────────────────────────────
        const now            = new Date();
        const todayStart     = new Date(now); todayStart.setHours(0,0,0,0);
        const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1);
        const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd   = new Date(todayStart);

        // Branch filter predicate
        const kassirFilter = branch
            ? { kassir: { branch } }
            : {};

        // ─── Parallel queries ────────────────────────────────────────────
        const [
            todaySales,
            yesterdaySales,
            monthSales,
            topItems,
            staffRanking,
            totalCustomers,
            activeStaff,
        ] = await Promise.all([
            // Bugungi savdo
            prisma.transaction.aggregate({
                where: { tenantId, status: "completed", createdAt: { gte: todayStart }, ...kassirFilter },
                _sum: { amount: true }, _count: { id: true },
            }),
            // Kecha savdo (o'sish hisobi uchun)
            prisma.transaction.aggregate({
                where: { tenantId, status: "completed", createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
                _sum: { amount: true },
            }),
            // Oy savdosi
            prisma.transaction.aggregate({
                where: { tenantId, status: "completed", createdAt: { gte: monthStart }, ...kassirFilter },
                _sum: { amount: true }, _count: { id: true },
            }),
            // Top 5 mahsulot (oy bo'yicha)
            prisma.transactionItem.groupBy({
                by: ["name"],
                where: { transaction: { tenantId, status: "completed", createdAt: { gte: monthStart } } },
                _sum: { quantity: true, total: true },
                orderBy: { _sum: { total: "desc" } },
                take: 5,
            }),
            // Kassir reytingi (bugun)
            prisma.transaction.groupBy({
                by: ["kassirName"],
                where: { tenantId, status: "completed", createdAt: { gte: todayStart }, kassirName: { not: null } },
                _sum: { amount: true }, _count: { id: true },
                orderBy: { _sum: { amount: "desc" } },
                take: 5,
            }),
            // Jami mijozlar
            prisma.customer.count({ where: { tenantId } }),
            // Faol xodimlar
            prisma.staff.count({ where: { tenantId, status: "active" } }),
        ]);

        // ─── O'sish hisobi ───────────────────────────────────────────────
        const todayAmt     = todaySales._sum.amount ?? 0;
        const yesterdayAmt = yesterdaySales._sum.amount ?? 0;
        const growthPct    = yesterdayAmt > 0
            ? Math.round(((todayAmt - yesterdayAmt) / yesterdayAmt) * 100)
            : null;

        const data = {
            today: {
                amount:      todayAmt,
                txCount:     todaySales._count.id,
                growthPct,
            },
            month: {
                amount:   monthSales._sum.amount ?? 0,
                txCount:  monthSales._count.id,
            },
            topItems: topItems.map(i => ({
                name:     i.name,
                quantity: i._sum.quantity ?? 0,
                total:    i._sum.total ?? 0,
            })),
            staffRanking: staffRanking.map(s => ({
                name:    s.kassirName ?? "—",
                amount:  s._sum.amount ?? 0,
                txCount: s._count.id,
            })),
            totalCustomers,
            activeStaff,
            generatedAt: now.toISOString(),
        };

        cacheSet(cacheKey, data, ANALYTICS_TTL);
        return NextResponse.json({ success: true, ...data });

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[analytics/summary]", msg);
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
