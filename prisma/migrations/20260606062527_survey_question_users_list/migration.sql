-- AlterTable
ALTER TABLE "survey_questions" ADD COLUMN     "fieldName" TEXT,
ADD COLUMN     "showInUsersList" BOOLEAN NOT NULL DEFAULT false;
