import { NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const items = await prisma.inventoryWriteoff.findMany({
            where: { tenantId: session.tenantId },
            orderBy: { createdAt: "desc" },
            include: { product: true }
        });

        return NextResponse.json(items);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Xatolik yuz berdi" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (session.role === "KASSIR") {
            const staff = await prisma.staff.findUnique({ where: { id: session.userId } });
            if (staff && staff.role === "Omborchi") {
                const perms = staff.permissions ? (typeof staff.permissions === 'string' ? JSON.parse(staff.permissions) : staff.permissions) : [];
                if (!Array.isArray(perms) || !perms.includes("sjisaniya")) {
                    return NextResponse.json({ error: "Sizda hisobdan chiqarish ruxsati yo'q" }, { status: 403 });
                }
            }
        }

        const body = await req.json();
        const { date, productId, productName, quantity, unit, reason, approvedBy } = body;

        let pId = productId;
        let pName = productName || "NOMA'LUM";
        let pUnit = unit || "dona";
        let itemCost = 0;

        if (productId) {
            const product = await prisma.product.findUnique({
                where: { id: productId, tenantId: session.tenantId }
            });
            if (product) {
                pName = product.name;
                pUnit = product.unit;
                itemCost = product.costPrice || 0;

                // Svisaniya qilganda mahsulot kamayadi
                await prisma.product.update({
                    where: { id: productId },
                    data: { stock: product.stock - Number(quantity) }
                });
            }
        }

        const totalLoss = Number(quantity) * itemCost;

        const writeoff = await prisma.inventoryWriteoff.create({
            data: {
                tenantId: session.tenantId,
                date: new Date(date || Date.now()),
                productId: pId,
                productName: pName,
                quantity: Number(quantity),
                unit: pUnit,
                reason: reason || "Noma'lum",
                totalLoss: totalLoss,
                approvedBy: approvedBy || session.userId || "Kirituvchi",
                status: "approved"
            }
        });

        await prisma.auditLog.create({
            data: {
                tenantId: session.tenantId,
                user: session.userId,
                action: "INVENTORY_WRITEOFF_CREATED",
                detail: `${pName} hisobdan chiqarildi: ${quantity} ${pUnit}. Zarar summasi: ${totalLoss}`,
                type: "create"
            }
        });

        return NextResponse.json(writeoff);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Xatolik" }, { status: 500 });
    }
}
