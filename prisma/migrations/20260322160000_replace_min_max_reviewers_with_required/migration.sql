-- Migrate JSON config: minReviewers → requiredReviewers, drop maxReviewers
UPDATE "AppSetting"
SET "value" = ("value"::jsonb - 'minReviewers' - 'maxReviewers' || jsonb_build_object('requiredReviewers', ("value"::jsonb -> 'minReviewers')))::text
WHERE "key" LIKE 'SUBMISSION_TYPE_%'
  AND "value"::jsonb ? 'minReviewers';
