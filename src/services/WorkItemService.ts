import { injectable, inject } from 'inversify';
import { WorkItem, ReadinessState, ReadinessDimension, ReadinessDimensionKey } from '../domain/entities.js';
import type { IWorkItemRepository } from '../adapters/IWorkItemRepository.js';
import type { IGraphRepository } from '../adapters/IGraphRepository.js';
import type { AuditTrailService } from './AuditTrailService.js';

/**
 * Business service for work item operations with hybrid data storage
 * Implements the HybridWorkItemService pattern with dual-store synchronization
 */
@injectable()
export class WorkItemService {
  constructor(
    @inject('IWorkItemRepository') private workItemRepository: IWorkItemRepository,
    @inject('IGraphRepository') private graphRepository: IGraphRepository,
    @inject('AuditTrailService') private auditTrailService: AuditTrailService
  ) {}

  /**
   * Create a work item - saves to PostgreSQL and syncs to Neo4j as node
   * @param tenantId - Required tenant context for multi-tenant isolation
   */
  async createWorkItem(
    tenantId: string,
    id: string,
    title: string,
    spec: Record<string, any> = {},
    description?: string,
    readiness?: ReadinessState,
    deliverableType?: string,
    parentId?: string,
    implementationStatus?: string,
  ): Promise<WorkItem> {
    try {
      // Create domain entity with tenant context
      const workItem = new WorkItem(
        id,
        spec,
        title,
        description,
        readiness || new ReadinessState(),
        undefined, // groupId
        undefined, // sprintId
        parentId,
        deliverableType as any,
        undefined, // createdAt
        undefined, // updatedAt
        tenantId,
        implementationStatus as any,
      );

      // Validate business rules
      const businessErrors = await WorkItem.validateBusinessRules(workItem);
      if (businessErrors.length > 0) {
        throw new Error(`Business rule validation failed: ${businessErrors.join(', ')}`);
      }

      // Save to PostgreSQL (primary store) - this handles audit logging internally
      const savedWorkItem = await this.workItemRepository.save(workItem);

      try {
        // Sync to Neo4j as node (graph store)
        const nodeProperties = {
          workItemId: savedWorkItem.id,
          title: savedWorkItem.title || '',
          readinessPercentage: savedWorkItem.getCompletionPercentage(),
          isReady: savedWorkItem.isReady(),
          createdAt: savedWorkItem.createdAt.toISOString(),
          updatedAt: savedWorkItem.updatedAt.toISOString()
        };

        const nodeId = await this.graphRepository.createNode(['WorkItem'], nodeProperties);

        // Publish WORK_ITEM_CREATED event for further processing
        this.auditTrailService.emit('WORK_ITEM_CREATED', {
          workItemId: savedWorkItem.id,
          nodeId,
          title: savedWorkItem.title,
          spec: savedWorkItem.spec,
          readiness: savedWorkItem.readiness.toJSON()
        });

      } catch (graphError) {
        // Compensate PostgreSQL transaction on graph failure
        await this.workItemRepository.delete(savedWorkItem.id);
        throw new Error(`Graph synchronization failed: ${graphError instanceof Error ? graphError.message : 'Unknown error'}`);
      }

      return savedWorkItem;
    } catch (error) {
      throw new Error(`Failed to create work item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update readiness dimension - updates PostgreSQL spec and publishes state change event
   */
  async updateReadiness(
    workItemId: string,
    dimension: ReadinessDimensionKey,
    value: ReadinessDimension
  ): Promise<WorkItem> {
    try {
      // Get current work item
      const existingWorkItem = await this.workItemRepository.findById(workItemId);
      if (!existingWorkItem) {
        throw new Error('Work item not found');
      }

      // Create updated work item with new readiness
      const updatedWorkItem = existingWorkItem.updateReadiness(dimension, value);

      // Save to PostgreSQL
      const savedWorkItem = await this.workItemRepository.save(updatedWorkItem);

      // Update Neo4j node properties
      try {
        // Find the node by workItemId
        const nodes = await this.graphRepository.findNodesByType('WorkItem', { workItemId });
        if (nodes.length > 0) {
          const nodeId = nodes[0].nodeId;
          await this.graphRepository.updateNode(nodeId, {
            readinessPercentage: savedWorkItem.getCompletionPercentage(),
            isReady: savedWorkItem.isReady(),
            updatedAt: savedWorkItem.updatedAt.toISOString()
          });

          // Publish READINESS_UPDATED event
          this.auditTrailService.emit('READINESS_UPDATED', {
            workItemId: savedWorkItem.id,
            nodeId,
            dimension,
            oldValue: existingWorkItem.readiness[dimension],
            newValue: value,
            completionPercentage: savedWorkItem.getCompletionPercentage()
          });
        }
      } catch (graphError) {
        // Log but don't fail the operation - PostgreSQL is source of truth
        console.warn(`Graph update failed for work item ${workItemId}:`, graphError);
      }

      return savedWorkItem;
    } catch (error) {
      throw new Error(`Failed to update readiness: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create dependency relationship - creates Neo4j relationship and logs to audit trail
   */
  async createDependency(
    fromWorkItemId: string,
    toWorkItemId: string,
    relationshipType: string = 'DEPENDS_ON',
    properties: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Verify both work items exist
      const [fromWorkItem, toWorkItem] = await Promise.all([
        this.workItemRepository.findById(fromWorkItemId),
        this.workItemRepository.findById(toWorkItemId)
      ]);

      if (!fromWorkItem) {
        throw new Error(`Source work item ${fromWorkItemId} not found`);
      }
      if (!toWorkItem) {
        throw new Error(`Target work item ${toWorkItemId} not found`);
      }

      // Find Neo4j nodes for both work items
      const [fromNodes, toNodes] = await Promise.all([
        this.graphRepository.findNodesByType('WorkItem', { workItemId: fromWorkItemId }),
        this.graphRepository.findNodesByType('WorkItem', { workItemId: toWorkItemId })
      ]);

      if (fromNodes.length === 0) {
        throw new Error(`Source node for work item ${fromWorkItemId} not found in graph`);
      }
      if (toNodes.length === 0) {
        throw new Error(`Target node for work item ${toWorkItemId} not found in graph`);
      }

      const fromNodeId = fromNodes[0].nodeId;
      const toNodeId = toNodes[0].nodeId;

      // Create relationship in Neo4j
      const relationshipId = await this.graphRepository.createRelationship(
        fromNodeId,
        toNodeId,
        relationshipType,
        {
          ...properties,
          createdAt: new Date().toISOString()
        }
      );

      // Log relationship creation to audit trail
      await this.workItemRepository.logStateChange(
        fromWorkItemId,
        'RELATIONSHIP_ADDED',
        {
          relationshipId,
          fromWorkItemId,
          toWorkItemId,
          relationshipType,
          properties
        }
      );

      // Publish RELATIONSHIP_ADDED event
      this.auditTrailService.emit('RELATIONSHIP_ADDED', {
        relationshipId,
        fromWorkItemId,
        toWorkItemId,
        fromNodeId,
        toNodeId,
        relationshipType,
        properties
      });

      return relationshipId;
    } catch (error) {
      throw new Error(`Failed to create dependency: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get work item by ID with full details
   */
  async getWorkItem(id: string): Promise<WorkItem | null> {
    try {
      return await this.workItemRepository.findById(id);
    } catch (error) {
      throw new Error(`Failed to get work item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List work items with optional filtering
   */
  async listWorkItems(options: {
    dimension?: keyof ReadinessState;
    value?: ReadinessDimension;
    searchTerm?: string;
    parentId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    items: WorkItem[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { dimension, value, searchTerm, parentId, limit = 50, offset = 0 } = options;

      // Hierarchy filtering: parentId query
      if (parentId) {
        return await this.workItemRepository.findAll(limit, offset, parentId);
      }

      if (searchTerm) {
        const items = await this.workItemRepository.findBySearch(searchTerm, limit, offset);
        // For search, we don't have total count - approximate it
        return {
          items,
          total: items.length + offset + (items.length === limit ? 1 : 0),
          hasMore: items.length === limit
        };
      } else if (dimension && value) {
        const items = await this.workItemRepository.findByReadiness(dimension, value, limit, offset);
        // For filtered results, approximate total
        return {
          items,
          total: items.length + offset + (items.length === limit ? 1 : 0),
          hasMore: items.length === limit
        };
      } else {
        return await this.workItemRepository.findAll(limit, offset);
      }
    } catch (error) {
      throw new Error(`Failed to list work items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get dependency graph for a work item
   */
  async getDependencies(
    workItemId: string,
    relationshipType: string = 'DEPENDS_ON',
    maxDepth: number = 5
  ): Promise<Array<{ nodeId: string; workItemId: string; depth: number; properties: Record<string, any> }>> {
    try {
      // Find the work item's node in the graph
      const nodes = await this.graphRepository.findNodesByType('WorkItem', { workItemId });
      if (nodes.length === 0) {
        return [];
      }

      const nodeId = nodes[0].nodeId;
      const dependencies = await this.graphRepository.traverseDependencies(nodeId, relationshipType, maxDepth);

      // Enrich with work item IDs
      return dependencies.map(dep => ({
        nodeId: dep.nodeId,
        workItemId: dep.properties.workItemId || '',
        depth: dep.depth,
        properties: dep.properties
      }));
    } catch (error) {
      throw new Error(`Failed to get dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check - verify both data stores are accessible
   */
  async healthCheck(): Promise<{ postgresql: boolean; neo4j: boolean; overall: boolean }> {
    try {
      const [pgHealth, graphHealth] = await Promise.all([
        this.workItemRepository.healthCheck(),
        this.graphRepository.healthCheck()
      ]);

      return {
        postgresql: pgHealth,
        neo4j: graphHealth,
        overall: pgHealth && graphHealth
      };
    } catch (error) {
      return {
        postgresql: false,
        neo4j: false,
        overall: false
      };
    }
  }
}