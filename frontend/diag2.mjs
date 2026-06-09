import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, status: true, shopCode: true } });
console.log('Tenantlar:', JSON.stringify(tenants, null, 2));

const aziz = await prisma.staff.findFirst({ where: { username: 'aziz' } });
const keys = Object.keys(aziz || {});
console.log('\nStaff maydonlari:', keys.join(', '));
console.log('tenantId:', aziz?.tenantId);
const pw = aziz?.password;
console.log('password:', pw ? String(pw).substring(0,20) + '...' : String(pw));

const tenant = await prisma.tenant.findUnique({ where: { id: aziz?.tenantId || '' } });
console.log('Tenant topildi:', tenant?.name || 'TOPILMADI!');

const staffIds = await prisma.staff.findMany({ select: { tenantId: true } });
const uniq = [...new Set(staffIds.map(s => s.tenantId))];
console.log('\nStaffning barcha tenantIdlari:', uniq);
const tids = tenants.map(t => t.id);
uniq.forEach(uid => {
  console.log(`  "${uid}" tenant jadvalida: ${tids.includes(uid) ? 'BORU' : 'YOQ!'}`);
});
