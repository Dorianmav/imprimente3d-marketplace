/*
  Warnings:

  - You are about to drop the column `localisation` on the `ImprimeurProfil` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripeAccountId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ImprimeurProfil" DROP COLUMN "localisation",
ALTER COLUMN "tarifsIndicatifs" DROP NOT NULL;

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeAccountId_key" ON "User"("stripeAccountId");
