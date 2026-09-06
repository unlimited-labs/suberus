-- AlterTable
ALTER TABLE "email_campaign" ADD COLUMN "data_columns" JSONB NOT NULL DEFAULT '{}';

-- Keep existing campaigns working: the heading is unknown, so the key stands in.
UPDATE "email_campaign"
SET "data_columns" = COALESCE(
  (SELECT jsonb_object_agg(key, key) FROM unnest("data_keys") AS key),
  '{}'::jsonb
)
WHERE "data_keys" IS NOT NULL AND array_length("data_keys", 1) > 0;

-- AlterTable
ALTER TABLE "email_campaign" DROP COLUMN "data_keys";
