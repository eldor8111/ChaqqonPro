// Login API ni to'g'ridan simulyatsiya qilish
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';

const prisma = new PrismaClient();

const JWT_SECRET = '62092766183fdc73e2af7eb63ecf891d3c22613ea51647dffdc900880abcfaa4';

async function testLogin(username, password) {
    console.log(`\n🔍 Login test: "${username}" / "${password}"`);
    try {
        const searchLower = username.toLowerCase().trim();
        
        const allActiveStaff = await prisma.staff.findMany({
            where: { status: 'active' },
        });

        console.log(`   Faol xodimlar soni: ${allActiveStaff.length}`);
        
        const staffList = allActiveStaff.filter(s => {
            if (s.username?.toLowerCase().trim() === searchLower) return true;
            if (s.name?.toLowerCase().trim() === searchLower) return true;
            return false;
        });

        console.log(`   "${username}" bo'yicha topilganlar: ${staffList.length}`);
        if (staffList.length > 0) {
            staffList.forEach(s => console.log(`     - ${s.username} (${s.role}) tenantId: ${s.tenantId}`));
        }

        if (staffList.length === 0) {
            console.log('   ❌ Xodim topilmadi');
            return;
        }

        // authenticateKassir ni simulyatsiya
        for (const staff of staffList) {
            // Check password
            const tenant = await prisma.tenant.findUnique({ where: { id: staff.tenantId } });
            console.log(`   Tenant: ${tenant?.name} (${tenant?.status})`);
            console.log(`   Staff parol (saqlangan): "${staff.password}"`);
            console.log(`   Kiritilgan parol: "${password}"`);
            
            const bcrypt = await import('bcryptjs');
            const match = await bcrypt.default.compare(password, staff.password || '');
            console.log(`   Parol mos keladi: ${match}`);
        }

    } catch (e) {
        console.error('❌ Xato:', e.message, e.stack?.split('\n').slice(0,3).join('\n'));
    }
}

// Barcha faol xodimlarni ko'rsatish
const staff = await prisma.staff.findMany({ where: { status: 'active' }, select: { username: true, name: true, role: true, tenantId: true } });
console.log('\n📋 Barcha faol xodimlar:');
staff.forEach(s => console.log(`   - username:"${s.username}" name:"${s.name}" role:${s.role}`));

await testLogin('aziz', '1234');
await testLogin('aziz', 'aziz123');

await prisma.$disconnect();
