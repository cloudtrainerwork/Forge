'use client';

import { create } from 'zustand';
import type { ReleaseDTO } from '../services/ReleaseService';
import * as ReleaseService from '../services/ReleaseService';

interface ReleaseState {
  releases: ReleaseDTO[];
  selectedReleaseId: string | null;
  isLoading: boolean;
  panelOpen: boolean;

  loadReleases: (projectId: string) => Promise<void>;
  selectRelease: (releaseId: string | null) => void;
  togglePanel: () => void;
  setReleases: (releases: ReleaseDTO[]) => void;
}

export const useReleaseStore = create<ReleaseState>((set) => ({
  releases: [],
  selectedReleaseId: null,
  isLoading: false,
  panelOpen: false,

  loadReleases: async (projectId: string) => {
    set({ isLoading: true });
    const releases = await ReleaseService.list(projectId);
    set({ releases, isLoading: false });
  },

  selectRelease: (releaseId) => set({ selectedReleaseId: releaseId }),

  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  setReleases: (releases) => set({ releases }),
}));
