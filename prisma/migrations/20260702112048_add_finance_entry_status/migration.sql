-- AlterTable
ALTER TABLE "finance_entries" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "ordered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false;
