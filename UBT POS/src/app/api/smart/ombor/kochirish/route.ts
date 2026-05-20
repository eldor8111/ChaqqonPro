export const dynamic = 'force-dynamic';
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
        const { date, productId, productName, quantity, unit, fromWarehouse, toWarehouse, employee, notes, productType } = body;

        let pId = productId;
        let pName = productName || "NOMA'LUM";
        let pUnit = unit || "dona";
        const qty = Number(quantity);
        const isIngredient = productType === "xomashyo" || productType === "polfabrikat";
        // xomashyo uchun FK yo'q — productId null
        const transferProductId = isIngredient ? null : (pId || null);

        if (productId) {
            if (isIngredient) {
                // UbtIngredient jadvalidan ma'lumot olish va stock ayirish (sodda bir-ombor tizimi)
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
                // Product jadvalidan ma'lumot olish
                const product = await prisma.product.findUnique({
                    where: { id: productId, tenantId: session.tenantId }
                });
                if (product) {
                    pName = product.name;
                    pUnit = product.unit;
                    // Product uchun ham stock ayirish
                    await prisma.product.update({
                        where: { id: productId },
                        data: { stock: Math.max(0, product.stock - qty) }
                    });
                }
            }
        }

        const transfer = await prisma.inventoryTransfer.create({
            data: {
                tenantId: session.tenantId,
                date: new Date(date || Date.now()),
                productId: transferProductId,
                productName: pName,
                quantity: qty,
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
