'use client';

/**
 * Canvas store — bridges the graph canvas component and the layout header.
 *
 * The canvas sets project name, dirty state, and a save callback.
 * The header reads them to render breadcrumbs and a Save button.
 */

import { create } from 'zustand';

interface CanvasState {
  /** Name of the currently open project (empty when not on a canvas page) */
  projectName: string;
  /** Project ID for breadcrumb link */
  projectId: string | null;
  /** True when canvas has unsaved changes */
  isDirty: boolean;
  /** True while a save is in progress */
  isSaving: boolean;
  /** Callback the header invokes when the user clicks Save */
  saveFn: (() => Promise<void>) | null;

  // Actions
  setProjectContext: (id: string, name: string) => void;
  clearProjectContext: () => void;
  markDirty: () => void;
  markClean: () => void;
  setSaving: (saving: boolean) => void;
  registerSave: (fn: () => Promise<void>) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  projectName: '',
  projectId: null,
  isDirty: false,
  isSaving: false,
  saveFn: null,

  setProjectContext: (id, name) => set({ projectId: id, projectName: name }),
  clearProjectContext: () => set({ projectId: null, projectName: '', isDirty: false, saveFn: null }),
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
  setSaving: (saving) => set({ isSaving: saving }),
  registerSave: (fn) => set({ saveFn: fn }),
}));
