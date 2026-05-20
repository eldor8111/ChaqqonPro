import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Faqat faol orderlarni qaytarish (delivered va cancelled ekranda ko'rinmaydi)
        const orders = await prisma.deliveryOrder.findMany({
            where: { tenantId, status: { notIn: ["delivered", "cancelled"] } },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        // Build staff list for couriers
        const couriers = await prisma.staff.findMany({
            where: { tenantId },
            select: { id: true, name: true, role: true },
        });

        return NextResponse.json({ orders, couriers });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { customerName, customerPhone, address, items, totalAmount, paymentMethod, notes } = body;

        const orderNumber = `DEL-${Date.now().toString().slice(-6)}`;

        const order = await prisma.deliveryOrder.create({
            data: {
                tenantId,
                orderNumber,
                customerName: customerName || "Noma'lum",
                customerPhone: customerPhone || "",
                address: address || "",
                items: JSON.stringify(items || []),
                totalAmount: Number(totalAmount) || 0,
                status: "new",
                paymentMethod: paymentMethod || "Naqd pul",
                notes: notes || "",
            },
        });

        return NextResponse.json(order);
    } catch (e: any) {
        console.error("Delivery POST error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { id, status, courierId, courierName, isPaid } = body;

        const updated = await prisma.deliveryOrder.update({
            where: { id, tenantId },
            data: {
                ...(status ? { status } : {}),
                ...(courierId !== undefined ? { courierId, courierName } : {}),
                ...(isPaid !== undefined ? { isPaid } : {}),
                ...(status === "delivered" ? { deliveredAt: new Date() } : {}),
            },
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { id, items } = body;

        if (!id || !Array.isArray(items)) {
            return NextResponse.json({ error: "id va items kerak" }, { status: 400 });
        }

        // Calculate new running total
        const runningTotal = items.reduce((sum: number, ci: any) => {
            const price = ci.item?.price ?? ci.price ?? 0;
            const qty = ci.qty ?? 1;
            return sum + price * qty;
        }, 0);

        const updated = await prisma.deliveryOrder.update({
            where: { id, tenantId },
            data: {
                items: JSON.stringify(items),
                totalAmount: Math.round(runningTotal),
            },
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        console.error("Delivery PUT error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
