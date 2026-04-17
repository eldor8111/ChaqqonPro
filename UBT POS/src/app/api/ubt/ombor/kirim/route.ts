export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

const _ensureReceiptFields = async () => {
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE InventoryReceipt ADD COLUMN currency TEXT DEFAULT 'UZS'`);
    } catch (e) {}
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE InventoryReceipt ADD COLUMN invoiceNo TEXT`);
    } catch (e) {}
};
_ensureReceiptFields();

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const receipts = await prisma.$queryRawUnsafe(`
            SELECT ir.*, p.name as pName 
            FROM InventoryReceipt ir 
            LEFT JOIN Product p ON ir.productId = p.id
            WHERE ir.tenantId = ? 
            ORDER BY ir.createdAt DESC
        `, session.tenantId) as any[];

        const formatted = receipts.map(r => ({
            ...r,
            product: r.pName ? { name: r.pName } : null
        }));

        return NextResponse.json(formatted);
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
        const { date, supplier, warehouse, notes, status, currency, invoiceNo, items } = body;

        const createdReceipts = [];

        for (const item of items) {
            let pId = item.productId;
            let pName = item.productName || "Noma'lum";
            let pUnit = item.unit || "dona";
            const qty = Number(item.quantity) || 0;
            const cost = Number(item.costPrice) || 0;

            const pType = item.productType || "";

            if (pId) {
                // Mahsulot (Product jadvali) — stockni yangilash
                if (pType === "mahsulot" || pType === "taom" || (!pType)) {
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

                // Xomashyo / Polfabrikat (UbtIngredient jadvali) — stockni yangilash
                if (pType === "xomashyo" || pType === "polfabrikat") {
                    try {
                        const ingRows: any[] = await prisma.$queryRawUnsafe(
                            "SELECT id, name, unit, stock FROM UbtIngredient WHERE id=? AND tenantId=? LIMIT 1",
                            pId, session.tenantId
                        );
                        if (ingRows.length > 0 && status === 'accepted') {
                            pName = ingRows[0].name;
                            pUnit = ingRows[0].unit;
                            const newStock = Number(ingRows[0].stock || 0) + qty;
                            await prisma.$executeRawUnsafe(
                                "UPDATE UbtIngredient SET stock=?, price=? WHERE id=? AND tenantId=?",
                                newStock, cost, pId, session.tenantId
                            );
                        }
                    } catch (ingErr) {
                        console.error("UbtIngredient stock update error:", ingErr);
                    }
                }
            }

            // Xomashyo va polfabrikat uchun productId NULL — FK constraint yo'q
            const receiptProductId = (pType === "xomashyo" || pType === "polfabrikat") ? null : pId;
            const notesStr = [
                notes || "",
                currency ? `Valyuta: ${currency}` : "",
                pType ? `Tur: ${pType}` : "",
            ].filter(Boolean).join(" | ");

            const receipt = await prisma.inventoryReceipt.create({
                data: {
                    tenantId: session.tenantId,
                    date: new Date(date || Date.now()),
                    supplier: supplier || "Noma'lum",
                    productId: receiptProductId,
                    productName: pName,
                    quantity: qty,
                    unit: pUnit,
                    costPrice: cost,
                    totalCost: qty * cost,
                    warehouse: warehouse || "Asosiy Ombor",
                    notes: notesStr || null,
                    status: status || "accepted",
                    registeredAt: new Date(),
                    acceptedAt: status === 'accepted' ? new Date() : null
                }
            });

            await prisma.$executeRawUnsafe(
                `UPDATE InventoryReceipt SET currency = ?, invoiceNo = ? WHERE id = ?`,
                currency || "UZS", invoiceNo || null, receipt.id
            );

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

        // Auto-generate Moliya Expense (Kassa) if accepted
        if (status === "accepted") {
            const totalKirimCost = createdReceipts.reduce((sum, r) => sum + Number(r.totalCost || 0), 0);
            if (totalKirimCost > 0) {
                await prisma.kassiHarakat.create({
                    data: {
                        tenantId: session.tenantId,
                        type: "expense",
                        category: "Bozor-ochar (xomashyo)",
                        amount: totalKirimCost,
                        description: `Ombor kirimi uchun xarajat (Yetkazib beruvchi: ${supplier || "Noma'lum"})`,
                        paymentMethod: "Naqd pul",
                        date: new Date(date || Date.now()),
                        createdBy: session.userId || "System",
                        kontragent: supplier || null
                    }
                });
            }
        }

        return NextResponse.json({ success: true, receipts: createdReceipts });
    } catch (e: any) {
        console.error("Kirim Error:", e);
        return NextResponse.json({ error: "Xatolik yuz berdi" }, { status: 500 });
    }
}
