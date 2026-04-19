-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_tracks" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "series" TEXT,
    "seriesOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_sessions" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "trackId" UUID,
    "roomId" UUID,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "program_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_session_chairs" (
    "sessionId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "program_session_chairs_pkey" PRIMARY KEY ("sessionId","userId")
);

-- CreateTable
CREATE TABLE "presentation_slots" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presentation_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_breaks" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "roomId" UUID,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_breaks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_name_key" ON "rooms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "program_tracks_name_key" ON "program_tracks"("name");

-- CreateIndex
CREATE INDEX "program_tracks_series_seriesOrder_idx" ON "program_tracks"("series", "seriesOrder");

-- CreateIndex
CREATE INDEX "program_sessions_startAt_idx" ON "program_sessions"("startAt");

-- CreateIndex
CREATE INDEX "program_sessions_roomId_startAt_idx" ON "program_sessions"("roomId", "startAt");

-- CreateIndex
CREATE INDEX "program_sessions_trackId_idx" ON "program_sessions"("trackId");

-- CreateIndex
CREATE INDEX "program_session_chairs_userId_idx" ON "program_session_chairs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "presentation_slots_submissionId_key" ON "presentation_slots"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "presentation_slots_sessionId_order_key" ON "presentation_slots"("sessionId", "order");

-- CreateIndex
CREATE INDEX "schedule_breaks_startAt_idx" ON "schedule_breaks"("startAt");

-- CreateIndex
CREATE INDEX "schedule_breaks_roomId_startAt_idx" ON "schedule_breaks"("roomId", "startAt");

-- AddForeignKey
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "program_tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_session_chairs" ADD CONSTRAINT "program_session_chairs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "program_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_session_chairs" ADD CONSTRAINT "program_session_chairs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_slots" ADD CONSTRAINT "presentation_slots_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "program_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_slots" ADD CONSTRAINT "presentation_slots_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_breaks" ADD CONSTRAINT "schedule_breaks_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
