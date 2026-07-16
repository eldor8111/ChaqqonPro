const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

console.log("=== DIAGNOSTIC START ===");
console.log("DATABASE_URL Env Variable:", process.env.DATABASE_URL);
console.log("Current working directory:", process.cwd());

// Check dev.db in different paths
const pathsToCheck = [
  path.join(__dirname, 'dev.db'),
  path.join(__dirname, 'prisma', 'dev.db'),
  path.join(__dirname, '.next', 'standalone', 'dev.db'),
  '/root/eldor/chaqqonpro/frontend/dev.db',
  '/root/eldor/chaqqonpro/frontend/.next/standalone/dev.db',
  '/root/eldor/chaqqonpro/frontend/prisma/dev.db'
];

pathsToCheck.forEach(p => {
  if (fs.existsSync(p)) {
    const stats = fs.statSync(p);
    console.log(`FOUND DB: ${p} - Size: ${(stats.size / 1024).toFixed(2)} KB - Modified: ${stats.mtime}`);
  } else {
    console.log(`NOT FOUND DB: ${p}`);
  }
});

// Check .env files contents
const envFiles = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '.env.production'),
  path.join(__dirname, '.next', 'standalone', '.env')
];

envFiles.forEach(f => {
  if (fs.existsSync(f)) {
    console.log(`--- ${f} ---`);
    const content = fs.readFileSync(f, 'utf8');
    const dbUrlLine = content.split('\n').find(l => l.includes('DATABASE_URL'));
    console.log(dbUrlLine || "DATABASE_URL not found in this env file");
  } else {
    console.log(`NOT FOUND ENV: ${f}`);
  }
});

const prisma = new PrismaClient();

async function main() {
  console.log("\n=== PRISMA QUERY CHECK ===");
  try {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, shopName: true, shopCode: true }
    });
    console.log("Tenants count in current connection:", tenants.length);
    console.log("Tenants list:", JSON.stringify(tenants, null, 2));

    const tables = await prisma.smartTable.findMany({
      select: { id: true, tenantId: true, tableNumber: true, status: true, section: true }
    });
    console.log("Tables count in current connection:", tables.length);
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
