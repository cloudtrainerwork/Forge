import { PrismaClient } from '@prisma/client';
import type {
  IAuthRepository,
  UserRecord,
  TenantRecord,
  MembershipRecord,
  AccountRecord,
} from '../../adapters/IAuthRepository.js';
import type { MembershipRole } from '../../auth/types.js';

/**
 * Prisma-backed auth repository.
 *
 * NOTE: Auth tables (users, tenants, accounts, sessions, tenant_memberships)
 * are NOT subject to RLS — they are system-wide tables accessed before tenant
 * context is established.  Only tenant-owned domain tables use RLS.
 *
 * NOTE: Prisma models for auth tables are defined in schema.prisma but the
 * generated client may not include them until `prisma generate` is re-run.
 * We cast through `any` for these models until then.
 */
export class AuthRepository implements IAuthRepository {
  private db: any; // Cast for auth models not yet in generated Prisma client
  constructor(private prisma: PrismaClient) {
    this.db = prisma as any;
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  async findUserById(id: string): Promise<UserRecord | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.db.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findUserByProvider(provider: string, providerAccountId: string): Promise<UserRecord | null> {
    const account = await this.db.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });
    return account?.user ?? null;
  }

  async createUser(email: string, name?: string, image?: string): Promise<UserRecord> {
    return this.db.user.create({
      data: {
        email: email.toLowerCase(),
        name: name ?? null,
        image: image ?? null,
      },
    });
  }

  // ── Accounts ──────────────────────────────────────────────────────────────

  async linkAccount(
    userId: string,
    provider: string,
    providerAccountId: string,
    tokens?: { accessToken?: string; refreshToken?: string; expiresAt?: number; idToken?: string },
  ): Promise<AccountRecord> {
    return this.db.account.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      create: {
        userId,
        provider,
        providerAccountId,
        accessToken: tokens?.accessToken ?? null,
        refreshToken: tokens?.refreshToken ?? null,
        expiresAt: tokens?.expiresAt ?? null,
        idToken: tokens?.idToken ?? null,
      },
      update: {
        accessToken: tokens?.accessToken,
        refreshToken: tokens?.refreshToken,
        expiresAt: tokens?.expiresAt,
        idToken: tokens?.idToken,
      },
    });
  }

  // ── Tenants ───────────────────────────────────────────────────────────────

  async findTenantById(id: string): Promise<TenantRecord | null> {
    return this.db.tenant.findUnique({ where: { id } });
  }

  async findTenantBySlug(slug: string): Promise<TenantRecord | null> {
    return this.db.tenant.findUnique({ where: { slug: slug.toLowerCase() } });
  }

  async createTenant(slug: string, name: string): Promise<TenantRecord> {
    return this.db.tenant.create({
      data: { slug: slug.toLowerCase(), name },
    });
  }

  // ── Memberships ───────────────────────────────────────────────────────────

  async findMembership(userId: string, tenantId: string): Promise<MembershipRecord | null> {
    const row = await this.db.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    return row ? { ...row, role: row.role as MembershipRole } : null;
  }

  async createMembership(userId: string, tenantId: string, role: MembershipRole): Promise<MembershipRecord> {
    const row = await this.db.tenantMembership.create({
      data: { userId, tenantId, role },
    });
    return { ...row, role: row.role as MembershipRole };
  }

  async listUserTenants(userId: string): Promise<Array<TenantRecord & { role: MembershipRole }>> {
    const memberships = await this.db.tenantMembership.findMany({
      where: { userId, status: 'active' },
      include: { tenant: true },
    });

    return memberships.map(m => ({
      ...m.tenant,
      role: m.role as MembershipRole,
    }));
  }
}
