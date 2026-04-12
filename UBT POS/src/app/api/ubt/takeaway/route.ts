export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

const METHOD_MAP: Record<string, string> = {
    cash: "Naqd pul",
    card: "Plastik karta",
    qr:   "QR kod",
};

async function resolveAuth(request: NextRequest): Promise<{ tenantId: string; waiterName?: string } | null> {
    try {
        const session = await getSession();
        if (session?.tenantId) return { tenantId: session.tenantId };
    } catch {}
    const auth = request.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET);
            if (payload.tenantId) return {
                tenantId: payload.tenantId as string,
                waiterName: payload.name as string | undefined,
            };
        } catch {}
    }
    return null;
}

// ─── GET /api/ubt/takeaway ─────────────────────────────────────────────────
// Returns today's takeaway orders (stored as Transactions with notes "Takeaway")
export async function GET(request: NextRequest) {
    try {
        const auth = await resolveAuth(request);
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

        const txs = await prisma.transaction.findMany({
            where: {
                tenantId: auth.tenantId,
                notes: { contains: "Olib ketish" },
                createdAt: { gte: todayStart },
            },
            include: { items: true },
            orderBy: { createdAt: "desc" },
            take: 200,
        });

        const orders = txs.map((tx, i) => ({
            id:     tx.id,
            num:    i + 1,
            total:  tx.amount,
            name:   tx.kassirName || "Noma'lum",
            phone:  (tx.notes?.match(/Tel:\s*([^|]+)/) ?? [])[1]?.trim() || "",
            time:   new Date(tx.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
            status: "done" as const,
            items:  tx.items.map(it => ({
                item: { id: it.productId || it.id, name: it.name, price: it.price, categoryId: "", inStock: true },
                qty:  it.quantity,
            })),
            paymentMethod: tx.method,
        }));

        return NextResponse.json({ orders });
    } catch (error) {
        console.error("[takeaway GET]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// ─── POST /api/ubt/takeaway ────────────────────────────────────────────────
// Creates a new paid takeaway order: Transaction + items + stock deduction
export async function POST(request: NextRequest) {
    try {
        const auth = await resolveAuth(request);
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { name, phone, items, paymentMethod, total, waiterName, customerId } = await request.json();
        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Items bo'sh" }, { status: 400 });
        }

        const grandTotal  = Math.round(Number(total) || 0);
        const methodName  = METHOD_MAP[paymentMethod] || paymentMethod || "Naqd pul";
        const kassirLabel = waiterName || auth.waiterName || "POS";
        const orderNum    = `TW-${Date.now().toString().slice(-6)}`;

        // 1. Transaction
        const tx = await prisma.transaction.create({
            data: {
                tenantId:   auth.tenantId,
                amount:     grandTotal,
                method:     methodName,
                status:     "completed",
                kassirName: kassirLabel,
                notes:      `Olib ketish: ${orderNum}${phone ? ` | Tel: ${phone}` : ""}${name ? ` | ${name}` : ""}`,
                customerId: customerId || null,
            },
        });

        // 2. Transaction items + stock deduction
        for (const ci of items as { item: any; qty: number }[]) {
            const itemName  = ci.item?.name || ci.item?.id;
            const itemPrice = Number(ci.item?.price ?? 0);
            const itemQty   = Number(ci.qty ?? 1);

            await prisma.transactionItem.create({
                data: {
                    transactionId: tx.id,
                    name:          itemName,
                    quantity:      itemQty,
                    price:         itemPrice,
                    discount:      0,
                    total:         itemPrice * itemQty,
                },
            });

            // Stock deduction
            try {
                const product = await prisma.product.findFirst({
                    where: { tenantId: auth.tenantId, name: itemName },
                });
                if (product && product.stock > 0) {
                    await prisma.product.update({
                        where: { id: product.id },
                        data:  { stock: Math.max(0, product.stock - itemQty) },
                    });
                    await prisma.inventoryExpenditure.create({
                        data: {
                            tenantId:      auth.tenantId,
                            date:          new Date(),
                            productId:     product.id,
                            productName:   product.name,
                            quantity:      itemQty,
                            unit:          product.unit || "dona",
                            reason:        "sale",
                            fromWarehouse: "Asosiy Ombor",
                            employee:      kassirLabel,
                            notes:         `Takeaway (${orderNum})`,
                        },
                    });
                }
            } catch (e) {
                console.warn("[takeaway stock]", e);
            }
        }

        return NextResponse.json({ success: true, transactionId: tx.id, orderNum }, { status: 201 });
    } catch (error) {
        console.error("[takeaway POST]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
