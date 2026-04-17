import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

export const dynamic = "force-dynamic";

// GET: All kassa harakatlari (income/expense entries)
export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type"); // "income" | "expense" | null (all)

        const entries = await prisma.kassiHarakat.findMany({
            where: { tenantId: session.tenantId },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        const formattedEntries = entries.map(e => ({
            ...e,
            amount: Number(e.amount),
            date: e.date || e.createdAt,
        }));

        // Summary using GroupBy for optimization
        const grouped = await prisma.kassiHarakat.groupBy({
            by: ['type'],
            where: { tenantId: session.tenantId },
            _sum: { amount: true },
        });

        const totalIncome = grouped.find(g => g.type === "income")?._sum.amount || 0;
        const totalExpense = grouped.find(g => g.type === "expense")?._sum.amount || 0;

        // Bosh valyuta kursini olish
        const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
        let usdRate = 12500;
        if (tenant?.settings) {
            try {
                const s = JSON.parse(tenant.settings);
                if (s.usdRate) usdRate = Number(s.usdRate);
            } catch (e) {}
        }

        return NextResponse.json({
            entries: formattedEntries,
            summary: {
                totalIncome,
                totalExpense,
                netProfit: totalIncome - totalExpense,
            },
            usdRate
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST: Add new entry
export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { type, category, amount, description, paymentMethod, date, kontragent } = body;

        if (!type || !amount) {
            return NextResponse.json({ error: "type va amount majburiy" }, { status: 400 });
        }

        const entry = await prisma.kassiHarakat.create({
            data: {
                tenantId: session.tenantId,
                type,
                category: category || "Boshqa",
                amount: Number(amount),
                description: description || "",
                paymentMethod: paymentMethod || "Naqd pul",
                date: date ? new Date(date) : new Date(),
                createdBy: session.userId || "Admin",
                kontragent: kontragent || null,
            },
        });

        await prisma.auditLog.create({
            data: {
                tenantId: session.tenantId,
                user: session.userId || "admin",
                action: type === "income" ? "MOLIYA_KIRIM" : "MOLIYA_CHIQIM",
                detail: `${category}: ${Number(amount).toLocaleString()} so'm — ${description || ""}`,
                type: "create",
            },
        });

        return NextResponse.json(entry);
    } catch (e: any) {
        console.error("Moliya POST error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// DELETE
export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await req.json();
        await prisma.kassiHarakat.delete({
            where: { id, tenantId: session.tenantId },
        });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// PUT: Update Moliya Settings (USD Rate)
export async function PUT(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { usdRate } = body;

        if (!usdRate) return NextResponse.json({ error: "usdRate majburiy" }, { status: 400 });

        const tenant = await prisma.tenant.findUnique({ where: { id: session.tenantId } });
        let settings = {};
        if (tenant?.settings) {
            try { settings = JSON.parse(tenant.settings); } catch (e) {}
        }
        
        (settings as any).usdRate = Number(usdRate);

        await prisma.tenant.update({
            where: { id: session.tenantId },
            data: { settings: JSON.stringify(settings) }
        });

        return NextResponse.json({ success: true, usdRate: (settings as any).usdRate });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
