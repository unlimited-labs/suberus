-- AlterTable
ALTER TABLE "finance_entries" ADD COLUMN     "amountIsGross" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "vatRate" INTEGER;
