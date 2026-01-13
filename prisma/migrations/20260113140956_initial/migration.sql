-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('AUTHOR', 'REVIEWER', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('ABSTRACT', 'FULL_PAPER', 'POSTER');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REVIEWS_COMPLETE', 'AWAITING_DECISION', 'REVISE_REQUIRED', 'RESUBMITTED', 'ACCEPTED', 'CONDITIONALLY_ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('ACCEPT', 'ACCEPT_WITH_MINOR_REVISIONS', 'REVISE_AND_RESUBMIT', 'REJECT');

-- CreateEnum
CREATE TYPE "EditorDecisionType" AS ENUM ('ACCEPT', 'CONDITIONALLY_ACCEPT', 'REVISE_AND_RESUBMIT', 'REJECT');

-- CreateEnum
CREATE TYPE "ReviewMode" AS ENUM ('OPEN', 'SINGLE_BLIND', 'DOUBLE_BLIND');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('FULL', 'STUDENT', 'INVITED', 'STAFF', 'CASH');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('SUBMISSION_MAIN', 'SUBMISSION_SUPPLEMENTARY', 'REVIEW_ATTACHMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "FileEntityType" AS ENUM ('SUBMISSION', 'SUBMISSION_VERSION', 'REVIEW');

-- CreateEnum
CREATE TYPE "EmailEventType" AS ENUM ('SUBMISSION_RECEIVED', 'SUBMISSION_WITHDRAWN', 'REVIEWER_ASSIGNED', 'REVIEWER_REMINDER', 'REVIEW_SUBMITTED', 'ALL_REVIEWS_COMPLETE', 'DECISION_ACCEPTED', 'DECISION_CONDITIONALLY_ACCEPTED', 'DECISION_REVISE_REQUIRED', 'DECISION_REJECTED', 'REVISION_REMINDER', 'REVISION_RECEIVED', 'DEADLINE_APPROACHING', 'ACCOUNT_CREATED', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "ConferenceSettingKey" AS ENUM ('CONFERENCE_NAME', 'CONFERENCE_DATE_START', 'CONFERENCE_DATE_END', 'SUBMISSION_DEADLINE', 'REVIEW_DEADLINE', 'NOTIFICATION_DATE', 'MAX_ABSTRACT_LENGTH', 'MAX_FILE_SIZE_MB', 'ALLOWED_FILE_TYPES', 'MAX_AUTHORS_PER_ABSTRACT', 'REQUIRE_ORCID', 'ENABLE_KEYWORDS', 'MAX_KEYWORDS_PER_ABSTRACT', 'CONTACT_EMAIL', 'CONFERENCE_LOCATION', 'CONFERENCE_WEBSITE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "image" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "affiliation" TEXT,
    "orcid" TEXT,
    "address" TEXT,
    "country" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'AUTHOR',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_settings" (
    "id" UUID NOT NULL,
    "key" "ConferenceSettingKey" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conference_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "eventType" "EmailEventType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isHtml" BOOLEAN NOT NULL DEFAULT false,
    "ccEmails" TEXT[],
    "bccEmails" TEXT[],
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "availablePlaceholders" TEXT[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_type_configs" (
    "id" UUID NOT NULL,
    "type" "SubmissionType" NOT NULL,
    "minReviewers" INTEGER NOT NULL DEFAULT 1,
    "maxReviewers" INTEGER NOT NULL DEFAULT 1,
    "requiresEditorDecision" BOOLEAN NOT NULL DEFAULT false,
    "allowRevisions" BOOLEAN NOT NULL DEFAULT true,
    "maxRevisions" INTEGER NOT NULL DEFAULT 2,
    "reviewDeadline" INTEGER,
    "requireAllReviews" BOOLEAN NOT NULL DEFAULT true,
    "autoTransitionAfterReviews" BOOLEAN NOT NULL DEFAULT true,
    "enableScoring" BOOLEAN NOT NULL DEFAULT false,
    "scoringCriteria" JSONB,
    "reviewMode" "ReviewMode" NOT NULL DEFAULT 'SINGLE_BLIND',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_type_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_sessions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "conference_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL,
    "type" "SubmissionType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "userId" UUID NOT NULL,
    "sessionId" UUID,
    "presenterId" UUID,
    "currentVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_versions" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_authors" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "userId" UUID,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "affiliation" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isPresenter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_keywords" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "keywordId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_assignments" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "assignedBy" UUID,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT,

    CONSTRAINT "review_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "versionId" UUID,
    "round" INTEGER NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "comments" TEXT,
    "privateNotes" TEXT,
    "scoreNovelty" INTEGER,
    "scoreMethodology" INTEGER,
    "scoreClarity" INTEGER,
    "scoreRelevance" INTEGER,
    "confidenceLevel" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editor_decisions" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "editorId" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "decision" "EditorDecisionType" NOT NULL,
    "reasoning" TEXT,
    "letterToAuthor" TEXT,
    "basedOnReviews" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editor_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_status_history" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "fromStatus" "SubmissionStatus",
    "toStatus" "SubmissionStatus" NOT NULL,
    "round" INTEGER,
    "event" TEXT,
    "reason" TEXT,
    "triggeredBy" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fees" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "type" "FeeType" NOT NULL DEFAULT 'FULL',
    "amount" DECIMAL(10,2),
    "currency" TEXT DEFAULT 'USD',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "entityType" "FileEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "type" "FileType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_verifications" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE INDEX "users_emailVerified_idx" ON "users"("emailVerified");

-- CreateIndex
CREATE UNIQUE INDEX "conference_settings_key_key" ON "conference_settings"("key");

-- CreateIndex
CREATE INDEX "conference_settings_key_idx" ON "conference_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_eventType_key" ON "email_templates"("eventType");

-- CreateIndex
CREATE INDEX "email_templates_eventType_idx" ON "email_templates"("eventType");

-- CreateIndex
CREATE INDEX "email_templates_isEnabled_idx" ON "email_templates"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "submission_type_configs_type_key" ON "submission_type_configs"("type");

-- CreateIndex
CREATE INDEX "submission_type_configs_type_idx" ON "submission_type_configs"("type");

-- CreateIndex
CREATE INDEX "submission_type_configs_isActive_idx" ON "submission_type_configs"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_name_key" ON "keywords"("name");

-- CreateIndex
CREATE INDEX "keywords_name_idx" ON "keywords"("name");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_currentVersionId_key" ON "submissions"("currentVersionId");

-- CreateIndex
CREATE INDEX "submissions_userId_idx" ON "submissions"("userId");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "submissions_type_idx" ON "submissions"("type");

-- CreateIndex
CREATE INDEX "submissions_sessionId_idx" ON "submissions"("sessionId");

-- CreateIndex
CREATE INDEX "submissions_presenterId_idx" ON "submissions"("presenterId");

-- CreateIndex
CREATE INDEX "submissions_currentVersionId_idx" ON "submissions"("currentVersionId");

-- CreateIndex
CREATE INDEX "submissions_createdAt_idx" ON "submissions"("createdAt");

-- CreateIndex
CREATE INDEX "submissions_status_createdAt_idx" ON "submissions"("status", "createdAt");

-- CreateIndex
CREATE INDEX "submissions_status_type_createdAt_idx" ON "submissions"("status", "type", "createdAt");

-- CreateIndex
CREATE INDEX "submissions_status_userId_createdAt_idx" ON "submissions"("status", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "submission_versions_submissionId_idx" ON "submission_versions"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_versions_submissionId_version_key" ON "submission_versions"("submissionId", "version");

-- CreateIndex
CREATE INDEX "submission_authors_submissionId_idx" ON "submission_authors"("submissionId");

-- CreateIndex
CREATE INDEX "submission_authors_userId_idx" ON "submission_authors"("userId");

-- CreateIndex
CREATE INDEX "submission_authors_email_idx" ON "submission_authors"("email");

-- CreateIndex
CREATE INDEX "submission_authors_submissionId_orderIndex_idx" ON "submission_authors"("submissionId", "orderIndex");

-- CreateIndex
CREATE INDEX "submission_keywords_submissionId_idx" ON "submission_keywords"("submissionId");

-- CreateIndex
CREATE INDEX "submission_keywords_keywordId_idx" ON "submission_keywords"("keywordId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_keywords_submissionId_keywordId_key" ON "submission_keywords"("submissionId", "keywordId");

-- CreateIndex
CREATE INDEX "review_assignments_submissionId_round_status_idx" ON "review_assignments"("submissionId", "round", "status");

-- CreateIndex
CREATE INDEX "review_assignments_reviewerId_status_idx" ON "review_assignments"("reviewerId", "status");

-- CreateIndex
CREATE INDEX "review_assignments_status_deadline_idx" ON "review_assignments"("status", "deadline");

-- CreateIndex
CREATE INDEX "review_assignments_submissionId_round_idx" ON "review_assignments"("submissionId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "review_assignments_submissionId_reviewerId_round_key" ON "review_assignments"("submissionId", "reviewerId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_assignmentId_key" ON "reviews"("assignmentId");

-- CreateIndex
CREATE INDEX "reviews_submissionId_round_idx" ON "reviews"("submissionId", "round");

-- CreateIndex
CREATE INDEX "reviews_reviewerId_idx" ON "reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "reviews_assignmentId_idx" ON "reviews"("assignmentId");

-- CreateIndex
CREATE INDEX "editor_decisions_submissionId_round_idx" ON "editor_decisions"("submissionId", "round");

-- CreateIndex
CREATE INDEX "editor_decisions_editorId_idx" ON "editor_decisions"("editorId");

-- CreateIndex
CREATE INDEX "submission_status_history_submissionId_createdAt_idx" ON "submission_status_history"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "submission_status_history_toStatus_idx" ON "submission_status_history"("toStatus");

-- CreateIndex
CREATE UNIQUE INDEX "fees_userId_key" ON "fees"("userId");

-- CreateIndex
CREATE INDEX "fees_userId_idx" ON "fees"("userId");

-- CreateIndex
CREATE INDEX "fees_paid_idx" ON "fees"("paid");

-- CreateIndex
CREATE UNIQUE INDEX "files_storageKey_key" ON "files"("storageKey");

-- CreateIndex
CREATE INDEX "files_entityType_entityId_idx" ON "files"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "files_uploadedById_idx" ON "files"("uploadedById");

-- CreateIndex
CREATE INDEX "files_type_idx" ON "files"("type");

-- CreateIndex
CREATE INDEX "files_storageKey_idx" ON "files"("storageKey");

-- CreateIndex
CREATE INDEX "files_entityType_entityId_createdAt_idx" ON "files"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "user_verifications_identifier_idx" ON "user_verifications"("identifier");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "conference_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "submission_authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "submission_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_versions" ADD CONSTRAINT "submission_versions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_authors" ADD CONSTRAINT "submission_authors_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_authors" ADD CONSTRAINT "submission_authors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_keywords" ADD CONSTRAINT "submission_keywords_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_keywords" ADD CONSTRAINT "submission_keywords_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_assignments" ADD CONSTRAINT "review_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "review_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "submission_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editor_decisions" ADD CONSTRAINT "editor_decisions_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editor_decisions" ADD CONSTRAINT "editor_decisions_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_status_history" ADD CONSTRAINT "submission_status_history_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_status_history" ADD CONSTRAINT "submission_status_history_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fees" ADD CONSTRAINT "fees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
