const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== SAMIR DIAGNOSTICS ===");
  try {
    // 1. Samir ismli xodimlarni topamiz
    const staff = await prisma.staff.findMany({
      where: { name: { contains: "Samir" } }
    });
    console.log("Samir count:", staff.length);
    console.log("Samir staff records:", JSON.stringify(staff, null, 2));

    if (staff.length === 0) {
      console.log("No staff named Samir found. Let's find all staff:");
      const allStaff = await prisma.staff.findMany({
        select: { id: true, name: true, role: true, tenantId: true }
      });
      console.log("All staff:", JSON.stringify(allStaff, null, 2));
      return;
    }

    for (const s of staff) {
      console.log(`\nAnalyzing tenant for Samir (${s.name}) tenantId: ${s.tenantId}:`);
      
      // 2. Tenant settings
      const tenant = await prisma.tenant.findUnique({
        where: { id: s.tenantId },
        select: { id: true, shopName: true, settings: true }
      });
      console.log("Tenant info:", tenant.id, tenant.shopName);
      console.log("Tenant Settings raw length:", tenant.settings ? tenant.settings.length : 0);
      try {
        const parsed = JSON.parse(tenant.settings);
        console.log("Parsed Settings (smartSettings):", JSON.stringify(parsed.smartSettings, null, 2));
      } catch (e) {
        console.log("Failed to parse settings JSON:", e.message);
      }

      // 3. Tables in database for this tenant
      const tables = await prisma.smartTable.findMany({
        where: { tenantId: s.tenantId }
      });
      console.log(`DB Tables count for this tenant: ${tables.length}`);
      console.log("DB Tables:", JSON.stringify(tables.map(t => ({ id: t.id, number: t.tableNumber, section: t.section, status: t.status })), null, 2));

      // 4. Simulate the API route tables filter logic
      let ubtZones = [];
      if (tenant.settings) {
        try {
          const parsed = JSON.parse(tenant.settings);
          ubtZones = parsed.smartSettings?.zones || [];
        } catch {}
      }
      
      const filtered = tables.map(t => {
        const z = ubtZones.find(zone => zone.name === t.section);
        const fee = z?.serviceFee !== undefined ? Number(z.serviceFee) : 0;
        let tableJson = null;
        if (z?.tables && Array.isArray(z.tables)) {
          tableJson = z.tables.find(tb => tb.name === t.tableNumber) ?? null;
        }
        // What we do in GET:
        const isActive = tableJson ? tableJson.isActive !== false : false;
        return { 
          tableNumber: t.tableNumber, 
          section: t.section, 
          isActive, 
          hasZoneInSettings: !!z, 
          hasTableInSettings: !!tableJson 
        };
      });

      console.log("Simulation of tables GET filter results:");
      console.log(JSON.stringify(filtered, null, 2));
      console.log("Active tables returned:", filtered.filter(f => f.isActive).length);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
