import { injectable, inject } from 'inversify';
import type { IAuthRepository, TenantRecord } from '../adapters/IAuthRepository.js';
import { JwtService } from '../auth/JwtService.js';
import type { MembershipRole, AuthUser } from '../auth/types.js';
import { ForbiddenError, UnauthorizedError } from '../auth/types.js';

/**
 * AuthService — orchestrates sign-in, tenant creation, membership verification,
 * and JWT issuance.
 *
 * This is a singleton injected via InversifyJS.  All state is request-scoped
 * (passed as method params), not stored on the instance.
 */
@injectable()
export class AuthService {
  constructor(
    @inject('IAuthRepository') private authRepo: IAuthRepository,
    @inject('JwtService') private jwt: JwtService,
  ) {}

  // ── Provider authentication ───────────────────────────────────────────────

  /**
   * Authenticate a user from an external IdP callback.
   *
   * 1. Find or create local user by provider + providerAccountId
   * 2. Link the account
   * 3. Return the local AuthUser
   */
  async authenticateWithProvider(
    provider: string,
    providerAccountId: string,
    email: string,
    name?: string,
    image?: string,
    tokens?: { accessToken?: string; refreshToken?: string; expiresAt?: number; idToken?: string },
  ): Promise<AuthUser> {
    // Try to find existing user by provider link
    let user = await this.authRepo.findUserByProvider(provider, providerAccountId);

    if (!user) {
      // Try to find by email (user may already exist from another provider)
      user = await this.authRepo.findUserByEmail(email);

      if (!user) {
        // Brand new user
        user = await this.authRepo.createUser(email, name, image);
      }

      // Link this provider account
      await this.authRepo.linkAccount(user.id, provider, providerAccountId, tokens);
    }

    return { id: user.id, email: user.email, name: user.name ?? undefined, image: user.image ?? undefined };
  }

  // ── Tenant management ─────────────────────────────────────────────────────

  /**
   * Create a new tenant and assign the creator as OWNER.
   */
  async createTenant(name: string, slug: string, ownerUserId: string): Promise<TenantRecord> {
    const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

    // Check slug availability
    const existing = await this.authRepo.findTenantBySlug(sanitizedSlug);
    if (existing) {
      throw new ForbiddenError(`Tenant slug "${sanitizedSlug}" is already taken`);
    }

    const tenant = await this.authRepo.createTenant(sanitizedSlug, name);
    await this.authRepo.createMembership(ownerUserId, tenant.id, 'OWNER');

    return tenant;
  }

  /**
   * Verify user membership for a specific tenant.  Returns the role.
   * Throws ForbiddenError if user is not a member.
   */
  async verifyMembership(userId: string, tenantId: string): Promise<MembershipRole> {
    const membership = await this.authRepo.findMembership(userId, tenantId);
    if (!membership || membership.status !== 'active') {
      throw new ForbiddenError('You do not have access to this tenant');
    }
    return membership.role;
  }

  /** List all tenants a user has access to */
  async listUserTenants(userId: string) {
    return this.authRepo.listUserTenants(userId);
  }

  /** Resolve a tenant slug to a TenantRecord */
  async resolveTenantBySlug(slug: string): Promise<TenantRecord | null> {
    return this.authRepo.findTenantBySlug(slug);
  }

  // ── Token management ──────────────────────────────────────────────────────

  /**
   * Issue a FORGE JWT for a given user + tenant context.
   * The caller must have already verified membership.
   */
  issueToken(userId: string, tenantId: string, role: MembershipRole): string {
    return this.jwt.signToken(userId, tenantId, role);
  }

  /**
   * Full sign-in flow: authenticate provider → find/create user → pick tenant → issue JWT.
   *
   * If the user has no tenants, returns { user, token: null, tenants: [] }
   * so the frontend can redirect to tenant creation.
   */
  async signIn(
    provider: string,
    providerAccountId: string,
    email: string,
    name?: string,
    image?: string,
    tokens?: { accessToken?: string; refreshToken?: string; expiresAt?: number; idToken?: string },
  ): Promise<{
    user: AuthUser;
    tenants: Array<TenantRecord & { role: MembershipRole }>;
    token: string | null;
    activeTenant: TenantRecord | null;
  }> {
    const user = await this.authenticateWithProvider(provider, providerAccountId, email, name, image, tokens);
    const tenants = await this.listUserTenants(user.id);

    if (tenants.length === 0) {
      return { user, tenants: [], token: null, activeTenant: null };
    }

    // Auto-select first tenant
    const activeTenant = tenants[0];
    const token = this.issueToken(user.id, activeTenant.id, activeTenant.role);

    return { user, tenants, token, activeTenant };
  }

  /**
   * Switch the active tenant context — verify membership and issue new token.
   */
  async switchTenant(userId: string, tenantId: string): Promise<{ token: string; role: MembershipRole }> {
    const role = await this.verifyMembership(userId, tenantId);
    const token = this.issueToken(userId, tenantId, role);
    return { token, role };
  }

  // ── User lookup ───────────────────────────────────────────────────────────

  async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await this.authRepo.findUserById(userId);
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name ?? undefined, image: user.image ?? undefined };
  }
}
