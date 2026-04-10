import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

export const dynamic = "force-dynamic";

// Ensure UbtSupplier table exists
const _ensureSupplierTable = prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS UbtSupplier (
        id        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
        tenantId  TEXT NOT NULL,
        name      TEXT NOT NULL,
        phone     TEXT,
        info      TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).catch(() => {});

// GET: Returns mijozlar (customers) + yetkazib beruvchilar (suppliers) for a tenant
export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await _ensureSupplierTable;

        // Customers from Prisma Customer model
        const customers = await prisma.customer.findMany({
            where: { tenantId: session.tenantId },
            select: { id: true, name: true, phone: true },
            orderBy: { name: "asc" },
            take: 300,
        });

        // Suppliers from raw table
        const suppliers: any[] = await prisma.$queryRawUnsafe(
            `SELECT id, name, phone FROM UbtSupplier WHERE tenantId = ? ORDER BY name ASC LIMIT 300`,
            session.tenantId
        );

        // Staff from Prisma Staff model
        const staff = await prisma.staff.findMany({
            where: { tenantId: session.tenantId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({ customers, suppliers, staff });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST: Add new supplier
export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await _ensureSupplierTable;

        const { name, phone, info } = await req.json();
        if (!name) return NextResponse.json({ error: "Nom majburiy" }, { status: 400 });

        const id = Math.random().toString(36).slice(2, 12);
        await prisma.$executeRawUnsafe(
            `INSERT INTO UbtSupplier (id, tenantId, name, phone, info) VALUES (?, ?, ?, ?, ?)`,
            id, session.tenantId, name, phone || null, info || null
        );

        return NextResponse.json({ success: true, id });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
