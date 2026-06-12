import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

try {
    const staffCount = await p.staff.count();
    console.log('✅ DB ulanishi muvaffaqiyatli!');
    console.log('   Staff soni:', staffCount);
    
    const tenants = await p.tenant.count();
    console.log('   Tenant soni:', tenants);
    
    if (staffCount > 0) {
        const sample = await p.staff.findFirst({ select: { username: true, role: true, status: true } });
        console.log('   Birinchi xodim:', sample);
    }
} catch (e) {
    console.error('❌ DB xatosi:', e.message);
    console.error('   Kod:', e.code);
} finally {
    await p.$disconnect();
}
