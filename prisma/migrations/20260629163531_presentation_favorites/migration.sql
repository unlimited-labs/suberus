-- CreateTable
CREATE TABLE "presentation_favorites" (
    "slotId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "presentation_favorites_pkey" PRIMARY KEY ("slotId","userId")
);

-- CreateIndex
CREATE INDEX "presentation_favorites_userId_idx" ON "presentation_favorites"("userId");

-- AddForeignKey
ALTER TABLE "presentation_favorites" ADD CONSTRAINT "presentation_favorites_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "presentation_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presentation_favorites" ADD CONSTRAINT "presentation_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
