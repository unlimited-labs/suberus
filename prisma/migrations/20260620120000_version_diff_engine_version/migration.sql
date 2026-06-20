-- The redline now comes from xmldiff (docx-api sidecar); its version joins the
-- cache key so a diff-engine bump yields a new row instead of silently mutating a
-- historical redline. Existing rows are derived cache and were cleared.

-- DropIndex
DROP INDEX "version_diff_artifacts_oldArtifactSha_newArtifactSha_key";

-- AlterTable
ALTER TABLE "version_diff_artifacts" ADD COLUMN "diffVersion" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "version_diff_artifacts_old_new_diffVersion_key" ON "version_diff_artifacts"("oldArtifactSha", "newArtifactSha", "diffVersion");
