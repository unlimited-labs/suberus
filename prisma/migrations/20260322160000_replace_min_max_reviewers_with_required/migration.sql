-- Migrate JSON config: minReviewers → requiredReviewers, drop maxReviewers
UPDATE "app_settings"
SET "value" = "value"::jsonb - 'minReviewers' - 'maxReviewers' || jsonb_build_object('requiredReviewers', ("value"::jsonb -> 'minReviewers'))
WHERE "key" LIKE 'SUBMISSION_TYPE_%'
  AND "value"::jsonb ? 'minReviewers';
