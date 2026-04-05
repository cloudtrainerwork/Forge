import { PrismaClient, AuditLogType } from '@prisma/client';
import { WorkItem, ReadinessDimension, ReadinessState } from '../../domain/entities.js';
import { IWorkItemRepository } from '../../adapters/IWorkItemRepository.js';

/**
 * PostgreSQL implementation of work item repository using Prisma
 * Handles work item specifications, readiness tracking, and audit trail
 */
export class WorkItemRepository implements IWorkItemRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async save(workItem: WorkItem): Promise<WorkItem> {
    try {
      // Validate before saving
      await workItem.validate();

      const data: Record<string, any> = {
        id: workItem.id,
        title: workItem.title || null,
        description: workItem.description || null,
        spec: workItem.spec,
        readiness: workItem.readiness.toJSON(),
        implementationStatus: workItem.implementationStatus || 'NOT_STARTED',
        deliverableType: workItem.deliverableType || null,
        parentId: workItem.parentId || null,
      };

      // Include tenantId for new records (required column with RLS)
      if (workItem.tenantId) {
        data.tenantId = workItem.tenantId;
      }

      // Check if work item exists
      const existing = await this.prisma.workItem.findUnique({
        where: { id: workItem.id }
      });

      let savedItem;
      if (existing) {
        // Update existing
        savedItem = await this.prisma.workItem.update({
          where: { id: workItem.id },
          data: {
            ...data,
            updatedAt: new Date(),
          }
        });

        // Log update (include tenantId for RLS on audit_logs)
        await this.logStateChange(
          workItem.id,
          'WORK_ITEM_UPDATED',
          {
            before: {
              title: existing.title,
              description: existing.description,
              spec: existing.spec,
              readiness: existing.readiness,
            },
            after: {
              title: data.title,
              description: data.description,
              spec: data.spec,
              readiness: data.readiness,
            }
          },
          {},
          workItem.tenantId,
        );
      } else {
        // Create new
        savedItem = await this.prisma.workItem.create({
          data: {
            ...data,
            createdAt: workItem.createdAt,
            updatedAt: workItem.updatedAt,
          } as any
        });

        // Log creation (include tenantId for RLS on audit_logs)
        await this.logStateChange(
          workItem.id,
          'WORK_ITEM_CREATED',
          {
            created: {
              title: data.title,
              description: data.description,
              spec: data.spec,
              readiness: data.readiness,
            }
          },
          {},
          workItem.tenantId,
        );
      }

      return this.mapToWorkItem(savedItem);
    } catch (error) {
      throw new Error(`Failed to save work item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<WorkItem | null> {
    try {
      const item = await this.prisma.workItem.findUnique({
        where: { id }
      });

      return item ? this.mapToWorkItem(item) : null;
    } catch (error) {
      throw new Error(`Failed to find work item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByReadiness(
    dimension?: keyof WorkItem['readiness'],
    value?: ReadinessDimension,
    limit: number = 50,
    offset: number = 0
  ): Promise<WorkItem[]> {
    try {
      let where = {};

      if (dimension && value) {
        // JSONB query for specific readiness dimension
        where = {
          readiness: {
            path: [dimension],
            equals: value
          }
        };
      }

      const items = await this.prisma.workItem.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' }
      });

      return items.map(item => this.mapToWorkItem(item));
    } catch (error) {
      throw new Error(`Failed to find by readiness: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findBySpec(
    specQuery: Record<string, any>,
    limit: number = 50,
    offset: number = 0
  ): Promise<WorkItem[]> {
    try {
      // Build JSONB query for spec
      const whereConditions = Object.entries(specQuery).map(([key, value]) => ({
        spec: {
          path: [key],
          equals: value
        }
      }));

      const items = await this.prisma.workItem.findMany({
        where: {
          AND: whereConditions
        },
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' }
      });

      return items.map(item => this.mapToWorkItem(item));
    } catch (error) {
      throw new Error(`Failed to find by spec: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findBySearch(
    searchTerm: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WorkItem[]> {
    try {
      const items = await this.prisma.workItem.findMany({
        where: {
          OR: [
            {
              title: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              description: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            }
          ]
        },
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' }
      });

      return items.map(item => this.mapToWorkItem(item));
    } catch (error) {
      throw new Error(`Failed to search work items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(id: string, updates: Partial<WorkItem>): Promise<WorkItem> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Work item not found');
      }

      // Create updated work item (preserve tenantId from existing)
      const updated = new WorkItem(
        existing.id,
        updates.spec ?? existing.spec,
        updates.title ?? existing.title,
        updates.description ?? existing.description,
        updates.readiness ?? existing.readiness,
        updates.groupId ?? existing.groupId,
        updates.sprintId ?? existing.sprintId,
        updates.parentId ?? existing.parentId,
        updates.deliverableType ?? existing.deliverableType,
        existing.createdAt,
        new Date(),
        existing.tenantId,
        updates.implementationStatus ?? existing.implementationStatus,
      );

      return await this.save(updated);
    } catch (error) {
      throw new Error(`Failed to update work item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.workItem.delete({
        where: { id }
      });
    } catch (error) {
      throw new Error(`Failed to delete work item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(limit: number = 50, offset: number = 0): Promise<{
    items: WorkItem[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const [items, total] = await Promise.all([
        this.prisma.workItem.findMany({
          take: limit,
          skip: offset,
          orderBy: { updatedAt: 'desc' }
        }),
        this.prisma.workItem.count()
      ]);

      return {
        items: items.map(item => this.mapToWorkItem(item)),
        total,
        hasMore: offset + items.length < total
      };
    } catch (error) {
      throw new Error(`Failed to find all work items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async countByReadiness(): Promise<Record<string, number>> {
    try {
      // This would require raw SQL for complex JSONB aggregation
      // For now, implement a basic count approach
      const items = await this.prisma.workItem.findMany({
        select: { readiness: true }
      });

      const counts: Record<string, number> = {
        complete: 0,
        inProgress: 0,
        notStarted: 0
      };

      items.forEach(item => {
        const readiness = item.readiness as any;
        const dimensions = Object.values(readiness);

        const allComplete = dimensions.every(d => d === 'COMPLETE');
        const anyInProgress = dimensions.some(d => d === 'IN_PROGRESS');

        if (allComplete) {
          counts.complete++;
        } else if (anyInProgress) {
          counts.inProgress++;
        } else {
          counts.notStarted++;
        }
      });

      return counts;
    } catch (error) {
      throw new Error(`Failed to count by readiness: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async logStateChange(
    entityId: string,
    type: 'WORK_ITEM_CREATED' | 'WORK_ITEM_UPDATED' | 'RELATIONSHIP_ADDED' | 'RELATIONSHIP_REMOVED' | 'READINESS_UPDATED',
    changes: Record<string, any>,
    metadata: Record<string, any> = {},
    tenantId?: string,
    actorId?: string,
  ): Promise<void> {
    try {
      const data: Record<string, any> = {
        type: type as AuditLogType,
        entityId,
        changes: {
          ...changes,
          metadata
        },
      };
      // Include tenantId if provided (required by RLS policy)
      if (tenantId) data.tenantId = tenantId;
      if (actorId) data.actorId = actorId;

      await this.prisma.auditLog.create({ data: data as any });
    } catch (error) {
      throw new Error(`Failed to log state change: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAuditLog(
    entityId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<{
    id: string;
    type: string;
    changes: Record<string, any>;
    timestamp: Date;
  }>> {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: { entityId },
        take: limit,
        skip: offset,
        orderBy: { timestamp: 'desc' }
      });

      return logs.map(log => ({
        id: log.id,
        type: log.type,
        changes: log.changes as Record<string, any>,
        timestamp: log.timestamp
      }));
    } catch (error) {
      throw new Error(`Failed to get audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Map Prisma model to domain entity
   */
  private mapToWorkItem(item: any): WorkItem {
    return new WorkItem(
      item.id,
      item.spec as Record<string, any>,
      item.title || undefined,
      item.description || undefined,
      item.readiness ? ReadinessState.fromJSON(item.readiness) : undefined,
      item.groupId || undefined,
      item.sprintId || undefined,
      item.parentId || undefined,
      item.deliverableType || undefined,
      item.createdAt,
      item.updatedAt,
      item.tenantId || undefined,
      (item.implementationStatus as any) || undefined,
    );
  }
}