export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

async function getAuthTenantId(request: NextRequest): Promise<string | null> {
    try {
        const cookieSession = await getSession();
        if (cookieSession?.tenantId) return cookieSession.tenantId;
    } catch {}
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
            if (payload.tenantId) return payload.tenantId as string;
        } catch {}
    }
    // POS fallback
    const firstTenant = await prisma.tenant.findFirst({ where: { status: "active" } });
    return firstTenant?.id ?? null;
}

// Module-level — faqat bir marta ishlaydigan CREATE TABLE
const _tableReady = prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS UbtPrinter (
        id          TEXT PRIMARY KEY,
        tenantId    TEXT NOT NULL,
        name        TEXT NOT NULL,
        ipAddress   TEXT NOT NULL,
        port        INTEGER NOT NULL DEFAULT 9100,
        description TEXT,
        createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
    )
`).catch(() => {});

// GET — list printers
export async function GET(req: NextRequest) {
    try {
        await _tableReady;
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json([], { status: 200 });
        const rows: any[] = await prisma.$queryRawUnsafe(
            `SELECT id, name, ipAddress, port, description, createdAt FROM UbtPrinter WHERE tenantId=? ORDER BY createdAt ASC`,
            tenantId
        );
        return NextResponse.json(rows);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// POST — add printer
export async function POST(req: NextRequest) {
    try {
        await _tableReady;
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { name, ipAddress, port, description } = await req.json();
        if (!name || !ipAddress) return NextResponse.json({ error: "Nomi va IP manzil kiritilishi shart" }, { status: 400 });
        const id = `prn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const portNum = Number(port) || 9100;
        await prisma.$executeRawUnsafe(
            `INSERT INTO UbtPrinter (id, tenantId, name, ipAddress, port, description) VALUES (?,?,?,?,?,?)`,
            id, tenantId, name, ipAddress, portNum, description || ""
        );
        return NextResponse.json({ success: true, id });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// DELETE — remove printer
export async function DELETE(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: "ID kiritilmagan" }, { status: 400 });
        await prisma.$executeRawUnsafe(`DELETE FROM UbtPrinter WHERE id=? AND tenantId=?`, id, tenantId);
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
