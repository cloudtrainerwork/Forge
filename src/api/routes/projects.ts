import { Router, Request, Response, NextFunction } from 'express';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import { ProjectService } from '../../services/ProjectService.js';
import { PermissionService } from '../../services/PermissionService.js';
import type { AuthenticatedRequest } from '../../auth/types.js';

function getAuth(req: Request) {
  const authReq = req as AuthenticatedRequest;
  return {
    userId: authReq.user?.id || 'dev-user-001',
    tenantId: authReq.tenant?.tenantId || 'system-default',
    tenantRole: authReq.tenant?.role || 'OWNER',
  };
}

export default function projectRoutes(serviceFactory: ServiceFactory): Router {
  const router = Router();

  /** GET / — list projects for the current tenant */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = getAuth(req);
      const projectService = serviceFactory.getService<ProjectService>('ProjectService');
      const status = req.query.status as string | undefined;
      const projects = await projectService.listProjects(tenantId, status);
      res.json({ data: projects });
    } catch (err) { next(err); }
  });

  /** POST / — create a new project */
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, tenantId } = getAuth(req);
      const projectService = serviceFactory.getService<ProjectService>('ProjectService');
      const { name, description } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Project name is required' });
      }
      const project = await projectService.createProject(tenantId, userId, name, description);
      res.status(201).json({ data: project });
    } catch (err) { next(err); }
  });

  /** GET /:projectId — get a single project */
  router.get('/:projectId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectService = serviceFactory.getService<ProjectService>('ProjectService');
      const project = await projectService.getProject(req.params.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      res.json({ data: project });
    } catch (err) { next(err); }
  });

  /** PUT /:projectId — update a project */
  router.put('/:projectId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectService = serviceFactory.getService<ProjectService>('ProjectService');
      const { name, description } = req.body;
      const project = await projectService.updateProject(req.params.projectId, { name, description });
      res.json({ data: project });
    } catch (err) { next(err); }
  });

  /** DELETE /:projectId — archive a project */
  router.delete('/:projectId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectService = serviceFactory.getService<ProjectService>('ProjectService');
      const project = await projectService.archiveProject(req.params.projectId);
      res.json({ data: project });
    } catch (err) { next(err); }
  });

  /** POST /:projectId/restore — restore an archived project */
  router.post('/:projectId/restore', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectService = serviceFactory.getService<ProjectService>('ProjectService');
      const project = await projectService.restoreProject(req.params.projectId);
      res.json({ data: project });
    } catch (err) { next(err); }
  });

  /** GET /:projectId/members — list project members */
  router.get('/:projectId/members', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectService = serviceFactory.getService<ProjectService>('ProjectService');
      const members = await projectService.getProjectMembers(req.params.projectId);
      res.json({ data: members });
    } catch (err) { next(err); }
  });

  /** POST /:projectId/members — add a member */
  router.post('/:projectId/members', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectService = serviceFactory.getService<ProjectService>('ProjectService');
      const { userId, role } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      await projectService.addMember(req.params.projectId, userId, role || 'MEMBER');
      res.status(201).json({ data: { success: true } });
    } catch (err) { next(err); }
  });

  /** PUT /:projectId/members/:userId — update member role */
  router.put('/:projectId/members/:userId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectService = serviceFactory.getService<ProjectService>('ProjectService');
      const { role } = req.body;
      if (!role) return res.status(400).json({ error: 'role is required' });
      await projectService.updateMemberRole(req.params.projectId, req.params.userId, role);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  });

  /** DELETE /:projectId/members/:userId — remove a member */
  router.delete('/:projectId/members/:userId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectService = serviceFactory.getService<ProjectService>('ProjectService');
      await projectService.removeMember(req.params.projectId, req.params.userId);
      res.json({ data: { success: true } });
    } catch (err) { next(err); }
  });

  return router;
}
