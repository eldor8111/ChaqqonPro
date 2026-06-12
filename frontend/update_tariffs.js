const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Delete old tariffs
    await prisma.tariff.deleteMany({});
    
    // Create new tariffs
    await prisma.tariff.create({
        data: {
            name: '1 Oylik',
            description: '1 oylik standart obuna',
            pricePerMonth: 300000,
            durationDays: 30,
            maxUsers: 9999,
            maxBranches: 9999,
            isActive: true,
            sortOrder: 1
        }
    });

    await prisma.tariff.create({
        data: {
            name: '1 Yillik',
            description: '1 yillik chegirmali obuna',
            pricePerMonth: 3099000,
            durationDays: 365,
            maxUsers: 9999,
            maxBranches: 9999,
            isActive: true,
            sortOrder: 2
        }
    });

    await prisma.tariff.create({
        data: {
            name: 'VIP',
            description: 'Cheksiz VIP obuna',
            pricePerMonth: 0,
            durationDays: 3650, // 10 years
            maxUsers: 9999,
            maxBranches: 9999,
            isActive: false, // Hidden from normal users
            sortOrder: 3
        }
    });
    
    console.log("Tariffs updated!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
