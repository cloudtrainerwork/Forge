'use client';

import { create } from 'zustand';
import type { SprintDTO } from '../services/SprintService';
import * as SprintService from '../services/SprintService';

interface SprintState {
  sprints: SprintDTO[];
  selectedSprintId: string | null;
  isLoading: boolean;
  panelOpen: boolean;

  loadSprints: (projectId: string) => Promise<void>;
  selectSprint: (sprintId: string | null) => void;
  togglePanel: () => void;
}

export const useSprintStore = create<SprintState>((set) => ({
  sprints: [],
  selectedSprintId: null,
  isLoading: false,
  panelOpen: false,

  loadSprints: async (projectId: string) => {
    set({ isLoading: true });
    const sprints = await SprintService.list(projectId);
    set({ sprints, isLoading: false });
  },

  selectSprint: (sprintId) => set({ selectedSprintId: sprintId }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
}));
