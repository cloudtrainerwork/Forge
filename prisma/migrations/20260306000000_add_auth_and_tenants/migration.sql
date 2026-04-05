-- ============================================================================
-- Migration: Add multi-tenant auth (tenants, users, accounts, sessions,
--            tenant_memberships) and scope existing tables to tenant_id.
-- ============================================================================

-- ── New tables ──────────────────────────────────────────────────────────────

CREATE TABLE "tenants" (
    "id"         TEXT NOT NULL,
    "slug"       TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "status"     TEXT NOT NULL DEFAULT 'active',
    "plan_tier"  TEXT NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

CREATE TABLE "users" (
    "id"             TEXT NOT NULL,
    "email"          TEXT NOT NULL,
    "name"           TEXT,
    "image"          TEXT,
    "email_verified" TIMESTAMP(3),
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "accounts" (
    "id"                  TEXT NOT NULL,
    "user_id"             TEXT NOT NULL,
    "provider"            TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "type"                TEXT NOT NULL DEFAULT 'oauth',
    "access_token"        TEXT,
    "refresh_token"       TEXT,
    "expires_at"          INTEGER,
    "token_type"          TEXT,
    "scope"               TEXT,
    "id_token"            TEXT,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key"
    ON "accounts"("provider", "provider_account_id");

CREATE TABLE "sessions" (
    "id"            TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id"       TEXT NOT NULL,
    "expires"       TIMESTAMP(3) NOT NULL,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

CREATE TABLE "tenant_memberships" (
    "id"         TEXT NOT NULL,
    "tenant_id"  TEXT NOT NULL,
    "user_id"    TEXT NOT NULL,
    "role"       TEXT NOT NULL DEFAULT 'MEMBER',
    "status"     TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tenant_memberships_tenant_id_user_id_key"
    ON "tenant_memberships"("tenant_id", "user_id");
CREATE INDEX "tenant_memberships_user_id_idx" ON "tenant_memberships"("user_id");

-- ── Foreign keys ────────────────────────────────────────────────────────────

ALTER TABLE "accounts"
    ADD CONSTRAINT "accounts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sessions"
    ADD CONSTRAINT "sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_memberships"
    ADD CONSTRAINT "tenant_memberships_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_memberships"
    ADD CONSTRAINT "tenant_memberships_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Create a system tenant for migration of existing data ───────────────────

INSERT INTO "tenants" ("id", "slug", "name", "status", "plan_tier", "created_at", "updated_at")
VALUES ('system-default', 'default', 'Default Workspace', 'active', 'free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ── Add tenant_id to existing tables ────────────────────────────────────────

-- WorkItem: add tenant_id with default to system tenant for existing rows
ALTER TABLE "work_items" ADD COLUMN "tenant_id" TEXT;
UPDATE "work_items" SET "tenant_id" = 'system-default' WHERE "tenant_id" IS NULL;
ALTER TABLE "work_items" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "work_items"
    ADD CONSTRAINT "work_items_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "work_items_tenant_id_created_at_idx" ON "work_items"("tenant_id", "created_at" DESC);
CREATE INDEX "work_items_tenant_id_id_idx" ON "work_items"("tenant_id", "id");

-- ReadinessConfiguration: add tenant_id, migrate unique constraint
ALTER TABLE "readiness_configurations" ADD COLUMN "tenant_id" TEXT;
UPDATE "readiness_configurations" SET "tenant_id" = 'system-default' WHERE "tenant_id" IS NULL;
ALTER TABLE "readiness_configurations" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "readiness_configurations"
    ADD CONSTRAINT "readiness_configurations_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Drop old unique on name, replace with composite unique on (tenant_id, name)
ALTER TABLE "readiness_configurations" DROP CONSTRAINT IF EXISTS "readiness_configurations_name_key";
CREATE UNIQUE INDEX "readiness_configurations_tenant_id_name_key"
    ON "readiness_configurations"("tenant_id", "name");
CREATE INDEX "readiness_configurations_tenant_id_idx" ON "readiness_configurations"("tenant_id");

-- AuditLog: add tenant_id + actor_id
ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "actor_id" TEXT;
UPDATE "audit_logs" SET "tenant_id" = 'system-default' WHERE "tenant_id" IS NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "audit_logs_tenant_id_timestamp_idx" ON "audit_logs"("tenant_id", "timestamp" DESC);
CREATE INDEX "audit_logs_tenant_id_entity_id_idx" ON "audit_logs"("tenant_id", "entity_id");

-- ── Extend AuditLogType enum ────────────────────────────────────────────────

ALTER TYPE "AuditLogType" ADD VALUE IF NOT EXISTS 'TENANT_CREATED';
ALTER TYPE "AuditLogType" ADD VALUE IF NOT EXISTS 'USER_JOINED';
ALTER TYPE "AuditLogType" ADD VALUE IF NOT EXISTS 'USER_LEFT';

-- ── Row-Level Security ──────────────────────────────────────────────────────
-- RLS policies use the session variable `app.current_tenant_id` which the
-- application sets per-request via: SET LOCAL app.current_tenant_id = '<id>'
--
-- The migration/admin role bypasses RLS by default (BYPASSRLS).
-- The runtime app role is subject to these policies.
-- ────────────────────────────────────────────────────────────────────────────

-- Enable RLS on tenant-scoped tables
ALTER TABLE "work_items"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "readiness_configurations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_memberships"      ENABLE ROW LEVEL SECURITY;

-- Policies for work_items
CREATE POLICY "work_items_tenant_isolation" ON "work_items"
    USING ("tenant_id" = current_setting('app.current_tenant_id', true));
CREATE POLICY "work_items_tenant_insert" ON "work_items"
    FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id', true));

-- Policies for readiness_configurations
CREATE POLICY "readiness_configs_tenant_isolation" ON "readiness_configurations"
    USING ("tenant_id" = current_setting('app.current_tenant_id', true));
CREATE POLICY "readiness_configs_tenant_insert" ON "readiness_configurations"
    FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id', true));

-- Policies for audit_logs
CREATE POLICY "audit_logs_tenant_isolation" ON "audit_logs"
    USING ("tenant_id" = current_setting('app.current_tenant_id', true));
CREATE POLICY "audit_logs_tenant_insert" ON "audit_logs"
    FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id', true));

-- Policies for tenant_memberships
CREATE POLICY "tenant_memberships_tenant_isolation" ON "tenant_memberships"
    USING ("tenant_id" = current_setting('app.current_tenant_id', true));
CREATE POLICY "tenant_memberships_tenant_insert" ON "tenant_memberships"
    FOR INSERT WITH CHECK ("tenant_id" = current_setting('app.current_tenant_id', true));
