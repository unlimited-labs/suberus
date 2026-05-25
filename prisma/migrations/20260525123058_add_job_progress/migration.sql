-- CreateTable
CREATE TABLE "job_progress" (
    "id" UUID NOT NULL,
    "queue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stage" TEXT NOT NULL DEFAULT 'queued',
    "current" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autoplan_proposals" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "autoplan_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_progress_queue_status_idx" ON "job_progress"("queue", "status");

-- CreateIndex
CREATE UNIQUE INDEX "autoplan_proposals_job_id_key" ON "autoplan_proposals"("job_id");

-- AddForeignKey
ALTER TABLE "autoplan_proposals" ADD CONSTRAINT "autoplan_proposals_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
