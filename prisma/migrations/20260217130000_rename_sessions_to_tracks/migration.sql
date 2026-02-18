-- Rename table + column
ALTER TABLE "conference_sessions" RENAME TO "conference_tracks";
ALTER TABLE "submissions" RENAME COLUMN "sessionId" TO "trackId";

-- Rename indexes
ALTER INDEX "conference_sessions_pkey" RENAME TO "conference_tracks_pkey";
ALTER INDEX "conference_sessions_name_key" RENAME TO "conference_tracks_name_key";
ALTER INDEX "conference_sessions_supervisorId_idx" RENAME TO "conference_tracks_supervisorId_idx";
ALTER INDEX "conference_sessions_isActive_idx" RENAME TO "conference_tracks_isActive_idx";
ALTER INDEX "submissions_sessionId_idx" RENAME TO "submissions_trackId_idx";

-- Rename FK constraints
ALTER TABLE "conference_tracks" RENAME CONSTRAINT "conference_sessions_supervisorId_fkey" TO "conference_tracks_supervisorId_fkey";
ALTER TABLE "submissions" RENAME CONSTRAINT "submissions_sessionId_fkey" TO "submissions_trackId_fkey";

-- Migrate JSON config key: enableSessionSelection -> enableTrackSelection
UPDATE "app_settings"
SET "value" = "value" - 'enableSessionSelection' || jsonb_build_object('enableTrackSelection', ("value"->'enableSessionSelection'))
WHERE "key" IN ('SUBMISSION_TYPE_ORAL_PRESENTATION', 'SUBMISSION_TYPE_POSTER', 'SUBMISSION_TYPE_FULL_PAPER')
  AND "value" ? 'enableSessionSelection';

-- Default submission types to inactive
UPDATE "app_settings"
SET "value" = jsonb_set("value", '{isActive}', 'false')
WHERE "key" IN ('SUBMISSION_TYPE_ORAL_PRESENTATION', 'SUBMISSION_TYPE_POSTER', 'SUBMISSION_TYPE_FULL_PAPER')
  AND ("value"->>'isActive') = 'true';
