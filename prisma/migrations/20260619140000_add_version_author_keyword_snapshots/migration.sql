-- CreateTable
CREATE TABLE "submission_version_authors" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "affiliation" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isPresenter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_version_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_version_keywords" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_version_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_version_authors_versionId_idx" ON "submission_version_authors"("versionId");

-- CreateIndex
CREATE INDEX "submission_version_keywords_versionId_idx" ON "submission_version_keywords"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_version_keywords_versionId_name_key" ON "submission_version_keywords"("versionId", "name");

-- AddForeignKey
ALTER TABLE "submission_version_authors" ADD CONSTRAINT "submission_version_authors_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "submission_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_version_keywords" ADD CONSTRAINT "submission_version_keywords_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "submission_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: snapshot every existing version from the submission's CURRENT authors/keywords.
-- Authors and keywords were previously shared across all versions, so the current set is
-- the only history we have; this preserves today's behavior as the historical baseline.
INSERT INTO "submission_version_authors" ("id", "versionId", "firstName", "lastName", "email", "affiliation", "orderIndex", "isPresenter", "createdAt")
SELECT gen_random_uuid(), sv."id", sa."firstName", sa."lastName", sa."email", COALESCE(aff."name", ''), sa."orderIndex", sa."isPresenter", CURRENT_TIMESTAMP
FROM "submission_versions" sv
JOIN "submission_authors" sa ON sa."submissionId" = sv."submissionId"
LEFT JOIN "affiliations" aff ON aff."id" = sa."affiliationId";

INSERT INTO "submission_version_keywords" ("id", "versionId", "name", "createdAt")
SELECT gen_random_uuid(), sv."id", k."name", CURRENT_TIMESTAMP
FROM "submission_versions" sv
JOIN "submission_keywords" sk ON sk."submissionId" = sv."submissionId"
JOIN "keywords" k ON k."id" = sk."keywordId";
