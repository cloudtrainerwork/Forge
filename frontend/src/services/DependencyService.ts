'use client';

/**
 * DependencyService — manages graph edges (dependencies) between work items.
 */

import * as api from './ApiClient';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DependencyDTO {
  from: string;
  to: string;
  type: string; // 'requires' | 'contains' | 'feeds-into'
}

// ── Service ────────────────────────────────────────────────────────────────────

/** Fetch all dependencies */
export async function list(): Promise<DependencyDTO[]> {
  const result = await api.safeGet<{ data: DependencyDTO[] }>('/dependencies');
  if (result.ok) return result.data.data ?? [];
  console.debug('[DependencyService] list failed:', result.error.message);
  return [];
}

/** Create a new dependency edge */
export async function create(from: string, to: string, type = 'requires'): Promise<DependencyDTO | null> {
  try {
    const res = await api.post<{ data: DependencyDTO }>('/dependencies', { from, to, type });
    return res.data ?? { from, to, type };
  } catch (err) {
    if (err instanceof api.ApiError && err.status === 409) {
      // Already exists — not an error
      return { from, to, type };
    }
    console.error('[DependencyService] create failed:', err);
    return null;
  }
}

/** Remove a dependency edge */
export async function remove(from: string, to: string): Promise<boolean> {
  try {
    await api.del(`/dependencies/${from}/${to}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Persist an array of dependency edges (best-effort).
 * Retries 400 errors up to 3× because nodes may still be creating.
 */
export async function upsertMany(deps: DependencyDTO[]): Promise<{ created: number; errors: number }> {
  let created = 0;
  let errors = 0;

  for (const dep of deps) {
    let retries = 0;
    let ok = false;

    while (!ok && retries < 3) {
      try {
        await api.post('/dependencies', dep, { skipDedup: true });
        created++;
        ok = true;
      } catch (err) {
        if (err instanceof api.ApiError) {
          if (err.status === 409) { ok = true; continue; } // already exists
          if (err.status === 400) {
            retries++;
            if (retries < 3) await new Promise(r => setTimeout(r, 1000));
            else { errors++; ok = true; }
          } else {
            errors++;
            ok = true;
          }
        } else {
          errors++;
          ok = true;
        }
      }
    }
  }

  return { created, errors };
}
