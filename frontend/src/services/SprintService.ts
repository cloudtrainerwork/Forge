'use client';

import * as api from './ApiClient';

export interface SprintDTO {
  id: string;
  projectId: string;
  number: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETE' | 'CANCELLED';
  goal: string | null;
  plannedVelocity: number | null;
  actualVelocity: number | null;
  capacity: number | null;
  workItemCount: number;
  completedCount: number;
  totalEstimatedHours: number;
  totalActualHours: number;
}

export async function list(projectId: string): Promise<SprintDTO[]> {
  const result = await api.safeGet<{ data: SprintDTO[] }>(`/projects/${projectId}/sprints`);
  if (result.ok) return result.data.data ?? [];
  return [];
}

export async function create(projectId: string, data: {
  number: number; name: string; description?: string;
  startDate: string; endDate: string; goal?: string;
  plannedVelocity?: number; capacity?: number;
}): Promise<SprintDTO | null> {
  try { const res = await api.post<{ data: SprintDTO }>(`/projects/${projectId}/sprints`, data); return res.data; }
  catch { return null; }
}

export async function update(projectId: string, sprintId: string, data: any): Promise<SprintDTO | null> {
  try { const res = await api.put<{ data: SprintDTO }>(`/projects/${projectId}/sprints/${sprintId}`, data); return res.data; }
  catch { return null; }
}

export async function remove(projectId: string, sprintId: string): Promise<boolean> {
  try { await api.del(`/projects/${projectId}/sprints/${sprintId}`); return true; } catch { return false; }
}

export async function updateStatus(projectId: string, sprintId: string, status: string): Promise<SprintDTO | null> {
  try { const res = await api.put<{ data: SprintDTO }>(`/projects/${projectId}/sprints/${sprintId}/status`, { status }); return res.data; }
  catch { return null; }
}

export async function assignWorkItems(projectId: string, sprintId: string, workItemIds: string[]): Promise<boolean> {
  try { await api.post(`/projects/${projectId}/sprints/${sprintId}/assign`, { workItemIds }); return true; } catch { return false; }
}

export async function unassignWorkItems(projectId: string, sprintId: string, workItemIds: string[]): Promise<boolean> {
  try { await api.post(`/projects/${projectId}/sprints/${sprintId}/unassign`, { workItemIds }); return true; } catch { return false; }
}
