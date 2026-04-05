import type { MembershipRole } from '../auth/types.js';

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
  createdAt: Date;
}

export interface TenantRecord {
  id: string;
  slug: string;
  name: string;
  status: string;
  planTier: string;
  createdAt: Date;
}

export interface MembershipRecord {
  id: string;
  tenantId: string;
  userId: string;
  role: MembershipRole;
  status: string;
  createdAt: Date;
}

export interface AccountRecord {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
}

// ── Interface ──────────────────────────────────────────────────────────────

export interface IAuthRepository {
  // Users
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserByProvider(provider: string, providerAccountId: string): Promise<UserRecord | null>;
  createUser(email: string, name?: string, image?: string): Promise<UserRecord>;

  // Accounts (external IdP links)
  linkAccount(userId: string, provider: string, providerAccountId: string, tokens?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    idToken?: string;
  }): Promise<AccountRecord>;

  // Tenants
  findTenantById(id: string): Promise<TenantRecord | null>;
  findTenantBySlug(slug: string): Promise<TenantRecord | null>;
  createTenant(slug: string, name: string): Promise<TenantRecord>;

  // Memberships
  findMembership(userId: string, tenantId: string): Promise<MembershipRecord | null>;
  createMembership(userId: string, tenantId: string, role: MembershipRole): Promise<MembershipRecord>;
  listUserTenants(userId: string): Promise<Array<TenantRecord & { role: MembershipRole }>>;
}
