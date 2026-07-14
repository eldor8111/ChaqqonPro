import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const staff = await prisma.staff.findFirst({
        where: { OR: [{ username: "1014" }, { pinCode: "1014" }] },
        include: { tenant: true }
    });

    if (!staff) {
        console.log("Staff 1014 not found");
        return;
    }

    console.log("Found staff:", staff.name, "Role:", staff.role, "Tenant:", staff.tenant.shopName);
    
    // get tenant settings
    const t = staff.tenant;
    const s = JSON.parse(t.settings || '{}');
    const zones = s?.smartSettings?.zones || [];
    console.log('Zones:', JSON.stringify(zones.map(z => ({ name: z.name, serviceFee: z.serviceFee })), null, 2));

    const tables = await prisma.smartTable.findMany({ where: { tenantId: t.id }, select: { tableNumber: true, section: true } });
    const uniqueSections = [...new Set(tables.map(tb => tb.section))];
    console.log('Table sections:', uniqueSections);
}

main().finally(() => prisma.$disconnect());
