import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const tenants = await prisma.tenant.findMany({ select: { id: true, shopName: true, settings: true } });
for (const t of tenants) {
    try {
        const s = JSON.parse(t.settings || '{}');
        const zones = s?.smartSettings?.zones || [];
        console.log(`\n=== Tenant: ${t.shopName} (${t.id}) ===`);
        console.log('Zones:', JSON.stringify(zones.map(z => ({ name: z.name, serviceFee: z.serviceFee })), null, 2));
        
        const tables = await prisma.smartTable.findMany({ where: { tenantId: t.id }, select: { tableNumber: true, section: true } });
        const uniqueSections = [...new Set(tables.map(tb => tb.section))];
        console.log('Table sections:', uniqueSections);
        
        // zone vs section moslikni ko'rish
        for (const sec of uniqueSections) {
            const z = zones.find(z => z.name === sec);
            if (z) {
                console.log(`  Section "${sec}" -> Zone TOPILDI, serviceFee=${z.serviceFee}`);
            } else {
                console.log(`  Section "${sec}" -> Zone TOPILMADI (default ishlatiladi)`);
            }
        }
    } catch(e) {
        console.log('Error:', e.message);
    }
}
await prisma.$disconnect();
