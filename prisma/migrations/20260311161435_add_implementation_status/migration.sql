-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_created_by_fkey";

-- AlterTable
ALTER TABLE "work_items" ADD COLUMN     "implementation_status" TEXT NOT NULL DEFAULT 'NOT_STARTED';

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
