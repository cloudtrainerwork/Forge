import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import type { IProjectRepository, ProjectRecord, ProjectWithMemberCount, ProjectMemberDetail } from '../adapters/IProjectRepository.js';
import type { IAuthRepository } from '../adapters/IAuthRepository.js';
import type { ProjectRole } from '../domain/roles.js';
import { ForbiddenError } from '../auth/types.js';

/**
 * ProjectService — orchestrates project CRUD and membership management.
 *
 * All methods receive tenantId/userId as parameters (singleton service, no instance state).
 */
@injectable()
export class ProjectService {
  constructor(
    @inject('IProjectRepository') private projectRepo: IProjectRepository,
    @inject('IAuthRepository') private authRepo: IAuthRepository,
  ) {}

  // ── Project CRUD ──────────────────────────────────────────────────────────

  async listProjects(tenantId: string, status?: string): Promise<ProjectWithMemberCount[]> {
    return this.projectRepo.listByTenant(tenantId, status);
  }

  async getProject(projectId: string): Promise<ProjectRecord | null> {
    return this.projectRepo.findById(projectId);
  }

  async createProject(
    tenantId: string,
    createdById: string,
    name: string,
    description?: string,
  ): Promise<ProjectRecord> {
    const id = uuidv4();

    const project = await this.projectRepo.create({
      id,
      tenantId,
      name: name.trim(),
      description: description?.trim(),
      createdById,
    });

    // Auto-add creator as PM
    await this.projectRepo.addMember({
      id: uuidv4(),
      projectId: id,
      userId: createdById,
      role: 'PM',
    });

    return project;
  }

  async updateProject(
    projectId: string,
    data: { name?: string; description?: string },
  ): Promise<ProjectRecord> {
    const clean: any = {};
    if (data.name !== undefined) clean.name = data.name.trim();
    if (data.description !== undefined) clean.description = data.description.trim();
    return this.projectRepo.update(projectId, clean);
  }

  async archiveProject(projectId: string): Promise<ProjectRecord> {
    return this.projectRepo.update(projectId, { status: 'archived' });
  }

  async restoreProject(projectId: string): Promise<ProjectRecord> {
    return this.projectRepo.update(projectId, { status: 'active' });
  }

  // ── Membership management ─────────────────────────────────────────────────

  async getProjectMembers(projectId: string): Promise<ProjectMemberDetail[]> {
    return this.projectRepo.listMembers(projectId);
  }

  async addMember(projectId: string, userId: string, role: ProjectRole): Promise<void> {
    // Verify the user exists
    const user = await this.authRepo.findUserById(userId);
    if (!user) throw new ForbiddenError('User not found');

    // Check if already a member
    const existing = await this.projectRepo.findMembership(projectId, userId);
    if (existing) throw new ForbiddenError('User is already a project member');

    await this.projectRepo.addMember({
      id: uuidv4(),
      projectId,
      userId,
      role,
    });
  }

  async updateMemberRole(projectId: string, userId: string, role: ProjectRole): Promise<void> {
    const existing = await this.projectRepo.findMembership(projectId, userId);
    if (!existing) throw new ForbiddenError('User is not a project member');
    await this.projectRepo.updateMemberRole(projectId, userId, role);
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    const existing = await this.projectRepo.findMembership(projectId, userId);
    if (!existing) throw new ForbiddenError('User is not a project member');
    await this.projectRepo.removeMember(projectId, userId);
  }

  async getUserProjects(userId: string, tenantId: string): Promise<Array<ProjectRecord & { role: ProjectRole }>> {
    return this.projectRepo.listUserProjects(userId, tenantId);
  }
}
