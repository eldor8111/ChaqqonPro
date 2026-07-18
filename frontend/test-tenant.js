const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const testCode = `TEST${Math.floor(Math.random() * 10000)}`;
        const testBilling = Math.floor(Math.random() * 10000000).toString();
        
        console.log("Checking if table Tenant works by creating a mock tenant...");
        const res = await prisma.tenant.create({
            data: {
                id: `test_${Date.now()}`,
                shopCode: testCode,
                billingId: testBilling,
                shopName: "Test Shop",
                ownerName: "Test Owner",
                phone: "123456789",
                email: "test@example.com",
                address: "Test Address",
                plan: "basic",
                status: "active",
                adminUsername: "admin",
                adminPasswordHash: "hash",
                settings: "{}",
                agentCode: null,
            }
        });
        console.log("Success! Created tenant:", res.id);
        
        // Clean up
        await prisma.tenant.delete({ where: { id: res.id } });
        console.log("Cleaned up successfully.");
    } catch (e) {
        console.error("Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
