export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { getBusinessDayBounds } from "@/lib/backend/dateUtils";

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const tf = url.searchParams.get("timeframe") || "all";

        let dayRefreshTime = "00:00";
        try {
            const t = await prisma.tenant.findUnique({ where: { id: session.tenantId }, select: { settings: true } });
            if (t?.settings) {
                const parsed = JSON.parse(t.settings as string);
                if (parsed.dayRefreshTime) dayRefreshTime = parsed.dayRefreshTime;
            }
        } catch {}

        const now = new Date();
        const base = getBusinessDayBounds(now, dayRefreshTime, true);
        let dateFilter: any = {};

        if (tf === "today") {
            dateFilter = { gte: base.start, lte: base.end };
        } else if (tf === "week") {
            const startStr = new Date(base.start);
            startStr.setDate(startStr.getDate() - 6);
            dateFilter = { gte: startStr, lte: base.end };
        } else if (tf === "month") {
            const startStr = new Date(base.start);
            startStr.setDate(1);
            dateFilter = { gte: startStr, lte: base.end };
        } else if (tf === "year") {
            const startStr = new Date(base.start);
            startStr.setMonth(0, 1);
            dateFilter = { gte: startStr, lte: base.end };
        }
        
        const filterClause = Object.keys(dateFilter).length > 0 ? dateFilter : undefined;

        const returns = await prisma.inventoryExpenditure.findMany({
            where: { tenantId: session.tenantId, reason: "return", createdAt: filterClause },
            include: { product: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ returns });
    } catch (e: any) {
        return NextResponse.json({ error: "Server error", details: e.message }, { status: 500 });
    }
}
