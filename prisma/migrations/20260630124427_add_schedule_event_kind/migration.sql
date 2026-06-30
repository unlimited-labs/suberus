-- CreateEnum
CREATE TYPE "ScheduleItemKind" AS ENUM ('BREAK', 'EVENT');

-- AlterTable
ALTER TABLE "schedule_breaks" ADD COLUMN     "description" TEXT,
ADD COLUMN     "kind" "ScheduleItemKind" NOT NULL DEFAULT 'BREAK',
ADD COLUMN     "location" TEXT,
ADD COLUMN     "locationUrl" TEXT;
