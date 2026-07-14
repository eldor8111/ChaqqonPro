export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";

export async function GET(_request: NextRequest) {
    try {
        let tenantId = null;
        try {
            const session = await getSession();
            if (session?.tenantId) tenantId = session.tenantId;
        } catch {}

        if (!tenantId) {
            const authHeader = _request.headers.get("Authorization");
            if (authHeader?.startsWith("Bearer ")) {
                try {
                    const { jwtVerify } = require("jose");
                    const { payload } = await jwtVerify(authHeader.slice(7), new TextEncoder().encode(process.env.JWT_SECRET || "fallback"));
                    if (payload.tenantId) tenantId = payload.tenantId as string;
                } catch {}
            }
        }

        if (!tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const customers = await prisma.customer.findMany({
            where: { tenantId },
            orderBy: { name: "asc" },
            select: { id: true, name: true, phone: true, segment: true, bonusPoints: true, totalPurchases: true, createdAt: true },
        });

        return NextResponse.json({ customers });
    } catch (error) {
        console.error("Get customers error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const tenantId = session.tenantId;
        const body = await request.json();

        const { name, phone, segment } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const customer = await prisma.customer.create({
            data: {
                tenantId,
                name,
                phone: phone || null,
                segment: segment || "new",
                bonusPoints: 0,
                totalPurchases: 0,
            },
        });

        return NextResponse.json({ success: true, customer }, { status: 201 });
    } catch (error) {
        console.error("Create customer error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
