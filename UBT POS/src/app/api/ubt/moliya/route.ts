import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

export const dynamic = "force-dynamic";

// Ensure kontragent column exists (lazy migration)
const _ensureKontragentColumn = prisma
    .$executeRawUnsafe(`ALTER TABLE KassiHarakat ADD COLUMN kontragent TEXT`)
    .catch(() => { /* column already exists — ignore */ });

// GET: All kassa harakatlari (income/expense entries)
export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type"); // "income" | "expense" | null (all)

        await _ensureKontragentColumn;

        const rawEntries: any[] = await prisma.$queryRawUnsafe(
            `SELECT *, kontragent FROM KassiHarakat WHERE tenantId = ? ORDER BY createdAt DESC LIMIT 200`,
            session.tenantId
        );
        const entries = rawEntries.map(e => ({
            ...e,
            amount: Number(e.amount),
            date: e.date || e.createdAt,
        }));

        // Summary
        const allEntries = await prisma.kassiHarakat.findMany({
            where: { tenantId: session.tenantId },
            select: { type: true, amount: true },
        });

        const totalIncome = allEntries.filter(e => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
        const totalExpense = allEntries.filter(e => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);

        return NextResponse.json({
            entries,
            summary: {
                totalIncome,
                totalExpense,
                netProfit: totalIncome - totalExpense,
            },
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

        await _ensureKontragentColumn;

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
            },
        });

        // Save kontragent via raw SQL update (Prisma doesn't know this column)
        if (kontragent) {
            await prisma.$executeRawUnsafe(
                `UPDATE KassiHarakat SET kontragent = ? WHERE id = ?`,
                kontragent,
                entry.id
            );
        }

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
