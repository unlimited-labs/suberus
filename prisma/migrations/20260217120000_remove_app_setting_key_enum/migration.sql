-- AlterTable: convert AppSettingKey enum column to plain text
ALTER TABLE "app_settings" ALTER COLUMN "key" TYPE TEXT;

-- DropEnum
DROP TYPE "AppSettingKey";
