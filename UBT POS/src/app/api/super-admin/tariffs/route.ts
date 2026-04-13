import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSuperSession } from "@/lib/backend/auth";

// GET /api/super-admin/tariffs — barcha tariflar
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

// POST /api/super-admin/tariffs — yangi tarif
export async function POST(req: NextRequest) {
    try {
        const session = await getSuperSession();
        if (!session || session.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Faqat Super Admin uchun" }, { status: 403 });
        }

        const body = await req.json();
        const { name, description, pricePerMonth, durationDays, maxUsers, maxBranches, sortOrder } = body;
        if (!name?.trim()) return NextResponse.json({ error: "Tarif nomi kiritilmagan" }, { status: 400 });

        const tariff = await prisma.tariff.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                pricePerMonth: Number(pricePerMonth) || 0,
                durationDays: Number(durationDays) || 30,
                maxUsers: Number(maxUsers) || 10,
                maxBranches: Number(maxBranches) || 1,
                sortOrder: Number(sortOrder) || 0,
                isActive: true,
            },
        });
        return NextResponse.json({ tariff });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
