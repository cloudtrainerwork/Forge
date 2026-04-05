import { Request, Response, NextFunction } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { ServiceFactory } from '../factories/ServiceFactory.js';
import { JwtService } from '../auth/JwtService.js';
import { AuthService } from '../services/AuthService.js';
import type {
  AuthenticatedRequest,
  ForgeJwtPayload,
  MembershipRole,
} from '../auth/types.js';
import {
  UnauthorizedError,
  ForbiddenError,
  AuthError,
} from '../auth/types.js';

const isDev = process.env.NODE_ENV !== 'production';

/** Default dev payload used when no valid token is present in dev mode */
const DEV_PAYLOAD: ForgeJwtPayload = {
  sub: 'dev-user-001',
  tid: 'dev-tenant-001',
  role: 'OWNER',
  iat: 0,
  exp: 9999999999,
};

const DEV_USER = { id: 'dev-user-001', email: 'dev@forge.local', name: 'Dev User' };

/**
 * Creates the auth middleware chain for FORGE.
 *
 * In development mode the middleware is lenient:
 *   - Missing/invalid tokens → use a default dev identity
 *   - Unknown tenant slugs  → fall back to 'system-default' tenant
 *   - User DB lookup skipped for dev users
 *
 * In production every step is strictly enforced.
 */
export function createAuthMiddleware(serviceFactory: ServiceFactory) {
  const jwtService = serviceFactory.getService<JwtService>('JwtService');
  const authService = serviceFactory.getService<AuthService>('AuthService');

  // ── 1. Extract token from Authorization header ──────────────────────────

  function extractToken(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isDev) {
        (req as any).jwtPayload = DEV_PAYLOAD;
        return next();
      }
      return next(new UnauthorizedError('Missing Authorization header'));
    }

    const token = authHeader.slice(7);
    if (!token) {
      if (isDev) {
        (req as any).jwtPayload = DEV_PAYLOAD;
        return next();
      }
      return next(new UnauthorizedError('Empty bearer token'));
    }

    try {
      const payload = jwtService.verifyToken(token);
      (req as any).jwtPayload = payload;
      next();
    } catch (err) {
      if (isDev) {
        // In dev, accept unverifiable tokens by decoding without verification
        const decoded = jwtService.decodePayload(token);
        (req as any).jwtPayload = decoded ?? DEV_PAYLOAD;
        return next();
      }
      next(err instanceof AuthError ? err : new UnauthorizedError('Invalid token'));
    }
  }

  // ── 2. Verify JWT and load user ─────────────────────────────────────────

  async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const payload: ForgeJwtPayload = (req as any).jwtPayload;
      if (!payload?.sub) {
        if (isDev) {
          (req as any).jwtPayload = DEV_PAYLOAD;
          (req as any).user = DEV_USER;
          return next();
        }
        return next(new UnauthorizedError('Token missing user identity'));
      }

      // In dev mode with a dev user, skip DB lookup
      if (isDev && payload.sub.startsWith('dev-')) {
        (req as any).user = DEV_USER;
        return next();
      }

      const user = await authService.getUserById(payload.sub);
      if (!user) {
        if (isDev) {
          (req as any).user = DEV_USER;
          return next();
        }
        return next(new UnauthorizedError('User not found'));
      }

      (req as any).user = user;
      next();
    } catch (err) {
      if (isDev) {
        // DB might not have auth tables yet — continue with dev user
        (req as any).user = DEV_USER;
        return next();
      }
      next(err instanceof AuthError ? err : new UnauthorizedError());
    }
  }

  // ── 3. Resolve tenant and set RLS session variable ──────────────────────

  function createTenantResolver(prisma: PrismaClient) {
    return async function requireTenant(req: Request, _res: Response, next: NextFunction): Promise<void> {
      try {
        const payload: ForgeJwtPayload = (req as any).jwtPayload ?? DEV_PAYLOAD;

        // Resolve tenant from URL path: /api/v1/t/:slug/...
        const slug = req.params.tenantSlug;

        if (!slug) {
          // No slug in URL → use tenant from JWT
          const tenantId = payload.tid || 'system-default';
          (req as any).tenant = {
            tenantId,
            slug: '',
            role: (payload.role as MembershipRole) || 'OWNER',
          };

          // Best-effort RLS set (may fail if not in transaction — that's OK in dev)
          try {
            await prisma.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
          } catch { /* RLS set failed — acceptable in dev with superuser */ }

          return next();
        }

        // Try to resolve slug from database
        let tenant: any = null;
        try {
          tenant = await authService.resolveTenantBySlug(slug);
        } catch {
          // DB might not have tenants table yet
        }

        if (!tenant) {
          if (isDev) {
            // In dev, use system-default tenant when slug doesn't resolve
            const tenantId = payload.tid || 'system-default';
            (req as any).tenant = {
              tenantId,
              slug,
              role: 'OWNER' as MembershipRole,
            };
            try {
              await prisma.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}'`);
            } catch { /* acceptable in dev */ }
            return next();
          }
          return next(new ForbiddenError(`Tenant "${slug}" not found`));
        }

        if (tenant.status !== 'active') {
          return next(new ForbiddenError('Tenant is suspended'));
        }

        // Defense in depth: verify the JWT tenant matches the URL tenant
        if (!isDev && payload.tid !== tenant.id) {
          return next(new ForbiddenError('Token does not match requested tenant'));
        }

        // Verify membership (skip in dev or if DB doesn't have auth tables)
        let role: MembershipRole = (payload.role as MembershipRole) || 'OWNER';
        if (!isDev) {
          role = await authService.verifyMembership(payload.sub, tenant.id);
        }

        (req as any).tenant = {
          tenantId: tenant.id,
          slug: tenant.slug,
          role,
        };

        // Set PostgreSQL session variable for RLS
        try {
          await prisma.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenant.id}'`);
        } catch { /* acceptable if superuser bypasses RLS */ }

        next();
      } catch (err) {
        if (isDev) {
          // Fallback: allow request through with system-default tenant
          (req as any).tenant = { tenantId: 'system-default', slug: '', role: 'OWNER' };
          return next();
        }
        next(err instanceof AuthError ? err : new ForbiddenError());
      }
    };
  }

  // ── Auth error handler ──────────────────────────────────────────────────

  function authErrorHandler(err: any, _req: Request, res: Response, next: NextFunction): void {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({
        error: err.code,
        message: err.message,
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next(err);
  }

  return {
    extractToken,
    requireAuth,
    createTenantResolver,
    authErrorHandler,
    /** Compose the full chain: extractToken → requireAuth */
    requireAuthentication: [extractToken, requireAuth],
  };
}
