/**
 * /api/ubt/recommendations — Smart Tavsiyalar API
 *
 * GET  - Tavsiyalarni olish (cart itemlarga asosan)
 * POST - Yangi tavsiya yaratish (Admin)
 * PUT  - Tavsiya yangilash
 * DELETE - Tavsiya o'chirish
 */

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

// ─── Auth Helper ────────────────────────────────────────────────────────────
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

// ─── GET: Tavsiyalarni olish ────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const cartItemsRaw = searchParams.get("cartItems"); // JSON array of product IDs
        const cartTotal = parseFloat(searchParams.get("cartTotal") || "0");

        let cartItems: string[] = [];
        if (cartItemsRaw) {
            try {
                cartItems = JSON.parse(cartItemsRaw);
            } catch {
                cartItems = [];
            }
        }

        // ─── TAVSIYA ALGORITMI ───────────────────────────────────────────
        const now = new Date();

        // 1. Trigger-based recommendations (savatdagi mahsulotlarga asosan)
        const triggerRecommendations = await prisma.smartRecommendation.findMany({
            where: {
                tenantId,
                isActive: true,
                triggerProductId: { in: cartItems },
                minCartAmount: { lte: cartTotal },
                AND: [
                    {
                        OR: [
                            { startDate: null },
                            { startDate: { lte: now } }
                        ]
                    },
                    {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: now } }
                        ]
                    }
                ]
            },
            orderBy: { priority: 'desc' },
            take: 5
        });

        // 2. Always-show recommendations (har doim ko'rsatiladi)
        const alwaysRecommendations = await prisma.smartRecommendation.findMany({
            where: {
                tenantId,
                isActive: true,
                showAlways: true,
                minCartAmount: { lte: cartTotal },
                AND: [
                    {
                        OR: [
                            { startDate: null },
                            { startDate: { lte: now } }
                        ]
                    },
                    {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: now } }
                        ]
                    }
                ]
            },
            orderBy: { priority: 'desc' },
            take: 3
        });

        // 3. Birlashtirib, takrorlarni olib tashlash
        const allRecommendations = [...triggerRecommendations, ...alwaysRecommendations];
        const uniqueMap = new Map();
        allRecommendations.forEach(rec => {
            if (!uniqueMap.has(rec.recommendProductId)) {
                uniqueMap.set(rec.recommendProductId, rec);
            }
        });

        const recommendations = Array.from(uniqueMap.values()).slice(0, 5);

        // 4. Mahsulot ma'lumotlarini olish
        const productIds = recommendations.map(r => r.recommendProductId);
        const products = await prisma.product.findMany({
            where: {
                tenantId,
                id: { in: productIds }
            },
            select: {
                id: true,
                name: true,
                sellingPrice: true,
                category: true,
                stock: true,
                image: true
            }
        });

        // 5. View countni yangilash (async, javobni kechiktirmaslik uchun)
        const recIds = recommendations.map(r => r.id);
        prisma.smartRecommendation.updateMany({
            where: { id: { in: recIds } },
            data: { viewCount: { increment: 1 } }
        }).catch(err => console.error("Failed to update viewCount:", err));

        // 6. Natijani qaytarish
        const result = recommendations.map(rec => {
            const product = products.find(p => p.id === rec.recommendProductId);
            if (!product) return null;

            let finalPrice = product.sellingPrice;
            if (rec.discountType === "percent") {
                finalPrice = product.sellingPrice * (1 - rec.discountValue / 100);
            } else if (rec.discountType === "fixed") {
                finalPrice = Math.max(0, product.sellingPrice - rec.discountValue);
            }

            return {
                id: rec.id,
                product: {
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    originalPrice: product.sellingPrice,
                    finalPrice: Math.round(finalPrice),
                    stock: product.stock,
                    image: product.image
                },
                title: rec.title,
                description: rec.description,
                badgeText: rec.badgeText,
                badgeColor: rec.badgeColor,
                discountType: rec.discountType,
                discountValue: rec.discountValue,
                priority: rec.priority
            };
        }).filter(Boolean);

        return NextResponse.json({ recommendations: result });

    } catch (error) {
        console.error("GET /api/ubt/recommendations error:", error);
        return NextResponse.json({ error: "Server xatoligi" }, { status: 500 });
    }
}

// ─── POST: Yangi tavsiya yaratish ──────────────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            triggerProductId,
            triggerCategoryId,
            recommendProductId,
            recommendProductName,
            title,
            description,
            badgeText,
            badgeColor,
            discountType,
            discountValue,
            priority,
            showAlways,
            minCartAmount,
            startDate,
            endDate
        } = body;

        if (!recommendProductId || !recommendProductName || !title) {
            return NextResponse.json({
                error: "recommendProductId, recommendProductName va title majburiy"
            }, { status: 400 });
        }

        const recommendation = await prisma.smartRecommendation.create({
            data: {
                tenantId,
                triggerProductId: triggerProductId || null,
                triggerCategoryId: triggerCategoryId || null,
                recommendProductId,
                recommendProductName,
                title,
                description: description || "",
                badgeText: badgeText || "Tavsiya",
                badgeColor: badgeColor || "blue",
                discountType: discountType || "none",
                discountValue: discountValue || 0,
                priority: priority || 0,
                showAlways: showAlways || false,
                minCartAmount: minCartAmount || 0,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                isActive: true
            }
        });

        return NextResponse.json({ success: true, recommendation });

    } catch (error) {
        console.error("POST /api/ubt/recommendations error:", error);
        return NextResponse.json({ error: "Server xatoligi" }, { status: 500 });
    }
}

// ─── PUT: Tavsiya yangilash ────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "id majburiy" }, { status: 400 });
        }

        // Tenant tekshiruvi
        const existing = await prisma.smartRecommendation.findUnique({
            where: { id }
        });

        if (!existing || existing.tenantId !== tenantId) {
            return NextResponse.json({ error: "Tavsiya topilmadi" }, { status: 404 });
        }

        const recommendation = await prisma.smartRecommendation.update({
            where: { id },
            data: updates
        });

        return NextResponse.json({ success: true, recommendation });

    } catch (error) {
        console.error("PUT /api/ubt/recommendations error:", error);
        return NextResponse.json({ error: "Server xatoligi" }, { status: 500 });
    }
}

// ─── DELETE: Tavsiya o'chirish ─────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id majburiy" }, { status: 400 });
        }

        // Tenant tekshiruvi
        const existing = await prisma.smartRecommendation.findUnique({
            where: { id }
        });

        if (!existing || existing.tenantId !== tenantId) {
            return NextResponse.json({ error: "Tavsiya topilmadi" }, { status: 404 });
        }

        await prisma.smartRecommendation.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("DELETE /api/ubt/recommendations error:", error);
        return NextResponse.json({ error: "Server xatoligi" }, { status: 500 });
    }
}

// ─── PATCH: Click tracking ─────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, action } = body; // action: "click" | "conversion"

        if (!id || !action) {
            return NextResponse.json({ error: "id va action majburiy" }, { status: 400 });
        }

        const updateData: any = {};
        if (action === "click") {
            updateData.clickCount = { increment: 1 };
        } else if (action === "conversion") {
            updateData.conversionCount = { increment: 1 };
        }

        await prisma.smartRecommendation.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("PATCH /api/ubt/recommendations error:", error);
        return NextResponse.json({ error: "Server xatoligi" }, { status: 500 });
    }
}
