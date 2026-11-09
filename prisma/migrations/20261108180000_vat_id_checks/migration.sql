CREATE TYPE "VatIdCheckStatus" AS ENUM ('VERIFIED', 'NOT_FOUND', 'UNAVAILABLE', 'NOT_CHECKABLE');

CREATE TABLE "vat_id_checks" (
    "vatId" TEXT NOT NULL,
    "status" "VatIdCheckStatus" NOT NULL,
    "source" TEXT,
    "registryName" TEXT,
    "registryAddress" TEXT,
    "requestIdentifier" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_id_checks_pkey" PRIMARY KEY ("vatId")
);
