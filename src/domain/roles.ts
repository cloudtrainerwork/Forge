/**
 * Project-level roles for FORGE multi-tenant SaaS.
 *
 * These are per-project assignments, separate from the tenant-level
 * MembershipRole (OWNER|ADMIN|MEMBER|VIEWER) defined in auth/types.ts.
 */

export type ProjectRole =
  | 'PM'      // Product Manager
  | 'PJM'     // Project Manager
  | 'BA'      // Business Analyst
  | 'EA'      // Enterprise Architect
  | 'SA'      // Solution Architect
  | 'DEV'     // Developer
  | 'QA'      // QA Engineer
  | 'MEMBER'  // Generic member
  | 'VIEWER'; // Read-only

export const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  QA: 2,
  DEV: 2,
  BA: 3,
  SA: 3,
  EA: 3,
  PJM: 4,
  PM: 5,
};

export interface ProjectRoleMeta {
  code: ProjectRole;
  title: string;
  description: string;
  color: string;
}

export const PROJECT_ROLE_META: ProjectRoleMeta[] = [
  { code: 'PM', title: 'Product Manager', description: 'Full project control, manage members and priorities', color: '#6366f1' },
  { code: 'PJM', title: 'Project Manager', description: 'Manage timeline, assignments, and status tracking', color: '#8b5cf6' },
  { code: 'BA', title: 'Business Analyst', description: 'Edit specs, requirements, and acceptance criteria', color: '#ec4899' },
  { code: 'EA', title: 'Enterprise Architect', description: 'Edit architecture and integration patterns', color: '#f59e0b' },
  { code: 'SA', title: 'Solution Architect', description: 'Edit design and technical decisions', color: '#10b981' },
  { code: 'DEV', title: 'Developer', description: 'Edit implementation details and code specs', color: '#3b82f6' },
  { code: 'QA', title: 'QA Engineer', description: 'Edit test plans and readiness assessments', color: '#14b8a6' },
  { code: 'MEMBER', title: 'Member', description: 'View and comment on project items', color: '#6b7280' },
  { code: 'VIEWER', title: 'Viewer', description: 'Read-only access to project content', color: '#9ca3af' },
];

/** Returns true if `actual` project role is at least `required` level */
export function hasMinProjectRole(actual: ProjectRole, required: ProjectRole): boolean {
  return PROJECT_ROLE_HIERARCHY[actual] >= PROJECT_ROLE_HIERARCHY[required];
}

/** Get display metadata for a project role */
export function getProjectRoleMeta(role: ProjectRole): ProjectRoleMeta | undefined {
  return PROJECT_ROLE_META.find(m => m.code === role);
}
