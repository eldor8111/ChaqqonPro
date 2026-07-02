export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { getBusinessDayBounds } from "@/lib/backend/dateUtils";

// GET /api/smart/stats?period=daily|hourly|monthly|yearly|custom&from=ISO&to=ISO
// Returns comprehensive real-time stats for the UBT admin dashboard
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const tenantId = session.tenantId;
        const { searchParams } = new URL(request.url);
        const period    = searchParams.get("period") || "daily";
        const timeframe = searchParams.get("timeframe"); // today | week | month | year | all
        const fromParam = searchParams.get("from");
        const toParam   = searchParams.get("to");

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        let dayRefreshTime = "00:00";
        try {
            if (tenant?.settings) {
                const parsed = JSON.parse(tenant.settings as string);
                if (parsed.dayRefreshTime) dayRefreshTime = parsed.dayRefreshTime;
            }
        } catch {}

        // ── Determine time window ─────────────────────────────────────────────
        const now = new Date();
        let periodStart: Date;
        let periodEnd: Date;

        if (fromParam && toParam) {
            // Custom range (from Kalendar tab)
            periodStart = new Date(fromParam + "T00:00:00");
            periodEnd   = new Date(toParam   + "T23:59:59");
        } else if (timeframe === "week") {
            periodStart = new Date(now);
            periodStart.setDate(now.getDate() - 6);
            periodStart.setHours(0, 0, 0, 0);
            periodEnd = new Date(now);
            periodEnd.setHours(23, 59, 59, 999);
        } else if (timeframe === "month") {
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (timeframe === "year") {
            periodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            periodEnd   = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else if (timeframe === "all") {
            periodStart = new Date("2020-01-01T00:00:00");
            periodEnd   = new Date(now);
            periodEnd.setHours(23, 59, 59, 999);
        } else if (period === "custom" && fromParam && toParam) {
            periodStart = new Date(fromParam);
            periodEnd   = new Date(toParam);
        } else if (period === "hourly") {
            periodStart = new Date(now);
            periodStart.setMinutes(0, 0, 0);
            periodEnd = new Date(now);
            periodEnd.setMinutes(59, 59, 999);
        } else if (period === "monthly") {
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (period === "yearly") {
            periodStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            periodEnd   = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else {
            // Default: today (business day bounds)
            const bounds = getBusinessDayBounds(now, dayRefreshTime, true);
            periodStart = bounds.start;
            periodEnd   = bounds.end;
        }

        const todayStart = periodStart;
        const todayEnd   = periodEnd;

        // ── Parallel DB queries ───────────────────────────────────────────────
        const [
            todayTransactions,
            tables,
            pendingDeliveries,
            moliyaEntries,
            qarzAggregate,
            qarzQaytarishAgg,
            qarzOlishAgg,
            qarzUzishAgg
        ] = await Promise.all([
            prisma.transaction.findMany({
                where: {
                    tenantId,
                    status: "completed",
                    createdAt: { gte: todayStart, lte: todayEnd },
                    OR: [
                        { notes: { contains: "EVIKO" } },
                        { notes: { contains: "SMART" } },
                        { notes: { contains: "Olib ketish" } }
                    ],
                },
                select: { amount: true, method: true, createdAt: true },
            }),
            prisma.smartTable.findMany({
                where: { tenantId },
                select: { status: true },
            }),
            prisma.deliveryOrder.count({
                where: { 
                    tenantId, 
                    status: { in: ["new", "assigned", "on_the_way"] },
                    createdAt: { gte: todayStart, lte: todayEnd }
                },
            }),
            prisma.kassiHarakat.groupBy({
                by: ['type'],
                where: { tenantId, date: { gte: todayStart, lte: todayEnd } },
                _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
                where: { tenantId, status: "completed", method: "qarz" },
                _sum: { amount: true },
            }),
            prisma.kassiHarakat.aggregate({
                where: { tenantId, type: "income", category: "Qarz qaytarish" },
                _sum: { amount: true },
            }),
            prisma.kassiHarakat.aggregate({
                where: { tenantId, type: "income", category: { contains: "qarz olish" } },
                _sum: { amount: true },
            }),
            prisma.kassiHarakat.aggregate({
                where: { tenantId, type: "expense", category: { contains: "qarz" } },
                _sum: { amount: true },
            }),
        ]);

        // ── Revenue aggregation ───────────────────────────────────────────────
        const todayRevenue = todayTransactions.reduce((s, t) => s + Number(t.amount), 0);
        const todayCount   = todayTransactions.length;

        const byMethod: Record<string, { total: number; count: number }> = {};
        for (const tx of todayTransactions) {
            const m = tx.method || "Noma'lum";
            if (!byMethod[m]) byMethod[m] = { total: 0, count: 0 };
            byMethod[m].total += Number(tx.amount);
            byMethod[m].count += 1;
        }

        // ── Chart buckets based on period ─────────────────────────────────────
        let chartData: { hour: string; amount: number }[] = [];

        if (period === "hourly") {
            chartData = Array.from({ length: 60 }, (_, m) => ({
                hour: `${String(m).padStart(2, "0")}dk`,
                amount: 0,
            }));
            for (const tx of todayTransactions) {
                const m = new Date(tx.createdAt).getMinutes();
                chartData[m].amount += Number(tx.amount);
            }
        } else if (period === "monthly") {
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            chartData = Array.from({ length: daysInMonth }, (_, d) => ({
                hour: `${d + 1}-kun`,
                amount: 0,
            }));
            for (const tx of todayTransactions) {
                const d = new Date(tx.createdAt).getDate() - 1;
                if (chartData[d]) chartData[d].amount += Number(tx.amount);
            }
        } else if (period === "yearly") {
            const MONTHS = ["Yan","Fev","Mar","Apr","May","Iyn","Iyl","Avg","Sen","Okt","Noy","Dek"];
            chartData = MONTHS.map(m => ({ hour: m, amount: 0 }));
            for (const tx of todayTransactions) {
                const m = new Date(tx.createdAt).getMonth();
                chartData[m].amount += Number(tx.amount);
            }
        } else if (period === "custom" && fromParam && toParam) {
            const from = new Date(fromParam);
            const to   = new Date(toParam);
            const diffDays = Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1;
            chartData = Array.from({ length: Math.min(diffDays, 90) }, (_, i) => {
                const d = new Date(from);
                d.setDate(d.getDate() + i);
                return { hour: `${d.getDate()}/${d.getMonth()+1}`, amount: 0 };
            });
            for (const tx of todayTransactions) {
                const txDate = new Date(tx.createdAt);
                const dayIdx = Math.floor((txDate.getTime() - from.getTime()) / 86400000);
                if (chartData[dayIdx]) chartData[dayIdx].amount += Number(tx.amount);
            }
        } else {
            // Daily: 24 hourly buckets
            chartData = Array.from({ length: 24 }, (_, h) => ({
                hour: `${String(h).padStart(2, "0")}:00`,
                amount: 0,
            }));
            for (const tx of todayTransactions) {
                const h = new Date(tx.createdAt).getHours();
                chartData[h].amount += Number(tx.amount);
            }
        }

        // ── Table stats ───────────────────────────────────────────────────────
        const occupiedCount  = tables.filter(t => t.status === "occupied").length;
        const reservedCount  = tables.filter(t => t.status === "reserved").length;
        const freeCount      = tables.filter(t => t.status === "free").length;
        const totalTables    = tables.length;

        // ── Finance stats ─────────────────────────────────────────────────────
        const totalIncome  = Number(moliyaEntries.find(g => g.type === "income")?._sum.amount || 0);
        const totalExpense = Number(moliyaEntries.find(g => g.type === "expense")?._sum.amount || 0);

        // ── Debt Aggregation ──────────────────────────────────────────────────
        const allTimeQarzSales = Number(qarzAggregate._sum.amount) || 0;
        const qarzQaytarildi = Number(qarzQaytarishAgg._sum.amount) || 0;
        const qarzdorlar = allTimeQarzSales - qarzQaytarildi;

        const qarzOlingan = Number(qarzOlishAgg._sum.amount) || 0;
        const qarzUzilgan = Number(qarzUzishAgg._sum.amount) || 0;
        const bizningQarz = Math.max(0, qarzOlingan - qarzUzilgan);

        return NextResponse.json({
            period,
            periodStart: todayStart.toISOString(),
            periodEnd:   todayEnd.toISOString(),
            today: {
                revenue: Math.round(todayRevenue),
                count: todayCount,
                byMethod,
            },
            hourly: chartData,
            tables: {
                total: totalTables,
                occupied: occupiedCount,
                reserved: reservedCount,
                free: freeCount,
            },
            pendingDeliveries,
            finance: {
                totalIncome: Math.round(totalIncome),
                totalExpense: Math.round(totalExpense),
                netProfit: Math.round(totalIncome - totalExpense),
            },
            debt: {
                qarzdorlar: Math.round(qarzdorlar),
                bizningQarz: Math.round(bizningQarz),
            }
        });
    } catch (error) {
        console.error("[stats GET]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
