-- AlterTable
ALTER TABLE "submissions" ADD COLUMN "sequentialNumber" INTEGER;

-- Populate sequential numbers for existing submissions (ordered by createdAt)
WITH numbered_submissions AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) as seq_num
  FROM "submissions"
)
UPDATE "submissions" s
SET "sequentialNumber" = ns.seq_num
FROM numbered_submissions ns
WHERE s.id = ns.id;

-- CreateIndex
CREATE UNIQUE INDEX "submissions_sequentialNumber_key" ON "submissions"("sequentialNumber");
