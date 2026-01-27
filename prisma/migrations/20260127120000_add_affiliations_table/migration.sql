-- CreateTable
CREATE TABLE "affiliations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "affiliations_name_key" ON "affiliations"("name");

-- CreateIndex
CREATE INDEX "affiliations_name_idx" ON "affiliations"("name");

-- Extract unique affiliations from users and submission_authors (case-insensitive deduplication)
INSERT INTO "affiliations" ("name")
SELECT DISTINCT ON (LOWER(aff)) aff
FROM (
    SELECT affiliation AS aff FROM "users" WHERE affiliation IS NOT NULL AND affiliation != ''
    UNION ALL
    SELECT affiliation AS aff FROM "submission_authors" WHERE affiliation IS NOT NULL AND affiliation != ''
) combined
WHERE aff IS NOT NULL
ORDER BY LOWER(aff), aff;

-- Add affiliation_id column to users
ALTER TABLE "users" ADD COLUMN "affiliationId" UUID;

-- Add affiliation_id column to submission_authors
ALTER TABLE "submission_authors" ADD COLUMN "affiliationId" UUID;

-- Update users with matching affiliation
UPDATE "users" u
SET "affiliationId" = a.id
FROM "affiliations" a
WHERE LOWER(u.affiliation) = LOWER(a.name);

-- Update submission_authors with matching affiliation
UPDATE "submission_authors" sa
SET "affiliationId" = a.id
FROM "affiliations" a
WHERE LOWER(sa.affiliation) = LOWER(a.name);

-- Add foreign key constraints
ALTER TABLE "users" ADD CONSTRAINT "users_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "affiliations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "submission_authors" ADD CONSTRAINT "submission_authors_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "affiliations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old affiliation columns
ALTER TABLE "users" DROP COLUMN "affiliation";
ALTER TABLE "submission_authors" DROP COLUMN "affiliation";
