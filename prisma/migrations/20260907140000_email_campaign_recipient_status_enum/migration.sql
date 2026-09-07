-- CreateEnum
CREATE TYPE "EmailCampaignRecipientStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "email_campaign_recipient"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "EmailCampaignRecipientStatus"
    USING "status"::"EmailCampaignRecipientStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';
