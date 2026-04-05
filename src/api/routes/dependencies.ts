import { Router, Request, Response, NextFunction } from 'express';
import { ServiceFactory } from '../../factories/ServiceFactory.js';
import { IGraphRepository } from '../../adapters/IGraphRepository.js';

/**
 * Dependencies routes — CRUD for graph edges between work items.
 *
 * GET  /dependencies              — list all dependency edges
 * POST /dependencies              — create a dependency edge
 * DELETE /dependencies/:from/:to  — remove a dependency edge
 */
export default function dependencyRoutes(serviceFactory: ServiceFactory): Router {
  const router = Router({ mergeParams: true });

  let graphRepo: IGraphRepository | null = null;
  try {
    graphRepo = serviceFactory.getService<IGraphRepository>('IGraphRepository');
  } catch {
    console.warn('[dependencies] IGraphRepository not available — dependency routes will return empty results');
  }

  // ── GET / — list all dependency edges ───────────────────────────────────────
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      if (!graphRepo) {
        return res.json({ data: [] });
      }

      // Get all WorkItem nodes and their relationships
      const nodes = await graphRepo.findNodesByType('WorkItem', undefined, 1000);
      const allEdges: Array<{ from: string; to: string; type: string }> = [];
      const seen = new Set<string>();

      for (const node of nodes) {
        try {
          const rels = await graphRepo.findNodeRelationships(node.nodeId, 'OUT');
          for (const rel of rels) {
            const key = `${rel.fromNodeId}-${rel.type}-${rel.toNodeId}`;
            if (seen.has(key)) continue;
            seen.add(key);

            // Resolve work item IDs from node properties
            const fromNode = node;
            let toWorkItemId = rel.toNodeId;
            try {
              const targetNode = await graphRepo.findNodeById(rel.toNodeId);
              if (targetNode) toWorkItemId = targetNode.properties.workItemId || rel.toNodeId;
            } catch { /* use raw ID */ }

            allEdges.push({
              from: fromNode.properties.workItemId || rel.fromNodeId,
              to: toWorkItemId,
              type: rel.type.toLowerCase().replace(/_/g, '-'),
            });
          }
        } catch {
          // Skip nodes with relationship errors
        }
      }

      res.json({ data: allEdges });
    } catch (error) {
      // If Neo4j is down, return empty rather than error
      console.warn('[dependencies] Failed to list dependencies:', error);
      res.json({ data: [] });
    }
  });

  // ── POST / — create a dependency edge ──────────────────────────────────────
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to, type = 'requires' } = req.body;

      if (!from || !to) {
        return res.status(400).json({ error: 'from and to are required' });
      }

      if (!graphRepo) {
        // Return success even without Neo4j (edges stored in localStorage on frontend)
        return res.status(201).json({ data: { from, to, type } });
      }

      // Find or create nodes for both work items
      const relType = type.toUpperCase().replace(/-/g, '_');

      let fromNodes = await graphRepo.findNodesByType('WorkItem', { workItemId: from });
      let fromNodeId: string;
      if (fromNodes.length === 0) {
        fromNodeId = await graphRepo.createNode(['WorkItem'], { workItemId: from });
      } else {
        fromNodeId = fromNodes[0].nodeId;
      }

      let toNodes = await graphRepo.findNodesByType('WorkItem', { workItemId: to });
      let toNodeId: string;
      if (toNodes.length === 0) {
        toNodeId = await graphRepo.createNode(['WorkItem'], { workItemId: to });
      } else {
        toNodeId = toNodes[0].nodeId;
      }

      await graphRepo.createRelationship(fromNodeId, toNodeId, relType);
      res.status(201).json({ data: { from, to, type } });
    } catch (error) {
      console.warn('[dependencies] Failed to create dependency:', error);
      // Still return success — frontend stores edges in localStorage
      const { from, to, type = 'requires' } = req.body;
      res.status(201).json({ data: { from, to, type } });
    }
  });

  // ── DELETE /:from/:to — remove a dependency edge ──────────────────────────
  router.delete('/:from/:to', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to } = req.params;

      if (!graphRepo) {
        return res.status(204).send();
      }

      // Find the relationship between these work items
      const fromNodes = await graphRepo.findNodesByType('WorkItem', { workItemId: from });
      if (fromNodes.length > 0) {
        const rels = await graphRepo.findNodeRelationships(fromNodes[0].nodeId, 'OUT');
        for (const rel of rels) {
          const targetNode = await graphRepo.findNodeById(rel.toNodeId);
          if (targetNode && targetNode.properties.workItemId === to) {
            await graphRepo.deleteRelationship(rel.relationshipId);
            break;
          }
        }
      }

      res.status(204).send();
    } catch (error) {
      console.warn('[dependencies] Failed to delete dependency:', error);
      res.status(204).send(); // Idempotent delete
    }
  });

  return router;
}
