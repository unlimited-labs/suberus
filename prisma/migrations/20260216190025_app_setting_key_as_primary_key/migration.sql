-- AlterTable: Remove id column, make key the primary key
ALTER TABLE "app_settings" DROP CONSTRAINT "app_settings_pkey";

ALTER TABLE "app_settings" DROP COLUMN "id";

ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");

-- DropIndex: key index is now redundant (PK is auto-indexed)
DROP INDEX IF EXISTS "app_settings_key_key";
DROP INDEX IF EXISTS "app_settings_key_idx";
