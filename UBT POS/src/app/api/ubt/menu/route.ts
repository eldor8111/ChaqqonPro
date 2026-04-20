export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

async function getAuthTenantId(request: NextRequest): Promise<string | null> {
    // 1. Try cookie session (admin dashboard)
    try {
        const cookieSession = await getSession();
        if (cookieSession?.tenantId) return cookieSession.tenantId;
    } catch {}

    // 2. Try Bearer token (POS terminal)
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
            if (payload.tenantId) return payload.tenantId as string;
        } catch {}
    }
    return null;
}

// Module-level: runs once when server starts, never blocks individual requests.
const _ensurePrinterIpColumn = prisma
    .$executeRawUnsafe(`ALTER TABLE Product ADD COLUMN printerIp TEXT`)
    .catch(() => {})
    .then(() => prisma.$executeRawUnsafe(`ALTER TABLE Product ADD COLUMN isSetMenu INTEGER DEFAULT 0`)).catch(() => {})
    .then(() => prisma.$executeRawUnsafe(`ALTER TABLE Product ADD COLUMN modifiers TEXT`)).catch(() => {})
    .then(() => prisma.$executeRawUnsafe(`ALTER TABLE Product ADD COLUMN type TEXT DEFAULT 'taom'`)).catch(() => {})
    .then(() => prisma.$executeRawUnsafe(`ALTER TABLE Product ADD COLUMN warehouse TEXT`)).catch(() => {});


async function isProductInActiveOrder(tenantId: string, productName: string, productId?: string) {
    // ─── 1. Check only CART KDS orders that are still PENDING ────────────────
    // priority="cart" = actual table cart orders (not kitchen display items)
    // We also cross-check the table is still "occupied" to avoid stale records
    const activeCarts = await prisma.kDSOrder.findMany({
        where: {
            tenantId,
            status: "pending",
            priority: "cart",
        },
        select: { id: true, description: true, tableId: true },
    });

    // Collect occupied table IDs for cross-validation
    const occupiedTableIds = new Set<string>();
    const tableIds = activeCarts.map(c => c.tableId).filter(Boolean) as string[];
    if (tableIds.length > 0) {
        const occupiedTables = await prisma.ubtTable.findMany({
            where: { tenantId, id: { in: tableIds }, status: "occupied" },
            select: { id: true },
        });
        occupiedTables.forEach(t => occupiedTableIds.add(t.id));
    }

    // ─── Auto-cleanup: mark stale cart records as "served" ───────────────────
    // A cart is stale if its table exists but is no longer "occupied"
    const staleCartIds = activeCarts
        .filter(c => c.tableId && !occupiedTableIds.has(c.tableId))
        .map(c => c.id);
    if (staleCartIds.length > 0) {
        prisma.kDSOrder.updateMany({
            where: { id: { in: staleCartIds } },
            data: { status: "served", completedAt: new Date() },
        }).catch(() => {}); // fire-and-forget, don't block the request
    }

    // ─── Check remaining truly active carts ──────────────────────────────────
    const genuineActiveCarts = activeCarts.filter(
        c => !c.tableId || occupiedTableIds.has(c.tableId)
    );

    for (const kds of genuineActiveCarts) {
        if (kds.description) {
            try {
                const parsed = JSON.parse(kds.description);
                if (Array.isArray(parsed)) {
                    if (parsed.some((i: any) =>
                        (i.item?.name === productName) ||
                        (i.name === productName) ||
                        (productId && i.item?.id === productId) ||
                        (productId && i.id === productId)
                    )) {
                        return true;
                    }
                }
            } catch {
                if (kds.description.includes(productName)) return true;
            }
        }
    }

    // ─── 2. Check active deliveries ──────────────────────────────────────────
    const activeDeliveries = await prisma.deliveryOrder.findMany({
        where: { tenantId, status: { in: ["new", "assigned", "on_the_way"] } },
        select: { items: true },
    });
    for (const d of activeDeliveries) {
        if (d.items) {
            try {
                const parsed = JSON.parse(d.items);
                if (parsed.some((i: any) => i.name === productName || (productId && i.id === productId))) {
                    return true;
                }
            } catch {}
        }
    }
    return false;
}

// GET - fetch menu items for POS (or all products for kirim with ?all=1)
export async function GET(request: NextRequest) {
    await _ensurePrinterIpColumn; // resolves instantly after first run
    try {
        let tenantId: string | null = await getAuthTenantId(request);

        // POS fallback logic removed to prevent cross-tenant data leaks. If token fails, require login.

        if (!tenantId) {
            return NextResponse.json({ categories: [], items: [], cancelCode: "" });
        }

        // ?all=1 => kirim sahifasi uchun: barcha productlarni qaytarish (type filtrsiz)
        const returnAll = request.nextUrl.searchParams.get("all") === "1";

        let cancelCode = "";
        let paymentMethods: any[] = [];
        if (!returnAll) {
            const tObj = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
            if (tObj?.settings) {
                try {
                    const parsed = JSON.parse(tObj.settings as string);
                    if (parsed.cancelCode) cancelCode = parsed.cancelCode;
                    if (parsed.paymentMethods) paymentMethods = parsed.paymentMethods;
                } catch {}
            }
        }

        const products2: any[] = await prisma.$queryRawUnsafe(
            `SELECT id, name, category, sellingPrice, costPrice, stock, unit,
                    COALESCE(type, 'taom') as type,
                    COALESCE(warehouse, '') as warehouse,
                    CASE WHEN image IS NOT NULL THEN image ELSE NULL END as image,
                    CASE WHEN printerIp IS NOT NULL THEN printerIp ELSE NULL END as printerIp,
                    isSetMenu, modifiers
             FROM Product WHERE tenantId = ? ORDER BY category ASC, name ASC`,
            tenantId
        );

        // Fetch explicit categories
        let explicitCategories: any[] = [];
        try {
            explicitCategories = await prisma.$queryRawUnsafe(
                `SELECT id, name FROM UbtCategory WHERE tenantId=? ORDER BY createdAt ASC`, 
                tenantId
            );
        } catch {
            // Table might not exist yet if they haven't visited Kategoriya panel
        }

        const productCategoryNames = Array.from(new Set(products2.map((p: any) => p.category).filter(Boolean)));
        const stableId = (s: string) => s.split("").reduce((a, c) => ((a * 31 + c.charCodeAt(0)) & 0xfffffff), 5381).toString(36);
        
        const categoriesMap = new Map<string, { id: string; name: string }>();
        
        // Add explicit
        explicitCategories.forEach(c => categoriesMap.set(c.name, { id: c.id, name: c.name }));
        
        // Add implicit from products (if not already added)
        productCategoryNames.forEach((name: any) => {
            if (!categoriesMap.has(name)) {
                categoriesMap.set(name, { id: stableId(name), name });
            }
        });

        const categories = Array.from(categoriesMap.values());
        const catNameToId = Object.fromEntries(categories.map((c: any) => [c.name, c.id]));

        const items = products2.map((p: any) => ({
            id: p.id,
            name: p.name,
            categoryId: catNameToId[p.category] ?? "0",
            price: Number(p.sellingPrice),
            cost: Number(p.costPrice),
            type: p.type || "taom",
            warehouse: p.warehouse || "",
            inStock: true,
            stock: Number(p.stock),
            unit: p.unit,
            image: p.image ?? null,
            printerIp: p.printerIp ?? null,
            isSetMenu: p.isSetMenu === 1 || p.isSetMenu === true,
            modifiers: (() => { try { return p.modifiers ? JSON.parse(p.modifiers) : []; } catch { return []; } })(),
        }));

        // ?all=1 bo'lsa — kirim sahifasi uchun barcha productlarni qaytarish
        if (returnAll) {
            return NextResponse.json({ categories, items, cancelCode: "", paymentMethods: [] });
        }

        return NextResponse.json({ categories, items, cancelCode, paymentMethods });
    } catch (error) {
        console.error("UBT menu GET error:", error);
        return NextResponse.json({ categories: [], items: [], error: String(error) });
    }
}

// POST - create or update a menu item from admin nomenklatura
export async function POST(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, category, sellingPrice, costPrice, type, warehouse, stock, unit, image, printerIp, isSetMenu, modifiers } = body;

        if (!name) return NextResponse.json({ error: "Nomi kiritilishi shart" }, { status: 400 });

        const catVal = category || "Umumiy";
        const sellPrice = Number(sellingPrice) || 0;
        const costPr = Number(costPrice) || 0;
        const stk = Number(stock) || 99;
        const utStr = unit || "dona";
        const imgVal = image ?? null;
        const piVal = printerIp || null;
        const isSetMenuVal = isSetMenu ? 1 : 0;
        const typeVal = (type === "mahsulot" ? "mahsulot" : "taom");
        const warehouseVal = warehouse || null;
        const modifiersVal = modifiers && Array.isArray(modifiers) && modifiers.length > 0 ? JSON.stringify(modifiers) : null;

        await _ensurePrinterIpColumn;

        // UPSERT by id OR name
        let targetId = id;
        if (!targetId) {
            const existingByName: any[] = await prisma.$queryRawUnsafe(
                `SELECT id FROM Product WHERE tenantId=? AND name=? LIMIT 1`,
                tenantId, name
            );
            if (existingByName.length > 0) targetId = existingByName[0].id;
        }

        if (targetId) {
            const active = await isProductInActiveOrder(tenantId, name, targetId);
            if (active) {
                return NextResponse.json({ error: "Ushbu mahsulot ayni paytda faol zakazlar (band stollar yoki yetkazish) ichida mavjud! Mijoz to'lov qilmaguncha uni tahrirlash mumkin emas." }, { status: 400 });
            }

            await prisma.$executeRawUnsafe(
                `UPDATE Product SET name=?, category=?, sellingPrice=?, costPrice=?, type=?, warehouse=?, stock=?, unit=?, image=?, printerIp=?, isSetMenu=?, modifiers=? WHERE id=? AND tenantId=?`,
                name, catVal, sellPrice, costPr, typeVal, warehouseVal, stk, utStr, imgVal, piVal, isSetMenuVal, modifiersVal, targetId, tenantId
            );
            return NextResponse.json({ success: true, action: "updated", id: targetId });
        } else {
            const newId = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            await prisma.$executeRawUnsafe(
                `INSERT INTO Product (id, tenantId, name, category, sellingPrice, costPrice, type, warehouse, stock, minStock, unit, image, printerIp, isSetMenu, modifiers, createdAt)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 10, ?, ?, ?, ?, ?, datetime('now'))`,
                newId, tenantId, name, catVal, sellPrice, costPr, typeVal, warehouseVal, stk, utStr, imgVal, piVal, isSetMenuVal, modifiersVal
            );
            return NextResponse.json({ success: true, action: "created", id: newId }, { status: 201 });
        }
    } catch (error) {
        console.error("UBT menu POST error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

// DELETE - remove a menu item (by id or by name)
export async function DELETE(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { id, name } = body;

        if (id) {
            // Delete by id
            const existing: any[] = await prisma.$queryRawUnsafe(`SELECT name FROM Product WHERE id=? AND tenantId=? LIMIT 1`, id, tenantId);
            if (existing.length > 0) {
                const active = await isProductInActiveOrder(tenantId, existing[0].name, id);
                if (active) return NextResponse.json({ error: "Faol zakazda bo'lgan mahsulotni o'chirish mumkin emas, mijoz oldin to'lov qilishi kerak!" }, { status: 400 });
            }
            await prisma.$executeRawUnsafe(`DELETE FROM Product WHERE id=? AND tenantId=?`, id, tenantId);
        } else if (name) {
            // Delete by name (for nomenklatura sync)
            const active = await isProductInActiveOrder(tenantId, name);
            if (active) return NextResponse.json({ error: "Faol zakazda bo'lgan mahsulotni o'chirish mumkin emas, mijoz oldin to'lov qilishi kerak!" }, { status: 400 });
            await prisma.$executeRawUnsafe(`DELETE FROM Product WHERE name=? AND tenantId=?`, name, tenantId);
        } else {
            return NextResponse.json({ error: "ID yoki nom kiritilmagan" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
