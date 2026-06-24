-- CreateEnum
CREATE TYPE "SurveyAudience" AS ENUM ('ALL', 'PARTICIPANTS', 'EXHIBITORS');

-- AlterTable
ALTER TABLE "survey_questions" ADD COLUMN     "audience" "SurveyAudience" NOT NULL DEFAULT 'ALL';
