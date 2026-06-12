-- CreateEnum
CREATE TYPE "ExhibitorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'EXHIBITOR_APPLIED';
ALTER TYPE "ActivityType" ADD VALUE 'EXHIBITOR_APPROVED';
ALTER TYPE "ActivityType" ADD VALUE 'EXHIBITOR_REJECTED';
ALTER TYPE "ActivityType" ADD VALUE 'EXHIBITOR_WITHDRAWN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailEventType" ADD VALUE 'EXHIBITOR_APPROVED';
ALTER TYPE "EmailEventType" ADD VALUE 'EXHIBITOR_REJECTED';

-- AlterEnum
ALTER TYPE "FileEntityType" ADD VALUE 'EXHIBITOR';

-- AlterEnum
ALTER TYPE "FileType" ADD VALUE 'EXHIBITOR_LOGO';

-- AlterEnum
ALTER TYPE "SubmissionType" ADD VALUE 'EXHIBITOR';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'EXHIBITOR';

-- CreateTable
CREATE TABLE "exhibitors" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "website" TEXT,
    "package" TEXT,
    "status" "ExhibitorStatus" NOT NULL DEFAULT 'PENDING',
    "submissionId" UUID,
    "appliedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exhibitors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exhibitors_userId_key" ON "exhibitors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "exhibitors_submissionId_key" ON "exhibitors"("submissionId");

-- CreateIndex
CREATE INDEX "exhibitors_status_idx" ON "exhibitors"("status");

-- CreateIndex
CREATE INDEX "exhibitors_appliedAt_idx" ON "exhibitors"("appliedAt");

-- AddForeignKey
ALTER TABLE "exhibitors" ADD CONSTRAINT "exhibitors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibitors" ADD CONSTRAINT "exhibitors_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibitors" ADD CONSTRAINT "exhibitors_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
