export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const products = await prisma.product.findMany({
            where: { tenantId: session.tenantId },
            orderBy: { name: "asc" }
        });

        return NextResponse.json(products);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Xatolik" }, { status: 500 });
    }
}
