'use client';

/**
 * SpecificationService — manages specification data with a dual-persistence
 * strategy: localStorage (instant, reliable) + database (async, best-effort).
 *
 * localStorage is the source of truth. The DB is kept in sync on save() so that
 * the backend services (validation, export, reports) have access to the data.
 */

import * as api from './ApiClient';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SpecSection {
  content: string;
  status: 'empty' | 'draft' | 'review' | 'complete';
  wordCount: number;
  lastUpdated: string;
}

export type SectionName = 'requirements' | 'design' | 'frontend' | 'backend' | 'integration' | 'test';

export const SECTION_NAMES: SectionName[] = [
  'requirements', 'design', 'frontend', 'backend', 'integration', 'test',
];

export interface SpecData {
  id: string;
  workItemId: string;
  sections: Record<SectionName, SpecSection>;
  overallStatus: 'empty' | 'draft' | 'review' | 'complete';
  completionPercentage: number;
  updatedAt: string;
}

// ── Readiness mapping ──────────────────────────────────────────────────────────

const STATUS_WEIGHT: Record<SpecSection['status'], number> = {
  empty: 0, draft: 0.25, review: 0.75, complete: 1,
};

const STATUS_READINESS: Record<SpecSection['status'], number> = {
  empty: 0, draft: 0.3, review: 0.7, complete: 1.0,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function wordCount(text: string): number {
  if (!text?.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function deriveStatus(wc: number): SpecSection['status'] {
  if (wc === 0) return 'empty';
  if (wc < 20) return 'draft';
  if (wc < 100) return 'review';
  return 'complete';
}

function emptySection(): SpecSection {
  return { content: '', status: 'empty', wordCount: 0, lastUpdated: new Date().toISOString() };
}

function recalcOverall(sections: Record<SectionName, SpecSection>): { overallStatus: SpecData['overallStatus']; completionPercentage: number } {
  let total = 0;
  const statuses: SpecSection['status'][] = [];

  for (const name of SECTION_NAMES) {
    const s = sections[name];
    total += STATUS_WEIGHT[s.status] ?? 0;
    statuses.push(s.status);
  }

  const pct = Math.round((total / SECTION_NAMES.length) * 100);

  let overallStatus: SpecData['overallStatus'] = 'empty';
  if (statuses.every(s => s === 'complete')) overallStatus = 'complete';
  else if (statuses.some(s => s === 'review' || s === 'complete')) overallStatus = 'review';
  else if (statuses.some(s => s === 'draft')) overallStatus = 'draft';

  return { overallStatus, completionPercentage: pct };
}

// ── localStorage persistence ───────────────────────────────────────────────────

const STORAGE_KEY = (id: string) => `forge-spec-${id}`;

export function loadFromLocal(workItemId: string): SpecData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(workItemId));
    if (raw) {
      const parsed = JSON.parse(raw) as SpecData;
      if (parsed?.sections?.requirements) return parsed;
    }
  } catch { /* corrupt → fall through */ }

  return createEmpty(workItemId);
}

export function saveToLocal(spec: SpecData): void {
  try {
    localStorage.setItem(STORAGE_KEY(spec.workItemId), JSON.stringify(spec));
  } catch {
    console.warn('[SpecificationService] localStorage write failed');
  }
}

// ── DB persistence (fire-and-forget per section) ───────────────────────────────

export async function saveToDB(spec: SpecData): Promise<void> {
  const promises = SECTION_NAMES.map(name => {
    const section = spec.sections[name];
    return api
      .patch(`/specifications/${spec.workItemId}/sections/${name}`, section)
      .catch(err => {
        // 404 → work item only in localStorage; not a real error
        // NetworkError → backend down; non-fatal (localStorage is source of truth)
        if (err instanceof api.NotFoundError || err instanceof api.NetworkError) return;
        console.debug(`[SpecificationService] DB save failed for ${name}:`, err);
      });
  });
  await Promise.allSettled(promises);
}

// ── Full save (local + DB) ─────────────────────────────────────────────────────

export async function save(spec: SpecData): Promise<void> {
  saveToLocal(spec);
  try {
    await saveToDB(spec);
    console.log('[SpecificationService] Saved to localStorage + DB');
  } catch {
    console.warn('[SpecificationService] Saved to localStorage only (DB unavailable)');
  }
}

// ── Fetch from backend (falls back to empty template) ──────────────────────────

export async function fetchFromDB(workItemId: string): Promise<SpecData | null> {
  try {
    const res = await api.get<{ data: any }>(`/specifications/${workItemId}`);
    if (!res.data) return null;
    // The backend shape may differ slightly — normalise
    return normalise(workItemId, res.data);
  } catch {
    return null;
  }
}

// ── Section update (pure data, no side effects) ────────────────────────────────

export function updateSection(spec: SpecData, section: SectionName, content: string): SpecData {
  const wc = wordCount(content);
  const status = deriveStatus(wc);

  const updatedSections = {
    ...spec.sections,
    [section]: { content, status, wordCount: wc, lastUpdated: new Date().toISOString() },
  };

  const { overallStatus, completionPercentage } = recalcOverall(updatedSections);

  return {
    ...spec,
    sections: updatedSections,
    overallStatus,
    completionPercentage,
    updatedAt: new Date().toISOString(),
  };
}

// ── Readiness values for diagram nodes ─────────────────────────────────────────

export interface NodeReadiness {
  Requirements: number;
  Design: number;
  Frontend: number;
  Backend: number;
  Integration: number;
  Test: number;
}

const DEFAULT_READINESS: NodeReadiness = {
  Requirements: 0, Design: 0, Frontend: 0, Backend: 0, Integration: 0, Test: 0,
};

/** Read spec from localStorage and convert section statuses → 0-1 readiness values */
export function getReadinessForNode(nodeId: string): NodeReadiness {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(nodeId));
    if (!raw) return { ...DEFAULT_READINESS };
    const spec = JSON.parse(raw) as SpecData;
    if (!spec?.sections) return { ...DEFAULT_READINESS };

    return {
      Requirements: STATUS_READINESS[spec.sections.requirements?.status] ?? 0,
      Design:       STATUS_READINESS[spec.sections.design?.status]       ?? 0,
      Frontend:     STATUS_READINESS[spec.sections.frontend?.status]     ?? 0,
      Backend:      STATUS_READINESS[spec.sections.backend?.status]      ?? 0,
      Integration:  STATUS_READINESS[spec.sections.integration?.status]  ?? 0,
      Test:         STATUS_READINESS[spec.sections.test?.status]         ?? 0,
    };
  } catch {
    return { ...DEFAULT_READINESS };
  }
}

// ── Factory ────────────────────────────────────────────────────────────────────

export function createEmpty(workItemId: string): SpecData {
  const sections = {} as Record<SectionName, SpecSection>;
  for (const name of SECTION_NAMES) sections[name] = emptySection();

  return {
    id: `spec-${workItemId}`,
    workItemId,
    sections,
    overallStatus: 'empty',
    completionPercentage: 0,
    updatedAt: new Date().toISOString(),
  };
}

/** Normalise backend response into our SpecData shape */
function normalise(workItemId: string, raw: any): SpecData {
  const empty = createEmpty(workItemId);
  if (!raw) return empty;

  const sections = {} as Record<SectionName, SpecSection>;
  for (const name of SECTION_NAMES) {
    const s = raw.sections?.[name] ?? raw[name];
    if (s && typeof s.content === 'string') {
      sections[name] = {
        content: s.content,
        status: s.status ?? deriveStatus(wordCount(s.content)),
        wordCount: s.wordCount ?? wordCount(s.content),
        lastUpdated: s.lastUpdated ?? new Date().toISOString(),
      };
    } else {
      sections[name] = emptySection();
    }
  }

  const { overallStatus, completionPercentage } = recalcOverall(sections);

  return {
    id: raw.id ?? `spec-${workItemId}`,
    workItemId,
    sections,
    overallStatus,
    completionPercentage,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}
