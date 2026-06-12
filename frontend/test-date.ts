import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const normalizedPhone = "+998991234567";
        const tenants = await prisma.$queryRaw`SELECT id FROM Tenant WHERE REPLACE(phone, ' ', '') = ${normalizedPhone}`;
        console.log('tenants:', tenants);
    } catch(e) {
        console.error('ERROR:', (e as Error).message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
