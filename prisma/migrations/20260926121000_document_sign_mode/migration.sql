-- CreateEnum
CREATE TYPE "SignMode" AS ENUM ('NONE', 'INVISIBLE', 'VISIBLE');

-- AlterTable
ALTER TABLE "generated_documents" ADD COLUMN "signMode" "SignMode" NOT NULL DEFAULT 'VISIBLE';

UPDATE "generated_documents" SET "signMode" = 'INVISIBLE' WHERE "sealVisible" = false;
UPDATE "generated_documents" SET "signMode" = 'NONE'
  WHERE "templateId" IS NULL AND "signed" = false AND "status" = 'READY';

ALTER TABLE "generated_documents" DROP COLUMN "sealVisible";
