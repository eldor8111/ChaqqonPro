export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";

// ─── Waiter Call API ────────────────────────────────────────────────────────
// Mijoz QR kod menyusidan ofitsiant chaqiradi.
// Bu endpoint ham autentifikatsiya talab ETMAYDI.
// Barcha ma'lumotlar DATABASE da saqlanadi.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(
    request: NextRequest,
    { params }: { params: { tenantId: string } }
) {
    try {
        const { tenantId } = params;
        const body = await request.json();
        const { tableId, message } = body;

        if (!tenantId || !tableId) {
            return NextResponse.json({ error: "tenantId va tableId kerak" }, { status: 400 });
        }

        // Tenant mavjudligini tekshirish
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Restoran topilmadi" }, { status: 404 });
        }

        // Stol ma'lumotlarini olish
        const table = await prisma.smartTable.findFirst({
            where: { id: tableId, tenantId },
            select: { tableNumber: true, section: true }
        });

        if (!table) {
            return NextResponse.json({ error: "Stol topilmadi" }, { status: 404 });
        }

        // Eski active chaqiruvni o'chirish (agar mavjud bo'lsa)
        await prisma.waiterCall.deleteMany({
            where: {
                tenantId,
                tableId,
                status: "active",
            }
        });

        // Yangi chaqiruvni database'ga saqlash
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 daqiqadan keyin expire
        await prisma.waiterCall.create({
            data: {
                tenantId,
                tableId,
                tableNumber: table.tableNumber,
                message: message || null,
                status: "active",
                expiresAt,
            }
        });

        return NextResponse.json({
            success: true,
            tableNumber: table.tableNumber,
            message: "Ofitsiant chaqirildi! Tez orada keladi."
        });
    } catch (error) {
        console.error("Waiter call error:", error);
        return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
    }
}

// GET — Admin panel ofitsiant chaqiruvlarini ko'rish uchun
export async function GET(
    request: NextRequest,
    { params }: { params: { tenantId: string } }
) {
    try {
        const { tenantId } = params;

        // Muddati o'tganlarni avtomatik o'chirish
        await prisma.waiterCall.deleteMany({
            where: {
                tenantId,
                expiresAt: { lt: new Date() },
            }
        });

        // Faol chaqiruvlarni olish
        const calls = await prisma.waiterCall.findMany({
            where: {
                tenantId,
                status: "active",
            },
            orderBy: { calledAt: "desc" },
        });

        return NextResponse.json({
            calls: calls.map(c => ({
                tableId: c.tableId,
                tableNumber: c.tableNumber,
                calledAt: c.calledAt.toISOString(),
                message: c.message,
            }))
        });
    } catch (error) {
        return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
    }
}

// DELETE — Chaqiruvni o'chirish (ofitsiant qabul qilgandan keyin)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { tenantId: string } }
) {
    try {
        const { tenantId } = params;
        const url = new URL(request.url);
        const tableId = url.searchParams.get("tableId");

        if (tableId) {
            await prisma.waiterCall.deleteMany({
                where: {
                    tenantId,
                    tableId,
                    status: "active",
                }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
    }
}
