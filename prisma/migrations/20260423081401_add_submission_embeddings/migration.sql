-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "submission_embeddings" (
    "submissionId" UUID NOT NULL,
    "embedding" vector(2560) NOT NULL,
    "hash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_embeddings_pkey" PRIMARY KEY ("submissionId")
);

-- CreateIndex
CREATE INDEX "submission_embeddings_hash_idx" ON "submission_embeddings"("hash");

-- Note: HNSW index omitted. pgvector HNSW has a 2000-dim limit and Qwen3-Embedding-4B is 2560-dim.
-- At MVP scale (hundreds of submissions) a sequential cosine scan is sub-millisecond.
-- If needed later, use a halfvec(2560) index (HNSW supports up to 4000 halfvec dims).

-- AddForeignKey
ALTER TABLE "submission_embeddings" ADD CONSTRAINT "submission_embeddings_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
