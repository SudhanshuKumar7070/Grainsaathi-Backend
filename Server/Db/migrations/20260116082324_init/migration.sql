-- CreateTable
CREATE TABLE "Kisaan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "refreshToken" TEXT,

    CONSTRAINT "Kisaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vyapari" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "refreshToken" TEXT,

    CONSTRAINT "Vyapari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "refreshToken" TEXT,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KisanVyapari" (
    "id" SERIAL NOT NULL,
    "kisanId" INTEGER NOT NULL,
    "vyapariId" INTEGER NOT NULL,

    CONSTRAINT "KisanVyapari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KisanOrganisation" (
    "id" SERIAL NOT NULL,
    "kisanId" INTEGER NOT NULL,
    "organisationId" INTEGER NOT NULL,

    CONSTRAINT "KisanOrganisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationVyapari" (
    "id" SERIAL NOT NULL,
    "organisationId" INTEGER NOT NULL,
    "vyapariId" INTEGER NOT NULL,

    CONSTRAINT "OrganisationVyapari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganisationOrganisation" (
    "id" SERIAL NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,

    CONSTRAINT "OrganisationOrganisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kisaan_email_key" ON "Kisaan"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Kisaan_phone_key" ON "Kisaan"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Vyapari_email_key" ON "Vyapari"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vyapari_phone_key" ON "Vyapari"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_email_key" ON "Organisation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_phone_key" ON "Organisation"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "KisanVyapari_kisanId_vyapariId_key" ON "KisanVyapari"("kisanId", "vyapariId");

-- CreateIndex
CREATE UNIQUE INDEX "KisanOrganisation_kisanId_organisationId_key" ON "KisanOrganisation"("kisanId", "organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationVyapari_organisationId_vyapariId_key" ON "OrganisationVyapari"("organisationId", "vyapariId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganisationOrganisation_buyerId_sellerId_key" ON "OrganisationOrganisation"("buyerId", "sellerId");

-- AddForeignKey
ALTER TABLE "KisanVyapari" ADD CONSTRAINT "KisanVyapari_kisanId_fkey" FOREIGN KEY ("kisanId") REFERENCES "Kisaan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KisanVyapari" ADD CONSTRAINT "KisanVyapari_vyapariId_fkey" FOREIGN KEY ("vyapariId") REFERENCES "Vyapari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KisanOrganisation" ADD CONSTRAINT "KisanOrganisation_kisanId_fkey" FOREIGN KEY ("kisanId") REFERENCES "Kisaan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KisanOrganisation" ADD CONSTRAINT "KisanOrganisation_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationVyapari" ADD CONSTRAINT "OrganisationVyapari_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationVyapari" ADD CONSTRAINT "OrganisationVyapari_vyapariId_fkey" FOREIGN KEY ("vyapariId") REFERENCES "Vyapari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationOrganisation" ADD CONSTRAINT "OrganisationOrganisation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganisationOrganisation" ADD CONSTRAINT "OrganisationOrganisation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
