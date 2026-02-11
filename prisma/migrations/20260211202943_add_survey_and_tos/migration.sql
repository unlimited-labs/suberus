-- AlterEnum
ALTER TYPE "AppSettingKey" ADD VALUE 'TOS_CONTENT';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tosAcceptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "value" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "survey_questions_isActive_orderIndex_idx" ON "survey_questions"("isActive", "orderIndex");

-- CreateIndex
CREATE INDEX "survey_answers_userId_idx" ON "survey_answers"("userId");

-- CreateIndex
CREATE INDEX "survey_answers_questionId_idx" ON "survey_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "survey_answers_userId_questionId_key" ON "survey_answers"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "survey_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
