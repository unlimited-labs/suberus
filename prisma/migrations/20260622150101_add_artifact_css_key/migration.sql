-- AlterTable
ALTER TABLE "submission_version_artifacts" ADD COLUMN     "cssKey" TEXT;

-- RenameIndex
ALTER INDEX "version_diff_artifacts_old_new_diffVersion_key" RENAME TO "version_diff_artifacts_oldArtifactSha_newArtifactSha_diffVe_key";
