// Temporary DB check script
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const tenants = await prisma.tenant.findMany({
  select: { shopCode: true, shopName: true, adminUsername: true, phone: true, status: true, plan: true }
});
console.log("=== TENANTS ===");
console.log(JSON.stringify(tenants, null, 2));

const sessions = await prisma.session.count();
console.log(`\n=== SESSIONS: ${sessions} active ===`);

await prisma.$disconnect();
