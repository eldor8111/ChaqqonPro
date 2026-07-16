const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== DB CHECK ===");
  try {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, shopName: true, shopCode: true }
    });
    console.log("Tenants count:", tenants.length);
    console.log("Tenants:", JSON.stringify(tenants, null, 2));

    const tables = await prisma.smartTable.findMany({
      select: { id: true, tenantId: true, tableNumber: true, status: true, section: true }
    });
    console.log("Tables count:", tables.length);
    console.log("Tables (first 10):", JSON.stringify(tables.slice(0, 10), null, 2));

    // Get Samir's staff info to find his tenantId
    const staff = await prisma.staff.findMany({
      where: { name: { contains: "Samir", lte: undefined } }, // SQLite search
      select: { id: true, name: true, tenantId: true }
    });
    console.log("Staff named Samir:", JSON.stringify(staff, null, 2));

    if (staff.length > 0) {
      const samirTenantId = staff[0].tenantId;
      console.log("Samir's tenant ID:", samirTenantId);
      const samirTables = await prisma.smartTable.findMany({
        where: { tenantId: samirTenantId }
      });
      console.log(`Tables for Samir's tenant (${samirTables.length}):`, JSON.stringify(samirTables, null, 2));
      
      const tenant = await prisma.tenant.findUnique({
        where: { id: samirTenantId },
        select: { settings: true }
      });
      console.log("Samir's tenant settings:", tenant?.settings);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
