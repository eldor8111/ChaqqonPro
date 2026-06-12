import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

console.log('\n🔍 SuperAdmin jadvalini tekshirish...');
const superAdmins = await p.superAdmin.findMany({ select: { id: true } });
console.log('SuperAdmin yozuvlari:', superAdmins.length === 0 ? '❌ YO\'Q (bo\'sh)' : `✅ ${superAdmins.length} ta`);

console.log('\n🔍 PlatformUser jadvalini tekshirish...');
const platformUsers = await p.platformUser.findMany({ 
    select: { id: true, name: true, phone: true, role: true, status: true } 
});
if (platformUsers.length === 0) {
    console.log('PlatformUser: ❌ YO\'Q (bo\'sh)');
} else {
    platformUsers.forEach(u => {
        console.log(`  - ${u.name} | ${u.phone} | ${u.role} | ${u.status}`);
    });
}

console.log('\n🔍 Sessionlarni tekshirish...');
const sessions = await p.session.findMany({ 
    select: { role: true, expiresAt: true, userId: true } 
});
if (sessions.length === 0) {
    console.log('Session: ❌ YO\'Q');
} else {
    sessions.forEach(s => {
        const expired = new Date(s.expiresAt) < new Date();
        console.log(`  - userId:${s.userId} | role:${s.role} | ${expired ? '❌ MUDDATI TUGAGAN' : '✅ Aktiv'}`);
    });
}

await p.$disconnect();
