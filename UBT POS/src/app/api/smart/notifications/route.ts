export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

// Autentifikatsiyani tekshirib, Tenant ID sini olish
async function getAuthTenantId(request: NextRequest): Promise<string | null> {
    try {
        const cookieSession = await getSession();
        if (cookieSession?.tenantId) return cookieSession.tenantId;
    } catch {}

    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
            if (payload.tenantId) return payload.tenantId as string;
        } catch {}
    }
    return null;
}

// Vaqt formatini do'stona qilib qaytaradi ("5 min", "1 soat")
function getTimeAgo(date: Date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000); // daqiqa
    if (diff < 1) return "hozirgina";
    if (diff < 60) return `${diff} min`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} soat`;
    return `${Math.floor(hours / 24)} kun`;
}

export async function GET(request: NextRequest) {
    const tenantId = await getAuthTenantId(request);
    if (!tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const notifications = [];
        let idCounter = 1;

        // 1. Zaxira tugayotgan mahsulotlarni izlash (Product)
        const products = await prisma.product.findMany({
            where: { tenantId },
            select: { name: true, stock: true, minStock: true, unit: true }
        });

        for (const p of products) {
            if (p.stock <= p.minStock) {
                notifications.push({
                    id: idCounter++,
                    type: "alert",
                    title: "Zaxira tugayapti",
                    desc: `${p.name}: ${p.stock} ${p.unit} qoldi (Limit: ${p.minStock})`,
                    time: "Doimiy",
                });
            }
        }

        // 2. Kutilayotgan yangi yetkazib berish (Dastavka) qidirish
        const newDeliveries = await prisma.deliveryOrder.findMany({
            where: { tenantId, status: "new" },
            select: { orderNumber: true, customerName: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });

        for (const d of newDeliveries) {
            notifications.push({
                id: idCounter++,
                type: "info",
                title: "Yangi dastavka",
                desc: `${d.orderNumber} – ${d.customerName || "Mijoz"} kutyapti`,
                time: getTimeAgo(d.createdAt),
            });
        }

        // Qolgan yana nimadir qo'shish kerak bo'lsa shu yerda qilinadi...

        return NextResponse.json({ notifications });

    } catch (error) {
        console.error("Notifications API error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
