import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    // Clear existing data
    await prisma.session.deleteMany({});
    await prisma.transactionItem.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.kDSOrder.deleteMany({});
    await prisma.ubtReservation.deleteMany({});
    await prisma.ubtTable.deleteMany({});
    await prisma.pharmacyDrug.deleteMany({});
    await prisma.inventoryWriteoff.deleteMany({});
    await prisma.inventoryCount.deleteMany({});
    await prisma.inventoryTransfer.deleteMany({});
    await prisma.inventoryExpenditure.deleteMany({});
    await prisma.inventoryReceipt.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.staff.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.superAdmin.deleteMany({});

    // Create super admin
    const superAdminPasswordHash = await bcryptjs.hash("superadmin123", 10);
    await prisma.superAdmin.create({
        data: {
            passwordHash: superAdminPasswordHash,
        },
    });

    console.log("✅ Super Admin created");

    // Create tenants
    const tenant1PasswordHash = await bcryptjs.hash("ali123", 10);
    const tenant2PasswordHash = await bcryptjs.hash("fatima123", 10);
    const tenant3PasswordHash = await bcryptjs.hash("yusuf123", 10);
    const ubtPasswordHash  = await bcryptjs.hash("zimzim123", 10);

    const tenant1 = await prisma.tenant.create({
        data: {
            shopCode: "SHOP001",
            shopName: "Toshkent Bozori #1",
            ownerName: "Ali Karimov",
            phone: "+998 90 123 45 67",
            email: "ali@example.com",
            address: "Toshkent, Mirzo Ulug'bek tumani",
            plan: "pro",
            status: "active",
            adminUsername: "ali",
            adminPasswordHash: tenant1PasswordHash,
        },
    });

    const tenant2 = await prisma.tenant.create({
        data: {
            shopCode: "SHOP002",
            shopName: "Samarqand Do'koni",
            ownerName: "Fatima Rahimova",
            phone: "+998 91 234 56 78",
            email: "fatima@example.com",
            address: "Samarqand, Markaziy bazaar",
            plan: "basic",
            status: "active",
            adminUsername: "fatima",
            adminPasswordHash: tenant2PasswordHash,
        },
    });

    const tenant3 = await prisma.tenant.create({
        data: {
            shopCode: "SHOP003",
            shopName: "Andijon Do'koni",
            ownerName: "Yusuf Sultanov",
            phone: "+998 92 345 67 89",
            email: "yusuf@example.com",
            address: "Andijon, Sayyohlar ko'chasi",
            plan: "starter",
            status: "trial",
            adminUsername: "yusuf",
            adminPasswordHash: tenant3PasswordHash,
        },
    });

    const ubtTenant = await prisma.tenant.create({
        data: {
            shopCode: "UBT001",
            shopName: "ZIM-ZIM Restaurant",
            ownerName: "Sardor Yusupov",
            phone: "+998 99 111 22 33",
            email: "zimzim@example.com",
            address: "Toshkent, Chilonzor tumani",
            plan: "pro",
            status: "active",
            adminUsername: "zimzim",
            adminPasswordHash: ubtPasswordHash,
            settings: JSON.stringify({ shopType: "ubt" }),
        },
    });

    console.log("✅ 4 Tenants created (including UBT: ZIM-ZIM)");

    // Create products for each tenant
    const productData = [
        {
            name: "Coca-Cola 0.5L",
            sku: "CK-001",
            barcode: "4900000012345",
            category: "Ichimliklar",
            sellingPrice: 12000,
            costPrice: 6000,
            minStock: 20,
            unit: "dona",
        },
        {
            name: "Lay's Original 75g",
            sku: "LAY-001",
            barcode: "4900000054321",
            category: "Snack",
            sellingPrice: 15000,
            costPrice: 5500,
            minStock: 30,
            unit: "dona",
        },
        {
            name: "Lipton Do'stlik",
            sku: "LIP-001",
            barcode: "4900000098765",
            category: "Ichimliklar",
            sellingPrice: 9000,
            costPrice: 4500,
            minStock: 15,
            unit: "paket",
        },
        {
            name: "Red Bull 250ml",
            sku: "RB-001",
            barcode: "4900000111222",
            category: "Energetik",
            sellingPrice: 35000,
            costPrice: 18000,
            minStock: 10,
            unit: "dona",
        },
        {
            name: "Nestle KitKat 4F",
            sku: "KIT-001",
            barcode: "4900000333444",
            category: "Shokolad",
            sellingPrice: 18000,
            costPrice: 8000,
            minStock: 25,
            unit: "dona",
        },
        {
            name: "Parmalat sut 1L",
            sku: "PAR-001",
            barcode: "4900000555666",
            category: "Sut mahsulotlari",
            sellingPrice: 22000,
            costPrice: 6500,
            minStock: 10,
            unit: "dona",
        },
        {
            name: "Dove Shampoo 400ml",
            sku: "DOV-001",
            barcode: "4900000777888",
            category: "Gigiyena",
            sellingPrice: 55000,
            costPrice: 28000,
            minStock: 8,
            unit: "dona",
        },
        {
            name: "Chiqin Makaron",
            sku: "CHQ-001",
            barcode: "4900000999000",
            category: "Qisqa ovqatlar",
            sellingPrice: 8000,
            costPrice: 3000,
            minStock: 50,
            unit: "paket",
        },
    ];

    for (const tenant of [tenant1, tenant2, tenant3]) {
        for (const product of productData) {
            await prisma.product.create({
                data: {
                    tenantId: tenant.id,
                    ...product,
                    stock: Math.floor(Math.random() * 100) + 20,
                },
            });
        }
    }

    console.log("✅ Products created for all tenants");

    // Create staff for each tenant
    const staffData = [
        {
            name: "Aziz Yusupov",
            role: "Kassir",
            username: "aziz",
            permissions: JSON.stringify(["pos", "discounts", "refunds"]),
            branch: "Filial #1",
        },
        {
            name: "Nilufar Karimova",
            role: "Kassir",
            username: "nilufar",
            permissions: JSON.stringify(["pos", "discounts", "refunds"]),
            branch: "Filial #1",
        },
        {
            name: "Sherzod Holiqov",
            role: "Omborchi",
            username: "sherzod",
            permissions: JSON.stringify(["inventory", "stockEdit"]),
            branch: "Ombo",
        },
        {
            name: "Alisher Karimov",
            role: "Menejer",
            username: "alisher",
            permissions: JSON.stringify([
                "pos",
                "inventory",
                "crm",
                "reports",
                "discounts",
                "refunds",
                "stockEdit",
            ]),
            branch: "Filial #1",
        },
        {
            name: "Gulnora Raximova",
            role: "Kassir",
            username: "gulnora",
            permissions: JSON.stringify(["pos", "discounts", "refunds"]),
            branch: "Filial #2",
        },
    ];

    for (const tenant of [tenant1, tenant2, tenant3]) {
        for (const staff of staffData) {
            const passwordHash = await bcryptjs.hash(staff.username + "123", 10);
            await prisma.staff.create({
                data: {
                    tenantId: tenant.id,
                    name: staff.name,
                    role: staff.role,
                    username: staff.username,
                    passwordHash,
                    permissions: staff.permissions,
                    branch: staff.branch,
                    status: "active",
                },
            });
        }
    }

    console.log("✅ Staff created for all tenants");

    // Create customers for each tenant
    const customerData = [
        { name: "Akmal Mahmudov", phone: "+998 90 111 22 33", segment: "VIP" },
        { name: "Nodira Yusupova", phone: "+998 91 222 33 44", segment: "regular" },
        { name: "Bobur Raximov", phone: "+998 92 333 44 55", segment: "regular" },
        { name: "Laylo Abdullayeva", phone: "+998 93 444 55 66", segment: "new" },
        { name: "Qodirjon Aripov", phone: "+998 94 555 66 77", segment: "VIP" },
    ];

    for (const tenant of [tenant1, tenant2, tenant3]) {
        for (const customer of customerData) {
            await prisma.customer.create({
                data: {
                    tenantId: tenant.id,
                    ...customer,
                    bonusPoints: Math.floor(Math.random() * 10000),
                    totalPurchases: Math.floor(Math.random() * 5000000),
                },
            });
        }
    }

    console.log("✅ Customers created for all tenants");

    // Create sample transactions for tenant1
    const products = await prisma.product.findMany({ where: { tenantId: tenant1.id } });
    const staffMembers = await prisma.staff.findMany({ where: { tenantId: tenant1.id } });
    const customers = await prisma.customer.findMany({ where: { tenantId: tenant1.id } });

    if (products.length > 0 && staffMembers.length > 0) {
        for (let i = 0; i < 5; i++) {
            const randomProducts = products.sort(() => 0.5 - Math.random()).slice(0, 3);
            let totalAmount = 0;

            const transaction = await prisma.transaction.create({
                data: {
                    tenantId: tenant1.id,
                    amount: 0, // Will be updated after adding items
                    method: ["Naqd pul", "Plastik karta", "QR kod"][Math.floor(Math.random() * 3)],
                    status: "completed",
                    customerId: customers[i]?.id || null,
                    kassirId: staffMembers[0].id,
                },
            });

            for (const product of randomProducts) {
                const quantity = Math.floor(Math.random() * 5) + 1;
                const itemTotal = product.sellingPrice * quantity;
                totalAmount += itemTotal;

                await prisma.transactionItem.create({
                    data: {
                        transactionId: transaction.id,
                        productId: product.id,
                        name: product.name,
                        quantity,
                        price: product.sellingPrice,
                        discount: 0,
                        total: itemTotal,
                    },
                });
            }

            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { amount: totalAmount },
            });
        }
    }

    console.log("✅ Sample transactions created");

    // ===== ZIM-ZIM UBT Staff =====
    const ubtStaffData = [
        { name: "Kamoliddin Tursunov", role: "Ofitsiant", username: "kamoliddin", branch: "Birinchi qavat", permissions: ["pos"] },
        { name: "Navruz Xoliqov",      role: "Ofitsiant", username: "navruz",      branch: "zal",           permissions: ["pos"] },
        { name: "Botir Raxmatullayev", role: "Ofitsiant", username: "botir",       branch: "Ikkinchi qavat",permissions: ["pos"] },
        { name: "Dilnoza Yusupova",    role: "Kassir",    username: "dilnoza",     branch: "Kassa",         permissions: ["pos", "discounts", "refunds"] },
        { name: "Sardor Admin",        role: "Administrator", username: "admin_ubt", branch: "Bosh ofis",
          permissions: ["pos","inventory","crm","reports","staff","discounts","refunds","priceEdit","stockEdit"] },
    ];

    for (const s of ubtStaffData) {
        const passwordHash = await bcryptjs.hash(s.username + "123", 10);
        await prisma.staff.create({
            data: {
                tenantId: ubtTenant.id,
                name: s.name, role: s.role, username: s.username,
                passwordHash, permissions: JSON.stringify(s.permissions),
                branch: s.branch, status: "active",
            },
        });
    }
    console.log("✅ ZIM-ZIM UBT staff created");

    // ===== ZIM-ZIM UBT Tables =====
    const ubtLayout = [
        { section: "Birinchi qavat", count: 16 },
        { section: "zal",            count: 3  },
        { section: "Ikkinchi qavat", count: 4  },
        { section: "Podval",         count: 5  },
    ];

    for (const { section, count } of ubtLayout) {
        for (let i = 1; i <= count; i++) {
            await prisma.ubtTable.create({
                data: {
                    tenantId: ubtTenant.id,
                    tableNumber: String(i),
                    capacity: 4,
                    status: "free",
                    section,
                },
            });
        }
    }
    console.log("✅ ZIM-ZIM UBT tables created (28 tables, 4 sections)");

    // ===== Old tenant1 UBT tables (simple) =====
    for (let i = 1; i <= 8; i++) {
        await prisma.ubtTable.create({
            data: {
                tenantId: tenant1.id,
                tableNumber: String(i),
                capacity: [2, 2, 4, 4, 6, 6, 8, 8][i - 1],
                status: "free",
                section: ["Uchun", "Uchun", "Orta", "Orta", "Orta", "Tashqarisi", "Tashqarisi", "Tashqarisi"][i - 1],
            },
        });
    }
    console.log("✅ Tenant1 UBT tables created");

    // Create pharmacy drugs for tenant1
    const drugData = [
        {
            name: "Paracetamol 500mg",
            dosage: "500mg",
            manufacturer: "Pharma Co",
            sellingPrice: 12000,
            costPrice: 4000,
            requiresPrescription: false,
        },
        {
            name: "Aspirin 100mg",
            dosage: "100mg",
            manufacturer: "Bayer",
            sellingPrice: 18000,
            costPrice: 6000,
            requiresPrescription: false,
        },
        {
            name: "Amoxicillin 500mg",
            dosage: "500mg",
            manufacturer: "Pharma Co",
            sellingPrice: 45000,
            costPrice: 15000,
            requiresPrescription: true,
        },
    ];

    for (const drug of drugData) {
        await prisma.pharmacyDrug.create({
            data: {
                tenantId: tenant1.id,
                ...drug,
                stock: Math.floor(Math.random() * 100) + 10,
                category: "Dori",
            },
        });
    }

    console.log("✅ Pharmacy drugs created");

    console.log("\n🎉 All seed data created successfully!");
    console.log("\n📝 Demo Credentials:");
    console.log("Super Admin: password = 'superadmin123'");
    console.log("SHOP001: ali / ali123 (Pro plan)");
    console.log("SHOP002: fatima / fatima123 (Basic plan)");
    console.log("SHOP003: yusuf / yusuf123 (Starter plan - Trial)");
    console.log("UBT001 (ZIM-ZIM): zimzim / zimzim123 (Pro plan, UBT)");
    console.log("  Ofitsiantlar: kamoliddin/kamoliddin123, navruz/navruz123, botir/botir123");
    console.log("  Kassir: dilnoza/dilnoza123");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
