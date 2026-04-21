export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { getBusinessDayBounds } from "@/lib/backend/dateUtils";

// GET /api/ubt/stats
// Returns comprehensive real-time stats for the UBT admin dashboard
export async function GET(_request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const tenantId = session.tenantId;

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        let dayRefreshTime = "00:00";
        try {
            if (tenant?.settings) {
                const parsed = JSON.parse(tenant.settings as string);
                if (parsed.dayRefreshTime) dayRefreshTime = parsed.dayRefreshTime;
            }
        } catch {}

        // Calculate custom business day boundaries
        const bounds = getBusinessDayBounds(new Date(), dayRefreshTime, true);
        const todayStart = bounds.start;
        const todayEnd = bounds.end;

        // ── Parallel DB queries ───────────────────────────────────────────────
        const [
            todayTransactions,
            tables,
            pendingDeliveries,
            moliyaEntries,
            qarzAggregate,
        ] = await Promise.all([
            // All completed UBT transactions today
            prisma.transaction.findMany({
                where: {
                    tenantId,
                    status: "completed",
                    createdAt: { gte: todayStart, lte: todayEnd },
                    notes: { contains: "ChaqqonPro" },
                },
                select: { amount: true, method: true, createdAt: true },
            }),
            // All tables (for occupied/free counts)
            prisma.ubtTable.findMany({
                where: { tenantId },
                select: { status: true },
            }),
            // Pending delivery orders
            prisma.deliveryOrder.count({
                where: { 
                    tenantId, 
                    status: { in: ["new", "assigned", "on_the_way"] },
                    createdAt: { gte: todayStart, lte: todayEnd }
                },
            }),
            // Finance income & expense
            prisma.kassiHarakat.findMany({
                where: { tenantId },
                select: { type: true, category: true, amount: true },
            }),
            // Total global Qarz sales ever originated
            prisma.transaction.aggregate({
                where: { tenantId, status: "completed", method: "qarz" },
                _sum: { amount: true },
            }),
        ]);

        // ── Revenue aggregation ───────────────────────────────────────────────
        const todayRevenue = todayTransactions.reduce((s, t) => s + Number(t.amount), 0);
        const todayCount   = todayTransactions.length;

        // By payment method (Dynamic, no hardcoding)
        const byMethod: Record<string, { total: number; count: number }> = {};
        for (const tx of todayTransactions) {
            const m = tx.method || "Noma'lum";
            if (!byMethod[m]) byMethod[m] = { total: 0, count: 0 };
            byMethod[m].total += Number(tx.amount);
            byMethod[m].count += 1;
        }

        // ── Hourly chart data (24 buckets) ────────────────────────────────────
        const hourly: { hour: string; amount: number }[] = Array.from({ length: 24 }, (_, h) => ({
            hour: `${String(h).padStart(2, "0")}:00`,
            amount: 0,
        }));
        for (const tx of todayTransactions) {
            const h = new Date(tx.createdAt).getHours();
            hourly[h].amount += Number(tx.amount);
        }

        // ── Table stats ───────────────────────────────────────────────────────
        const occupiedCount  = tables.filter(t => t.status === "occupied").length;
        const reservedCount  = tables.filter(t => t.status === "reserved").length;
        const freeCount      = tables.filter(t => t.status === "free").length;
        const totalTables    = tables.length;

        // ── Finance stats ─────────────────────────────────────────────────────
        const totalIncome  = moliyaEntries.filter(e => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
        const totalExpense = moliyaEntries.filter(e => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);

        // ── Debt Aggregation ──────────────────────────────────────────────────
        // Qarzdorlar (Mijozlar qarzi) = Barcha qarz savdolar - Kassa orqali qaytarilgan qarzlar
        const allTimeQarzSales = Number(qarzAggregate._sum.amount) || 0;
        
        const qarzQaytarildi = moliyaEntries
            .filter(e => e.type === "income" && e.category === "Qarz qaytarish")
            .reduce((s, e) => s + Number(e.amount), 0);
            
        const qarzdorlar = allTimeQarzSales - qarzQaytarildi;

        // Bizning Qarzimiz = Kassadan olingan qarzlar - Kassadan uzilgan qarzlar (Agar kategoriya kiritilsa)
        const qarzOlingan = moliyaEntries.filter(e => e.type === "income" && e.category?.toLowerCase().includes("qarz olish")).reduce((s, e) => s + Number(e.amount), 0);
        const qarzUzilgan = moliyaEntries.filter(e => e.type === "expense" && e.category?.toLowerCase().includes("qarz")).reduce((s, e) => s + Number(e.amount), 0);
        const bizningQarz = Math.max(0, qarzOlingan - qarzUzilgan); // Placeholder until Vendor system is complete

        return NextResponse.json({
            today: {
                revenue: Math.round(todayRevenue),
                count: todayCount,
                byMethod,
            },
            hourly,
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
