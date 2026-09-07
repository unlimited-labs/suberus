-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "email_campaign" ADD COLUMN "save_to_profile" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "announcement" (
    "id" UUID NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "body_source" TEXT NOT NULL DEFAULT '',
    "rendered_html" TEXT,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "total_recipients" INTEGER NOT NULL DEFAULT 0,
    "data_columns" JSONB NOT NULL DEFAULT '{}',
    "source_campaign_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_recipient" (
    "id" UUID NOT NULL,
    "announcement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "titles" TEXT NOT NULL DEFAULT '',
    "data" JSONB NOT NULL DEFAULT '{}',
    "rendered_subject" TEXT,
    "rendered_body" TEXT,
    "body_source_override" TEXT,
    "published_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),

    CONSTRAINT "announcement_recipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "announcement_source_campaign_id_key" ON "announcement"("source_campaign_id");

-- CreateIndex
CREATE INDEX "announcement_status_idx" ON "announcement"("status");

-- CreateIndex
CREATE INDEX "announcement_created_at_idx" ON "announcement"("created_at");

-- CreateIndex
CREATE INDEX "announcement_recipient_user_id_published_at_idx" ON "announcement_recipient"("user_id", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_recipient_announcement_id_user_id_key" ON "announcement_recipient"("announcement_id", "user_id");

-- AddForeignKey
ALTER TABLE "announcement_recipient" ADD CONSTRAINT "announcement_recipient_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_recipient" ADD CONSTRAINT "announcement_recipient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
