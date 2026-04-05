'use client';

/**
 * Zustand store for project state management.
 *
 * Tracks: active project, project list, loading state.
 * All persistence goes through ProjectService → backend API.
 */

import { create } from 'zustand';
import * as ProjectService from '../services/ProjectService';
import type { Project } from '../services/ProjectService';

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProjects: (status?: string) => Promise<void>;
  setActiveProject: (project: Project | null) => void;
  createProject: (name: string, description?: string) => Promise<Project>;
  archiveProject: (projectId: string) => Promise<void>;
  restoreProject: (projectId: string) => Promise<void>;
  updateProject: (projectId: string, data: { name?: string; description?: string }) => Promise<void>;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  isLoading: false,
  error: null,

  loadProjects: async (status?: string) => {
    set({ isLoading: true, error: null });
    try {
      const projects = await ProjectService.list(status);
      set({ projects, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load projects', isLoading: false });
    }
  },

  setActiveProject: (project) => {
    set({ activeProject: project });
  },

  createProject: async (name, description) => {
    set({ isLoading: true, error: null });
    try {
      const project = await ProjectService.create(name, description);
      set(state => ({
        projects: [project, ...state.projects],
        isLoading: false,
      }));
      return project;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create project', isLoading: false });
      throw err;
    }
  },

  archiveProject: async (projectId) => {
    try {
      const archived = await ProjectService.archive(projectId);
      set(state => ({
        projects: state.projects.map(p => p.id === projectId ? { ...p, ...archived, status: 'archived' as const } : p),
        activeProject: state.activeProject?.id === projectId ? null : state.activeProject,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to archive project' });
    }
  },

  restoreProject: async (projectId) => {
    try {
      const project = await ProjectService.restore(projectId);
      set(state => ({
        projects: state.projects.map(p => p.id === projectId ? project : p),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to restore project' });
    }
  },

  updateProject: async (projectId, data) => {
    try {
      const updated = await ProjectService.update(projectId, data);
      set(state => ({
        projects: state.projects.map(p => p.id === projectId ? updated : p),
        activeProject: state.activeProject?.id === projectId ? updated : state.activeProject,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update project' });
    }
  },

  clearError: () => set({ error: null }),
}));
