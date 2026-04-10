import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const agentCode = searchParams.get("agentCode");

        if (!agentCode) {
            return NextResponse.json({ error: "agentCode kiritish majburiy!" }, { status: 400 });
        }

        const tenants = await prisma.tenant.findMany({
            where: {
                agentCode: agentCode,
            },
            select: {
                id: true,
                shopCode: true,
                shopName: true,
                ownerName: true,
                phone: true,
                plan: true,
                status: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(tenants);
    } catch (error) {
        console.error("Agent tenants GET xatosi:", error);
        return NextResponse.json({ error: "Ichki server xatosi" }, { status: 500 });
    }
}
