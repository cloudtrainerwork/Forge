'use client';

/**
 * WorkItemService — manages work item CRUD against the FORGE backend.
 *
 * Handles creation, position updates, listing, and the "create-if-missing"
 * pattern used when persisting template-loaded nodes.
 */

import * as api from './ApiClient';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ReadinessState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';

export interface WorkItemDTO {
  id: string;
  title: string;
  description?: string;
  type: string;
  x: number;
  y: number;
  readiness: {
    requirements: number | ReadinessState;
    design: number | ReadinessState;
    frontend: number | ReadinessState;
    backend: number | ReadinessState;
    integration: number | ReadinessState;
    test: number | ReadinessState;
  };
  confidence: string;
  implementationStatus: string; // NOT_STARTED | STUBBED | PARTIAL | FUNCTIONAL | PRODUCTION
  parentId?: string | null;
  childCount?: number;
}

export interface WorkItemListResponse {
  data: WorkItemDTO[];
  total?: number;
  hasMore?: boolean;
}

// ── Service ────────────────────────────────────────────────────────────────────

/** Fetch all work items from the backend */
export async function list(): Promise<WorkItemDTO[]> {
  const result = await api.safeGet<WorkItemListResponse>('/work-items');
  if (result.ok) return result.data.data ?? [];
  console.debug('[WorkItemService] list failed:', result.error.message);
  return [];
}

/** Fetch work items filtered by parentId (hierarchy drill-down) */
export async function listByParent(parentId: string | null): Promise<WorkItemDTO[]> {
  const param = parentId ?? 'root';
  const result = await api.safeGet<WorkItemListResponse>(`/work-items?parentId=${encodeURIComponent(param)}`);
  if (result.ok) return result.data.data ?? [];
  console.debug('[WorkItemService] listByParent failed:', result.error.message);
  return [];
}

/** Get ancestor chain for breadcrumb reconstruction */
export async function getAncestors(id: string): Promise<Array<{ id: string; title: string }>> {
  const result = await api.safeGet<{ data: Array<{ id: string; title: string }> }>(`/work-items/${id}/ancestors`);
  if (result.ok) return result.data.data ?? [];
  return [];
}

/** Fetch a single work item by ID */
export async function getById(id: string): Promise<WorkItemDTO | null> {
  try {
    const res = await api.get<{ data: WorkItemDTO }>(`/work-items/${id}`);
    return res.data ?? null;
  } catch (err) {
    if (err instanceof api.NotFoundError) return null;
    throw err;
  }
}

/** Create a new work item */
export async function create(item: WorkItemDTO): Promise<WorkItemDTO> {
  const res = await api.post<{ data: WorkItemDTO }>('/work-items', item);
  return res.data;
}

/** Update a work item's position on the canvas */
export async function updatePosition(id: string, x: number, y: number): Promise<boolean> {
  try {
    await api.put(`/work-items/${id}/position`, { x, y });
    return true;
  } catch {
    return false;
  }
}

/** Update a work item's title, description, type, or implementationStatus */
export async function update(id: string, data: { title?: string; description?: string; type?: string; implementationStatus?: string }): Promise<WorkItemDTO | null> {
  try {
    const res = await api.put<{ data: WorkItemDTO }>(`/work-items/${id}`, data);
    return res.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Persist an array of work items using create-or-update semantics (best-effort).
 *
 * Uses safe (non-throwing) API calls to avoid triggering the Next.js dev
 * error overlay for expected failures (e.g. missing tenant in dev mode).
 */
export async function upsertMany(items: WorkItemDTO[]): Promise<{ created: number; errors: number }> {
  let created = 0;
  let errors = 0;

  for (const item of items) {
    // Use safe (non-throwing) API calls
    const result = await api.safePost('/work-items', item, { skipDedup: true });
    if (result.ok) {
      created++;
    } else if (result.error.status === 409) {
      // Already exists — update position and type/status
      await api.safePut(`/work-items/${item.id}/position`, { x: item.x, y: item.y });
      // Also sync type and implementationStatus
      if (item.type || item.implementationStatus) {
        await api.safePut(`/work-items/${item.id}`, {
          ...(item.type ? { type: item.type } : {}),
          ...(item.implementationStatus ? { implementationStatus: item.implementationStatus } : {}),
        });
      }
    } else {
      errors++;
    }
  }

  if (errors > 0) {
    console.warn(`[WorkItemService] upsertMany: ${errors} of ${items.length} items failed to save (${created} created)`);
  }

  return { created, errors };
}
