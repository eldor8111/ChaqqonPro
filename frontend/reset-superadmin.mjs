import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const deleted = await p.superAdmin.deleteMany({});
    console.log('Deleted superadmins:', deleted.count);
    
    // Test user parolini almashtirish (qulaylik uchun)
    const bcryptjs = await import('bcryptjs');
    const hash = await bcryptjs.default.hash('123456', 10);
    
    await p.tenant.updateMany({
        where: { adminUsername: 'ali' },
        data: { adminPasswordHash: hash }
    });
    console.log('Tenant "ali" paroli "123456" ga o\'zgartirildi.');

    await p.$disconnect();
}
main().catch(console.error);
