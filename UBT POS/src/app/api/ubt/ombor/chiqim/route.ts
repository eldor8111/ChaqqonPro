export const dynamic = 'force-dynamic';
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
        const { date, productId, productName, quantity, unit, reason, fromWarehouse, employee, notes, productType } = body;

        const qty = Number(quantity);
        let pName = productName || "NOMA'LUM";
        let pUnit = unit || "dona";
        const isIngredient = productType === "xomashyo" || productType === "polfabrikat";
        // xomashyo uchun FK yo'q — productId null
        const expProductId = isIngredient ? null : (productId || null);

        if (productId) {
            if (isIngredient) {
                // UbtIngredient jadvalidan stock ayirish
                const ingRows: any[] = await prisma.$queryRawUnsafe(
                    "SELECT id, name, unit, stock FROM UbtIngredient WHERE id=? AND tenantId=? LIMIT 1",
                    productId, session.tenantId
                );
                if (ingRows.length > 0) {
                    pName = ingRows[0].name;
                    pUnit = ingRows[0].unit;
                    const newStock = Math.max(0, Number(ingRows[0].stock) - qty);
                    await prisma.$executeRawUnsafe(
                        "UPDATE UbtIngredient SET stock=? WHERE id=? AND tenantId=?",
                        newStock, productId, session.tenantId
                    );
                }
            } else {
                // Product jadvalidan stock ayirish (mahsulot / taom)
                const product = await prisma.product.findUnique({
                    where: { id: productId, tenantId: session.tenantId }
                });
                if (product) {
                    pName = product.name;
                    pUnit = product.unit;
                    await prisma.product.update({
                        where: { id: productId },
                        data: { stock: Math.max(0, product.stock - qty) }
                    });
                }
            }
        }

        const expenditure = await prisma.inventoryExpenditure.create({
            data: {
                tenantId: session.tenantId,
                date: new Date(date || Date.now()),
                productId: expProductId,
                productName: pName,
                quantity: qty,
                unit: pUnit,
                reason: reason || "Boshqa",
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
