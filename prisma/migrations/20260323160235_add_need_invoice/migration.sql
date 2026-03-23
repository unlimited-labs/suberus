-- AlterTable
ALTER TABLE "users" ADD COLUMN     "needInvoice" BOOLEAN NOT NULL DEFAULT false;

-- Set existing records to true (they had billing address before this change)
UPDATE "users" SET "needInvoice" = true;
