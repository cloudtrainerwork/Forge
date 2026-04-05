import { injectable, inject } from 'inversify';
import type { IProjectRepository } from '../adapters/IProjectRepository.js';
import type { IAuthRepository } from '../adapters/IAuthRepository.js';
import type { MembershipRole } from '../auth/types.js';
import { hasMinRole } from '../auth/types.js';
import type { ProjectRole } from '../domain/roles.js';
import { hasMinProjectRole } from '../domain/roles.js';

/**
 * PermissionService — resolves effective permissions across tenant + project roles.
 *
 * Role resolution order:
 *   1. Tenant OWNER/ADMIN → PM-level access on ALL projects
 *   2. Explicit project membership role
 *   3. Fallback → tenant MEMBER treated as project VIEWER (no project access)
 */
@injectable()
export class PermissionService {
  constructor(
    @inject('IProjectRepository') private projectRepo: IProjectRepository,
    @inject('IAuthRepository') private authRepo: IAuthRepository,
  ) {}

  /**
   * Get the effective project role for a user.
   * Tenant OWNER/ADMIN automatically gets PM-level access.
   */
  async getEffectiveProjectRole(
    userId: string,
    tenantId: string,
    projectId: string,
  ): Promise<ProjectRole | null> {
    // Check tenant role first
    const membership = await this.authRepo.findMembership(userId, tenantId);
    if (!membership || membership.status !== 'active') return null;

    const tenantRole = membership.role;

    // Tenant OWNER/ADMIN → automatic PM access
    if (hasMinRole(tenantRole, 'ADMIN')) {
      return 'PM';
    }

    // Check project-level membership
    const projMembership = await this.projectRepo.findMembership(projectId, userId);
    if (projMembership && projMembership.status === 'active') {
      return projMembership.role;
    }

    // No project membership → no access
    return null;
  }

  /** Can the user manage tenant-level settings (members, billing, etc.)? */
  canManageTenant(tenantRole: MembershipRole): boolean {
    return hasMinRole(tenantRole, 'ADMIN');
  }

  /** Can the user edit project content? */
  async canEditProject(userId: string, tenantId: string, projectId: string): Promise<boolean> {
    const role = await this.getEffectiveProjectRole(userId, tenantId, projectId);
    if (!role) return false;
    return hasMinProjectRole(role, 'MEMBER');
  }

  /** Can the user manage project members? */
  async canManageProjectMembers(userId: string, tenantId: string, projectId: string): Promise<boolean> {
    const role = await this.getEffectiveProjectRole(userId, tenantId, projectId);
    if (!role) return false;
    return hasMinProjectRole(role, 'PJM');
  }
}
