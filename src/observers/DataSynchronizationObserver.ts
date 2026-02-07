import { EventEmitter } from 'events';
import type { IWorkItemRepository } from '../adapters/IWorkItemRepository.js';
import type { IGraphRepository } from '../adapters/IGraphRepository.js';

/**
 * Data synchronization event types
 */
export enum SyncEventType {
  POSTGRESQL_DATA_CHANGED = 'POSTGRESQL_DATA_CHANGED',
  NEO4J_RELATIONSHIP_CHANGED = 'NEO4J_RELATIONSHIP_CHANGED',
  SYNC_FAILURE = 'SYNC_FAILURE',
  SYNC_SUCCESS = 'SYNC_SUCCESS'
}

/**
 * Event data structures for synchronization events
 */
export interface PostgreSQLDataChangedEvent {
  workItemId: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  data: Record<string, any>;
  timestamp: Date;
}

export interface Neo4jRelationshipChangedEvent {
  relationshipId: string;
  fromNodeId: string;
  toNodeId: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  relationshipType: string;
  properties: Record<string, any>;
  timestamp: Date;
}

export interface SyncFailureEvent {
  syncType: 'POSTGRESQL_TO_NEO4J' | 'NEO4J_TO_POSTGRESQL';
  entityId: string;
  error: string;
  retryCount: number;
  maxRetries: number;
  timestamp: Date;
}

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * DataSynchronizationObserver implementing event handlers per research DataSynchronizationService pattern
 * Handles sync failures with retry logic and compensation patterns to prevent dual-write consistency issues
 */
export class DataSynchronizationObserver extends EventEmitter {
  private workItemRepository: IWorkItemRepository;
  private graphRepository: IGraphRepository;
  private retryConfig: RetryConfig;
  private syncQueue = new Map<string, { event: any; retryCount: number; lastAttempt: Date }>();
  private isProcessing = false;

  constructor(
    workItemRepository: IWorkItemRepository,
    graphRepository: IGraphRepository,
    retryConfig: Partial<RetryConfig> = {}
  ) {
    super();

    this.workItemRepository = workItemRepository;
    this.graphRepository = graphRepository;
    this.retryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      ...retryConfig
    };

    this.setupEventHandlers();
    this.startRetryProcessor();
  }

  /**
   * Setup event handlers for all synchronization events
   */
  private setupEventHandlers(): void {
    this.on(SyncEventType.POSTGRESQL_DATA_CHANGED, this.handlePostgreSQLDataChanged.bind(this));
    this.on(SyncEventType.NEO4J_RELATIONSHIP_CHANGED, this.handleNeo4jRelationshipChanged.bind(this));
    this.on(SyncEventType.SYNC_FAILURE, this.handleSyncFailure.bind(this));
    this.on('error', this.handleError.bind(this));
  }

  /**
   * Handle PostgreSQL data changes - sync to Neo4j
   */
  private async handlePostgreSQLDataChanged(event: PostgreSQLDataChangedEvent): Promise<void> {
    const syncId = `pg-${event.workItemId}-${event.timestamp.getTime()}`;

    try {
      await this.syncPostgresToNeo4j(event);
      this.emit(SyncEventType.SYNC_SUCCESS, {
        syncType: 'POSTGRESQL_TO_NEO4J',
        entityId: event.workItemId,
        syncId
      });
    } catch (error) {
      console.warn(`PostgreSQL -> Neo4j sync failed for work item ${event.workItemId}:`, error);

      this.emit(SyncEventType.SYNC_FAILURE, {
        syncType: 'POSTGRESQL_TO_NEO4J',
        entityId: event.workItemId,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
        maxRetries: this.retryConfig.maxRetries,
        timestamp: new Date()
      });

      // Add to retry queue
      this.addToRetryQueue(syncId, event);
    }
  }

  /**
   * Handle Neo4j relationship changes - log to PostgreSQL
   */
  private async handleNeo4jRelationshipChanged(event: Neo4jRelationshipChangedEvent): Promise<void> {
    const syncId = `neo4j-${event.relationshipId}-${event.timestamp.getTime()}`;

    try {
      await this.syncNeo4jToPostgres(event);
      this.emit(SyncEventType.SYNC_SUCCESS, {
        syncType: 'NEO4J_TO_POSTGRESQL',
        entityId: event.relationshipId,
        syncId
      });
    } catch (error) {
      console.warn(`Neo4j -> PostgreSQL sync failed for relationship ${event.relationshipId}:`, error);

      this.emit(SyncEventType.SYNC_FAILURE, {
        syncType: 'NEO4J_TO_POSTGRESQL',
        entityId: event.relationshipId,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
        maxRetries: this.retryConfig.maxRetries,
        timestamp: new Date()
      });

      // Add to retry queue
      this.addToRetryQueue(syncId, event);
    }
  }

  /**
   * Handle synchronization failures with exponential backoff retry
   */
  private async handleSyncFailure(event: SyncFailureEvent): Promise<void> {
    console.error(`Sync failure (attempt ${event.retryCount + 1}/${event.maxRetries}):`, {
      syncType: event.syncType,
      entityId: event.entityId,
      error: event.error
    });

    // Log failure to audit trail if max retries exceeded
    if (event.retryCount >= event.maxRetries) {
      try {
        await this.workItemRepository.logStateChange(
          event.entityId,
          'WORK_ITEM_UPDATED', // Use existing enum value
          {
            syncFailure: true,
            syncType: event.syncType,
            error: event.error,
            finalRetryCount: event.retryCount
          },
          {
            eventType: 'SYNC_FAILURE',
            severity: 'ERROR',
            timestamp: event.timestamp.toISOString()
          }
        );
      } catch (auditError) {
        console.error('Failed to log sync failure to audit trail:', auditError);
      }
    }
  }

  /**
   * Sync PostgreSQL work item data to Neo4j node
   */
  private async syncPostgresToNeo4j(event: PostgreSQLDataChangedEvent): Promise<void> {
    switch (event.changeType) {
      case 'CREATE':
      case 'UPDATE':
        // Find existing node or create new one
        const existingNodes = await this.graphRepository.findNodesByType('WorkItem', {
          workItemId: event.workItemId
        });

        const nodeProperties = {
          workItemId: event.workItemId,
          title: event.data.title || '',
          readinessPercentage: this.calculateReadinessPercentage(event.data.readiness),
          isReady: this.isWorkItemReady(event.data.readiness),
          updatedAt: new Date().toISOString()
        };

        if (existingNodes.length > 0) {
          // Update existing node
          await this.graphRepository.updateNode(existingNodes[0].nodeId, nodeProperties);
        } else {
          // Create new node
          await this.graphRepository.createNode(['WorkItem'], {
            ...nodeProperties,
            createdAt: new Date().toISOString()
          });
        }
        break;

      case 'DELETE':
        // Remove node from graph
        const nodesToDelete = await this.graphRepository.findNodesByType('WorkItem', {
          workItemId: event.workItemId
        });

        for (const node of nodesToDelete) {
          await this.graphRepository.deleteNode(node.nodeId);
        }
        break;
    }
  }

  /**
   * Sync Neo4j relationship changes to PostgreSQL audit log
   */
  private async syncNeo4jToPostgres(event: Neo4jRelationshipChangedEvent): Promise<void> {
    // Get work item IDs from the relationship nodes
    const fromNode = await this.graphRepository.findNodeById(event.fromNodeId);
    const toNode = await this.graphRepository.findNodeById(event.toNodeId);

    if (!fromNode || !toNode) {
      throw new Error(`Cannot find nodes for relationship ${event.relationshipId}`);
    }

    const fromWorkItemId = fromNode.properties.workItemId;
    const toWorkItemId = toNode.properties.workItemId;

    if (!fromWorkItemId || !toWorkItemId) {
      throw new Error(`Nodes missing workItemId properties for relationship ${event.relationshipId}`);
    }

    // Log the relationship change
    const auditType = event.changeType === 'DELETE' ? 'RELATIONSHIP_REMOVED' : 'RELATIONSHIP_ADDED';

    await this.workItemRepository.logStateChange(
      fromWorkItemId,
      auditType,
      {
        relationshipId: event.relationshipId,
        toWorkItemId,
        relationshipType: event.relationshipType,
        properties: event.properties,
        changeType: event.changeType
      },
      {
        eventType: 'NEO4J_SYNC',
        source: 'DataSynchronizationObserver',
        timestamp: event.timestamp.toISOString()
      }
    );
  }

  /**
   * Add failed sync operation to retry queue
   */
  private addToRetryQueue(syncId: string, event: any): void {
    this.syncQueue.set(syncId, {
      event,
      retryCount: 0,
      lastAttempt: new Date()
    });
  }

  /**
   * Start background processor for retry queue
   */
  private startRetryProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.syncQueue.size === 0) {
        return;
      }

      this.isProcessing = true;
      await this.processRetryQueue();
      this.isProcessing = false;
    }, 5000); // Check every 5 seconds
  }

  /**
   * Process items in the retry queue with exponential backoff
   */
  private async processRetryQueue(): Promise<void> {
    const now = new Date();
    const itemsToRetry: Array<{ syncId: string; item: any }> = [];

    // Find items ready for retry
    for (const [syncId, item] of this.syncQueue.entries()) {
      const delay = Math.min(
        this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, item.retryCount),
        this.retryConfig.maxDelayMs
      );

      if (now.getTime() - item.lastAttempt.getTime() >= delay) {
        if (item.retryCount < this.retryConfig.maxRetries) {
          itemsToRetry.push({ syncId, item });
        } else {
          // Max retries exceeded, remove from queue and log failure
          this.syncQueue.delete(syncId);
          console.error(`Max retries exceeded for sync operation ${syncId}`);
        }
      }
    }

    // Process retry items
    for (const { syncId, item } of itemsToRetry) {
      try {
        const event = item.event;
        item.retryCount++;
        item.lastAttempt = now;

        // Determine event type and retry
        if (event.workItemId) {
          await this.syncPostgresToNeo4j(event as PostgreSQLDataChangedEvent);
        } else if (event.relationshipId) {
          await this.syncNeo4jToPostgres(event as Neo4jRelationshipChangedEvent);
        }

        // Success - remove from queue
        this.syncQueue.delete(syncId);
        console.log(`Retry successful for sync operation ${syncId}`);

      } catch (error) {
        console.warn(`Retry failed for sync operation ${syncId} (attempt ${item.retryCount}):`, error);

        // Emit failure event if max retries reached
        if (item.retryCount >= this.retryConfig.maxRetries) {
          this.emit(SyncEventType.SYNC_FAILURE, {
            syncType: item.event.workItemId ? 'POSTGRESQL_TO_NEO4J' : 'NEO4J_TO_POSTGRESQL',
            entityId: item.event.workItemId || item.event.relationshipId,
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: item.retryCount,
            maxRetries: this.retryConfig.maxRetries,
            timestamp: now
          });
        }
      }
    }
  }

  /**
   * Calculate readiness percentage from readiness object
   */
  private calculateReadinessPercentage(readiness: any): number {
    if (!readiness) return 0;

    const dimensions = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];
    const completedCount = dimensions.filter(dim => readiness[dim] === 'COMPLETE').length;
    return Math.round((completedCount / dimensions.length) * 100);
  }

  /**
   * Check if work item is ready (all dimensions complete)
   */
  private isWorkItemReady(readiness: any): boolean {
    if (!readiness) return false;

    const dimensions = ['requirements', 'design', 'frontend', 'backend', 'integration', 'test'];
    return dimensions.every(dim => readiness[dim] === 'COMPLETE');
  }

  /**
   * Handle general errors
   */
  private handleError(error: Error): void {
    console.error('DataSynchronizationObserver error:', error);
  }

  /**
   * Get synchronization status for monitoring
   */
  getStatus(): {
    queueSize: number;
    isProcessing: boolean;
    retryConfig: RetryConfig;
  } {
    return {
      queueSize: this.syncQueue.size,
      isProcessing: this.isProcessing,
      retryConfig: this.retryConfig
    };
  }

  /**
   * Manually trigger sync for a work item (for admin operations)
   */
  async forceSyncWorkItem(workItemId: string): Promise<void> {
    const workItem = await this.workItemRepository.findById(workItemId);
    if (!workItem) {
      throw new Error(`Work item ${workItemId} not found`);
    }

    const event: PostgreSQLDataChangedEvent = {
      workItemId,
      changeType: 'UPDATE',
      data: workItem.toJSON(),
      timestamp: new Date()
    };

    await this.handlePostgreSQLDataChanged(event);
  }

  /**
   * Health check for synchronization system
   */
  async healthCheck(): Promise<{
    observer: boolean;
    repositories: boolean;
    queue: boolean;
    overall: boolean;
  }> {
    try {
      const [pgHealth, graphHealth] = await Promise.all([
        this.workItemRepository.healthCheck(),
        this.graphRepository.healthCheck()
      ]);

      return {
        observer: true,
        repositories: pgHealth && graphHealth,
        queue: this.syncQueue.size < 100, // Alert if queue gets too large
        overall: pgHealth && graphHealth && this.syncQueue.size < 100
      };
    } catch (error) {
      return {
        observer: false,
        repositories: false,
        queue: false,
        overall: false
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down data synchronization observer...');

    // Wait for current processing to complete
    let attempts = 0;
    while (this.isProcessing && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    // Clear retry queue
    this.syncQueue.clear();

    // Remove all listeners
    this.removeAllListeners();

    console.log('Data synchronization observer shutdown complete');
  }
}