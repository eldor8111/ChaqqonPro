import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("=== Smart Tables ===");
    const tables = await prisma.smartTable.findMany();
    console.log(JSON.stringify(tables, null, 2));
}

main().finally(() => prisma.$disconnect());
