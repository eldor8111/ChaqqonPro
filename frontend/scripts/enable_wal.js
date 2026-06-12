const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Enabling WAL mode...');
  await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
  const mode = await prisma.$queryRawUnsafe('PRAGMA journal_mode;');
  console.log('Current mode:', mode);
}
main().finally(() => prisma.$disconnect());
