export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

// ─── Auth helper (cookie session OR JWT bearer) ───────────────────────────────
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

// ─── GET /api/ubt/orders-db?tableId=xxx ────────────────────────────────────
// Returns active (non-served) cart items for a specific table from DB
export async function GET(request: NextRequest) {
    try {
        const auth = await resolveAuth(request);
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const tableId = searchParams.get("tableId");

        if (!tableId) return NextResponse.json({ items: [] });

        // Find latest active KDS order for this table that stores cart JSON
        const kdsOrders = await prisma.kDSOrder.findMany({
            where: {
                tenantId: auth.tenantId,
                tableId,
                status: { not: "served" },
                priority: "cart", // distinguish cart-storage orders from kitchen display orders
            },
            orderBy: { createdAt: "desc" },
        });

        // Merge all cart items from all active KDS cart orders
        const allItems: any[] = [];
        for (const ord of kdsOrders) {
            try {
                const parsed = JSON.parse(ord.description);
                // Support both old format (plain array) and new format ({waiterName, items})
                const items = Array.isArray(parsed) ? parsed : (parsed.items ?? []);
                if (Array.isArray(items)) allItems.push(...items);
            } catch {}
        }

        // Deduplicate by item.id + saboy + shotId, summing quantities
        const merged: Record<string, any> = {};
        for (const entry of allItems) {
            const id = entry.item?.id || entry.id;
            if (!id) continue;
            const key = `${id}-${!!entry.isSaboy}-${entry.shotId || 1}`;
            if (merged[key]) {
                merged[key].qty = (merged[key].qty || 0) + (entry.qty || 1);
            } else {
                merged[key] = { ...entry };
            }
        }

        return NextResponse.json({ items: Object.values(merged) });
    } catch (error) {
        console.error("[orders-db GET]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// ─── POST /api/ubt/orders-db ──────────────────────────────────────────────
// Saves confirmed cart items to DB so both admin and other POS sessions can see them
// Also sends a "pending" payment to mark the table as occupied
export async function POST(request: NextRequest) {
    try {
        const auth = await resolveAuth(request);
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { tableId, items, waiterName, replace, shotId } = await request.json();
        if (!tableId || !Array.isArray(items)) {
            return NextResponse.json({ error: "tableId va items kerak" }, { status: 400 });
        }

        // If replace=true, clear previous cart orders first
        if (replace) {
            await prisma.kDSOrder.deleteMany({
                where: { tenantId: auth.tenantId, tableId, priority: "cart", status: { not: "served" } },
            });
        }

        // Count previous orders to determine suffix (A, B, C)
        const pendingCount = await prisma.kDSOrder.count({
            where: { tenantId: auth.tenantId, tableId, status: "pending" },
        });
        
        const suffixMap = ["", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"];
        const suffix = suffixMap[Math.min(pendingCount, suffixMap.length - 1)] || "";

        // Save cart as a new KDS order with priority="cart"
        // description format: JSON with waiterName + items + suffix + shotId
        const descPayload = JSON.stringify({ waiterName: waiterName || auth.waiterName || "", items, suffix, shotId: shotId || 1 });
        const order = await prisma.kDSOrder.create({
            data: {
                tenantId: auth.tenantId,
                tableId,
                description: descPayload,
                status: "pending",
                priority: "cart",
            },
        });

        // Calculate running total from items
        const runningTotal = items.reduce((sum: number, ci: any) => {
            const price = ci.item?.price ?? ci.price ?? 0;
            const qty = ci.qty ?? 1;
            return sum + price * qty;
        }, 0);

        // Update table: mark as occupied, add to amount, set waiter
        const currentTable = await prisma.ubtTable.findUnique({
            where: { id: tableId, tenantId: auth.tenantId },
            select: { name: true, amount: true, since: true, status: true },
        });
        if (currentTable) {
            const prevAmount = Number(currentTable.amount ?? 0);
            await prisma.ubtTable.update({
                where: { id: tableId, tenantId: auth.tenantId },
                data: {
                    status: "occupied",
                    amount: prevAmount + Math.round(runningTotal),
                    waiter: waiterName || undefined,
                    since: currentTable.since || new Date().toISOString(),
                },
            });
        }

        // --- AUTO-PRINT KITCHEN RECEIPT FOR DINE-IN ORDERS ---
        try {
            const itemIds = items.map((c: any) => c.item?.id || c.id).filter(Boolean);
            const products = await prisma.product.findMany({
                where: { tenantId: auth.tenantId, id: { in: itemIds } },
                select: { id: true, printerIp: true },
            });
            const printerIpMap = new Map<string, string | null>();
            products.forEach(p => printerIpMap.set(p.id, p.printerIp));

            const printerGroups: Record<string, any[]> = {};
            for (const c of items) {
                const id = c.item?.id || c.id;
                const ip = printerIpMap.get(id);
                if (ip) {
                    if (!printerGroups[ip]) printerGroups[ip] = [];
                    printerGroups[ip].push(c);
                }
            }

            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            // Build table label: "Stol 5", or "Stol 5 - 2-Hisob" if shotId > 1, + suffix
            const baseTableName = currentTable ? currentTable.name : "Noma'lum stol";
            const shotLabel = (shotId && shotId > 1) ? ` · ${shotId}-Hisob` : "";
            const suffixLabel = suffix ? `-${suffix}` : "";
            const tableNameToPrint = baseTableName + suffixLabel + shotLabel;

            import("@/lib/services/PrinterService").then(m => {
                for (const [printerIp, pItems] of Object.entries(printerGroups)) {
                    const printItems = pItems.map((c: any) => ({
                        name: c.item?.name || c.name || "",
                        qty: c.qty || 1,
                        price: c.item?.price || c.price || 0,
                        unit: c.item?.unit || c.unit || "ta",
                    }));
                    const total = printItems.reduce((s, c) => s + c.price * c.qty, 0);

                    m.PrinterService.print({
                        printerIp, port: 9100, receiptType: "kitchen", tableName: tableNameToPrint, time: timeStr,
                        items: printItems, total,
                        orderNum: order.id,
                    }).catch(e => console.warn("[Auto Kitchen Print Error]", e));
                }
            }).catch(() => {});
        } catch (printErr) {
            console.error("[orders-db Kitchen Print Error]", printErr);
        }

        return NextResponse.json({ success: true, orderId: order.id, suffix });
    } catch (error) {
        console.error("[orders-db POST]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// ─── PUT /api/ubt/orders-db ──────────────────────────────────────────────
// Replaces the entire cart for a table and recalculates the total. Used for editing confirmed orders natively from the table view.
export async function PUT(request: NextRequest) {
    try {
        const auth = await resolveAuth(request);
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { tableId, items, waiterName } = await request.json();
        if (!tableId || !Array.isArray(items)) {
            return NextResponse.json({ error: "tableId va items kerak" }, { status: 400 });
        }

        // Delete previous cart orders
        await prisma.kDSOrder.deleteMany({
            where: { tenantId: auth.tenantId, tableId, priority: "cart", status: { not: "served" } },
        });

        if (items.length > 0) {
            // Save cart as a new KDS order with priority="cart"
            await prisma.kDSOrder.create({
                data: {
                    tenantId: auth.tenantId,
                    tableId,
                    description: JSON.stringify(items),
                    status: "pending",
                    priority: "cart",
                },
            });
        }

        // Calculate running total from items
        const runningTotal = items.reduce((sum: number, ci: any) => {
            const price = ci.item?.price ?? ci.price ?? 0;
            const qty = ci.qty ?? 1;
            return sum + price * qty;
        }, 0);

        // Update table: mark as occupied or free if empty, OVERWRITE amount to runningTotal
        const currentTable = await prisma.ubtTable.findUnique({
            where: { id: tableId, tenantId: auth.tenantId },
            select: { since: true, status: true },
        });

        if (currentTable) {
            await prisma.ubtTable.update({
                where: { id: tableId, tenantId: auth.tenantId },
                data: {
                    status: items.length > 0 ? "occupied" : "free",
                    amount: Math.round(runningTotal),
                    waiter: waiterName || undefined,
                    since: items.length > 0 ? (currentTable.since || new Date().toISOString()) : null,
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[orders-db PUT]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// ─── DELETE /api/ubt/orders-db?tableId=xxx ────────────────────────────────
// Called after payment or transfer: marks cart KDS orders as "served" (keeps for stats)
export async function DELETE(request: NextRequest) {
    try {
        const auth = await resolveAuth(request);
        if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const tableId = searchParams.get("tableId");
        if (!tableId) return NextResponse.json({ error: "tableId kerak" }, { status: 400 });

        // Mark cart KDS orders as "served" (do NOT delete — needed for waiter stats)
        await prisma.kDSOrder.updateMany({
            where: {
                tenantId: auth.tenantId,
                tableId,
                priority: "cart",
                status: { not: "served" },
            },
            data: {
                status: "served",
                completedAt: new Date(),
            },
        });

        // Also free the table so it doesn't stay "occupied" visually
        await prisma.ubtTable.updateMany({
            where: { id: tableId, tenantId: auth.tenantId },
            data: { status: "free", amount: 0, since: null },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[orders-db DELETE]", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
