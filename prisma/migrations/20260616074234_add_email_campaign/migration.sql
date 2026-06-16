-- CreateEnum
CREATE TYPE "EmailCampaignFormat" AS ENUM ('PLAIN', 'MARKDOWN', 'MJML');

-- CreateEnum
CREATE TYPE "EmailCampaignStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "email_campaign" (
    "id" UUID NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "format" "EmailCampaignFormat" NOT NULL DEFAULT 'MARKDOWN',
    "body_source" TEXT NOT NULL DEFAULT '',
    "rendered_html" TEXT,
    "status" "EmailCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "job_progress_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "email_campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_campaign_recipient" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "user_id" UUID,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "titles" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "email_campaign_recipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_campaign_status_idx" ON "email_campaign"("status");

-- CreateIndex
CREATE INDEX "email_campaign_created_at_idx" ON "email_campaign"("created_at");

-- CreateIndex
CREATE INDEX "email_campaign_recipient_campaign_id_status_idx" ON "email_campaign_recipient"("campaign_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "email_campaign_recipient_campaign_id_user_id_key" ON "email_campaign_recipient"("campaign_id", "user_id");

-- AddForeignKey
ALTER TABLE "email_campaign_recipient" ADD CONSTRAINT "email_campaign_recipient_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "email_campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
