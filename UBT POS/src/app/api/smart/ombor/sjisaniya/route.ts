export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const items = await prisma.inventoryWriteoff.findMany({
            where: { tenantId: session.tenantId },
            orderBy: { createdAt: "desc" },
            include: { product: true }
        });

        return NextResponse.json(items);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Xatolik yuz berdi" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { date, productId, productName, quantity, unit, reason, approvedBy, productType } = body;

        let pId = productId;
        let pName = productName || "NOMA'LUM";
        let pUnit = unit || "dona";
        let itemCost = 0;
        // productId null bo'lishi kerak bo'lsa (xomashyo/polfabrikat uchun FK yo'q)
        let writeoffProductId: string | null = pId || null;

        if (productId) {
            const isIngredient = productType === "xomashyo" || productType === "polfabrikat";

            if (isIngredient) {
                // UbtIngredient jadvalidan stock ayirish
                writeoffProductId = null; // FK yo'q xomashyo uchun
                const ingRows: any[] = await prisma.$queryRawUnsafe(
                    "SELECT id, name, unit, stock, price FROM UbtIngredient WHERE id=? AND tenantId=? LIMIT 1",
                    productId, session.tenantId
                );
                if (ingRows.length > 0) {
                    pName = ingRows[0].name;
                    pUnit = ingRows[0].unit;
                    itemCost = Number(ingRows[0].price) || 0;
                    const newStock = Math.max(0, Number(ingRows[0].stock) - Number(quantity));
                    await prisma.$executeRawUnsafe(
                        "UPDATE UbtIngredient SET stock=? WHERE id=? AND tenantId=?",
                        newStock, productId, session.tenantId
                    );
                }
            } else {
                // Product jadvalidan stock ayirish (taom / mahsulot)
                const product = await prisma.product.findUnique({
                    where: { id: productId, tenantId: session.tenantId }
                });
                if (product) {
                    pName = product.name;
                    pUnit = product.unit;
                    itemCost = product.costPrice || 0;
                    await prisma.product.update({
                        where: { id: productId },
                        data: { stock: Math.max(0, product.stock - Number(quantity)) }
                    });
                }
            }
        }

        const totalLoss = Number(quantity) * itemCost;

        const writeoff = await prisma.inventoryWriteoff.create({
            data: {
                tenantId: session.tenantId,
                date: new Date(date || Date.now()),
                productId: writeoffProductId,
                productName: pName,
                quantity: Number(quantity),
                unit: pUnit,
                reason: reason || "Noma'lum",
                totalLoss: totalLoss,
                approvedBy: approvedBy || session.userId || "Kirituvchi",
                status: "approved"
            }
        });

        await prisma.auditLog.create({
            data: {
                tenantId: session.tenantId,
                user: session.userId,
                action: "INVENTORY_WRITEOFF_CREATED",
                detail: `${pName} hisobdan chiqarildi: ${quantity} ${pUnit}. Zarar summasi: ${totalLoss}`,
                type: "create"
            }
        });

        return NextResponse.json(writeoff);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Xatolik" }, { status: 500 });
    }
}
