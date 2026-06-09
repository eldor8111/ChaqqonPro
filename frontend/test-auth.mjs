import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function testAuth() {
  try {
    const tenantId = 'cmq2wu3550001v5y7jxi591yl'; // Aziz's tenant
    const username = 'aziz';
    const password = '123'; // Some password

    const staff = await prisma.staff.findFirst({
        where: { tenantId, username, status: "active" },
    });
    console.log('Staff found:', !!staff);
    if (!staff) return;

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    console.log('Tenant found:', !!tenant);
    if (!tenant) return;

    console.log('Verifying password...');
    const passwordValid = await bcryptjs.compare(password, staff.passwordHash);
    console.log('Password valid:', passwordValid);

  } catch (e) {
    console.error('Error during auth:', e);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();
