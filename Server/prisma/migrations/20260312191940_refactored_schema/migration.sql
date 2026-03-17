/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `Kisaan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `Organisation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `Vyapari` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Kisaan_phone_key" ON "Kisaan"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_phone_key" ON "Organisation"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Vyapari_phone_key" ON "Vyapari"("phone");
