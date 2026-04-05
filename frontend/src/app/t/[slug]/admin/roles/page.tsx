'use client';

/**
 * Admin roles page — reference guide for tenant and project role definitions.
 */

const C = {
  bg: '#08090d', surface: '#111219', surfaceAlt: '#161822', hover: '#1c1e2d',
  border: '#1f2235', borderActive: '#3b4068', text: '#e4e6f2', textMuted: '#6d7196',
  textDim: '#3a3e5c', accent: '#f97316',
};

const TENANT_ROLES = [
  { code: 'OWNER', title: 'Owner', description: 'Full control including billing, tenant deletion, and all admin capabilities', color: '#f97316' },
  { code: 'ADMIN', title: 'Admin', description: 'Manage members, all projects, and workspace settings', color: '#8b5cf6' },
  { code: 'MEMBER', title: 'Member', description: 'Access assigned projects and create new projects', color: '#3b82f6' },
  { code: 'VIEWER', title: 'Viewer', description: 'Read-only access to assigned projects', color: '#6b7280' },
];

const PROJECT_ROLES = [
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

function RoleCard({ code, title, description, color }: { code: string; title: string; description: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
      background: C.surfaceAlt, borderRadius: 10, border: `1px solid ${C.border}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color,
      }}>{code}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.4 }}>{description}</div>
      </div>
    </div>
  );
}

export default function AdminRolesPage() {
  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Roles & Permissions</h1>
      <p style={{ color: C.textMuted, fontSize: 14, margin: '0 0 32px', lineHeight: 1.5 }}>
        FORGE uses a two-level role system. Tenant roles control workspace-wide access, while project roles provide fine-grained control per project.
      </p>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: C.accent }}>Workspace Roles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TENANT_ROLES.map(r => <RoleCard key={r.code} {...r} />)}
        </div>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: C.accent }}>Project Roles</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PROJECT_ROLES.map(r => <RoleCard key={r.code} {...r} />)}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: C.accent }}>Role Resolution</h2>
        <div style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
          <ol style={{ margin: 0, paddingLeft: 20, color: C.textMuted, fontSize: 14, lineHeight: 2 }}>
            <li>Workspace <strong style={{ color: C.text }}>Owner</strong> or <strong style={{ color: C.text }}>Admin</strong> automatically has <strong style={{ color: C.text }}>PM</strong>-level access on all projects</li>
            <li>Explicit project membership role is used when assigned</li>
            <li>Workspace <strong style={{ color: C.text }}>Member</strong> without project assignment has no project access</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
