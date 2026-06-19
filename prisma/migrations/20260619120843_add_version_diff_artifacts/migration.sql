-- CreateEnum
CREATE TYPE "ArtifactKind" AS ENUM ('DOCX');

-- AlterTable
ALTER TABLE "files" ADD COLUMN     "sha256" CHAR(64);

-- CreateTable
CREATE TABLE "submission_version_artifacts" (
    "id" UUID NOT NULL,
    "sourceSha256" CHAR(64) NOT NULL,
    "kind" "ArtifactKind" NOT NULL,
    "pandocVersion" TEXT NOT NULL,
    "normalizerConfigHash" CHAR(64) NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "htmlKey" TEXT NOT NULL,
    "warnings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_version_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_diff_artifacts" (
    "id" UUID NOT NULL,
    "oldArtifactSha" CHAR(64) NOT NULL,
    "newArtifactSha" CHAR(64) NOT NULL,
    "oldVersionId" UUID NOT NULL,
    "newVersionId" UUID NOT NULL,
    "redlineKey" TEXT NOT NULL,
    "insCount" INTEGER NOT NULL DEFAULT 0,
    "delCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "version_diff_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blobs" (
    "sha256" CHAR(64) NOT NULL,
    "size" INTEGER NOT NULL,
    "refCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blobs_pkey" PRIMARY KEY ("sha256")
);

-- CreateIndex
CREATE UNIQUE INDEX "submission_version_artifacts_sourceSha256_kind_pandocVersio_key" ON "submission_version_artifacts"("sourceSha256", "kind", "pandocVersion", "normalizerConfigHash", "schemaVersion");

-- CreateIndex
CREATE INDEX "version_diff_artifacts_oldVersionId_newVersionId_idx" ON "version_diff_artifacts"("oldVersionId", "newVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "version_diff_artifacts_oldArtifactSha_newArtifactSha_key" ON "version_diff_artifacts"("oldArtifactSha", "newArtifactSha");

-- CreateIndex
CREATE INDEX "files_sha256_idx" ON "files"("sha256");
