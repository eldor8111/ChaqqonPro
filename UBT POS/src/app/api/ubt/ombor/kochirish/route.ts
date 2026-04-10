import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const transfers = await prisma.inventoryTransfer.findMany({
            where: { tenantId: session.tenantId },
            orderBy: { createdAt: "desc" },
            include: { product: true }
        });

        return NextResponse.json(transfers);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Xatolik" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { date, productId, productName, quantity, unit, fromWarehouse, toWarehouse, employee, notes } = body;

        let pId = productId;
        let pName = productName || "NOMA'LUM";
        let pUnit = unit || "dona";

        if (productId) {
            const product = await prisma.product.findUnique({
                where: { id: productId, tenantId: session.tenantId }
            });
            if (product) {
                pName = product.name;
                pUnit = product.unit;
            }
        }

        const transfer = await prisma.inventoryTransfer.create({
            data: {
                tenantId: session.tenantId,
                date: new Date(date || Date.now()),
                productId: pId,
                productName: pName,
                quantity: Number(quantity),
                unit: pUnit,
                fromWarehouse: fromWarehouse || "Asosiy Ombor",
                toWarehouse: toWarehouse || "Filial Ombori",
                employee: employee || session.userId || "Noma'lum",
                status: "completed",
                notes
            }
        });

        await prisma.auditLog.create({
            data: {
                tenantId: session.tenantId,
                user: session.userId,
                action: "INVENTORY_TRANSFER_CREATED",
                detail: `${pName} ko'chirildi: ${quantity} ${pUnit}. Yo'nalish: ${fromWarehouse} -> ${toWarehouse}`,
                type: "create"
            }
        });

        return NextResponse.json(transfer);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Xatolik" }, { status: 500 });
    }
}
