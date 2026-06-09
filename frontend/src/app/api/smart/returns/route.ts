export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

async function resolveAuth(request: NextRequest): Promise<{ tenantId: string; waiterName?: string } | null> {
    try {
        const session = await getSession();
        if (session?.tenantId) return { tenantId: session.tenantId };
    } catch {}
    const auth = request.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET);
            if (payload.tenantId) return {
                tenantId: payload.tenantId as string,
                waiterName: payload.name as string | undefined,
            };
        } catch {}
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const auth = await resolveAuth(req);
        if (!auth?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { productId, productName, quantity, unit, employee } = body;

        if (!productName || !quantity || quantity <= 0) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        // InventoryExpenditure "quantity" may be defined as Int in Prisma.
        // Avoid prisma float errors by rounding if necessary:
        const parsedQty = Math.round(Number(quantity));

        const exp = await prisma.inventoryExpenditure.create({
            data: {
                tenantId: auth.tenantId,
                productId: productId || null,
                productName,
                quantity: parsedQty,
                unit: unit || "ta",
                reason: "return",
                fromWarehouse: "Asosiy Ombor", // fallback
                employee: employee || auth.waiterName || "Kassir",
                notes: "Buyurtmadan bekor qilingan (Atmen)",
            }
        });

        return NextResponse.json({ success: true, returnRecord: exp });
    } catch (e: any) {
        return NextResponse.json({ error: "Server error", details: e.message }, { status: 500 });
    }
}
