import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import type { AuthenticatedRequest, MembershipRole } from '../../auth/types.js';
import { hasMinRole, ForbiddenError } from '../../auth/types.js';

function getAuth(req: Request) {
  const authReq = req as AuthenticatedRequest;
  return {
    userId: authReq.user?.id || 'dev-user-001',
    tenantId: authReq.tenant?.tenantId || 'system-default',
    tenantRole: (authReq.tenant?.role || 'OWNER') as MembershipRole,
  };
}

/** Middleware: require ADMIN or OWNER tenant role */
function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const { tenantRole } = getAuth(req);
  if (!hasMinRole(tenantRole, 'ADMIN')) {
    return next(new ForbiddenError('Admin access required'));
  }
  next();
}

export default function adminRoutes(serviceFactory: ServiceFactory): Router {
  const router = Router();
  router.use(requireAdmin);

  const prisma = () => serviceFactory.getService<PrismaClient>('PrismaClient');

  /** GET /members — list all tenant members */
  router.get('/members', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getAuth(req);
      const members = await prisma().tenantMembership.findMany({
        where: { tenantId },
        include: { user: { select: { id: true, email: true, name: true, image: true } } },
        orderBy: { createdAt: 'asc' },
      });
      res.json({
        data: members.map(m => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          status: m.status,
          createdAt: m.createdAt,
          user: (m as any).user,
        })),
      });
    } catch (err) { next(err); }
  });

  /** POST /members/invite — invite a user by email */
  router.post('/members/invite', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getAuth(req);
      const { email, role } = req.body;
      if (!email) return res.status(400).json({ error: 'email is required' });

      // Find or create user stub
      let user = await prisma().user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma().user.create({
          data: { email, name: email.split('@')[0] },
        });
      }

      // Check existing membership
      const existing = await prisma().tenantMembership.findUnique({
        where: { tenantId_userId: { tenantId, userId: user.id } },
      });
      if (existing) return res.status(409).json({ error: 'User is already a member' });

      const membership = await prisma().tenantMembership.create({
        data: {
          tenantId,
          userId: user.id,
          role: role || 'MEMBER',
          status: 'invited',
        },
      });
      res.status(201).json({ data: membership });
    } catch (err) { next(err); }
  });

  /** PUT /members/:userId/role — change tenant role */
  router.put('/members/:userId/role', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getAuth(req);
      const { role } = req.body;
      if (!role) return res.status(400).json({ error: 'role is required' });

      const membership = await prisma().tenantMembership.update({
        where: { tenantId_userId: { tenantId, userId: req.params.userId } },
        data: { role },
      });
      res.json({ data: membership });
    } catch (err) { next(err); }
  });

  /** DELETE /members/:userId — remove from tenant */
  router.delete('/members/:userId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId: currentUserId } = getAuth(req);
      if (req.params.userId === currentUserId) {
        return res.status(400).json({ error: 'Cannot remove yourself' });
      }
      await prisma().tenantMembership.delete({
        where: { tenantId_userId: { tenantId, userId: req.params.userId } },
      });
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  });

  /** GET /audit-logs — paginated audit log */
  router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getAuth(req);
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const type = req.query.type as string | undefined;

      const where: any = { tenantId };
      if (type) where.type = type;

      const [logs, total] = await Promise.all([
        prisma().auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma().auditLog.count({ where }),
      ]);

      res.json({ data: logs, pagination: { total, limit, offset } });
    } catch (err) { next(err); }
  });

  /** GET /settings — tenant settings */
  router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getAuth(req);
      const tenant = await prisma().tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
      res.json({
        data: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          status: tenant.status,
          planTier: tenant.planTier,
          createdAt: tenant.createdAt,
        },
      });
    } catch (err) { next(err); }
  });

  /** PUT /settings — update tenant settings */
  router.put('/settings', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getAuth(req);
      const { name } = req.body;
      const updated = await prisma().tenant.update({
        where: { id: tenantId },
        data: { ...(name && { name }) },
      });
      res.json({
        data: {
          id: updated.id,
          slug: updated.slug,
          name: updated.name,
          status: updated.status,
          planTier: updated.planTier,
        },
      });
    } catch (err) { next(err); }
  });

  return router;
}
