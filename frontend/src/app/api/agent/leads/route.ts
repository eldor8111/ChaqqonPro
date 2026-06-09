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

        const leads = await prisma.potentialClient.findMany({
            where: {
                agentCode: agentCode,
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(leads);
    } catch (error) {
        console.error("Agent leads GET xatosi:", error);
        return NextResponse.json({ error: "Ichki server xatosi" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { agentCode, businessName, ownerName, phone, address, status, nextContactDate, notes } = body;

        if (!agentCode || !businessName || !phone) {
            return NextResponse.json({ error: "Barcha kerakli maydonlar kiritilmagan!" }, { status: 400 });
        }

        const newLead = await prisma.potentialClient.create({
            data: {
                agentCode,
                businessName,
                ownerName,
                phone,
                address,
                status: status || "new",
                nextContactDate: nextContactDate ? new Date(nextContactDate) : null,
                notes
            }
        });

        return NextResponse.json(newLead, { status: 201 });
    } catch (error: any) {
        console.error("Agent leads POST xatosi:", error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "Bu raqam bilan mijoz allaqachon qo'shilgan!" }, { status: 400 });
        }
        return NextResponse.json({ error: "Ichki server xatosi" }, { status: 500 });
    }
}
