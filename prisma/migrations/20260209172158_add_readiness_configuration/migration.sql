-- CreateTable
CREATE TABLE "readiness_configurations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "states" JSONB NOT NULL,
    "validationRules" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "readiness_configurations_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "work_items" ADD COLUMN "readiness_configuration_id" TEXT;

-- AlterEnum
ALTER TYPE "AuditLogType" ADD VALUE 'READINESS_CONFIG_CREATED';
ALTER TYPE "AuditLogType" ADD VALUE 'READINESS_CONFIG_UPDATED';

-- CreateIndex
CREATE UNIQUE INDEX "readiness_configurations_name_key" ON "readiness_configurations"("name");

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_readiness_configuration_id_fkey" FOREIGN KEY ("readiness_configuration_id") REFERENCES "readiness_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE;