-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppSettingKey" ADD VALUE 'BRANDING_LOGO_URL';
ALTER TYPE "AppSettingKey" ADD VALUE 'BRANDING_FAVICON_URL';
ALTER TYPE "AppSettingKey" ADD VALUE 'BRANDING_PRIMARY_COLOR';
ALTER TYPE "AppSettingKey" ADD VALUE 'BRANDING_SECONDARY_COLOR';
ALTER TYPE "AppSettingKey" ADD VALUE 'BRANDING_FOOTER_TEXT';
