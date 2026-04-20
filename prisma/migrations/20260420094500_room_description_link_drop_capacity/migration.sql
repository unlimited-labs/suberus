-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "capacity",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "link" TEXT;
