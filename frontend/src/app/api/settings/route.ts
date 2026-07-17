export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/backend/auth";
import { prisma } from "@/lib/backend/db";
import { createAuditLog } from "@/lib/backend/audit";
import { PrinterService } from "@/lib/services/PrinterService";

function normalizeKey(value: string | null | undefined) {
    return (value || "").trim().toLowerCase();
}

function sortTableNames(a: string, b: string) {
    const numA = parseInt(a.match(/\d+/)?.at(0) || "0", 10);
    const numB = parseInt(b.match(/\d+/)?.at(0) || "0", 10);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
}

async function mergeDbTablesIntoSmartSettings(tenantId: string, settings: Record<string, any>) {
    const dbTables = await prisma.smartTable.findMany({
        where: { tenantId },
        select: { id: true, tableNumber: true, capacity: true, section: true },
        orderBy: [{ section: "asc" }, { tableNumber: "asc" }],
    });

    if (dbTables.length === 0) return settings;

    const nextSettings = { ...settings };
    const smartSettings = {
        serviceFee: 10,
        enableKDS: true,
        enableWaiterApp: true,
        tablesCount: 20,
        ...(nextSettings.smartSettings || {}),
    };
    const zones = Array.isArray(smartSettings.zones)
        ? smartSettings.zones.map((zone: any) => ({
            ...zone,
            tables: Array.isArray(zone.tables) ? zone.tables.map((table: any) => ({ ...table })) : [],
        }))
        : [];

    const zoneByName = new Map<string, any>();
    for (const zone of zones) {
        if (zone?.name) zoneByName.set(normalizeKey(zone.name), zone);
    }

    for (const table of dbTables) {
        const section = table.section || "Main";
        const zoneKey = normalizeKey(section);
        let zone = zoneByName.get(zoneKey);

        if (!zone) {
            zone = {
                id: `db:${section}`,
                name: section,
                branchId: "",
                serviceFee: 0,
                extraPriceType: "Qo'shimcha narx",
                tables: [],
            };
            zones.push(zone);
            zoneByName.set(zoneKey, zone);
        }

        if (!Array.isArray(zone.tables)) zone.tables = [];
        if (!zone.id) zone.id = `db:${section}`;

        const tableIdx = zone.tables.findIndex((item: any) =>
            item?.dbId === table.id ||
            (!item?.dbId && normalizeKey(item?.name) === normalizeKey(table.tableNumber))
        );

        const existingTable = tableIdx >= 0 ? zone.tables[tableIdx] : null;
        const mergedTable = {
            ...(existingTable || {}),
            id: existingTable?.id || table.id,
            dbId: table.id,
            name: table.tableNumber,
            capacity: table.capacity || existingTable?.capacity || 4,
        };

        if (tableIdx >= 0) zone.tables[tableIdx] = mergedTable;
        else zone.tables.push(mergedTable);
    }

    for (const zone of zones) {
        if (Array.isArray(zone.tables)) {
            zone.tables.sort((a: any, b: any) => sortTableNames(String(a?.name || ""), String(b?.name || "")));
        }
    }

    smartSettings.zones = zones;
    nextSettings.smartSettings = smartSettings;
    return nextSettings;
}

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const tenantId = session.tenantId;
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

        if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

        let settings: Record<string, any> = { branches: [{ id: "B-1", name: "Asosiy Filial", city: "Toshkent", manager: tenant.ownerName }] };
        if ((tenant as any).settings) {
            try {
                settings = JSON.parse((tenant as any).settings);
            } catch (e) { }
        }

        settings = await mergeDbTablesIntoSmartSettings(tenantId, settings);

        return NextResponse.json({
            tenant: {
                id: tenant.id,
                shopName: tenant.shopName,
                ownerName: tenant.ownerName,
                plan: tenant.plan,
                status: tenant.status,
                billingId: (tenant as any).billingId || null,
                expiresAt: (tenant as any).expiresAt || null,
                agentCode: (tenant as any).agentCode || null,
                settings,
            }
        });
    } catch (error) {
        console.error("Settings GET Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const tenantId = session.tenantId;
        const body = await request.json();

        if (body.settings) {
            await prisma.tenant.update({
                where: { id: tenantId },
                data: { settings: JSON.stringify(body.settings) } as any,
            });

            await createAuditLog(tenantId, session.userId ? "Admin" : "System", "Sozlamalar yangilandi", typeof body.settings?.branches !== "undefined" ? "Filiallar o'zgardi" : "Tizim sozlamalari", "update");
            
            PrinterService.invalidateReceiptCache(tenantId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Settings PUT Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
