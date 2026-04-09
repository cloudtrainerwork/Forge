import { injectable, inject } from 'inversify';
import type { PrismaClient } from '@prisma/client';
import type { ISprintRepository, SprintRecord, SprintWithStats } from '../../adapters/ISprintRepository.js';

@injectable()
export class SprintRepository implements ISprintRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async findById(id: string): Promise<SprintRecord | null> {
    const row = await (this.prisma as any).sprint.findUnique({ where: { id } });
    return row ? this.toRecord(row) : null;
  }

  async listByProject(projectId: string): Promise<SprintWithStats[]> {
    const sprints = await (this.prisma as any).sprint.findMany({
      where: { projectId },
      orderBy: { number: 'asc' },
    });
    const results: SprintWithStats[] = [];
    for (const s of sprints) {
      const [workItemCount, completedCount, hoursAgg] = await Promise.all([
        (this.prisma as any).workItem.count({ where: { sprintId: s.id } }),
        (this.prisma as any).workItem.count({ where: { sprintId: s.id, implementationStatus: 'PRODUCTION' } }),
        (this.prisma as any).workItem.aggregate({
          where: { sprintId: s.id },
          _sum: { estimatedHours: true, actualHours: true },
        }),
      ]);
      results.push({
        ...this.toRecord(s), workItemCount, completedCount,
        totalEstimatedHours: hoursAgg._sum.estimatedHours ?? 0,
        totalActualHours: hoursAgg._sum.actualHours ?? 0,
      });
    }
    return results;
  }

  async findActiveSprint(projectId: string): Promise<SprintRecord | null> {
    const row = await (this.prisma as any).sprint.findFirst({
      where: { projectId, status: 'ACTIVE' },
    });
    return row ? this.toRecord(row) : null;
  }

  async create(data: {
    id: string; tenantId: string; projectId: string;
    number: number; name: string; description?: string;
    startDate: Date; endDate: Date; goal?: string;
    plannedVelocity?: number; capacity?: number;
  }): Promise<SprintRecord> {
    const row = await (this.prisma as any).sprint.create({
      data: {
        id: data.id, tenantId: data.tenantId, projectId: data.projectId,
        number: data.number, name: data.name, description: data.description ?? null,
        startDate: data.startDate, endDate: data.endDate, goal: data.goal ?? null,
        plannedVelocity: data.plannedVelocity ?? null, capacity: data.capacity ?? null,
      },
    });
    return this.toRecord(row);
  }

  async update(id: string, data: any): Promise<SprintRecord> {
    const row = await (this.prisma as any).sprint.update({ where: { id }, data });
    return this.toRecord(row);
  }

  async delete(id: string): Promise<void> {
    // Unassign work items first
    await (this.prisma as any).workItem.updateMany({ where: { sprintId: id }, data: { sprintId: null } });
    await (this.prisma as any).sprint.delete({ where: { id } });
  }

  async assignWorkItem(workItemId: string, sprintId: string | null): Promise<void> {
    await (this.prisma as any).workItem.update({ where: { id: workItemId }, data: { sprintId } });
  }

  async assignWorkItems(workItemIds: string[], sprintId: string | null): Promise<void> {
    await (this.prisma as any).workItem.updateMany({ where: { id: { in: workItemIds } }, data: { sprintId } });
  }

  async getWorkItemsBySprint(sprintId: string): Promise<Array<{
    id: string; title: string; implementationStatus: string;
    deliverableType: string | null; parentId: string | null;
  }>> {
    return (this.prisma as any).workItem.findMany({
      where: { sprintId },
      select: { id: true, title: true, implementationStatus: true, deliverableType: true, parentId: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private toRecord(row: any): SprintRecord {
    return {
      id: row.id, tenantId: row.tenantId, projectId: row.projectId,
      number: row.number, name: row.name, description: row.description,
      startDate: row.startDate, endDate: row.endDate, status: row.status,
      goal: row.goal, plannedVelocity: row.plannedVelocity,
      actualVelocity: row.actualVelocity, capacity: row.capacity,
      createdAt: row.createdAt, updatedAt: row.updatedAt,
    };
  }
}
