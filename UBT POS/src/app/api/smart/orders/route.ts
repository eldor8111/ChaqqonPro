export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

export async function GET(_request: NextRequest) {
    try {
        // Single DB call instead of getSession() + getTenantId() (which calls getSession() again)
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const tenantId = session.tenantId;

        const orders = await prisma.kDSOrder.findMany({
            where: { tenantId, status: { not: "served" } },
            // select only needed table fields instead of fetching entire table row
            include: { table: { select: { id: true, tableNumber: true, section: true, capacity: true } } },
            orderBy: { createdAt: "asc" }
        });

        return NextResponse.json({ orders });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const tenantId = session.tenantId;

        const { tableId, description, priority } = await request.json();

        const order = await prisma.kDSOrder.create({
            data: {
                tenantId,
                tableId,
                description,
                status: "new",
                priority: priority || "normal"
            }
        });

        return NextResponse.json({ success: true, order }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const tenantId = session.tenantId;

        const { id, status } = await request.json();

        const order = await prisma.kDSOrder.update({
            where: { id, tenantId },
            data: {
                status,
                completedAt: status === "ready" || status === "served" ? new Date() : null
            }
        });

        return NextResponse.json({ success: true, order });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// PATCH — update KDS order status by id suffix (last 4 chars)
export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const tenantId = session.tenantId;
        const { idSuffix, status } = await request.json();
        if (!idSuffix || !status) return NextResponse.json({ error: "idSuffix va status kerak" }, { status: 400 });
        // faqat harf va raqam — LIKE wildcard injection oldini olish
        if (!/^[a-zA-Z0-9]{1,8}$/.test(idSuffix)) return NextResponse.json({ error: "idSuffix noto'g'ri format" }, { status: 400 });

        // Find order whose ID ends with idSuffix (exact suffix match, no wildcard injection)
        const orders: any[] = await prisma.$queryRawUnsafe(
            `SELECT id FROM KDSOrder WHERE tenantId=? AND substr(id, -${idSuffix.length}) = ? LIMIT 1`,
            tenantId, idSuffix
        );
        if (!orders.length) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });

        // Use type-safe Prisma update instead of raw SQL
        await prisma.kDSOrder.update({
            where: { id: orders[0].id },
            data: {
                status,
                completedAt: (status === "ready" || status === "served") ? new Date() : null
            }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Server xatoligi" }, { status: 500 });
    }
}
