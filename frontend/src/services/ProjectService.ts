'use client';

/**
 * ProjectService — manages projects via the FORGE backend API.
 *
 * Replaces the previous localStorage-only implementation.
 * All calls go through ApiClient which handles auth, tenant-scoping, and retries.
 */

import * as ApiClient from './ApiClient';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
}

// ── Project CRUD ───────────────────────────────────────────────────────────────

/** List all projects for the current tenant */
export async function list(status?: string): Promise<Project[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  // Use safeGet to avoid thrown exceptions triggering the Next.js dev error overlay
  const result = await ApiClient.safeGet<{ data: Project[] }>(`/projects${query}`);
  if (result.ok) return result.data.data;
  // Backend unreachable or errored — return empty list, don't crash
  console.debug('[ProjectService] list failed:', result.error.message);
  return [];
}

/** Get a single project by ID */
export async function getById(projectId: string): Promise<Project | null> {
  const result = await ApiClient.safeGet<{ data: Project }>(`/projects/${projectId}`);
  if (result.ok) return result.data.data;
  return null;
}

/** Create a new project */
export async function create(name: string, description?: string): Promise<Project> {
  const res = await ApiClient.post<{ data: Project }>('/projects', { name, description }, { skipDedup: true });
  return res.data;
}

/** Update project name/description */
export async function update(projectId: string, data: { name?: string; description?: string }): Promise<Project> {
  const res = await ApiClient.put<{ data: Project }>(`/projects/${projectId}`, data);
  return res.data;
}

/** Archive a project (soft delete) */
export async function archive(projectId: string): Promise<Project> {
  const res = await ApiClient.del<{ data: Project }>(`/projects/${projectId}`);
  return res.data;
}

/** Restore an archived project */
export async function restore(projectId: string): Promise<Project> {
  const res = await ApiClient.post<{ data: Project }>(`/projects/${projectId}/restore`, {}, { skipDedup: true });
  return res.data;
}

// ── Members ────────────────────────────────────────────────────────────────────

/** List members of a project */
export async function listMembers(projectId: string): Promise<ProjectMember[]> {
  const res = await ApiClient.get<{ data: ProjectMember[] }>(`/projects/${projectId}/members`);
  return res.data;
}

/** Add a member to a project */
export async function addMember(projectId: string, userId: string, role: string): Promise<void> {
  await ApiClient.post(`/projects/${projectId}/members`, { userId, role }, { skipDedup: true });
}

/** Update a member's role */
export async function updateMemberRole(projectId: string, userId: string, role: string): Promise<void> {
  await ApiClient.put(`/projects/${projectId}/members/${userId}`, { role });
}

/** Remove a member from a project */
export async function removeMember(projectId: string, userId: string): Promise<void> {
  await ApiClient.del(`/projects/${projectId}/members/${userId}`);
}

/** Generate a unique project ID (client-side, for optimistic UI) */
export function generateId(): string {
  return `project-${Date.now()}`;
}
