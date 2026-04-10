const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.platformUser.findMany();
  console.log("Users:", JSON.stringify(users, null, 2));

  const superAdmin = await prisma.superAdmin.findMany();
  console.log("SuperAdmins:", JSON.stringify(superAdmin, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
