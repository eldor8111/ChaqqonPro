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
        const fromParam = url.searchParams.get("from");
        const toParam   = url.searchParams.get("to");

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

        // Custom range takes priority over preset timeframe
        if (fromParam && toParam) {
            const from = new Date(fromParam); from.setHours(0, 0, 0, 0);
            const to   = new Date(toParam);   to.setHours(23, 59, 59, 999);
            dateFilter = { gte: from, lte: to };
        } else if (tf === "today") {
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

        // 1. DISH_DATA (Top dishes by revenue)
        const items = await prisma.transactionItem.findMany({
            where: { 
                transaction: { tenantId: session.tenantId, status: "completed", createdAt: filterClause } 
            }
        });
        
        // Map images independently to fix historical transactions without productId
        const allProducts = await prisma.product.findMany({
            where: { tenantId: session.tenantId },
            select: { name: true, image: true }
        });
        const productImageMap: Record<string, string | null> = {};
        allProducts.forEach(p => { if (p.image) productImageMap[p.name] = p.image; });

        const dishMap: Record<string, { qty: number; revenue: number; image: string | null }> = {};
        for (const it of items) {
           const name = it.name || "Unknown";
           if (!dishMap[name]) {
               dishMap[name] = { qty: 0, revenue: 0, image: productImageMap[name] || null };
           }
           
           dishMap[name].qty += it.quantity;
           dishMap[name].revenue += (it.price * it.quantity);
        }
        
        const topDishes = Object.keys(dishMap).map(name => ({
           name, 
           qty: dishMap[name].qty, 
           revenue: dishMap[name].revenue,
           image: dishMap[name].image
        })).sort((a,b) => b.revenue - a.revenue).slice(0, 10);

        // 2. STAFF DATA, TIMELINE, AND INCOME
        const allTransactions = await prisma.transaction.findMany({
            where: { tenantId: session.tenantId, status: "completed", createdAt: filterClause },
            select: { kassirName: true, amount: true, method: true, createdAt: true }
        });
        
        const staffList = await prisma.staff.findMany({
            where: { tenantId: session.tenantId }
        });
        
        const staffMap: Record<string, any> = {};
        for (const s of staffList) {
            let roles = [];
            try {
                roles = typeof s.role === "string" && s.role.startsWith("[") ? JSON.parse(s.role) : [s.role];
            } catch { roles = [s.role]; }
            
            staffMap[s.name] = { 
                name: s.name, 
                roles,
                transactions: 0,
                sales: 0,
                cash: 0,
                card: 0
            };
        }
        
        const incomeByMethod: Record<string, { total: number; count: number }> = {};
        const timelineMap: Record<string, { count: number; revenue: number }> = {};

        for (const tx of allTransactions) {
            const empName = tx.kassirName || "Admin";
            if (!staffMap[empName]) {
                staffMap[empName] = { name: empName, roles: [], transactions: 0, sales: 0, cash: 0, card: 0 };
            }
            staffMap[empName].transactions += 1;
            const amt = Number(tx.amount) || 0;
            staffMap[empName].sales += amt;
            const m = tx.method || "Boshqa";
            if (m.toLowerCase().includes("naqd") || m.toLowerCase() === "cash") staffMap[empName].cash += amt;
            else if (m.toLowerCase().includes("karta") || m.toLowerCase() === "card" || m.toLowerCase().includes("plastik")) staffMap[empName].card += amt;

            // Income grouping
            if (!incomeByMethod[m]) incomeByMethod[m] = { total: 0, count: 0 };
            incomeByMethod[m].total += amt;
            incomeByMethod[m].count += 1;

            // Timeline formatting
            let bucket = "Barchasi";
            const d = new Date(tx.createdAt);
            if (tf === "today") bucket = `${String(d.getHours()).padStart(2,"0")}:00`;
            else if (tf === "year") bucket = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            else if (tf !== "all") bucket = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

            if (!timelineMap[bucket]) timelineMap[bucket] = { count: 0, revenue: 0 };
            timelineMap[bucket].count += 1;
            timelineMap[bucket].revenue += amt;
        }

        const ordersTimeline = Object.entries(timelineMap)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const staffMetrics = Object.values(staffMap);

        // 3. EXPENSES (Writing-offs and defined expenses)
        const expRecords = await prisma.inventoryExpenditure.findMany({
            where: { tenantId: session.tenantId, reason: { notIn: ["sale", "return"] }, createdAt: filterClause },
            include: { product: true }
        });
        
        const writingOffs = expRecords.reduce((sum, e) => {
            const cost = e.product?.costPrice || 5000;
            return sum + (e.quantity * cost); 
        }, 0);
        
        const totalSalaries = 0; // Salary logic

        const customExpenses = await prisma.kassiHarakat.findMany({
            where: { tenantId: session.tenantId, type: "expense", createdAt: filterClause }
        });
        
        const kassaExp = customExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        return NextResponse.json({
            topDishes,
            staffMetrics,
            incomeByMethod,
            ordersTimeline,
            expenses: {
                writingOffs,
                salaries: totalSalaries,
                customExpenses: kassaExp
            }
        });

    } catch (e: any) {
        return NextResponse.json({ error: "Server error", details: e.message }, { status: 500 });
    }
}
