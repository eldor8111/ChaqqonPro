export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

async function getAuthTenantId(request: NextRequest): Promise<string | null> {
    try {
        const session = await getSession();
        if (session?.tenantId) return session.tenantId;
    } catch {}
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            if (payload.tenantId) return payload.tenantId as string;
        } catch {}
    }
    return null;
}

interface CartItem {
    name: string;
    qty: number;
    price: number;
}

const METHOD_MAP: Record<string, string> = {
    cash: "Naqd pul",
    card: "Plastik karta",
    qr:   "QR kod",
};

export async function POST(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { tableId, items, paymentMethod, total, waiterName, tableLabel, serviceFee, customerId, extraFeeAmount } =
            await request.json();

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "Buyurtma bo'sh" }, { status: 400 });
        }

        // ──────────────────────────────────────────────────────────────────────
        // CONFIRM (pending) — tasdiqlab, stol "band" bo'lsin
        // ──────────────────────────────────────────────────────────────────────
        if (paymentMethod === "pending") {
            if (tableId) {
                const runningTotal = Math.round(total || 0);
                const currentTable = await prisma.smartTable.findUnique({
                    where: { id: tableId, tenantId },
                    select: { amount: true, since: true },
                });
                const prevAmount = Number(currentTable?.amount ?? 0);
                await prisma.smartTable.update({
                    where: { id: tableId, tenantId },
                    data: {
                        status: "occupied",
                        amount: prevAmount + runningTotal,
                        waiter: waiterName || null,
                        since: currentTable?.since || new Date().toISOString(),
                    },
                });
            }
            return NextResponse.json({ success: true, action: "confirmed" });
        }

        // ──────────────────────────────────────────────────────────────────────
        // PAYMENT — to'lov, stol "free" bo'lsin + Transaction yaratilsin
        // ──────────────────────────────────────────────────────────────────────
        const grandTotal = extraFeeAmount !== undefined && extraFeeAmount !== null
            ? Math.round((total || 0) + Number(extraFeeAmount))
            : Math.round((total || 0) * (1 + (serviceFee ?? 0)));
        const methodName = METHOD_MAP[paymentMethod] || paymentMethod;

        if (paymentMethod === "qarz" || methodName === "qarz") {
            if (!customerId) {
                return NextResponse.json({ error: "Qarzga berish uchun ro'yxatdan mijoz tanlashingiz shart!" }, { status: 400 });
            }
        }

        // 1. Create Transaction
        const transaction = await prisma.transaction.create({
            data: {
                tenantId,
                amount: grandTotal,
                method: methodName,
                status: "completed",
                kassirName: waiterName || null,
                notes: tableLabel ? `EVIKO - ${tableLabel}` : "EVIKO",
                customerId: customerId || null,
            },
        });

        // 1.b Create Moliya Income record automatically
        await prisma.kassiHarakat.create({
            data: {
                tenantId,
                type: "income",
                category: "Sotuv tushumi",
                amount: grandTotal,
                description: `Sotuv ${tableLabel ? '(Stol: ' + tableLabel + ')' : '(POS Terminal)'}. Check: ${transaction.id.slice(-6)}`,
                paymentMethod: methodName,
                date: new Date(),
                createdBy: waiterName || "System",
            }
        });

        // 2. Create TransactionItems + 🔴 KALKULYATSIYA: Deduct ingredients from stock
        for (const item of items as CartItem[]) {
            const itemTotal = item.price * item.qty;
            await prisma.transactionItem.create({
                data: {
                    transactionId: transaction.id,
                    name: item.name,
                    quantity: item.qty,
                    price: item.price,
                    discount: 0,
                    total: itemTotal,
                },
            });

            // 🔴 KALKULYATSIYA — Find product and its recipes, then deduct stock
            try {
                const products: any[] = await prisma.$queryRawUnsafe(
                    `SELECT id, name, stock, unit, recipes, "autoCalculate" FROM "Product" WHERE "tenantId"=$1 AND name=$2 LIMIT 1`,
                    tenantId, item.name
                );
                const product = products[0] ?? null;

                if (product) {
                    // Deduct the product's own stock if it's a trackable item (mahsulot)
                    if (product.stock > 0) {
                        const newStock = Math.max(0, product.stock - item.qty);
                        await prisma.$executeRawUnsafe(
                            `UPDATE "Product" SET stock=$1 WHERE id=$2 AND "tenantId"=$3`,
                            newStock, product.id, tenantId
                        );

                        // Log as expenditure
                        await prisma.inventoryExpenditure.create({
                            data: {
                                tenantId,
                                date: new Date(),
                                productId: product.id,
                                productName: product.name,
                                quantity: item.qty,
                                unit: product.unit || "dona",
                                reason: "sale",
                                fromWarehouse: "Asosiy Ombor",
                                employee: waiterName || "POS",
                                notes: `Sotuv (${tableLabel || "Kassa"}): ${transaction.id.slice(-6)}`,
                            },
                        });
                    }

                    // 🟢 RETSEPT KALKULYATSIYASI — Xomashyo zaxirasini kamaytirish
                    const autoCalc = Number(product.autoCalculate) !== 0;
                    if (autoCalc && product.recipes) {
                        let parsedRecipes: { xomashyoId: string; amount: number }[] = [];
                        try { parsedRecipes = JSON.parse(product.recipes); } catch {}

                        for (const recipe of parsedRecipes) {
                            if (!recipe.xomashyoId || !recipe.amount) continue;
                            const totalDeduct = recipe.amount * item.qty;
                            try {
                                // Mavjud zaxirani tekshirish
                                const ingRows: any[] = await prisma.$queryRawUnsafe(
                                    `SELECT id, stock, unit, name FROM "UbtIngredient" WHERE id=$1 AND "tenantId"=$2 LIMIT 1`,
                                    recipe.xomashyoId, tenantId
                                );
                                if (ingRows.length > 0) {
                                    const ing = ingRows[0];
                                    const newIngStock = Math.max(0, Number(ing.stock) - totalDeduct);
                                     await prisma.$executeRawUnsafe(
                                        `UPDATE "UbtIngredient" SET stock=$1 WHERE id=$2 AND "tenantId"=$3`,
                                        newIngStock, ing.id, tenantId
                                    );

                                    // Xomashyo ishlatilganligi haqida hisobot (Chiqim)
                                    await prisma.inventoryExpenditure.create({
                                        data: {
                                            tenantId,
                                            date: new Date(),
                                            productId: null, // Xomashyo uchun null qo'yamiz (InventoryExpenditure Product ga bog'langan)
                                            productName: ing.name,
                                            quantity: totalDeduct,
                                            unit: ing.unit || "kg",
                                            reason: "sale",
                                            fromWarehouse: "Oshxona Ombori", // Odatda taomlar oshxonadan chiqadi
                                            employee: waiterName || "POS",
                                            notes: `Retsept bo'yicha: ${product.name} (Sotuv: ${transaction.id.slice(-6)})`,
                                        },
                                    });
                                }
                            } catch (ingErr) {
                                console.error("[Retsept] Ingredient stock deduction error:", ingErr);
                            }
                        }
                    }
                }
            } catch (ingredientErr) {
                // Don't fail the payment if ingredient deduction fails
                console.error("[Kalkulyatsiya] Ingredient deduction error:", ingredientErr);
            }
        }

        // 3. Mark KDS orders as served
        if (tableId) {
            // Table order: mark ALL KDS orders for this table as served
            await prisma.kDSOrder.updateMany({
                where: { tenantId, tableId, status: { not: "served" } },
                data: { status: "served", completedAt: new Date() },
            });
        } else {
            // Kassa (cashier) mode: no tableId — clean up any stale cart orders
            // that contain the items being paid for, to prevent product-edit blocks
            const itemNames = new Set((items as CartItem[]).map(i => i.name));
            const staleCarts = await prisma.kDSOrder.findMany({
                where: { tenantId, status: "pending", priority: "cart" },
                select: { id: true, description: true },
            });
            const staleIds: string[] = [];
            for (const cart of staleCarts) {
                try {
                    const parsed: any[] = JSON.parse(cart.description);
                    const hasItem = parsed.some((ci: any) =>
                        itemNames.has(ci.item?.name ?? ci.name ?? "")
                    );
                    if (hasItem) staleIds.push(cart.id);
                } catch {}
            }
            if (staleIds.length > 0) {
                await prisma.kDSOrder.updateMany({
                    where: { id: { in: staleIds } },
                    data: { status: "served", completedAt: new Date() },
                });
            }
        }

        // 4. Free the table
        if (tableId) {
            await prisma.smartTable.update({
                where: { id: tableId, tenantId },
                data: { status: "free", amount: 0, order: null, since: null, waiter: null },
            });
        }

        return NextResponse.json({
            success: true,
            transactionId: transaction.id,
            amount: grandTotal,
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[pay]", msg);
        return NextResponse.json({ error: "To'lov amalga oshirishda xatolik yuz berdi" }, { status: 500 });
    }
}
