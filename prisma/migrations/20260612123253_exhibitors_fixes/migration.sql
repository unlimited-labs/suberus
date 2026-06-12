-- AlterTable
ALTER TABLE "exhibitors" ALTER COLUMN "companyName" DROP NOT NULL,
ALTER COLUMN "companyName" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "exhibitors_createdAt_idx" ON "exhibitors"("createdAt");
