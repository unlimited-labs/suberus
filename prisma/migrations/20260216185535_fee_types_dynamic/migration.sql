/*
  Warnings:

  - The `type` column on the `fees` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppSettingKey" ADD VALUE 'FEE_CURRENCY';
ALTER TYPE "AppSettingKey" ADD VALUE 'FEE_TYPES';

-- AlterTable
ALTER TABLE "fees" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'Full',
ALTER COLUMN "currency" SET DEFAULT 'EUR';

-- DropEnum
DROP TYPE "FeeType";
