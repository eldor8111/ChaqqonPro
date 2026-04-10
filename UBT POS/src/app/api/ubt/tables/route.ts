export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { jwtVerify } from "jose";
import { JWT_SECRET } from "@/lib/backend/jwt";

// Single auth helper — one DB call for cookie sessions, fallback to JWT.
// Previously used getSession() + getTenantId() which called getSession() twice.
async function getAuthTenantId(request: NextRequest): Promise<string | null> {
    try {
        const session = await getSession();
        if (session?.tenantId) return session.tenantId;
    } catch {}

    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const { payload } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
            if (payload.tenantId) return payload.tenantId as string;
        } catch {}
    }
    return null;
}

export async function GET(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const tables = await prisma.ubtTable.findMany({
            where: { tenantId },
            orderBy: [{ section: 'asc' }, { tableNumber: 'asc' }]
        });

        // Map service fee from tenant settings
        let ubtZones: any[] = [];
        const tObj = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
        if (tObj?.settings) {
            try {
                const parsed = JSON.parse(tObj.settings as string);
                ubtZones = parsed.ubtSettings?.zones || [];
            } catch {}
        }
        
        const tablesWithFee = tables.map(t => {
            const z = ubtZones.find(zone => zone.name === t.section);
            const fee = z?.serviceFee ? Number(z.serviceFee) : 10;
            const tableJson = z?.tables?.find((tb: any) => tb.name === t.tableNumber);
            let isActive = false;
            if (tableJson && tableJson.isActive !== false) {
                isActive = true;
            }
            return { ...t, serviceFee: fee, isActive };
        }).filter(t => t.isActive);

        tablesWithFee.sort((a, b) => {
            if (a.section !== b.section) return a.section.localeCompare(b.section);
            const numA = parseInt(a.tableNumber.match(/\d+/)?.at(0) || "0", 10);
            const numB = parseInt(b.tableNumber.match(/\d+/)?.at(0) || "0", 10);
            if (numA !== numB) return numA - numB;
            return a.tableNumber.localeCompare(b.tableNumber);
        });

        return NextResponse.json({ tables: tablesWithFee });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { tableNumber, capacity, section } = await request.json();

        const table = await prisma.ubtTable.create({
            data: {
                tenantId,
                tableNumber,
                capacity: capacity || 4,
                section: section || "Ichki",
                status: "free"
            }
        });

        return NextResponse.json({ success: true, table }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id, status, order, amount, since, waiter } = await request.json();

        const table = await prisma.ubtTable.update({
            where: { id, tenantId },
            data: { status, order, amount, since, waiter }
        });

        return NextResponse.json({ success: true, table });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const tenantId = await getAuthTenantId(request);
        if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(request.url);
        const section = url.searchParams.get("section");
        const tableNumber = url.searchParams.get("tableNumber");
        const id = url.searchParams.get("id");

        if (id) {
            await prisma.ubtTable.deleteMany({ where: { id, tenantId } });
        } else if (section && tableNumber) {
            await prisma.ubtTable.deleteMany({ where: { section, tableNumber, tenantId } });
        } else if (section) {
            await prisma.ubtTable.deleteMany({ where: { section, tenantId } });
        } else {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
