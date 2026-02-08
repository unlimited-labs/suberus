-- AlterTable
ALTER TABLE "conference_sessions"
ADD COLUMN "supervisorId" UUID,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "conference_sessions_name_key" ON "conference_sessions"("name");

-- CreateIndex
CREATE INDEX "conference_sessions_supervisorId_idx" ON "conference_sessions"("supervisorId");

-- CreateIndex
CREATE INDEX "conference_sessions_isActive_idx" ON "conference_sessions"("isActive");

-- AddForeignKey
ALTER TABLE "conference_sessions" ADD CONSTRAINT "conference_sessions_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
