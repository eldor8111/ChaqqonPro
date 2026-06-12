import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
import bcryptjs from 'bcryptjs';

async function main() {
    const phone = '+998889118171'; // Screenshotdagi raqam
    const password = 'eldor2580';  // Screenshotdagi parol
    const hash = await bcryptjs.hash(password, 10);
    
    // Eski foydalanuvchi bo'lsa o'chirish (tozalash)
    await p.platformUser.deleteMany({ where: { phone } });

    const user = await p.platformUser.create({
        data: {
            name: 'Eldor (Super Admin)',
            phone: phone,
            passwordHash: hash,
            role: 'MASTER',
            permissions: JSON.stringify(["all"])
        }
    });

    console.log('Super Admin (PlatformUser) yaratildi:', user);
    await p.$disconnect();
}
main().catch(console.error);
