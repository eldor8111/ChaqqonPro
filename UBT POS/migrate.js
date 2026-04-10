const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE Product ADD COLUMN isSetMenu INTEGER DEFAULT 0`);
    console.log("Added isSetMenu column");
  } catch (e) {
    console.log("isSetMenu may already exist: " + e.message);
  }
  
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE Product ADD COLUMN modifiers TEXT`);
    console.log("Added modifiers column");
  } catch (e) {
    console.log("modifiers may already exist: " + e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
