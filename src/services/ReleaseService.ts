import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import type { IReleaseRepository, ReleaseWithStats } from '../adapters/IReleaseRepository.js';
import type { AuditTrailService } from './AuditTrailService.js';

export interface ReleaseSummary {
  release: ReleaseWithStats;
  totalItems: number;
  completedItems: number;
  completionPercentage: number;
  harveyBallLevel: 'empty' | 'quarter' | 'half' | 'three-quarter' | 'full';
  bubbleCount: number;
  itemsByType: Record<string, { total: number; completed: number; percentage: number }>;
}

@injectable()
export class ReleaseService {
  constructor(
    @inject('IReleaseRepository') private releaseRepo: IReleaseRepository,
    @inject('AuditTrailService') private auditTrailService: AuditTrailService,
  ) {}

  async listReleases(projectId: string): Promise<ReleaseWithStats[]> {
    return this.releaseRepo.listByProject(projectId);
  }

  async getRelease(releaseId: string) {
    return this.releaseRepo.findById(releaseId);
  }

  async createRelease(
    tenantId: string, projectId: string,
    version: string, name: string, targetDate?: Date,
  ) {
    const id = uuidv4();
    const release = await this.releaseRepo.create({ id, tenantId, projectId, version, name, targetDate });

    try {
      this.auditTrailService.emit('RELEASE_CREATED', { releaseId: id, tenantId, projectId, version, name });
    } catch { /* audit best-effort */ }

    return release;
  }

  /** Idempotent: creates the "Future" bucket release if it doesn't exist (RL-03) */
  async ensureFutureRelease(tenantId: string, projectId: string) {
    const existing = await this.releaseRepo.findFutureRelease(projectId);
    if (existing) return existing;

    const id = uuidv4();
    return this.releaseRepo.create({
      id, tenantId, projectId,
      version: 'future',
      name: 'Future / Backlog',
      isFuture: true,
    });
  }

  async updateRelease(releaseId: string, data: {
    version?: string; name?: string; targetDate?: Date | null; status?: string;
  }) {
    const release = await this.releaseRepo.update(releaseId, data);

    try {
      this.auditTrailService.emit('RELEASE_UPDATED', { releaseId, changes: data });
    } catch { /* audit best-effort */ }

    return release;
  }

  async updateStatus(releaseId: string, status: string, tenantId?: string) {
    const release = await this.releaseRepo.update(releaseId, { status });

    try {
      this.auditTrailService.emit('RELEASE_STATUS_CHANGED', { releaseId, status, tenantId });
    } catch { /* audit best-effort */ }

    return release;
  }

  /** Delete release — moves all its work items to the Future bucket first */
  async deleteRelease(releaseId: string, tenantId: string, projectId: string) {
    const release = await this.releaseRepo.findById(releaseId);
    if (!release) throw new Error(`Release ${releaseId} not found`);
    if (release.isFuture) throw new Error('Cannot delete the Future release');

    // Move work items to Future release
    const futureRelease = await this.ensureFutureRelease(tenantId, projectId);
    const items = await this.releaseRepo.getWorkItemsByRelease(releaseId);
    if (items.length > 0) {
      await this.releaseRepo.assignWorkItems(
        items.map(i => i.id),
        futureRelease.id,
      );
    }

    await this.releaseRepo.delete(releaseId);
  }

  /** Assign a work item to a release with audit trail (RL-05) */
  async assignWorkItem(workItemId: string, releaseId: string | null, tenantId?: string) {
    await this.releaseRepo.assignWorkItem(workItemId, releaseId);

    try {
      this.auditTrailService.emit('WORK_ITEM_RELEASE_CHANGED', {
        workItemId, releaseId, tenantId,
      });
    } catch { /* audit best-effort */ }
  }

  async assignWorkItems(workItemIds: string[], releaseId: string | null, tenantId?: string) {
    await this.releaseRepo.assignWorkItems(workItemIds, releaseId);

    try {
      this.auditTrailService.emit('WORK_ITEM_RELEASE_CHANGED', {
        workItemIds, releaseId, tenantId,
      });
    } catch { /* audit best-effort */ }
  }

  async setOnTheBubble(workItemId: string, onTheBubble: boolean) {
    await this.releaseRepo.setOnTheBubble(workItemId, onTheBubble);
  }

  async getReleaseSummary(releaseId: string): Promise<ReleaseSummary | null> {
    const releases = await this.releaseRepo.listByProject('');
    // Need the full release with stats — get it directly
    const release = (await this.releaseRepo.listByProject('')).find(r => r.id === releaseId);

    // Fallback: get release and compute stats
    const releaseRecord = await this.releaseRepo.findById(releaseId);
    if (!releaseRecord) return null;

    const items = await this.releaseRepo.getWorkItemsByRelease(releaseId);
    const totalItems = items.length;
    const completedItems = items.filter(i => i.implementationStatus === 'PRODUCTION').length;
    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    const bubbleCount = items.filter(i => i.onTheBubble).length;

    // Harvey ball level
    let harveyBallLevel: ReleaseSummary['harveyBallLevel'] = 'empty';
    if (completionPercentage > 0 && completionPercentage <= 25) harveyBallLevel = 'quarter';
    else if (completionPercentage > 25 && completionPercentage <= 50) harveyBallLevel = 'half';
    else if (completionPercentage > 50 && completionPercentage <= 75) harveyBallLevel = 'three-quarter';
    else if (completionPercentage > 75) harveyBallLevel = 'full';

    // Items by type (RL-08)
    const itemsByType: Record<string, { total: number; completed: number; percentage: number }> = {};
    for (const item of items) {
      const type = item.deliverableType || 'GENERIC';
      if (!itemsByType[type]) itemsByType[type] = { total: 0, completed: 0, percentage: 0 };
      itemsByType[type].total++;
      if (item.implementationStatus === 'PRODUCTION') itemsByType[type].completed++;
    }
    for (const type in itemsByType) {
      const t = itemsByType[type];
      t.percentage = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
    }

    return {
      release: {
        ...releaseRecord,
        workItemCount: totalItems,
        completedCount: completedItems,
        onBubbleCount: bubbleCount,
      },
      totalItems,
      completedItems,
      completionPercentage,
      harveyBallLevel,
      bubbleCount,
      itemsByType,
    };
  }
}
