export interface ReleaseRecord {
  id: string;
  tenantId: string;
  projectId: string;
  version: string;
  name: string;
  targetDate: Date | null;
  status: string;
  isFuture: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReleaseWithStats extends ReleaseRecord {
  workItemCount: number;
  completedCount: number;
  onBubbleCount: number;
}

export interface IReleaseRepository {
  findById(id: string): Promise<ReleaseRecord | null>;
  listByProject(projectId: string): Promise<ReleaseWithStats[]>;
  findFutureRelease(projectId: string): Promise<ReleaseRecord | null>;
  create(data: {
    id: string;
    tenantId: string;
    projectId: string;
    version: string;
    name: string;
    targetDate?: Date;
    isFuture?: boolean;
  }): Promise<ReleaseRecord>;
  update(id: string, data: {
    version?: string;
    name?: string;
    targetDate?: Date | null;
    status?: string;
  }): Promise<ReleaseRecord>;
  delete(id: string): Promise<void>;
  assignWorkItem(workItemId: string, releaseId: string | null): Promise<void>;
  assignWorkItems(workItemIds: string[], releaseId: string | null): Promise<void>;
  setOnTheBubble(workItemId: string, onTheBubble: boolean): Promise<void>;
  getWorkItemsByRelease(releaseId: string): Promise<Array<{
    id: string;
    title: string;
    implementationStatus: string;
    onTheBubble: boolean;
    deliverableType: string | null;
    parentId: string | null;
  }>>;
}
