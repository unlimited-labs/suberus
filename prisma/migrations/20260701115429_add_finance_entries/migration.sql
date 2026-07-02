-- CreateEnum
CREATE TYPE "FinanceEntryKind" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "finance_entries" (
    "id" UUID NOT NULL,
    "kind" "FinanceEntryKind" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_entries_kind_sortOrder_idx" ON "finance_entries"("kind", "sortOrder");
