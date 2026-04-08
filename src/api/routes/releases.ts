import { Router, Request, Response, NextFunction } from 'express';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import { ReleaseService } from '../../services/ReleaseService.js';

function getTenantId(req: Request): string {
  return (req as any).tenant?.tenantId || 'dev-tenant-001';
}

export default function releaseRoutes(serviceFactory: ServiceFactory): Router {
  const router = Router({ mergeParams: true }); // mergeParams for :projectId from parent

  // GET /projects/:projectId/releases
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const releaseService = serviceFactory.getService<ReleaseService>('ReleaseService');
      const { projectId } = req.params;
      const tenantId = getTenantId(req);

      // Ensure Future release exists
      await releaseService.ensureFutureRelease(tenantId, projectId);

      const releases = await releaseService.listReleases(projectId);
      res.json({ data: releases, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // POST /projects/:projectId/releases
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const releaseService = serviceFactory.getService<ReleaseService>('ReleaseService');
      const { projectId } = req.params;
      const tenantId = getTenantId(req);
      const { version, name, targetDate } = req.body;

      if (!version || !name) {
        return res.status(400).json({ error: 'version and name are required' });
      }

      const release = await releaseService.createRelease(
        tenantId, projectId, version, name,
        targetDate ? new Date(targetDate) : undefined,
      );
      res.status(201).json({ data: release, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // GET /projects/:projectId/releases/:releaseId
  router.get('/:releaseId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const releaseService = serviceFactory.getService<ReleaseService>('ReleaseService');
      const release = await releaseService.getRelease(req.params.releaseId);
      if (!release) return res.status(404).json({ error: 'Release not found' });
      res.json({ data: release, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // PUT /projects/:projectId/releases/:releaseId
  router.put('/:releaseId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const releaseService = serviceFactory.getService<ReleaseService>('ReleaseService');
      const { version, name, targetDate } = req.body;
      const release = await releaseService.updateRelease(req.params.releaseId, {
        ...(version !== undefined ? { version } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(targetDate !== undefined ? { targetDate: targetDate ? new Date(targetDate) : null } : {}),
      });
      res.json({ data: release, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // DELETE /projects/:projectId/releases/:releaseId
  router.delete('/:releaseId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const releaseService = serviceFactory.getService<ReleaseService>('ReleaseService');
      const { projectId, releaseId } = req.params;
      const tenantId = getTenantId(req);
      await releaseService.deleteRelease(releaseId, tenantId, projectId);
      res.json({ message: 'Release deleted, items moved to Future', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // PUT /projects/:projectId/releases/:releaseId/status
  router.put('/:releaseId/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const releaseService = serviceFactory.getService<ReleaseService>('ReleaseService');
      const { status } = req.body;
      const validStatuses = ['PLANNING', 'IN_PROGRESS', 'RELEASED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      }
      const release = await releaseService.updateStatus(req.params.releaseId, status);
      res.json({ data: release, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // GET /projects/:projectId/releases/:releaseId/work-items
  router.get('/:releaseId/work-items', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const releaseService = serviceFactory.getService<ReleaseService>('ReleaseService');
      const items = await (serviceFactory.getService<any>('IReleaseRepository')).getWorkItemsByRelease(req.params.releaseId);
      res.json({ data: items, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // POST /projects/:projectId/releases/:releaseId/assign
  router.post('/:releaseId/assign', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const releaseService = serviceFactory.getService<ReleaseService>('ReleaseService');
      const { workItemIds } = req.body;
      if (!Array.isArray(workItemIds) || workItemIds.length === 0) {
        return res.status(400).json({ error: 'workItemIds array is required' });
      }
      const tenantId = getTenantId(req);
      await releaseService.assignWorkItems(workItemIds, req.params.releaseId, tenantId);
      res.json({ message: `${workItemIds.length} items assigned`, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // POST /projects/:projectId/releases/:releaseId/unassign
  router.post('/:releaseId/unassign', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const releaseService = serviceFactory.getService<ReleaseService>('ReleaseService');
      const { workItemIds } = req.body;
      if (!Array.isArray(workItemIds) || workItemIds.length === 0) {
        return res.status(400).json({ error: 'workItemIds array is required' });
      }
      await releaseService.assignWorkItems(workItemIds, null);
      res.json({ message: `${workItemIds.length} items unassigned`, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // PUT /projects/:projectId/releases/work-items/:workItemId/bubble
  router.put('/work-items/:workItemId/bubble', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const releaseService = serviceFactory.getService<ReleaseService>('ReleaseService');
      const { onTheBubble } = req.body;
      if (typeof onTheBubble !== 'boolean') {
        return res.status(400).json({ error: 'onTheBubble boolean is required' });
      }
      await releaseService.setOnTheBubble(req.params.workItemId, onTheBubble);
      res.json({ message: 'Updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // GET /projects/:projectId/releases/:releaseId/summary
  router.get('/:releaseId/summary', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const releaseService = serviceFactory.getService<ReleaseService>('ReleaseService');
      const summary = await releaseService.getReleaseSummary(req.params.releaseId);
      if (!summary) return res.status(404).json({ error: 'Release not found' });
      res.json({ data: summary, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  return router;
}
