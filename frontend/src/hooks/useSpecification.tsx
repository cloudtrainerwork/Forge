'use client';

/**
 * useSpecification — React hook wrapping SpecificationService.
 *
 * Provides reactive state for the spec editor:
 *   - spec        — current SpecData
 *   - isDirty     — unsaved changes exist
 *   - lastSaved   — timestamp of last save
 *   - saving      — save in progress
 *   - updateSectionContent(section, content) — mutate a section
 *   - save()      — persist to localStorage + DB
 *   - getSectionStatus(section) — quick status lookup
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  SpecificationService,
} from '../services';
import type { SpecData, SectionName, SpecSection } from '../services';

// ── Re-export types so consumers can import from the hook ──────────────────────

export type { SpecData, SpecSection, SectionName };

// ── Hook return type ───────────────────────────────────────────────────────────

export interface UseSpecificationReturn {
  spec: SpecData;
  isDirty: boolean;
  lastSaved: Date | null;
  saving: boolean;
  updateSectionContent: (section: SectionName, content: string) => void;
  save: () => Promise<void>;
  getSectionStatus: (section: SectionName) => SpecSection['status'];
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useSpecification(workItemId: string): UseSpecificationReturn {
  const [spec, setSpec] = useState<SpecData>(() =>
    SpecificationService.loadFromLocal(workItemId),
  );
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  const specRef = useRef(spec);
  specRef.current = spec;

  // Reload when workItemId changes
  useEffect(() => {
    setSpec(SpecificationService.loadFromLocal(workItemId));
    setIsDirty(false);
  }, [workItemId]);

  const updateSectionContent = useCallback((section: SectionName, content: string) => {
    setSpec(prev => SpecificationService.updateSection(prev, section, content));
    setIsDirty(true);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await SpecificationService.save(specRef.current);
    } catch (err) {
      // localStorage save already succeeded inside SpecificationService.save();
      // DB failure is non-fatal — log and continue
      console.warn('[useSpecification] Save completed to localStorage; DB sync failed:', err);
    } finally {
      setSaving(false);
      setIsDirty(false);
      setLastSaved(new Date());
    }
  }, []);

  const getSectionStatus = useCallback((section: SectionName): SpecSection['status'] => {
    return specRef.current.sections[section]?.status || 'empty';
  }, []);

  return { spec, isDirty, lastSaved, saving, updateSectionContent, save, getSectionStatus };
}
