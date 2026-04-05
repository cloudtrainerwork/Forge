-- CreateEnum
CREATE TYPE "AuditLogType" AS ENUM ('WORK_ITEM_CREATED', 'WORK_ITEM_UPDATED', 'RELATIONSHIP_ADDED', 'RELATIONSHIP_REMOVED', 'READINESS_UPDATED');

-- CreateTable
CREATE TABLE "health_checks" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'healthy',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_items" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "spec" JSONB NOT NULL,
    "readiness" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "type" "AuditLogType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
