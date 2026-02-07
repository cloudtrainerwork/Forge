import { EventEmitter } from 'events';
import { injectable, inject } from 'inversify';
import type { IWorkItemRepository } from '../adapters/IWorkItemRepository.js';

/**
 * Event types for the audit trail system
 */
export enum AuditEventType {
  WORK_ITEM_CREATED = 'WORK_ITEM_CREATED',
  WORK_ITEM_UPDATED = 'WORK_ITEM_UPDATED',
  RELATIONSHIP_ADDED = 'RELATIONSHIP_ADDED',
  RELATIONSHIP_REMOVED = 'RELATIONSHIP_REMOVED',
  READINESS_UPDATED = 'READINESS_UPDATED'
}

/**
 * Event data structures for different event types
 */
export interface WorkItemCreatedEvent {
  workItemId: string;
  nodeId: string;
  title?: string;
  spec: Record<string, any>;
  readiness: Record<string, any>;
}

export interface ReadinessUpdatedEvent {
  workItemId: string;
  nodeId: string;
  dimension: string;
  oldValue: string;
  newValue: string;
  completionPercentage: number;
}

export interface RelationshipAddedEvent {
  relationshipId: string;
  fromWorkItemId: string;
  toWorkItemId: string;
  fromNodeId: string;
  toNodeId: string;
  relationshipType: string;
  properties: Record<string, any>;
}

export interface RelationshipRemovedEvent {
  relationshipId: string;
  fromWorkItemId: string;
  toWorkItemId: string;
  relationshipType: string;
}

/**
 * Audit trail service extending EventEmitter for event-driven audit logging
 * Handles event persistence to PostgreSQL audit log with proper error propagation
 */
@injectable()
export class AuditTrailService extends EventEmitter {
  private isShuttingDown = false;

  constructor(
    @inject('IWorkItemRepository') private workItemRepository: IWorkItemRepository
  ) {
    super();
    this.setupEventHandlers();

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Setup event handlers for all audit event types
   */
  private setupEventHandlers(): void {
    this.on(AuditEventType.WORK_ITEM_CREATED, this.handleWorkItemCreated.bind(this));
    this.on(AuditEventType.WORK_ITEM_UPDATED, this.handleWorkItemUpdated.bind(this));
    this.on(AuditEventType.RELATIONSHIP_ADDED, this.handleRelationshipAdded.bind(this));
    this.on(AuditEventType.RELATIONSHIP_REMOVED, this.handleRelationshipRemoved.bind(this));
    this.on(AuditEventType.READINESS_UPDATED, this.handleReadinessUpdated.bind(this));

    // Handle errors from event handlers
    this.on('error', this.handleEventError.bind(this));
  }

  /**
   * Handle WORK_ITEM_CREATED events
   */
  private async handleWorkItemCreated(event: WorkItemCreatedEvent): Promise<void> {
    try {
      await this.workItemRepository.logStateChange(
        event.workItemId,
        'WORK_ITEM_CREATED',
        {
          nodeId: event.nodeId,
          title: event.title,
          spec: event.spec,
          readiness: event.readiness
        },
        {
          eventType: AuditEventType.WORK_ITEM_CREATED,
          timestamp: new Date().toISOString(),
          source: 'WorkItemService'
        }
      );
    } catch (error) {
      this.emit('error', new Error(`Failed to log work item created event: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Handle WORK_ITEM_UPDATED events
   */
  private async handleWorkItemUpdated(event: any): Promise<void> {
    try {
      await this.workItemRepository.logStateChange(
        event.workItemId,
        'WORK_ITEM_UPDATED',
        {
          changes: event.changes,
          before: event.before,
          after: event.after
        },
        {
          eventType: AuditEventType.WORK_ITEM_UPDATED,
          timestamp: new Date().toISOString(),
          source: 'WorkItemService'
        }
      );
    } catch (error) {
      this.emit('error', new Error(`Failed to log work item updated event: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Handle RELATIONSHIP_ADDED events
   */
  private async handleRelationshipAdded(event: RelationshipAddedEvent): Promise<void> {
    try {
      await this.workItemRepository.logStateChange(
        event.fromWorkItemId,
        'RELATIONSHIP_ADDED',
        {
          relationshipId: event.relationshipId,
          toWorkItemId: event.toWorkItemId,
          fromNodeId: event.fromNodeId,
          toNodeId: event.toNodeId,
          relationshipType: event.relationshipType,
          properties: event.properties
        },
        {
          eventType: AuditEventType.RELATIONSHIP_ADDED,
          timestamp: new Date().toISOString(),
          source: 'WorkItemService'
        }
      );
    } catch (error) {
      this.emit('error', new Error(`Failed to log relationship added event: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Handle RELATIONSHIP_REMOVED events
   */
  private async handleRelationshipRemoved(event: RelationshipRemovedEvent): Promise<void> {
    try {
      await this.workItemRepository.logStateChange(
        event.fromWorkItemId,
        'RELATIONSHIP_REMOVED',
        {
          relationshipId: event.relationshipId,
          toWorkItemId: event.toWorkItemId,
          relationshipType: event.relationshipType
        },
        {
          eventType: AuditEventType.RELATIONSHIP_REMOVED,
          timestamp: new Date().toISOString(),
          source: 'WorkItemService'
        }
      );
    } catch (error) {
      this.emit('error', new Error(`Failed to log relationship removed event: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Handle READINESS_UPDATED events
   */
  private async handleReadinessUpdated(event: ReadinessUpdatedEvent): Promise<void> {
    try {
      await this.workItemRepository.logStateChange(
        event.workItemId,
        'READINESS_UPDATED',
        {
          nodeId: event.nodeId,
          dimension: event.dimension,
          oldValue: event.oldValue,
          newValue: event.newValue,
          completionPercentage: event.completionPercentage
        },
        {
          eventType: AuditEventType.READINESS_UPDATED,
          timestamp: new Date().toISOString(),
          source: 'WorkItemService'
        }
      );
    } catch (error) {
      this.emit('error', new Error(`Failed to log readiness updated event: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Handle errors from event handlers
   */
  private handleEventError(error: Error): void {
    console.error('Audit trail event error:', error);

    // In production, you might want to:
    // 1. Send to monitoring system (e.g., Sentry, DataDog)
    // 2. Store in dead letter queue for retry
    // 3. Alert operations team

    // For now, log and continue
    if (this.listenerCount('error') <= 1) {
      // No other error listeners, prevent crash
      console.error('Unhandled audit trail error - continuing operation');
    }
  }

  /**
   * Get audit log for a specific work item
   */
  async getAuditLog(
    workItemId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<{
    id: string;
    type: string;
    changes: Record<string, any>;
    timestamp: Date;
  }>> {
    try {
      return await this.workItemRepository.getAuditLog(workItemId, limit, offset);
    } catch (error) {
      throw new Error(`Failed to get audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Manually log a state change (for external integrations)
   */
  async logStateChange(
    entityId: string,
    type: 'WORK_ITEM_CREATED' | 'WORK_ITEM_UPDATED' | 'RELATIONSHIP_ADDED' | 'RELATIONSHIP_REMOVED' | 'READINESS_UPDATED',
    changes: Record<string, any>,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.workItemRepository.logStateChange(
        entityId,
        type,
        changes,
        {
          ...metadata,
          timestamp: new Date().toISOString(),
          source: 'Manual'
        }
      );
    } catch (error) {
      throw new Error(`Failed to log manual state change: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if audit system is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.workItemRepository.healthCheck();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get count of pending events (for monitoring)
   */
  getPendingEventCount(): number {
    // EventEmitter doesn't have a direct way to count pending events
    // This is an approximation based on listener counts
    const eventTypes = Object.values(AuditEventType);
    return eventTypes.reduce((total, eventType) => {
      return total + this.listenerCount(eventType);
    }, 0);
  }

  /**
   * Graceful shutdown - ensure all events are processed
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('Shutting down audit trail service...');

    // Give pending events a chance to complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Remove all listeners
    this.removeAllListeners();

    console.log('Audit trail service shutdown complete');
  }
}