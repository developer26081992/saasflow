/*
  Warnings:

  - A unique constraint covering the columns `[checkoutSessionId]` on the table `Organisation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[checkoutLockToken]` on the table `Organisation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Organisation" ADD COLUMN     "checkoutLockExpiresAt" TIMESTAMP(3),
ADD COLUMN     "checkoutLockToken" TEXT,
ADD COLUMN     "checkoutSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_checkoutSessionId_key" ON "Organisation"("checkoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_checkoutLockToken_key" ON "Organisation"("checkoutLockToken");
