-- AlterTable
ALTER TABLE "email_campaign" ADD COLUMN "data_keys" TEXT[];

-- AlterTable
ALTER TABLE "email_campaign_recipient" ADD COLUMN "data" JSONB NOT NULL DEFAULT '{}';
