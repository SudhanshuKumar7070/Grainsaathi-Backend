/*
  Warnings:

  - A unique constraint covering the columns `[gsLoginId]` on the table `Organisation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[gsLoginId]` on the table `Vyapari` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "isRegistered" AS ENUM ('PENDING', 'REJECTED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SellContractStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SenderRole" AS ENUM ('KISAAN', 'VYAPARI', 'ORGANISATION');

-- CreateEnum
CREATE TYPE "ReceiverRole" AS ENUM ('VYAPARI', 'ORGANISATION');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('GST', 'AADHAR', 'PAN', 'TRADE_LICENSE');

-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "gsLoginId" TEXT,
ADD COLUMN     "gsPassword" TEXT,
ADD COLUMN     "registrationStatus" "isRegistered" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Vyapari" ADD COLUMN     "gsLoginId" TEXT,
ADD COLUMN     "gsPassword" TEXT,
ADD COLUMN     "registrationStatus" "isRegistered" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "Crops" (
    "id" SERIAL NOT NULL,
    "cropName" TEXT NOT NULL,
    "priceInPaise" INTEGER NOT NULL,
    "quantityQuintal" DOUBLE PRECISION,
    "traderId" INTEGER,
    "organisationId" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" SERIAL NOT NULL,
    "cropId" INTEGER NOT NULL,
    "cropPrice" INTEGER NOT NULL,
    "farmerId" INTEGER NOT NULL,
    "cropQuantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationTaskTicket" (
    "id" SERIAL NOT NULL,
    "vyapariId" INTEGER,
    "kisaanId" INTEGER,
    "orgId" INTEGER,
    "status" "TicketStatus" NOT NULL DEFAULT 'PENDING',
    "employeeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationTaskTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "creds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GsContract" (
    "id" SERIAL NOT NULL,
    "cropName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "pricePerQuintal" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "senderId" INTEGER NOT NULL,
    "senderRole" "SenderRole" NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "receiverRole" "ReceiverRole" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GsContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellContract" (
    "id" SERIAL NOT NULL,
    "gsContractId" INTEGER NOT NULL,
    "cropName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "pricePerQuintal" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "status" "SellContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "printedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" SERIAL NOT NULL,
    "sellContractId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "userRole" "SenderRole" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "userRole" "SenderRole" NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CropPriceHistory" (
    "id" SERIAL NOT NULL,
    "cropId" INTEGER NOT NULL,
    "oldPrice" INTEGER NOT NULL,
    "newPrice" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CropPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_phone_key" ON "Admin"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_phone_key" ON "SuperAdmin"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SellContract_gsContractId_key" ON "SellContract"("gsContractId");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_gsLoginId_key" ON "Organisation"("gsLoginId");

-- CreateIndex
CREATE UNIQUE INDEX "Vyapari_gsLoginId_key" ON "Vyapari"("gsLoginId");

-- AddForeignKey
ALTER TABLE "Crops" ADD CONSTRAINT "Crops_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "Vyapari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Crops" ADD CONSTRAINT "Crops_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Kisaan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationTaskTicket" ADD CONSTRAINT "RegistrationTaskTicket_vyapariId_fkey" FOREIGN KEY ("vyapariId") REFERENCES "Vyapari"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationTaskTicket" ADD CONSTRAINT "RegistrationTaskTicket_kisaanId_fkey" FOREIGN KEY ("kisaanId") REFERENCES "Kisaan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationTaskTicket" ADD CONSTRAINT "RegistrationTaskTicket_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationTaskTicket" ADD CONSTRAINT "RegistrationTaskTicket_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "SuperAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellContract" ADD CONSTRAINT "SellContract_gsContractId_fkey" FOREIGN KEY ("gsContractId") REFERENCES "GsContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_sellContractId_fkey" FOREIGN KEY ("sellContractId") REFERENCES "SellContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CropPriceHistory" ADD CONSTRAINT "CropPriceHistory_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
