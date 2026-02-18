-- CreateEnum
CREATE TYPE "SurveyQuestionType" AS ENUM ('CHECKBOX', 'TEXT', 'SINGLE_SELECT', 'MULTI_SELECT');

-- AlterTable
ALTER TABLE "survey_answers" ALTER COLUMN "value" SET DEFAULT '',
ALTER COLUMN "value" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "survey_questions" ADD COLUMN     "isRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "options" JSONB,
ADD COLUMN     "type" "SurveyQuestionType" NOT NULL DEFAULT 'CHECKBOX';
