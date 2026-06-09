export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const items = await prisma.inventoryCount.findMany({
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
        const { date, productId, productName, systemStock, actualStock, unit, employee, warehouse, productType } = body;

        let pId = productId;
        let pName = productName || "NOMA'LUM";
        let pUnit = unit || "dona";
        const diff = Number(actualStock) - Number(systemStock);
        const isIngredient = productType === "xomashyo" || productType === "polfabrikat";
        // xomashyo uchun FK yo'q
        const countProductId = isIngredient ? null : (pId || null);

        if (productId) {
            if (isIngredient) {
                // UbtIngredient stock'ni haqiqiy qoldiqqa o'rnatish
                const ingRows: any[] = await prisma.$queryRawUnsafe(
                    "SELECT id, name, unit FROM UbtIngredient WHERE id=? AND tenantId=? LIMIT 1",
                    productId, session.tenantId
                );
                if (ingRows.length > 0) {
                    pName = ingRows[0].name;
                    pUnit = ingRows[0].unit;
                    await prisma.$executeRawUnsafe(
                        "UPDATE UbtIngredient SET stock=? WHERE id=? AND tenantId=?",
                        Number(actualStock), productId, session.tenantId
                    );
                }
            } else {
                // Product jadvalini haqiqiy qoldiqqa o'rnatish
                const product = await prisma.product.findUnique({
                    where: { id: productId, tenantId: session.tenantId }
                });
                if (product) {
                    pName = product.name;
                    pUnit = product.unit;
                    await prisma.product.update({
                        where: { id: productId },
                        data: { stock: Number(actualStock) }
                    });
                }
            }
        }

        const countDoc = await prisma.inventoryCount.create({
            data: {
                tenantId: session.tenantId,
                date: new Date(date || Date.now()),
                warehouse: warehouse || "Asosiy Ombor",
                productId: countProductId,
                productName: pName,
                systemStock: Number(systemStock),
                actualStock: Number(actualStock),
                difference: diff,
                unit: pUnit,
                employee: employee || session.userId || "Noma'lum",
                status: "completed"
            }
        });

        await prisma.auditLog.create({
            data: {
                tenantId: session.tenantId,
                user: session.userId,
                action: "INVENTORY_COUNT_CREATED",
                detail: `${pName} inventarizatsiya qilindi. Haqiqiy qoldiq: ${actualStock} ${pUnit} (Farq: ${diff})`,
                type: "update"
            }
        });

        return NextResponse.json(countDoc);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Xatolik" }, { status: 500 });
    }
}
