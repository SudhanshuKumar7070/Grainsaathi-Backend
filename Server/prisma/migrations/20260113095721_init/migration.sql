-- AlterTable
ALTER TABLE "Kisaan" ADD COLUMN     "refreshToken" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "refreshToken" TEXT;

-- AlterTable
ALTER TABLE "Vyapari" ADD COLUMN     "refreshToken" TEXT;
