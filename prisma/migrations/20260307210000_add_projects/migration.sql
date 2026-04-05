-- ============================================================================
-- Migration: Add projects and project memberships (tenant-scoped).
-- Adds project_id to work_items for project-scoping.
-- Extends AuditLogType enum with project events.
-- Enables RLS on new tables.
-- ============================================================================

-- ── New tables ──────────────────────────────────────────────────────────────

CREATE TABLE "projects" (
    "id"          TEXT NOT NULL,
    "tenant_id"   TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "status"      TEXT NOT NULL DEFAULT 'active',
    "created_by"  TEXT NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "projects_tenant_id_name_key" ON "projects"("tenant_id", "name");
CREATE INDEX "projects_tenant_id_created_at_idx" ON "projects"("tenant_id", "created_at" DESC);
CREATE INDEX "projects_tenant_id_status_idx" ON "projects"("tenant_id", "status");

CREATE TABLE "project_memberships" (
    "id"         TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id"    TEXT NOT NULL,
    "role"       TEXT NOT NULL DEFAULT 'MEMBER',
    "status"     TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_memberships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "project_memberships_project_id_user_id_key"
    ON "project_memberships"("project_id", "user_id");
CREATE INDEX "project_memberships_user_id_idx" ON "project_memberships"("user_id");
CREATE INDEX "project_memberships_project_id_role_idx" ON "project_memberships"("project_id", "role");

-- ── Foreign keys ────────────────────────────────────────────────────────────

ALTER TABLE "projects"
    ADD CONSTRAINT "projects_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects"
    ADD CONSTRAINT "projects_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "project_memberships"
    ADD CONSTRAINT "project_memberships_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_memberships"
    ADD CONSTRAINT "project_memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Add project_id to work_items (nullable for backward compat) ─────────────

ALTER TABLE "work_items" ADD COLUMN "project_id" TEXT;
CREATE INDEX "work_items_project_id_idx" ON "work_items"("project_id");

ALTER TABLE "work_items"
    ADD CONSTRAINT "work_items_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Extend AuditLogType enum ────────────────────────────────────────────────

ALTER TYPE "AuditLogType" ADD VALUE IF NOT EXISTS 'PROJECT_CREATED';
ALTER TYPE "AuditLogType" ADD VALUE IF NOT EXISTS 'PROJECT_UPDATED';
ALTER TYPE "AuditLogType" ADD VALUE IF NOT EXISTS 'PROJECT_ARCHIVED';
ALTER TYPE "AuditLogType" ADD VALUE IF NOT EXISTS 'PROJECT_MEMBER_ADDED';
ALTER TYPE "AuditLogType" ADD VALUE IF NOT EXISTS 'PROJECT_MEMBER_REMOVED';
ALTER TYPE "AuditLogType" ADD VALUE IF NOT EXISTS 'PROJECT_MEMBER_ROLE_UPDATED';

-- ── Row-Level Security ──────────────────────────────────────────────────────

-- Enable RLS on projects
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_tenant_isolation" ON "projects"
    USING ("tenant_id" = current_setting('app.current_tenant_id', true));
CREATE POLICY "projects_tenant_insert" ON "projects"
    FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id', true));

-- Enable RLS on project_memberships (via join to projects for tenant scoping)
ALTER TABLE "project_memberships" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_memberships_tenant_isolation" ON "project_memberships"
    USING (
        "project_id" IN (
            SELECT "id" FROM "projects"
            WHERE "tenant_id" = current_setting('app.current_tenant_id', true)
        )
    );
CREATE POLICY "project_memberships_tenant_insert" ON "project_memberships"
    FOR INSERT WITH CHECK (
        "project_id" IN (
            SELECT "id" FROM "projects"
            WHERE "tenant_id" = current_setting('app.current_tenant_id', true)
        )
    );
