import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("=== DB Row Counts ===");
    const models = [
        'superAdmin', 'platformUser', 'session', 'tenant', 'product',
        'inventoryReceipt', 'inventoryExpenditure', 'inventoryWriteoff',
        'inventoryTransfer', 'inventoryCount', 'customer', 'supplier',
        'staff', 'smartTable', 'smartReservation', 'smartRecommendation',
        'kdsOrder', 'kassiHarakat', 'attendance', 'auditLog',
        'balanceLog', 'transaction', 'transactionItem', 'tariff'
    ];

    for (const m of models) {
        try {
            const count = await prisma[m].count();
            console.log(`- ${m}: ${count}`);
        } catch (e) {
            console.log(`- ${m}: Error: ${e.message}`);
        }
    }
    
    console.log("\n=== Tenant Details ===");
    try {
        const tenants = await prisma.tenant.findMany();
        console.log(JSON.stringify(tenants, null, 2));
    } catch (e) {
        console.log("Error fetching tenants:", e.message);
    }
}

main().finally(() => prisma.$disconnect());
