import { WorkItem, ReadinessDimension } from '../domain/entities.js';

/**
 * Work item repository interface for PostgreSQL operations
 * Handles work item specifications and audit trail
 */
export interface IWorkItemRepository {
  /**
   * Save a work item to the database
   */
  save(workItem: WorkItem): Promise<WorkItem>;

  /**
   * Find a work item by its ID
   */
  findById(id: string): Promise<WorkItem | null>;

  /**
   * Find work items by readiness criteria
   */
  findByReadiness(
    dimension?: keyof WorkItem['readiness'],
    value?: ReadinessDimension,
    limit?: number,
    offset?: number
  ): Promise<WorkItem[]>;

  /**
   * Find work items by specification query (JSONB operations)
   */
  findBySpec(
    specQuery: Record<string, any>,
    limit?: number,
    offset?: number
  ): Promise<WorkItem[]>;

  /**
   * Find work items with flexible text search
   */
  findBySearch(
    searchTerm: string,
    limit?: number,
    offset?: number
  ): Promise<WorkItem[]>;

  /**
   * Update a work item
   */
  update(id: string, updates: Partial<WorkItem>): Promise<WorkItem>;

  /**
   * Delete a work item
   */
  delete(id: string): Promise<void>;

  /**
   * Get work items with pagination
   */
  findAll(limit?: number, offset?: number): Promise<{
    items: WorkItem[];
    total: number;
    hasMore: boolean;
  }>;

  /**
   * Count work items by readiness state
   */
  countByReadiness(): Promise<Record<string, number>>;

  /**
   * Log a state change for audit trail
   */
  logStateChange(
    entityId: string,
    type: 'WORK_ITEM_CREATED' | 'WORK_ITEM_UPDATED' | 'RELATIONSHIP_ADDED' | 'RELATIONSHIP_REMOVED' | 'READINESS_UPDATED',
    changes: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void>;

  /**
   * Get audit log for a work item
   */
  getAuditLog(
    entityId: string,
    limit?: number,
    offset?: number
  ): Promise<Array<{
    id: string;
    type: string;
    changes: Record<string, any>;
    timestamp: Date;
  }>>;

  /**
   * Check if repository is healthy
   */
  healthCheck(): Promise<boolean>;
}