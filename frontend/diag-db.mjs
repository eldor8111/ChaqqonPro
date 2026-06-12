import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Barcha tenantlarni ko'rsatish
console.log('\n📋 Barcha tenantlar:');
const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, status: true, shopCode: true } });
tenants.forEach(t => console.log(`   - ID:"${t.id}" name:"${t.name}" status:${t.status} shopCode:${t.shopCode}`));

// Staff to'liq ma'lumotlari
console.log('\n👤 Aziz xodimining to\'liq ma\'lumoti:');
const aziz = await prisma.staff.findFirst({ where: { username: 'aziz' } });
console.log('   tenantId:', aziz?.tenantId);
console.log('   password field:', aziz?.password !== undefined ? `"${String(aziz?.password).substring(0,30)}..."` : 'YO\'Q (undefined)');
console.log('   status:', aziz?.status);

// Prisma schema da password field bormi?
console.log('\n📌 Staff model maydonlari:');
const keys = aziz ? Object.keys(aziz) : [];
keys.forEach(k => {
    const val = aziz[k];
    const display = val === null ? 'null' : val === undefined ? 'undefined' : typeof val === 'string' && val.length > 50 ? val.substring(0,50)+'...' : String(val);
    console.log(`   ${k}: ${display}`);
});

// Tenant ID check
const tenantId = aziz?.tenantId;
console.log('\n🔍 Tenant axtarish ID:', tenantId);
const tenant = await prisma.tenant.findUnique({ where: { id: tenantId || '' } });
console.log('   Topildi:', tenant ? `✅ ${tenant.name}` : '❌ Topilmadi');

// Barcha tenant IDlar va staff tenantId lar mos keladimi?
console.log('\n📊 ID moslik tekshirish:');
const staffTenantIds = [...new Set(await prisma.staff.findMany({ select: { tenantId: true } }).then(s => s.map(x => x.tenantId)))];
const tenantIds = tenants.map(t => t.id);
staffTenantIds.forEach(sid => {
    const exists = tenantIds.includes(sid);
    console.log(`   Staff tenantId "${sid}" → ${exists ? '✅ Tenant mavjud' : '❌ Tenant YO\'Q!'}`);
});

await prisma.$disconnect();
