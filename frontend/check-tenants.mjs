import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const tenants = await p.tenant.findMany({ select: { shopCode: true, phone: true, adminUsername: true, status: true } });
    console.log('--- TENANTLAR ---');
    console.log(tenants);
    
    await p.$disconnect();
}
main().catch(console.error);
