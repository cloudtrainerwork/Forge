import { Request } from 'express';

// ── Membership roles ───────────────────────────────────────────────────────

export type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

/** Returns true if `actual` role is at least `required` level */
export function hasMinRole(actual: MembershipRole, required: MembershipRole): boolean {
  return ROLE_HIERARCHY[actual] >= ROLE_HIERARCHY[required];
}

// ── Auth user (attached to req after token validation) ─────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

// ── Tenant context (attached to req after tenant resolution) ───────────────

export interface TenantContext {
  tenantId: string;
  slug: string;
  role: MembershipRole;
}

// ── JWT payload shape ──────────────────────────────────────────────────────

export interface ForgeJwtPayload {
  /** User ID */
  sub: string;
  /** Tenant ID */
  tid: string;
  /** Membership role */
  role: MembershipRole;
  /** Issued at (epoch seconds) */
  iat: number;
  /** Expires at (epoch seconds) */
  exp: number;
}

// ── Extended Express Request ───────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  tenant: TenantContext;
  jwtPayload: ForgeJwtPayload;
}

// ── Auth errors ────────────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 401,
    public readonly code: string = 'AUTH_ERROR',
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class TokenExpiredError extends AuthError {
  constructor() {
    super('Token has expired', 401, 'TOKEN_EXPIRED');
    this.name = 'TokenExpiredError';
  }
}
