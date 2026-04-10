import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const orders = await prisma.deliveryOrder.findMany({
            where: { tenantId: session.tenantId },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        // Build staff list for couriers
        const couriers = await prisma.staff.findMany({
            where: { tenantId: session.tenantId },
            select: { id: true, name: true, role: true },
        });

        return NextResponse.json({ orders, couriers });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { customerName, customerPhone, address, items, totalAmount, paymentMethod, notes } = body;

        const orderNumber = `DEL-${Date.now().toString().slice(-6)}`;

        const order = await prisma.deliveryOrder.create({
            data: {
                tenantId: session.tenantId,
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
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { id, status, courierId, courierName, isPaid } = body;

        const updated = await prisma.deliveryOrder.update({
            where: { id, tenantId: session.tenantId },
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
