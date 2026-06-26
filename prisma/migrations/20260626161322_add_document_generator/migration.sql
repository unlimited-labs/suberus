-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- AlterEnum
ALTER TYPE "EmailEventType" ADD VALUE 'DOCUMENT_GENERATED';

-- CreateTable
CREATE TABLE "document_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "placeholders" TEXT[],
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "templateId" UUID,
    "batchId" UUID,
    "name" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "size" INTEGER,
    "error" TEXT,
    "generatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_batches" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "templateId" UUID,
    "total" INTEGER NOT NULL,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_storageKey_key" ON "document_templates"("storageKey");

-- CreateIndex
CREATE INDEX "document_templates_createdAt_idx" ON "document_templates"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "generated_documents_storageKey_key" ON "generated_documents"("storageKey");

-- CreateIndex
CREATE INDEX "generated_documents_userId_status_idx" ON "generated_documents"("userId", "status");

-- CreateIndex
CREATE INDEX "generated_documents_batchId_idx" ON "generated_documents"("batchId");

-- CreateIndex
CREATE INDEX "generated_documents_status_idx" ON "generated_documents"("status");

-- CreateIndex
CREATE INDEX "generated_documents_createdAt_idx" ON "generated_documents"("createdAt");

-- CreateIndex
CREATE INDEX "document_batches_createdAt_idx" ON "document_batches"("createdAt");

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "document_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_batches" ADD CONSTRAINT "document_batches_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "document_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
