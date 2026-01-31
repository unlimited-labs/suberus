-- CreateEnum
CREATE TYPE "AppSettingKey" AS ENUM ('CONFERENCE_NAME', 'CONFERENCE_DATE_START', 'CONFERENCE_DATE_END', 'SUBMISSION_DEADLINE', 'REVIEW_DEADLINE', 'NOTIFICATION_DATE', 'CONTACT_EMAIL', 'CONFERENCE_LOCATION', 'CONFERENCE_WEBSITE', 'MAX_ABSTRACT_LENGTH', 'MAX_FILE_SIZE_MB', 'ALLOWED_FILE_TYPES', 'MAX_AUTHORS', 'REQUIRE_ORCID', 'ENABLE_KEYWORDS', 'MAX_KEYWORDS', 'SUBMISSION_TYPE_ORAL_PRESENTATION', 'SUBMISSION_TYPE_POSTER', 'SUBMISSION_TYPE_FULL_PAPER');

-- AlterTable
ALTER TABLE "affiliations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "submission_versions" ADD COLUMN "fileId" UUID;

-- CreateTable
CREATE TABLE "app_settings" (
    "id" UUID NOT NULL,
    "key" "AppSettingKey" NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- Create unique index first (needed for ON CONFLICT)
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- Migrate existing conference settings data
INSERT INTO "app_settings" ("id", "key", "value", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    cs."key"::text::"AppSettingKey",
    to_jsonb(cs."value"),
    cs."createdAt",
    cs."updatedAt"
FROM "conference_settings" cs
WHERE cs."key"::text IN (
    'CONFERENCE_NAME', 'CONFERENCE_DATE_START', 'CONFERENCE_DATE_END',
    'SUBMISSION_DEADLINE', 'REVIEW_DEADLINE', 'NOTIFICATION_DATE',
    'CONTACT_EMAIL', 'CONFERENCE_LOCATION', 'CONFERENCE_WEBSITE',
    'MAX_ABSTRACT_LENGTH', 'MAX_FILE_SIZE_MB', 'ALLOWED_FILE_TYPES',
    'REQUIRE_ORCID', 'ENABLE_KEYWORDS'
)
ON CONFLICT ("key") DO NOTHING;

-- Handle renamed keys from conference_settings
INSERT INTO "app_settings" ("id", "key", "value", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    'MAX_AUTHORS'::"AppSettingKey",
    to_jsonb(cs."value"),
    cs."createdAt",
    cs."updatedAt"
FROM "conference_settings" cs
WHERE cs."key"::text = 'MAX_AUTHORS_PER_ABSTRACT'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "app_settings" ("id", "key", "value", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    'MAX_KEYWORDS'::"AppSettingKey",
    to_jsonb(cs."value"),
    cs."createdAt",
    cs."updatedAt"
FROM "conference_settings" cs
WHERE cs."key"::text = 'MAX_KEYWORDS_PER_ABSTRACT'
ON CONFLICT ("key") DO NOTHING;

-- Insert default submission type configs
INSERT INTO "app_settings" ("id", "key", "value", "createdAt", "updatedAt")
VALUES
(
    gen_random_uuid(),
    'SUBMISSION_TYPE_ORAL_PRESENTATION',
    '{"isActive": true, "contentFormat": "TEXT", "allowedExtensions": [], "minReviewers": 2, "maxReviewers": 3, "reviewMode": "DOUBLE_BLIND", "reviewDeadlineDays": 14, "requiresEditorDecision": true, "allowRevisions": true, "maxRevisions": 2, "enableScoring": true, "scoringCriteria": ["Originality", "Clarity", "Significance", "Methodology"]}'::jsonb,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'SUBMISSION_TYPE_POSTER',
    '{"isActive": true, "contentFormat": "TEXT", "allowedExtensions": [], "minReviewers": 1, "maxReviewers": 2, "reviewMode": "SINGLE_BLIND", "reviewDeadlineDays": 7, "requiresEditorDecision": false, "allowRevisions": false, "maxRevisions": 0, "enableScoring": false, "scoringCriteria": []}'::jsonb,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'SUBMISSION_TYPE_FULL_PAPER',
    '{"isActive": true, "contentFormat": "FILE", "allowedExtensions": ["pdf", "doc", "docx"], "minReviewers": 3, "maxReviewers": 4, "reviewMode": "DOUBLE_BLIND", "reviewDeadlineDays": 21, "requiresEditorDecision": true, "allowRevisions": true, "maxRevisions": 3, "enableScoring": true, "scoringCriteria": ["Originality", "Clarity", "Significance", "Methodology", "Technical Quality"]}'::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT ("key") DO NOTHING;

-- DropTable
DROP TABLE "conference_settings";

-- DropTable
DROP TABLE "submission_type_configs";

-- DropEnum
DROP TYPE "ConferenceSettingKey";

-- CreateIndex
CREATE INDEX "app_settings_key_idx" ON "app_settings"("key");

-- AddForeignKey
ALTER TABLE "submission_versions" ADD CONSTRAINT "submission_versions_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
