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

        const { tableId, items, paymentMethod, total, waiterName, tableLabel, serviceFee, customerId } =
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
                const currentTable = await prisma.ubtTable.findUnique({
                    where: { id: tableId, tenantId },
                    select: { amount: true, since: true },
                });
                const prevAmount = Number(currentTable?.amount ?? 0);
                await prisma.ubtTable.update({
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
        const grandTotal = Math.round((total || 0) * (1 + (serviceFee ?? 0)));
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
                notes: tableLabel ? `UBT - ${tableLabel}` : "UBT",
                customerId: customerId || null,
            },
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
                const product = await prisma.product.findFirst({
                    where: { tenantId, name: item.name },
                });

                if (product) {
                    // Deduct the product's own stock if it's a trackable item (mahsulot)
                    if (product.stock > 0) {
                        const newStock = Math.max(0, product.stock - item.qty);
                        await prisma.product.update({
                            where: { id: product.id },
                            data: { stock: newStock },
                        });

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
                }
            } catch (ingredientErr) {
                // Don't fail the payment if ingredient deduction fails
                console.error("[Kalkulyatsiya] Ingredient deduction error:", ingredientErr);
            }
        }

        // 3. Mark KDS orders as served for this table
        if (tableId) {
            await prisma.kDSOrder.updateMany({
                where: { tenantId, tableId, status: { not: "served" } },
                data: { status: "served", completedAt: new Date() },
            });
        }

        // 4. Free the table
        if (tableId) {
            await prisma.ubtTable.update({
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
