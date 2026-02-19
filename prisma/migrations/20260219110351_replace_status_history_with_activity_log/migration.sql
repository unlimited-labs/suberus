/*
  Warnings:

  - You are about to drop the `submission_status_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('USER_REGISTERED', 'USER_EMAIL_VERIFIED', 'USER_PROFILE_UPDATED', 'USER_PASSWORD_CHANGED', 'USER_ROLE_CHANGED', 'USER_TOGGLED_ACTIVE', 'USER_DELETED', 'SUBMISSION_CREATED', 'SUBMISSION_DRAFT_SUBMITTED', 'SUBMISSION_STATUS_CHANGED', 'SUBMISSION_WITHDRAWN', 'SUBMISSION_RESUBMITTED', 'SUBMISSION_TRACK_CHANGED', 'REVIEW_ASSIGNED', 'REVIEW_STARTED', 'REVIEW_SUBMITTED', 'REVIEW_CANCELLED', 'REVIEW_OVERDUE', 'DECISION_SUBMITTED', 'DECISION_DESK_REJECT', 'DECISION_OVERRIDE', 'INVITATION_CREATED', 'INVITATION_USED', 'INVITATION_CANCELLED', 'FEE_MARKED_PAID', 'FEE_MARKED_UNPAID');

-- DropForeignKey
ALTER TABLE "submission_status_history" DROP CONSTRAINT "submission_status_history_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "submission_status_history" DROP CONSTRAINT "submission_status_history_triggeredBy_fkey";

-- DropTable
DROP TABLE "submission_status_history";

-- CreateTable
CREATE TABLE "activity_log" (
    "id" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "userId" UUID,
    "submissionId" UUID,
    "performedBy" UUID,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_log_createdAt_idx" ON "activity_log"("createdAt");

-- CreateIndex
CREATE INDEX "activity_log_type_idx" ON "activity_log"("type");

-- CreateIndex
CREATE INDEX "activity_log_submissionId_createdAt_idx" ON "activity_log"("submissionId", "createdAt");

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
