-- AlterEnum
ALTER TYPE "FileType" ADD VALUE 'CAMERA_READY';

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN "cameraReadyFileId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "submissions_cameraReadyFileId_key" ON "submissions"("cameraReadyFileId");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_cameraReadyFileId_fkey" FOREIGN KEY ("cameraReadyFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
