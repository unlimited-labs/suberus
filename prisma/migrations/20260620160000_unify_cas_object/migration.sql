-- Feature not yet live anywhere: safe to drop cached artifacts/diffs so every
-- remaining row carries the new figureShas (and stale toolchain rows are gone).
TRUNCATE TABLE "submission_version_artifacts", "version_diff_artifacts";

-- DropTable: the ref-counted figure-only Blob is replaced by the CasObject
-- inventory (figures + html + redline) driven by the mark-and-sweep reaper.
DROP TABLE "blobs";

-- CreateTable
CREATE TABLE "cas_objects" (
    "key" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cas_objects_pkey" PRIMARY KEY ("key")
);

-- AlterTable: per-artifact figure liveness for the reaper's live-set computation.
ALTER TABLE "submission_version_artifacts" ADD COLUMN "figureShas" TEXT[];

-- DropIndex: never queried (resolution goes through the unique key).
DROP INDEX "version_diff_artifacts_oldVersionId_newVersionId_idx";

-- CreateIndex: read-path for resolveHtmlKeyForVersion (findFirst by sourceSha256+kind, newest first).
CREATE INDEX "submission_version_artifacts_sourceSha256_kind_createdAt_idx" ON "submission_version_artifacts"("sourceSha256", "kind", "createdAt" DESC);
