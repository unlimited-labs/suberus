-- Create sequence for sequential numbering
CREATE SEQUENCE "submissions_sequentialNumber_seq";

-- Set sequence to start after the highest existing number (default to 1 if no submissions)
SELECT setval('"submissions_sequentialNumber_seq"', GREATEST(COALESCE((SELECT MAX("sequentialNumber") FROM "submissions"), 0), 1), false);

-- Fill NULL values with next sequence values (if any)
UPDATE "submissions"
SET "sequentialNumber" = nextval('"submissions_sequentialNumber_seq"')
WHERE "sequentialNumber" IS NULL;

-- Make sequentialNumber NOT NULL and use sequence as default
ALTER TABLE "submissions" ALTER COLUMN "sequentialNumber" SET NOT NULL;
ALTER TABLE "submissions" ALTER COLUMN "sequentialNumber" SET DEFAULT nextval('"submissions_sequentialNumber_seq"');
