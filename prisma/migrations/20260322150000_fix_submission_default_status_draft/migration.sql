-- AlterTable: change default status from SUBMITTED to DRAFT (matches xstate initial state)
ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
