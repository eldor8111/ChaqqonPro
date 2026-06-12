export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/backend/db";
import { getSession } from "@/lib/backend/auth";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

async function getAuthTenantId(request: NextRequest): Promise<string | null> {
    // Eski DB larda yangi ustun/jadvallarni yaratish (idempotent)
    const { ensurePrintSchema } = await import("@/lib/backend/printSchemaBootstrap");
    await ensurePrintSchema();
    try {
        const cookieSession = await getSession();
        if (cookieSession?.tenantId) return cookieSession.tenantId;
    } catch {}
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
            if (payload.tenantId) return payload.tenantId as string;
        } catch {}
    }
    const firstTenant = await prisma.tenant.findFirst({ where: { status: "active" } });
    return firstTenant?.id ?? null;
}

// GET — list printers
export async function GET(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json([], { status: 200 });
        const printers = await prisma.smartPrinter.findMany({
            where: { tenantId },
            orderBy: { createdAt: "asc" }
        });
        return NextResponse.json(printers);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// POST — add printer
export async function POST(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { name, ipAddress, port, description } = await req.json();
        
        if (!name || !ipAddress) return NextResponse.json({ error: "Nomi va IP manzil kiritilishi shart" }, { status: 400 });
        
        const portNum = Number(port) || 9100;
        
        const printer = await prisma.smartPrinter.create({
            data: {
                tenantId,
                name,
                ipAddress,
                port: portNum,
                description: description || ""
            }
        });
        return NextResponse.json({ success: true, id: printer.id });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// PATCH — update printer (rol, nom, faollik va h.k.)
export async function PATCH(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const body = await req.json();
        if (!body.id) return NextResponse.json({ error: "ID kiritilmagan" }, { status: 400 });

        const data: Record<string, unknown> = {};
        if (body.name !== undefined) data.name = String(body.name);
        if (body.ipAddress !== undefined) data.ipAddress = String(body.ipAddress);
        if (body.port !== undefined) data.port = Number(body.port) || 9100;
        if (body.description !== undefined) data.description = String(body.description);
        if (body.role !== undefined && ["cashier", "kitchen", "bar"].includes(body.role)) data.role = body.role;
        if (body.paperWidth !== undefined && [58, 80].includes(Number(body.paperWidth))) data.paperWidth = Number(body.paperWidth);
        if (body.isActive !== undefined) data.isActive = !!body.isActive;
        if (body.isDefault !== undefined) data.isDefault = !!body.isDefault;

        // Bitta rolda faqat bitta default printer bo'lsin
        if (data.isDefault === true) {
            const target = await prisma.smartPrinter.findFirst({ where: { id: body.id, tenantId } });
            if (target) {
                await prisma.smartPrinter.updateMany({
                    where: { tenantId, role: (data.role as string) || target.role, isDefault: true },
                    data: { isDefault: false },
                });
            }
        }

        await prisma.smartPrinter.updateMany({ where: { id: body.id, tenantId }, data });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

// DELETE — remove printer
export async function DELETE(req: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(req);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await req.json();
        
        if (!id) return NextResponse.json({ error: "ID kiritilmagan" }, { status: 400 });
        
        await prisma.smartPrinter.deleteMany({
            where: { id, tenantId }
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
