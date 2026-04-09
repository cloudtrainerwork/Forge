export interface SprintRecord {
  id: string;
  tenantId: string;
  projectId: string;
  number: number;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  goal: string | null;
  plannedVelocity: number | null;
  actualVelocity: number | null;
  capacity: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SprintWithStats extends SprintRecord {
  workItemCount: number;
  completedCount: number;
}

export interface ISprintRepository {
  findById(id: string): Promise<SprintRecord | null>;
  listByProject(projectId: string): Promise<SprintWithStats[]>;
  findActiveSprint(projectId: string): Promise<SprintRecord | null>;
  create(data: {
    id: string; tenantId: string; projectId: string;
    number: number; name: string; description?: string;
    startDate: Date; endDate: Date; goal?: string;
    plannedVelocity?: number; capacity?: number;
  }): Promise<SprintRecord>;
  update(id: string, data: {
    name?: string; description?: string; startDate?: Date; endDate?: Date;
    status?: string; goal?: string; plannedVelocity?: number;
    actualVelocity?: number; capacity?: number;
  }): Promise<SprintRecord>;
  delete(id: string): Promise<void>;
  assignWorkItem(workItemId: string, sprintId: string | null): Promise<void>;
  assignWorkItems(workItemIds: string[], sprintId: string | null): Promise<void>;
  getWorkItemsBySprint(sprintId: string): Promise<Array<{
    id: string; title: string; implementationStatus: string;
    deliverableType: string | null; parentId: string | null;
  }>>;
}
