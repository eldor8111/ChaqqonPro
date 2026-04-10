import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const expenditures = await prisma.inventoryExpenditure.findMany({
            where: { tenantId: session.tenantId },
            orderBy: { createdAt: "desc" },
            include: { product: true }
        });

        return NextResponse.json(expenditures);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Xatolik" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { date, productId, productName, quantity, unit, reason, fromWarehouse, employee, notes } = body;

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

                // Chiqim qilinganda snotedan ayiriladi
                await prisma.product.update({
                    where: { id: productId },
                    data: { stock: product.stock - Number(quantity) }
                });
            }
        }

        const expenditure = await prisma.inventoryExpenditure.create({
            data: {
                tenantId: session.tenantId,
                date: new Date(date || Date.now()),
                productId: pId,
                productName: pName,
                quantity: Number(quantity),
                unit: pUnit,
                reason: reason || "Boshqa", // sale, return, damage, writeoff, prep
                fromWarehouse: fromWarehouse || "Asosiy Ombor",
                employee: employee || session.userId || "Noma'lum",
                notes
            }
        });

        await prisma.auditLog.create({
            data: {
                tenantId: session.tenantId,
                user: session.userId,
                action: "INVENTORY_EXPENDITURE_CREATED",
                detail: `${pName} chiqim qilindi: ${quantity} ${pUnit}. Sabab: ${reason}`,
                type: "create"
            }
        });

        return NextResponse.json(expenditure);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Xatolik" }, { status: 500 });
    }
}
