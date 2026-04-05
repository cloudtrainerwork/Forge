import type { ProjectRole } from '../domain/roles.js';

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface ProjectRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMembershipRecord {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectWithMemberCount extends ProjectRecord {
  memberCount: number;
}

export interface ProjectMemberDetail extends ProjectMembershipRecord {
  userName: string | null;
  userEmail: string;
  userImage: string | null;
}

// ── Interface ──────────────────────────────────────────────────────────────

export interface IProjectRepository {
  // Projects
  findById(id: string): Promise<ProjectRecord | null>;
  listByTenant(tenantId: string, status?: string): Promise<ProjectWithMemberCount[]>;
  create(data: {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    createdById: string;
  }): Promise<ProjectRecord>;
  update(id: string, data: { name?: string; description?: string; status?: string }): Promise<ProjectRecord>;
  delete(id: string): Promise<void>;

  // Memberships
  findMembership(projectId: string, userId: string): Promise<ProjectMembershipRecord | null>;
  listMembers(projectId: string): Promise<ProjectMemberDetail[]>;
  addMember(data: {
    id: string;
    projectId: string;
    userId: string;
    role: ProjectRole;
  }): Promise<ProjectMembershipRecord>;
  updateMemberRole(projectId: string, userId: string, role: ProjectRole): Promise<ProjectMembershipRecord>;
  removeMember(projectId: string, userId: string): Promise<void>;
  listUserProjects(userId: string, tenantId: string): Promise<Array<ProjectRecord & { role: ProjectRole }>>;
}
