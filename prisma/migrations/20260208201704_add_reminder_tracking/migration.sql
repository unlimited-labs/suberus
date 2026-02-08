-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppSettingKey" ADD VALUE 'REMINDER_REVIEWER_SETTINGS';
ALTER TYPE "AppSettingKey" ADD VALUE 'REMINDER_REVISION_SETTINGS';
ALTER TYPE "AppSettingKey" ADD VALUE 'REMINDER_DEADLINE_SETTINGS';

-- AlterTable
ALTER TABLE "conference_sessions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "sent_reminders" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "reminderType" "EmailEventType" NOT NULL,
    "entityId" UUID NOT NULL,
    "reminderIndex" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sent_reminders_userId_reminderType_idx" ON "sent_reminders"("userId", "reminderType");

-- CreateIndex
CREATE INDEX "sent_reminders_entityId_idx" ON "sent_reminders"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "sent_reminders_userId_reminderType_entityId_reminderIndex_key" ON "sent_reminders"("userId", "reminderType", "entityId", "reminderIndex");
