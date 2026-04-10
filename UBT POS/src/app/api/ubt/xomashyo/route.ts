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
    return null;
}

const _tableReady = prisma.$executeRawUnsafe(
    "CREATE TABLE IF NOT EXISTS UbtIngredient (" +
        "id          TEXT PRIMARY KEY," +
        "tenantId    TEXT NOT NULL," +
        "name        TEXT NOT NULL," +
        "unit        TEXT NOT NULL," +
        "stock       REAL NOT NULL DEFAULT 0," +
        "price       REAL NOT NULL DEFAULT 0," +
        "type        TEXT NOT NULL DEFAULT 'xomashyo'," +
        "categoryId  TEXT NULL," +
        "createdAt   TEXT NOT NULL DEFAULT (datetime('now'))" +
    ")"
).catch(() => {})
  .then(() => prisma.$executeRawUnsafe(`ALTER TABLE UbtIngredient ADD COLUMN type TEXT NOT NULL DEFAULT 'xomashyo'`)).catch(() => {})
  .then(() => prisma.$executeRawUnsafe(`ALTER TABLE UbtIngredient ADD COLUMN categoryId TEXT NULL`)).catch(() => {});

export async function GET(req: NextRequest) {
    try {
        await _tableReady;
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json([], { status: 200 });
        
        const type = req.nextUrl.searchParams.get("type") || "xomashyo";
        const rows: any[] = await prisma.$queryRawUnsafe(
            "SELECT id, name, unit, stock, price, type, categoryId, createdAt FROM UbtIngredient WHERE tenantId=? AND type=? ORDER BY createdAt ASC",
            tenantId, type
        );
        return NextResponse.json(rows);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await _tableReady;
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        const { id, name, unit, stock, price, type, categoryId } = await req.json();
        const ingType = type || "xomashyo";
        const catId = categoryId || null;
        if (!name) return NextResponse.json({ error: "Xomashyo nomi kiritilishi shart" }, { status: 400 });
        
        if (id && !id.startsWith("X")) {
            // Update
            await prisma.$executeRawUnsafe(
                "UPDATE UbtIngredient SET name=?, unit=?, stock=?, price=?, type=?, categoryId=? WHERE id=? AND tenantId=?", 
                name, unit, stock, price, ingType, catId, id, tenantId
            );
            return NextResponse.json({ success: true, id });
        } else {
            // Create
            const newId = "ing_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
            await prisma.$executeRawUnsafe(
                "INSERT INTO UbtIngredient (id, tenantId, name, unit, stock, price, type, categoryId) VALUES (?,?,?,?,?,?,?,?)",
                newId, tenantId, name, unit, stock, price, ingType, catId
            );
            return NextResponse.json({ success: true, id: newId });
        }
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await _tableReady;
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: "ID kiritilmagan" }, { status: 400 });
        
        await prisma.$executeRawUnsafe("DELETE FROM UbtIngredient WHERE id=? AND tenantId=?", id, tenantId);
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
