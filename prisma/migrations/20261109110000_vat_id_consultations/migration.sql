CREATE TABLE "vat_id_consultations" (
    "id" UUID NOT NULL,
    "vatId" TEXT NOT NULL,
    "status" "VatIdCheckStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "requestIdentifier" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_id_consultations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vat_id_consultations_vatId_checkedAt_idx" ON "vat_id_consultations"("vatId", "checkedAt");
