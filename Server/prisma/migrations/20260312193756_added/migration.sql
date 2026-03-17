/*
  Warnings:

  - Added the required column `updatedAt` to the `Kisaan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Organisation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Vyapari` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Kisaan" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_At" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_At" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Vyapari" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_At" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
