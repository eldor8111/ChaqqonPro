import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const body = await request.json();
        const { status, notes } = body;

        const updatedLead = await prisma.potentialClient.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(notes && { notes })
            }
        });

        return NextResponse.json(updatedLead);
    } catch (error) {
        console.error("Agent leads PATCH xatosi:", error);
        return NextResponse.json({ error: "Ichki server xatosi" }, { status: 500 });
    }
}
