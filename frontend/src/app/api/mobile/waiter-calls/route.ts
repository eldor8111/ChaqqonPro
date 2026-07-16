export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { waiterCalls } from "@/lib/waiter-calls-store";

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

        const calls: Array<{ tableId: string; tableNumber: string; calledAt: string; message?: string }> = [];

        waiterCalls.forEach((value, key) => {
            const [tid, tableId] = key.split(":");
            if (tid === tenantId) {
                calls.push({
                    tableId,
                    tableNumber: value.tableNumber,
                    calledAt: value.calledAt.toISOString(),
                    message: value.message,
                });
            }
        });

        return NextResponse.json({ calls });
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
            waiterCalls.delete(`${tenantId}:${tableId}`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Server xatoligi", details: error.message }, { status: 500 });
    }
}
