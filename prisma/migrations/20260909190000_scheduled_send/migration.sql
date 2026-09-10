-- AlterEnum
ALTER TYPE "EmailCampaignStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED' BEFORE 'QUEUED';

-- AlterEnum
ALTER TYPE "AnnouncementStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED' BEFORE 'PUBLISHED';
ALTER TYPE "AnnouncementStatus" ADD VALUE IF NOT EXISTS 'PUBLISHING' BEFORE 'PUBLISHED';

-- AlterTable
ALTER TABLE "email_campaign" ADD COLUMN "scheduled_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "announcement" ADD COLUMN "scheduled_at" TIMESTAMP(3);
