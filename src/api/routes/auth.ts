import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import { AuthService } from '../../services/AuthService.js';
import { JwtService } from '../../auth/JwtService.js';
import type { AuthenticatedRequest } from '../../auth/types.js';
import { AuthError } from '../../auth/types.js';

/**
 * Auth routes — public (no auth middleware required).
 *
 * POST /auth/callback   — handle IdP callback, create/find user, issue JWT
 * POST /auth/tenant     — create a new tenant (requires auth)
 * GET  /auth/tenants    — list user's tenants (requires auth)
 * POST /auth/switch     — switch active tenant context (requires auth)
 */
export default function authRoutes(serviceFactory: ServiceFactory): Router {
  const router = Router();
  const authService = serviceFactory.getService<AuthService>('AuthService');
  const jwtService = serviceFactory.getService<JwtService>('JwtService');

  // ── POST /auth/callback — Provider sign-in ────────────────────────────────
  router.post('/callback', async (req: Request, res: Response) => {
    try {
      const { provider, providerAccountId, email, name, image, tokens } = req.body;

      if (!provider || !providerAccountId || !email) {
        return res.status(400).json({
          error: 'VALIDATION',
          message: 'provider, providerAccountId, and email are required',
        });
      }

      // ── Dev-mode: seed tenant/user in DB so FK constraints work ──────
      if (provider === 'dev' && process.env.NODE_ENV !== 'production') {
        const devUserId = 'dev-user-001';
        const devTenantId = 'dev-tenant-001';
        const devEmail = email || 'dev@forge.local';
        const devName = name || 'Dev User';

        // Ensure dev tenant, user, and membership exist in the database
        try {
          const prisma = serviceFactory.getService<PrismaClient>('PrismaClient');

          await prisma.tenant.upsert({
            where: { id: devTenantId },
            update: {},
            create: { id: devTenantId, slug: 'dev', name: 'Development', status: 'active', planTier: 'free' },
          });

          await prisma.user.upsert({
            where: { id: devUserId },
            update: { name: devName },
            create: { id: devUserId, email: devEmail, name: devName },
          });

          await prisma.tenantMembership.upsert({
            where: { tenantId_userId: { tenantId: devTenantId, userId: devUserId } },
            update: {},
            create: { tenantId: devTenantId, userId: devUserId, role: 'OWNER', status: 'active' },
          });
        } catch (seedErr) {
          console.warn('⚠️  Dev seed warning (non-fatal):', seedErr instanceof Error ? seedErr.message : seedErr);
        }

        const devToken = jwtService.signToken(devUserId, devTenantId, 'OWNER');

        return res.json({
          data: {
            user: { id: devUserId, email: devEmail, name: devName },
            tenants: [{ id: devTenantId, slug: 'dev', name: 'Development', role: 'OWNER' }],
            token: devToken,
            activeTenant: { id: devTenantId, slug: 'dev', name: 'Development', role: 'OWNER' },
          },
        });
      }

      const result = await authService.signIn(
        provider, providerAccountId, email, name, image, tokens,
      );

      res.json({
        data: {
          user: result.user,
          tenants: result.tenants,
          token: result.token,
          activeTenant: result.activeTenant,
        },
      });
    } catch (err) {
      if (err instanceof AuthError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      console.error('Auth callback error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: 'Authentication failed' });
    }
  });

  // ── POST /auth/tenant — Create new tenant ─────────────────────────────────
  // Requires: Authorization header with valid JWT
  router.post('/tenant', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const payload = jwtService.verifyToken(authHeader.slice(7));
      const { name, slug } = req.body;

      if (!name || !slug) {
        return res.status(400).json({
          error: 'VALIDATION',
          message: 'name and slug are required',
        });
      }

      const tenant = await authService.createTenant(name, slug, payload.sub);

      // Issue a new token scoped to the new tenant
      const token = authService.issueToken(payload.sub, tenant.id, 'OWNER');

      res.status(201).json({
        data: { tenant, token },
      });
    } catch (err) {
      if (err instanceof AuthError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      console.error('Create tenant error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to create tenant' });
    }
  });

  // ── GET /auth/tenants — List user's tenants ───────────────────────────────
  router.get('/tenants', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const payload = jwtService.verifyToken(authHeader.slice(7));
      const tenants = await authService.listUserTenants(payload.sub);

      res.json({ data: tenants });
    } catch (err) {
      if (err instanceof AuthError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      console.error('List tenants error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to list tenants' });
    }
  });

  // ── POST /auth/switch — Switch active tenant ──────────────────────────────
  router.post('/switch', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      }

      const payload = jwtService.verifyToken(authHeader.slice(7));
      const { tenantId } = req.body;

      if (!tenantId) {
        return res.status(400).json({ error: 'VALIDATION', message: 'tenantId is required' });
      }

      const result = await authService.switchTenant(payload.sub, tenantId);

      res.json({ data: result });
    } catch (err) {
      if (err instanceof AuthError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      console.error('Switch tenant error:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to switch tenant' });
    }
  });

  return router;
}
