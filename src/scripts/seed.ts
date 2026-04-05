import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Seed script — ensures dev tenant, user, and membership exist in the database.
 * Run with: npm run db:seed
 */
async function seed() {
  const prisma = new PrismaClient();

  try {
    console.log('🌱 Seeding development data...');

    // Dev tenant
    const tenant = await prisma.tenant.upsert({
      where: { id: 'dev-tenant-001' },
      update: {},
      create: {
        id: 'dev-tenant-001',
        slug: 'dev',
        name: 'Development',
        status: 'active',
        planTier: 'free',
      },
    });
    console.log(`  ✅ Tenant: ${tenant.name} (${tenant.id})`);

    // Dev user
    const user = await prisma.user.upsert({
      where: { id: 'dev-user-001' },
      update: {},
      create: {
        id: 'dev-user-001',
        email: 'dev@forge.local',
        name: 'Dev User',
      },
    });
    console.log(`  ✅ User: ${user.name} (${user.id})`);

    // Dev membership (OWNER)
    const membership = await prisma.tenantMembership.upsert({
      where: {
        tenantId_userId: { tenantId: tenant.id, userId: user.id },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        userId: user.id,
        role: 'OWNER',
        status: 'active',
      },
    });
    console.log(`  ✅ Membership: ${membership.role} (${membership.id})`);

    console.log('🌱 Seed complete!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
