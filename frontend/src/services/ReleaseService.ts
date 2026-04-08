'use client';

/**
 * ReleaseService — manages release CRUD and work item assignment.
 */

import * as api from './ApiClient';

export interface ReleaseDTO {
  id: string;
  projectId: string;
  version: string;
  name: string;
  targetDate: string | null;
  status: 'PLANNING' | 'IN_PROGRESS' | 'RELEASED' | 'CANCELLED';
  isFuture: boolean;
  workItemCount: number;
  completedCount: number;
  onBubbleCount: number;
}

export interface ReleaseSummaryDTO {
  release: ReleaseDTO;
  totalItems: number;
  completedItems: number;
  completionPercentage: number;
  harveyBallLevel: string;
  bubbleCount: number;
  itemsByType: Record<string, { total: number; completed: number; percentage: number }>;
}

export async function list(projectId: string): Promise<ReleaseDTO[]> {
  const result = await api.safeGet<{ data: ReleaseDTO[] }>(`/projects/${projectId}/releases`);
  if (result.ok) return result.data.data ?? [];
  return [];
}

export async function create(projectId: string, data: { version: string; name: string; targetDate?: string }): Promise<ReleaseDTO | null> {
  try {
    const res = await api.post<{ data: ReleaseDTO }>(`/projects/${projectId}/releases`, data);
    return res.data;
  } catch { return null; }
}

export async function update(projectId: string, releaseId: string, data: { version?: string; name?: string; targetDate?: string | null; status?: string }): Promise<ReleaseDTO | null> {
  try {
    const res = await api.put<{ data: ReleaseDTO }>(`/projects/${projectId}/releases/${releaseId}`, data);
    return res.data;
  } catch { return null; }
}

export async function remove(projectId: string, releaseId: string): Promise<boolean> {
  try {
    await api.del(`/projects/${projectId}/releases/${releaseId}`);
    return true;
  } catch { return false; }
}

export async function assignWorkItems(projectId: string, releaseId: string, workItemIds: string[]): Promise<boolean> {
  try {
    await api.post(`/projects/${projectId}/releases/${releaseId}/assign`, { workItemIds });
    return true;
  } catch { return false; }
}

export async function unassignWorkItems(projectId: string, releaseId: string, workItemIds: string[]): Promise<boolean> {
  try {
    await api.post(`/projects/${projectId}/releases/${releaseId}/unassign`, { workItemIds });
    return true;
  } catch { return false; }
}

export async function setOnTheBubble(projectId: string, workItemId: string, onTheBubble: boolean): Promise<boolean> {
  try {
    await api.put(`/projects/${projectId}/releases/work-items/${workItemId}/bubble`, { onTheBubble });
    return true;
  } catch { return false; }
}

export async function getSummary(projectId: string, releaseId: string): Promise<ReleaseSummaryDTO | null> {
  const result = await api.safeGet<{ data: ReleaseSummaryDTO }>(`/projects/${projectId}/releases/${releaseId}/summary`);
  if (result.ok) return result.data.data ?? null;
  return null;
}
