export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

async function getAuthTenantId(request: NextRequest): Promise<string | null> {
    try {
        const session = await getSession();
        if (session?.tenantId) return session.tenantId;
    } catch {}
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
            if (payload.tenantId) return payload.tenantId as string;
        } catch {}
    }
    return null;
}

import { getBusinessDayBounds } from "@/lib/backend/dateUtils";

// GET — list transactions (for admin dashboard + reports)
export async function GET(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) return NextResponse.json({ transactions: [], summary: {} }, { status: 401 });

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);
        const tf = url.searchParams.get("timeframe");
        const fromParam = url.searchParams.get("from");
        const toParam   = url.searchParams.get("to");

        let dateFilter: any = undefined;
        let dayRefreshTime = "00:00";

        try {
            const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
            if (t?.settings) {
                const parsed = JSON.parse(t.settings as string);
                if (parsed.dayRefreshTime) dayRefreshTime = parsed.dayRefreshTime;
            }
        } catch {}

        // Custom range takes priority
        if (fromParam && toParam) {
            const from = new Date(fromParam); from.setHours(0, 0, 0, 0);
            const to   = new Date(toParam);   to.setHours(23, 59, 59, 999);
            dateFilter = { gte: from, lte: to };
        } else if (tf && tf !== "all") {
            const base = getBusinessDayBounds(new Date(), dayRefreshTime, true);
            if (tf === "today") dateFilter = { gte: base.start, lte: base.end };
            else if (tf === "week") {
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
        }

        // Apply filters directly to prisma
        const transactions = await prisma.transaction.findMany({
            where: { tenantId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: { items: true }
        });

        // Summary stats — fetch today's summary using exact custom business day bounds
        const todayBase = getBusinessDayBounds(new Date(), dayRefreshTime, true);
        const todayFilter = { gte: todayBase.start, lte: todayBase.end };

        const todayRows = await prisma.transaction.findMany({
            where: { tenantId, status: "completed", createdAt: todayFilter }
        });

        const totalToday = todayRows.reduce((s, r) => s + Number(r.amount || 0), 0);
        const countToday = todayRows.length;
        const byMethod: any = {};
        
        for (const tx of todayRows) {
            const m = tx.method || "Boshqa";
            if (!byMethod[m]) byMethod[m] = { total: 0, count: 0 };
            byMethod[m].total += Number(tx.amount || 0);
            byMethod[m].count += 1;
        }

        return NextResponse.json({
            transactions: transactions.map(r => ({
                id: r.id,
                amount: Number(r.amount),
                method: r.method,
                status: r.status,
                kassirName: r.kassirName,
                notes: r.notes,
                createdAt: r.createdAt,
                items: r.items
            })),
            summary: {
                totalToday,
                countToday,
                byMethod,
            },
        });
    } catch (error) {
        console.error("Transactions GET error:", error);
        return NextResponse.json({ transactions: [], summary: {} }, { status: 500 });
    }
}
