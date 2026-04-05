-- ============================================================================
-- Database role setup for FORGE multi-tenant SaaS
--
-- Roles:
--   forge_admin  — owns tables, runs migrations, bypasses RLS
--   forge_app    — runtime role, minimal CRUD, subject to RLS
--
-- This script runs at Docker postgres init time.
-- ============================================================================

-- Admin role (used by Prisma migrations and admin tools)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'forge_admin') THEN
    CREATE ROLE forge_admin WITH LOGIN PASSWORD 'forgeadmin' BYPASSRLS;
  END IF;
END
$$;

-- Runtime app role (used by the Express backend at runtime)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'forge_app') THEN
    CREATE ROLE forge_app WITH LOGIN PASSWORD 'forgeapp' NOBYPASSRLS;
  END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE appdb TO forge_admin;
GRANT CONNECT ON DATABASE appdb TO forge_app;

-- After tables are created (via Prisma migrate), you need to run:
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO forge_app;
--   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO forge_app;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO forge_app;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO forge_app;
--
-- These are best run as a post-migration step (see src/scripts/grant-app-role.sql).
