export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSuperSession } from "@/lib/backend/auth";

// GET /api/super-admin/tariffs/all 
// Super Admin uchun barcha tariflar (VIP ham, isActive: false ham)
export async function GET(req: NextRequest) {
    try {
        const session = await getSuperSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const tariffs = await prisma.tariff.findMany({
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });
        return NextResponse.json({ tariffs });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
