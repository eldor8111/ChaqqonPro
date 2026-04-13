export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";

// GET /api/billing/tariffs (public)
// Tenant panelida faol tariflarni ko'rsatish
export async function GET(req: NextRequest) {
    try {
        const tariffs = await prisma.tariff.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });

        // Hozirgi PLANS obyektlari bilan bir xil interfeys berish uchun
        // agar eski hardcoded PLANS color/label lari kerak bo'lsa Frontend handle qiladi
        return NextResponse.json({ tariffs });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
