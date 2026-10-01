-- CreateEnum
CREATE TYPE "SignMode" AS ENUM ('NONE', 'INVISIBLE', 'VISIBLE');

-- AlterTable
ALTER TABLE "generated_documents" ADD COLUMN "signMode" "SignMode" NOT NULL DEFAULT 'VISIBLE';

UPDATE "generated_documents" SET "signMode" = 'INVISIBLE' WHERE "sealVisible" = false;
UPDATE "generated_documents" SET "signMode" = 'NONE'
  WHERE "templateId" IS NULL AND "signed" = false AND "status" = 'READY';

-- Uploads still queued/failed kept "don't sign" only in the pg-boss job payload.
DO $$
BEGIN
  IF to_regclass('pgboss.job') IS NOT NULL THEN
    UPDATE "generated_documents" d SET "signMode" = 'NONE'
      WHERE d."templateId" IS NULL AND d."signed" = false
        AND d."status" <> 'READY'
        AND EXISTS (
          SELECT 1 FROM pgboss.job j
          WHERE j.name = 'document-generate'
            AND j.data->>'documentId' = d."id"::text
            AND j.data->>'sign' = 'false'
        );
  END IF;
END $$;

ALTER TABLE "generated_documents" DROP COLUMN "sealVisible";
