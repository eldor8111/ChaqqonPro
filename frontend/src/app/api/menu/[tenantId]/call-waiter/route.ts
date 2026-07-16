export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";

// ─── Waiter Call API ────────────────────────────────────────────────────────
// Mijoz QR kod menyusidan ofitsiant chaqiradi.
// Bu endpoint ham autentifikatsiya talab ETMAYDI.
// ─────────────────────────────────────────────────────────────────────────────

import { waiterCalls } from "@/lib/waiter-calls-store";


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

        // Chaqiruvni saqlash
        const key = `${tenantId}:${tableId}`;
        waiterCalls.set(key, {
            calledAt: new Date(),
            tableNumber: table.tableNumber,
            message: message || undefined,
        });

        // 5 daqiqadan keyin avtomatik o'chirish
        setTimeout(() => {
            if (waiterCalls.get(key)?.calledAt) {
                waiterCalls.delete(key);
            }
        }, 5 * 60 * 1000);

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
        const calls: Array<{ tableId: string; tableNumber: string; calledAt: string; message?: string }> = [];

        waiterCalls.forEach((value, key) => {
            const [tid, tableId] = key.split(":");
            if (tid === tenantId) {
                calls.push({
                    tableId,
                    tableNumber: value.tableNumber,
                    calledAt: value.calledAt.toISOString(),
                    message: value.message,
                });
            }
        });

        return NextResponse.json({ calls });
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
            waiterCalls.delete(`${tenantId}:${tableId}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
    }
}
