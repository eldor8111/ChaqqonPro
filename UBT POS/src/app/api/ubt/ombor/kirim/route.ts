import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const receipts = await prisma.inventoryReceipt.findMany({
            where: { tenantId: session.tenantId },
            orderBy: { createdAt: "desc" },
            include: { product: true }
        });

        return NextResponse.json(receipts);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Xatolik yuz berdi" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { date, supplier, warehouse, notes, status, currency, items } = body;

        const createdReceipts = [];

        for (const item of items) {
            let pId = item.productId;
            let pName = item.productName || "Noma'lum";
            let pUnit = item.unit || "dona";
            const qty = Number(item.quantity) || 0;
            const cost = Number(item.costPrice) || 0;

            if (pId) {
                const existingProduct = await prisma.product.findUnique({
                    where: { id: pId, tenantId: session.tenantId }
                });
                if (existingProduct && status === 'accepted') {
                    pName = existingProduct.name;
                    pUnit = existingProduct.unit;
                    await prisma.product.update({
                        where: { id: pId },
                        data: { 
                            stock: existingProduct.stock + qty,
                            costPrice: cost
                        }
                    });
                }
            }

            const receipt = await prisma.inventoryReceipt.create({
                data: {
                    tenantId: session.tenantId,
                    date: new Date(date || Date.now()),
                    supplier: supplier || "Noma'lum",
                    productId: pId,
                    productName: pName,
                    quantity: qty,
                    unit: pUnit,
                    costPrice: cost,
                    totalCost: qty * cost,
                    warehouse: warehouse || "Asosiy Ombor",
                    notes: `${notes || ''} ${currency ? `(Valyuta: ${currency})` : ''}`,
                    status: status || "accepted",
                    registeredAt: new Date(),
                    acceptedAt: status === 'accepted' ? new Date() : null
                }
            });
            createdReceipts.push(receipt);

            await prisma.auditLog.create({
                data: {
                    tenantId: session.tenantId,
                    user: session.userId,
                    action: "INVENTORY_RECEIPT_CREATED",
                    detail: `${pName} qabul qilindi. Miqdori: ${qty} ${pUnit}`,
                    type: "create"
                }
            });
        }

        return NextResponse.json({ success: true, receipts: createdReceipts });
    } catch (e: any) {
        console.error("Kirim Error:", e);
        return NextResponse.json({ error: "Xatolik yuz berdi" }, { status: 500 });
    }
}
