import { injectable, inject } from 'inversify';
import type { PrismaClient } from '@prisma/client';
import type { IReleaseRepository, ReleaseRecord, ReleaseWithStats } from '../../adapters/IReleaseRepository.js';

@injectable()
export class ReleaseRepository implements IReleaseRepository {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {}

  async findById(id: string): Promise<ReleaseRecord | null> {
    const row = await (this.prisma as any).release.findUnique({ where: { id } });
    return row ? this.toRecord(row) : null;
  }

  async listByProject(projectId: string): Promise<ReleaseWithStats[]> {
    const releases = await (this.prisma as any).release.findMany({
      where: { projectId },
      orderBy: [{ isFuture: 'asc' }, { createdAt: 'asc' }],
    });

    // Get stats for each release
    const results: ReleaseWithStats[] = [];
    for (const r of releases) {
      const [workItemCount, completedCount, onBubbleCount] = await Promise.all([
        (this.prisma as any).workItem.count({ where: { releaseId: r.id } }),
        (this.prisma as any).workItem.count({ where: { releaseId: r.id, implementationStatus: 'PRODUCTION' } }),
        (this.prisma as any).workItem.count({ where: { releaseId: r.id, onTheBubble: true } }),
      ]);
      results.push({ ...this.toRecord(r), workItemCount, completedCount, onBubbleCount });
    }
    return results;
  }

  async findFutureRelease(projectId: string): Promise<ReleaseRecord | null> {
    const row = await (this.prisma as any).release.findFirst({
      where: { projectId, isFuture: true },
    });
    return row ? this.toRecord(row) : null;
  }

  async create(data: {
    id: string; tenantId: string; projectId: string;
    version: string; name: string; targetDate?: Date; isFuture?: boolean;
  }): Promise<ReleaseRecord> {
    const row = await (this.prisma as any).release.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        projectId: data.projectId,
        version: data.version,
        name: data.name,
        targetDate: data.targetDate ?? null,
        isFuture: data.isFuture ?? false,
      },
    });
    return this.toRecord(row);
  }

  async update(id: string, data: {
    version?: string; name?: string; targetDate?: Date | null; status?: string;
  }): Promise<ReleaseRecord> {
    const row = await (this.prisma as any).release.update({
      where: { id },
      data,
    });
    return this.toRecord(row);
  }

  async delete(id: string): Promise<void> {
    await (this.prisma as any).release.delete({ where: { id } });
  }

  async assignWorkItem(workItemId: string, releaseId: string | null): Promise<void> {
    await (this.prisma as any).workItem.update({
      where: { id: workItemId },
      data: { releaseId },
    });
  }

  async assignWorkItems(workItemIds: string[], releaseId: string | null): Promise<void> {
    await (this.prisma as any).workItem.updateMany({
      where: { id: { in: workItemIds } },
      data: { releaseId },
    });
  }

  async setOnTheBubble(workItemId: string, onTheBubble: boolean): Promise<void> {
    await (this.prisma as any).workItem.update({
      where: { id: workItemId },
      data: { onTheBubble },
    });
  }

  async getWorkItemsByRelease(releaseId: string): Promise<Array<{
    id: string; title: string; implementationStatus: string;
    onTheBubble: boolean; deliverableType: string | null; parentId: string | null;
  }>> {
    const items = await (this.prisma as any).workItem.findMany({
      where: { releaseId },
      select: { id: true, title: true, implementationStatus: true, onTheBubble: true, deliverableType: true, parentId: true },
      orderBy: { updatedAt: 'desc' },
    });
    return items;
  }

  private toRecord(row: any): ReleaseRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      projectId: row.projectId,
      version: row.version,
      name: row.name,
      targetDate: row.targetDate,
      status: row.status,
      isFuture: row.isFuture,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
