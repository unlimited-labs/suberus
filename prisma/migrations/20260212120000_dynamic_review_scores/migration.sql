-- AlterTable: Replace hardcoded score columns with dynamic JSON scores
ALTER TABLE "reviews" DROP COLUMN "scoreClarity",
DROP COLUMN "scoreMethodology",
DROP COLUMN "scoreNovelty",
DROP COLUMN "scoreRelevance";

ALTER TABLE "reviews" ADD COLUMN "scores" JSONB;
