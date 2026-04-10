/**
 * Test ma'lumotlarni qo'shish scripti
 * Ishlatish: node scripts/add-test-recommendations.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Smart Tavsiyalar - Test ma\'lumotlar qo\'shish...\n');

    // 1. Tenant ID ni olish
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        console.error('❌ Tenant topilmadi! Avval tenant yarating.');
        process.exit(1);
    }
    console.log(`✅ Tenant topildi: ${tenant.shopName} (${tenant.id})\n`);

    const tenantId = tenant.id;

    // 2. Test mahsulotlar yaratish
    console.log('📦 Test mahsulotlar yaratish...');

    const products = [
        {
            id: 'prod_demo_pepsi',
            name: 'Pepsi 1L',
            category: 'Ichimliklar',
            sellingPrice: 5000,
            costPrice: 3000,
            stock: 100,
        },
        {
            id: 'prod_demo_cola',
            name: 'Coca-Cola 1L',
            category: 'Ichimliklar',
            sellingPrice: 5000,
            costPrice: 3000,
            stock: 100,
        },
        {
            id: 'prod_demo_big_lavash',
            name: 'Big Lavash Premium',
            category: 'Taomlar',
            sellingPrice: 25000,
            costPrice: 12000,
            stock: 50,
        },
        {
            id: 'prod_demo_combo',
            name: 'Yangi Combo Set',
            category: 'Kombo',
            sellingPrice: 35000,
            costPrice: 18000,
            stock: 30,
        },
        {
            id: 'prod_demo_tiramisu',
            name: 'Tiramisu',
            category: 'Desertlar',
            sellingPrice: 12000,
            costPrice: 5000,
            stock: 20,
        },
    ];

    for (const prod of products) {
        try {
            await prisma.product.upsert({
                where: { id: prod.id },
                update: {},
                create: {
                    id: prod.id,
                    tenantId,
                    name: prod.name,
                    category: prod.category,
                    sellingPrice: prod.sellingPrice,
                    costPrice: prod.costPrice,
                    stock: prod.stock,
                    minStock: 10,
                    unit: 'dona',
                },
            });
            console.log(`  ✅ ${prod.name}`);
        } catch (error) {
            console.log(`  ⚠️  ${prod.name} (allaqachon mavjud)`);
        }
    }

    // 3. Smart Tavsiyalar yaratish
    console.log('\n🎯 Smart Tavsiyalar yaratish...');

    const recommendations = [
        {
            id: 'rec_pepsi_hit',
            recommendProductId: 'prod_demo_pepsi',
            recommendProductName: 'Pepsi 1L',
            title: 'Ichimlik qo\'shing!',
            description: 'Taom bilan Pepsi - eng yaxshi tanlov',
            badgeText: 'HIT',
            badgeColor: 'blue',
            discountType: 'percent',
            discountValue: 10,
            priority: 10,
        },
        {
            id: 'rec_cola_special',
            recommendProductId: 'prod_demo_cola',
            recommendProductName: 'Coca-Cola 1L',
            title: 'Coca-Cola tavsiya qilamiz!',
            description: 'Eng mashhur ichimlik',
            badgeText: 'TOP',
            badgeColor: 'red',
            discountType: 'none',
            discountValue: 0,
            priority: 9,
        },
        {
            id: 'rec_premium_upgrade',
            recommendProductId: 'prod_demo_big_lavash',
            recommendProductName: 'Big Lavash Premium',
            title: 'Premium versiyani sinab ko\'ring!',
            description: 'Kattaroq va mazaliroq',
            badgeText: 'PREMIUM',
            badgeColor: 'purple',
            discountType: 'none',
            discountValue: 0,
            priority: 15,
        },
        {
            id: 'rec_new_combo',
            recommendProductId: 'prod_demo_combo',
            recommendProductName: 'Yangi Combo Set',
            title: 'Yangi mahsulot!',
            description: 'Faqat bugun - 20% chegirma',
            badgeText: 'YANGI',
            badgeColor: 'orange',
            discountType: 'percent',
            discountValue: 20,
            priority: 20,
        },
        {
            id: 'rec_dessert',
            recommendProductId: 'prod_demo_tiramisu',
            recommendProductName: 'Tiramisu',
            title: 'Desertni unutmang!',
            description: 'Shirinlik 15% chegirma',
            badgeText: 'SHIRIN',
            badgeColor: 'pink',
            discountType: 'percent',
            discountValue: 15,
            priority: 12,
        },
    ];

    for (const rec of recommendations) {
        try {
            await prisma.smartRecommendation.upsert({
                where: { id: rec.id },
                update: {},
                create: {
                    id: rec.id,
                    tenantId,
                    triggerProductId: null,
                    triggerCategoryId: null,
                    recommendProductId: rec.recommendProductId,
                    recommendProductName: rec.recommendProductName,
                    title: rec.title,
                    description: rec.description,
                    badgeText: rec.badgeText,
                    badgeColor: rec.badgeColor,
                    discountType: rec.discountType,
                    discountValue: rec.discountValue,
                    priority: rec.priority,
                    showAlways: true,
                    minCartAmount: 0,
                    isActive: true,
                },
            });
            console.log(`  ✅ ${rec.title}`);
        } catch (error) {
            console.log(`  ⚠️  ${rec.title} (allaqachon mavjud)`);
        }
    }

    console.log('\n✅ Barcha test ma\'lumotlar qo\'shildi!\n');
    console.log('📊 Natijalar:');

    const totalProducts = await prisma.product.count({ where: { tenantId } });
    const totalRecs = await prisma.smartRecommendation.count({ where: { tenantId, isActive: true } });

    console.log(`  - Mahsulotlar: ${totalProducts}`);
    console.log(`  - Faol tavsiyalar: ${totalRecs}\n`);

    console.log('🚀 Keyingi qadam:');
    console.log('  1. Serverni ishga tushiring: npm run dev');
    console.log('  2. http://localhost:3005/horeca-pos ga o\'ting');
    console.log('  3. Biror taomni savatga qo\'shing');
    console.log('  4. Sahifa pastida tavsiyalar paydo bo\'ladi! 🎯\n');
}

main()
    .catch((e) => {
        console.error('❌ Xatolik:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
