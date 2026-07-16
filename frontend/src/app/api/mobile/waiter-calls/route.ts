export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/backend/db";

function getJwtSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not set");
    return new TextEncoder().encode(secret);
}

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization") || "";
        const token = authHeader.replace("Bearer ", "").trim();
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let payload: any;
        try {
            const result = await jwtVerify(token, getJwtSecret());
            payload = result.payload;
        } catch {
            return NextResponse.json({ error: "Token yaroqsiz" }, { status: 401 });
        }

        const { tenantId } = payload;
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Muddati o'tganlarni avtomatik o'chirish
        await prisma.waiterCall.deleteMany({
            where: {
                tenantId,
                expiresAt: { lt: new Date() },
            }
        });

        // Faol chaqiruvlarni database'dan olish
        const calls = await prisma.waiterCall.findMany({
            where: {
                tenantId,
                status: "active",
            },
            orderBy: { calledAt: "desc" },
        });

        return NextResponse.json({
            calls: calls.map(c => ({
                tableId: c.tableId,
                tableNumber: c.tableNumber,
                calledAt: c.calledAt.toISOString(),
                message: c.message,
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Server xatoligi", details: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization") || "";
        const token = authHeader.replace("Bearer ", "").trim();
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let payload: any;
        try {
            const result = await jwtVerify(token, getJwtSecret());
            payload = result.payload;
        } catch {
            return NextResponse.json({ error: "Token yaroqsiz" }, { status: 401 });
        }

        const { tenantId } = payload;
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const tableId = url.searchParams.get("tableId");

        if (tableId) {
            await prisma.waiterCall.deleteMany({
                where: {
                    tenantId,
                    tableId,
                    status: "active",
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Server xatoligi", details: error.message }, { status: 500 });
    }
}
