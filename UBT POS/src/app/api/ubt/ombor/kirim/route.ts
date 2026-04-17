export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

// ─── Ensure extra columns exist ──────────────────────────────────────────────
const _ensureReceiptFields = async () => {
    try { await prisma.$executeRawUnsafe(`ALTER TABLE InventoryReceipt ADD COLUMN currency TEXT DEFAULT 'UZS'`); } catch (e) {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE InventoryReceipt ADD COLUMN invoiceNo TEXT`); } catch (e) {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE InventoryReceipt ADD COLUMN documentId TEXT`); } catch (e) {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE InventoryReceipt ADD COLUMN costPriceUzs REAL DEFAULT 0`); } catch (e) {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE InventoryReceipt ADD COLUMN totalCostUzs REAL DEFAULT 0`); } catch (e) {}
};
_ensureReceiptFields();

// ─── Helper: get usdRate for tenant ──────────────────────────────────────────
async function getUsdRate(tenantId: string): Promise<number> {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant?.settings) {
            const s = JSON.parse(tenant.settings);
            if (s.usdRate) return Number(s.usdRate);
        }
    } catch {}
    return 12500;
}

function toUzs(amount: number, currency: string, usdRate: number): number {
    if (currency === "USD") return amount * usdRate;
    if (currency === "EUR") return amount * usdRate * 1.08;
    return amount;
}

// ─── GET: Return receipts grouped by documentId ───────────────────────────────
export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all rows with extra columns
        const rows: any[] = await prisma.$queryRawUnsafe(`
            SELECT ir.*, p.name as pName
            FROM InventoryReceipt ir
            LEFT JOIN Product p ON ir.productId = p.id
            WHERE ir.tenantId = ?
            ORDER BY ir.createdAt DESC
        `, session.tenantId);

        // Group by documentId (fall back to id if no documentId)
        const docsMap = new Map<string, any>();
        for (const r of rows) {
            const docKey = r.documentId || r.id;
            if (!docsMap.has(docKey)) {
                docsMap.set(docKey, {
                    id: docKey,
                    documentId: docKey,
                    invoiceNo: r.invoiceNo,
                    supplier: r.supplier,
                    warehouse: r.warehouse,
                    currency: r.currency || "UZS",
                    notes: r.notes,
                    status: r.status,
                    createdAt: r.createdAt,
                    items: [],
                    totalCost: 0,
                    totalCostUzs: 0,
                    totalQuantity: 0,
                });
            }
            const doc = docsMap.get(docKey);
            doc.items.push({
                id: r.id,
                productId: r.productId,
                productName: r.productName,
                quantity: Number(r.quantity),
                unit: r.unit,
                costPrice: Number(r.costPrice),
                costPriceUzs: Number(r.costPriceUzs || 0),
                totalCost: Number(r.totalCost),
                totalCostUzs: Number(r.totalCostUzs || 0),
            });
            doc.totalCost += Number(r.totalCost || 0);
            doc.totalCostUzs += Number(r.totalCostUzs || r.totalCost || 0);
            doc.totalQuantity += Number(r.quantity || 0);
        }

        return NextResponse.json(Array.from(docsMap.values()));
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Xatolik yuz berdi" }, { status: 500 });
    }
}

// ─── POST: Create grouped kirim document ──────────────────────────────────────
export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { date, supplier, warehouse, notes, status, currency, invoiceNo, items } = body;

        // Get usdRate for currency conversion
        const usdRate = await getUsdRate(session.tenantId);

        // Generate ONE documentId for all items in this batch
        const documentId = Math.random().toString(36).slice(2, 14) + Date.now().toString(36);

        const createdReceipts: any[] = [];

        for (const item of items) {
            let pId = item.productId;
            let pName = item.productName || "Noma'lum";
            let pUnit = item.unit || "dona";
            const qty = Number(item.quantity) || 0;
            const cost = Number(item.costPrice) || 0;
            const costUzs = toUzs(cost, currency || "UZS", usdRate);
            const totalUzs = qty * costUzs;
            const pType = item.productType || "";

            if (pId) {
                // Mahsulot (Product jadvali)
                if (pType === "mahsulot" || pType === "taom" || !pType) {
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
                                costPrice: costUzs  // UZS ga o'tkazilgan narx
                            }
                        });
                    }
                }

                // Xomashyo / Polfabrikat
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
                                newStock, costUzs, pId, session.tenantId
                            );
                        }
                    } catch (e) {
                        console.error("UbtIngredient stock update error:", e);
                    }
                }
            }

            const receiptProductId = (pType === "xomashyo" || pType === "polfabrikat") ? null : pId;

            const receipt = await prisma.inventoryReceipt.create({
                data: {
                    tenantId: session.tenantId,
                    date: new Date(date || Date.now()),
                    supplier: supplier || "Noma'lum",
                    productId: receiptProductId,
                    productName: pName,
                    quantity: qty,
                    unit: pUnit,
                    costPrice: cost,       // Original valyutada
                    totalCost: qty * cost, // Original valyutada
                    warehouse: warehouse || "Asosiy Ombor",
                    notes: notes || null,
                    status: status || "accepted",
                    registeredAt: new Date(),
                    acceptedAt: status === 'accepted' ? new Date() : null
                }
            });

            // Raw SQL orqali qo'shimcha ustunlarni yangilaymiz
            await prisma.$executeRawUnsafe(
                `UPDATE InventoryReceipt SET currency=?, invoiceNo=?, documentId=?, costPriceUzs=?, totalCostUzs=? WHERE id=?`,
                currency || "UZS", invoiceNo || null, documentId,
                costUzs, totalUzs,
                receipt.id
            );

            createdReceipts.push({ ...receipt, costPriceUzs: costUzs, totalCostUzs: totalUzs });
        }

        // Auto-generate Moliya Expense — UZS da saqlash
        if (status === "accepted") {
            const totalUzsAll = createdReceipts.reduce((sum, r) => sum + (r.totalCostUzs || 0), 0);
            if (totalUzsAll > 0) {
                await prisma.kassiHarakat.create({
                    data: {
                        tenantId: session.tenantId,
                        type: "expense",
                        category: "Bozor-ochar (xomashyo)",
                        amount: totalUzsAll,
                        description: `Ombor kirimi (${currency || "UZS"}, kurs: ${usdRate}) — ${supplier || "Noma'lum"}`,
                        paymentMethod: "Naqd pul",
                        date: new Date(date || Date.now()),
                        createdBy: session.userId || "System",
                        kontragent: supplier || null
                    }
                });
            }
        }

        await prisma.auditLog.create({
            data: {
                tenantId: session.tenantId,
                user: session.userId,
                action: "INVENTORY_RECEIPT_CREATED",
                detail: `${createdReceipts.length} ta mahsulot qabul qilindi. Valyuta: ${currency || "UZS"}`,
                type: "create"
            }
        });

        return NextResponse.json({ success: true, documentId, count: createdReceipts.length });
    } catch (e: any) {
        console.error("Kirim Error:", e);
        return NextResponse.json({ error: "Xatolik yuz berdi" }, { status: 500 });
    }
}

// ─── DELETE: O'chirish (documentId yoki ids massivi) ──────────────────────────
export async function DELETE(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        // documentId orqali butun hujjatni o'chirish
        if (body.documentId) {
            const rows: any[] = await prisma.$queryRawUnsafe(
                `SELECT id FROM InventoryReceipt WHERE documentId=? AND tenantId=?`,
                body.documentId, session.tenantId
            );
            for (const r of rows) {
                await prisma.inventoryReceipt.delete({ where: { id: r.id } });
            }
            return NextResponse.json({ success: true, deleted: rows.length });
        }

        // ids massiv orqali o'chirish
        const ids: string[] = body.ids || (body.id ? [body.id] : []);
        if (!ids.length) return NextResponse.json({ error: "id(lar) majburiy" }, { status: 400 });

        const owned: any[] = await prisma.$queryRawUnsafe(
            `SELECT id FROM InventoryReceipt WHERE tenantId=? AND id IN (${ids.map(() => "?").join(",")})`,
            session.tenantId, ...ids
        );

        for (const r of owned) {
            await prisma.inventoryReceipt.delete({ where: { id: r.id } });
        }

        return NextResponse.json({ success: true, deleted: owned.length });
    } catch (e: any) {
        console.error("Kirim DELETE error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
