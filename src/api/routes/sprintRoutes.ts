import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import type { ISprintRepository } from '../../adapters/ISprintRepository.js';

function getTenantId(req: Request): string {
  return (req as any).tenant?.tenantId || 'dev-tenant-001';
}

export default function sprintRoutes(serviceFactory: ServiceFactory): Router {
  const router = Router({ mergeParams: true });

  function getRepo() {
    return serviceFactory.getService<ISprintRepository>('ISprintRepository');
  }

  // GET /projects/:projectId/sprints
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sprints = await getRepo().listByProject(req.params.projectId);
      res.json({ data: sprints, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // POST /projects/:projectId/sprints
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { number, name, description, startDate, endDate, goal, plannedVelocity, capacity } = req.body;
      if (!number || !name || !startDate || !endDate) {
        return res.status(400).json({ error: 'number, name, startDate, endDate are required' });
      }
      const sprint = await getRepo().create({
        id: uuidv4(),
        tenantId: getTenantId(req),
        projectId: req.params.projectId,
        number, name, description,
        startDate: new Date(startDate), endDate: new Date(endDate),
        goal, plannedVelocity, capacity,
      });
      res.status(201).json({ data: sprint, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // GET /projects/:projectId/sprints/:sprintId
  router.get('/:sprintId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sprint = await getRepo().findById(req.params.sprintId);
      if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
      res.json({ data: sprint, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // PUT /projects/:projectId/sprints/:sprintId
  router.put('/:sprintId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, startDate, endDate, goal, plannedVelocity, actualVelocity, capacity } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (startDate !== undefined) data.startDate = new Date(startDate);
      if (endDate !== undefined) data.endDate = new Date(endDate);
      if (goal !== undefined) data.goal = goal;
      if (plannedVelocity !== undefined) data.plannedVelocity = plannedVelocity;
      if (actualVelocity !== undefined) data.actualVelocity = actualVelocity;
      if (capacity !== undefined) data.capacity = capacity;
      const sprint = await getRepo().update(req.params.sprintId, data);
      res.json({ data: sprint, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // DELETE /projects/:projectId/sprints/:sprintId
  router.delete('/:sprintId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getRepo().delete(req.params.sprintId);
      res.json({ message: 'Sprint deleted, items unassigned', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // PUT /projects/:projectId/sprints/:sprintId/status
  router.put('/:sprintId/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.body;
      const valid = ['PLANNING', 'ACTIVE', 'COMPLETE', 'CANCELLED'];
      if (!valid.includes(status)) return res.status(400).json({ error: `status must be: ${valid.join(', ')}` });

      // SP-09: Only one active sprint at a time
      if (status === 'ACTIVE') {
        const active = await getRepo().findActiveSprint(req.params.projectId);
        if (active && active.id !== req.params.sprintId) {
          return res.status(409).json({ error: `Sprint "${active.name}" is already active. Complete it first.` });
        }
      }

      const sprint = await getRepo().update(req.params.sprintId, { status });
      res.json({ data: sprint, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // GET /projects/:projectId/sprints/:sprintId/work-items
  router.get('/:sprintId/work-items', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await getRepo().getWorkItemsBySprint(req.params.sprintId);
      res.json({ data: items, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // POST /projects/:projectId/sprints/:sprintId/assign
  router.post('/:sprintId/assign', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workItemIds } = req.body;
      if (!Array.isArray(workItemIds) || workItemIds.length === 0) {
        return res.status(400).json({ error: 'workItemIds array required' });
      }
      await getRepo().assignWorkItems(workItemIds, req.params.sprintId);
      res.json({ message: `${workItemIds.length} items assigned`, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  // POST /projects/:projectId/sprints/:sprintId/unassign
  router.post('/:sprintId/unassign', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workItemIds } = req.body;
      if (!Array.isArray(workItemIds) || workItemIds.length === 0) {
        return res.status(400).json({ error: 'workItemIds array required' });
      }
      await getRepo().assignWorkItems(workItemIds, null);
      res.json({ message: `${workItemIds.length} items unassigned`, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  return router;
}
