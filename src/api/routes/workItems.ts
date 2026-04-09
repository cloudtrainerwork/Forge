import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ReadinessState, ReadinessDimension, ImplementationStatus } from '../../domain/entities.js';
import type { ReadinessDimensionKey } from '../../domain/entities.js';
import { WorkItemService } from '../../services/WorkItemService.js';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import type { AuthenticatedRequest } from '../../auth/types.js';

/** Helper to extract tenantId from authenticated request */
function getTenantId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  return authReq.tenant?.tenantId || 'system-default';
}

/**
 * Work item routes with dependency injection for WorkItemService
 * Provides REST API endpoints for work item operations with proper error handling
 */
export function workItemRoutes(serviceFactory: ServiceFactory): Router {
  const router = Router();

  /**
   * GET /work-items - List work items with optional filtering
   */
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workItemService = serviceFactory.getService<WorkItemService>('WorkItemService');

      const {
        dimension,
        value,
        search,
        parentId,
        limit = '50',
        offset = '0'
      } = req.query;

      // Parse and validate query parameters
      const parsedLimit = Math.min(parseInt(limit as string, 10) || 50, 100);
      const parsedOffset = Math.max(parseInt(offset as string, 10) || 0, 0);

      // Build filter options
      const options: any = {
        limit: parsedLimit,
        offset: parsedOffset
      };

      // Filter by parentId (hierarchy drill-down)
      if (parentId && typeof parentId === 'string') {
        options.parentId = parentId; // 'root' = top-level items, otherwise = children of that ID
      }

      if (search && typeof search === 'string') {
        options.searchTerm = search.trim();
      } else if (dimension && value) {
        // Validate dimension and value
        const validDimensions = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];
        const validValues = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'];

        if (!validDimensions.includes(dimension as string)) {
          return res.status(400).json({
            error: 'Bad Request',
            message: `Invalid dimension. Must be one of: ${validDimensions.join(', ')}`,
            timestamp: new Date().toISOString()
          });
        }

        if (!validValues.includes(value as string)) {
          return res.status(400).json({
            error: 'Bad Request',
            message: `Invalid value. Must be one of: ${validValues.join(', ')}`,
            timestamp: new Date().toISOString()
          });
        }

        options.dimension = dimension as keyof ReadinessState;
        options.value = value as ReadinessDimension;
      }

      const result = await workItemService.listWorkItems(options);

      res.json({
        data: result.items.map(item => item.toJSON()),
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total: result.total,
          hasMore: result.hasMore
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /work-items - Create a new work item
   */
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workItemService = serviceFactory.getService<WorkItemService>('WorkItemService');

      const {
        id = uuidv4(),
        title,
        description,
        spec = {},
        readiness,
        x,
        y,
        type,
        implementationStatus,
        parentId,
      } = req.body;

      // Validate required fields
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Title is required and must be a non-empty string',
          timestamp: new Date().toISOString()
        });
      }

      if (spec && typeof spec !== 'object') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Spec must be an object',
          timestamp: new Date().toISOString()
        });
      }

      // Parse readiness if provided
      let readinessState: ReadinessState | undefined;
      if (readiness) {
        try {
          readinessState = ReadinessState.fromJSON(readiness);
        } catch (error) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid readiness state format',
            timestamp: new Date().toISOString(),
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Merge canvas position into spec if provided
      const finalSpec = { ...(spec || {}) };
      if (typeof x === 'number' && typeof y === 'number') {
        finalSpec._position = { x, y };
      }

      // Normalize deliverableType: frontend sends uppercase keys, backend enum uses lowercase
      const normalizedType = type ? type.toLowerCase() : undefined;

      const tenantId = getTenantId(req);
      const workItem = await workItemService.createWorkItem(
        tenantId,
        id,
        title.trim(),
        finalSpec,
        description?.trim(),
        readinessState,
        normalizedType,
        parentId,
        implementationStatus,
      );

      res.status(201).json({
        data: workItem.toJSON(),
        message: 'Work item created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /work-items/:id/ancestors - Get ancestor chain for breadcrumb reconstruction
   */
  router.get('/:id/ancestors', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workItemService = serviceFactory.getService<WorkItemService>('WorkItemService');
      const { id } = req.params;
      const ancestors: Array<{ id: string; title: string }> = [];
      let currentId: string | undefined = id;

      // Walk up the parent chain (max 10 levels to prevent infinite loops)
      for (let i = 0; i < 10 && currentId; i++) {
        const item = await workItemService.getWorkItem(currentId);
        if (!item) break;
        ancestors.unshift({ id: item.id, title: item.title || item.id });
        currentId = item.parentId;
      }

      res.json({ data: ancestors, timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /work-items/:id/hours-rollup - Get aggregated hours including children (HR-07)
   */
  router.get('/:id/hours-rollup', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workItemService = serviceFactory.getService<WorkItemService>('WorkItemService');
      const { id } = req.params;

      const item = await workItemService.getWorkItem(id);
      if (!item) return res.status(404).json({ error: 'Not found' });

      // Get children hours
      const children = await workItemService.listWorkItems({ parentId: id });
      let childEstimated = 0, childActual = 0;
      for (const child of children.items) {
        childEstimated += child.estimatedHours ?? 0;
        childActual += child.actualHours ?? 0;
      }

      res.json({
        data: {
          ownEstimated: item.estimatedHours ?? 0,
          ownActual: item.actualHours ?? 0,
          childEstimated,
          childActual,
          totalEstimated: (item.estimatedHours ?? 0) + childEstimated,
          totalActual: (item.actualHours ?? 0) + childActual,
          childCount: children.items.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) { next(error); }
  });

  /**
   * GET /work-items/:id - Get work item by ID
   */
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workItemService = serviceFactory.getService<WorkItemService>('WorkItemService');
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const workItem = await workItemService.getWorkItem(id);

      if (!workItem) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Work item with ID ${id} not found`,
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        data: workItem.toJSON(),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  /**
   * PUT /work-items/:id - Update work item title, description, type, or implementationStatus
   */
  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workItemService = serviceFactory.getService<WorkItemService>('WorkItemService');
      const { id } = req.params;
      const { title, description, implementationStatus, type: deliverableType, estimatedHours, actualHours } = req.body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      // Validate implementationStatus if provided
      if (implementationStatus !== undefined) {
        const validStatuses = Object.values(ImplementationStatus);
        if (!validStatuses.includes(implementationStatus)) {
          return res.status(400).json({
            error: 'Bad Request',
            message: `Invalid implementationStatus. Must be one of: ${validStatuses.join(', ')}`,
            timestamp: new Date().toISOString()
          });
        }
      }

      const workItem = await workItemService.getWorkItem(id);
      if (!workItem) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Work item with ID ${id} not found`,
          timestamp: new Date().toISOString()
        });
      }

      // Build update payload
      const updates: Record<string, any> = {};
      if (title !== undefined) updates.title = title.trim();
      if (description !== undefined) updates.description = description.trim();
      if (implementationStatus !== undefined) updates.implementationStatus = implementationStatus;
      if (deliverableType !== undefined) updates.deliverableType = deliverableType.toLowerCase();
      if (estimatedHours !== undefined) updates.estimatedHours = estimatedHours === null ? null : Number(estimatedHours);
      if (actualHours !== undefined) updates.actualHours = actualHours === null ? null : Number(actualHours);

      // Persist via repository
      const workItemRepository = serviceFactory.getService<any>('IWorkItemRepository');
      const saved = await workItemRepository.update(id, updates);

      res.json({
        data: saved.toJSON(),
        message: 'Work item updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * PUT /work-items/:id/position - Update work item position on canvas
   */
  router.put('/:id/position', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workItemService = serviceFactory.getService<WorkItemService>('WorkItemService');
      const { id } = req.params;
      const { x, y } = req.body;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      if (typeof x !== 'number' || typeof y !== 'number') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'x and y coordinates are required and must be numbers',
          timestamp: new Date().toISOString()
        });
      }

      // Get the work item first to confirm it exists
      const workItem = await workItemService.getWorkItem(id);
      if (!workItem) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Work item with ID ${id} not found`,
          timestamp: new Date().toISOString()
        });
      }

      // Store position in spec metadata
      const updatedSpec = { ...workItem.spec, _position: { x, y } };
      // Use repository directly for position updates (lightweight, no audit needed)
      const workItemRepository = serviceFactory.getService<any>('IWorkItemRepository');
      const updated = await workItemRepository.update(id, { spec: updatedSpec });

      res.json({
        data: updated.toJSON(),
        message: 'Position updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  /**
   * PUT /work-items/:id/readiness - Update readiness dimension
   */
  router.put('/:id/readiness', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workItemService = serviceFactory.getService<WorkItemService>('WorkItemService');
      const { id } = req.params;
      const { dimension, value } = req.body;

      // Validate parameters
      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const validDimensions = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];
      if (!dimension || !validDimensions.includes(dimension)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Dimension is required and must be one of: ${validDimensions.join(', ')}`,
          timestamp: new Date().toISOString()
        });
      }

      const validValues = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE'];
      if (!value || !validValues.includes(value)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Value is required and must be one of: ${validValues.join(', ')}`,
          timestamp: new Date().toISOString()
        });
      }

      const updatedWorkItem = await workItemService.updateReadiness(
        id,
        dimension as ReadinessDimensionKey,
        value as ReadinessDimension
      );

      res.json({
        data: updatedWorkItem.toJSON(),
        message: 'Readiness updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /work-items/:id/dependencies - Create dependency relationship
   */
  router.post('/:id/dependencies', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workItemService = serviceFactory.getService<WorkItemService>('WorkItemService');
      const { id: fromWorkItemId } = req.params;
      const { toWorkItemId, relationshipType = 'DEPENDS_ON', properties = {} } = req.body;

      // Validate parameters
      if (!fromWorkItemId || typeof fromWorkItemId !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Source work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      if (!toWorkItemId || typeof toWorkItemId !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Target work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      if (fromWorkItemId === toWorkItemId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Work item cannot depend on itself',
          timestamp: new Date().toISOString()
        });
      }

      if (properties && typeof properties !== 'object') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Properties must be an object',
          timestamp: new Date().toISOString()
        });
      }

      const relationshipId = await workItemService.createDependency(
        fromWorkItemId,
        toWorkItemId,
        relationshipType,
        properties || {}
      );

      res.status(201).json({
        data: {
          relationshipId,
          fromWorkItemId,
          toWorkItemId,
          relationshipType,
          properties
        },
        message: 'Dependency created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /work-items/:id/dependencies - Get dependency graph
   */
  router.get('/:id/dependencies', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workItemService = serviceFactory.getService<WorkItemService>('WorkItemService');
      const { id } = req.params;
      const {
        relationshipType = 'DEPENDS_ON',
        maxDepth = '5'
      } = req.query;

      // Validate parameters
      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Work item ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const parsedMaxDepth = Math.min(parseInt(maxDepth as string, 10) || 5, 10);

      const dependencies = await workItemService.getDependencies(
        id,
        relationshipType as string,
        parsedMaxDepth
      );

      res.json({
        data: dependencies,
        parameters: {
          workItemId: id,
          relationshipType,
          maxDepth: parsedMaxDepth
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  return router;
}