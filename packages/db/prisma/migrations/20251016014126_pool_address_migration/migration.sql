/*
  Warnings:

  - You are about to drop the column `poolId` on the `Casino` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `Fee` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `FeeChargedEvent` table. All the data in the column will be lost.
  - The primary key for the `Pool` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Pool` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `PoolAccumulatedAmountReleased` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `PoolAccumulatedAmountReleasedEvent` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `PoolAccumulatedAmountUpdated` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `PoolAccumulatedAmountUpdatedEvent` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `PoolManagerUpdated` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `PoolManagerUpdatedEvent` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `PoolRegistered` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `PoolRegisteredEvent` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `Trial` table. All the data in the column will be lost.
  - You are about to drop the column `poolId` on the `TrialRegisteredEvent` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[poolAddress]` on the table `PoolRegistered` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[poolAddress]` on the table `PoolRegisteredEvent` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `poolAddress` to the `Fee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poolAddress` to the `FeeChargedEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `address` to the `Pool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poolAddress` to the `PoolAccumulatedAmountReleased` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poolAddress` to the `PoolAccumulatedAmountReleasedEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poolAddress` to the `PoolAccumulatedAmountUpdated` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poolAddress` to the `PoolAccumulatedAmountUpdatedEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poolAddress` to the `PoolManagerUpdated` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poolAddress` to the `PoolManagerUpdatedEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poolAddress` to the `PoolRegistered` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poolAddress` to the `PoolRegisteredEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poolAddress` to the `Trial` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poolAddress` to the `TrialRegisteredEvent` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Casino" DROP CONSTRAINT "Casino_poolId_fkey";

-- DropForeignKey
ALTER TABLE "Fee" DROP CONSTRAINT "Fee_poolId_fkey";

-- DropForeignKey
ALTER TABLE "Pool" DROP CONSTRAINT "Pool_id_fkey";

-- DropForeignKey
ALTER TABLE "PoolAccumulatedAmountReleased" DROP CONSTRAINT "PoolAccumulatedAmountReleased_poolId_fkey";

-- DropForeignKey
ALTER TABLE "PoolAccumulatedAmountUpdated" DROP CONSTRAINT "PoolAccumulatedAmountUpdated_poolId_fkey";

-- DropForeignKey
ALTER TABLE "PoolManagerUpdated" DROP CONSTRAINT "PoolManagerUpdated_poolId_fkey";

-- DropForeignKey
ALTER TABLE "Trial" DROP CONSTRAINT "Trial_poolId_fkey";

-- DropIndex
DROP INDEX "Casino_poolId_idx";

-- DropIndex
DROP INDEX "PoolRegistered_poolId_key";

-- DropIndex
DROP INDEX "PoolRegisteredEvent_poolId_key";

-- DropIndex
DROP INDEX "Trial_poolId_idx";

-- AlterTable
ALTER TABLE "Casino" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT;

-- AlterTable
ALTER TABLE "Fee" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FeeChargedEvent" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Pool" DROP CONSTRAINT "Pool_pkey",
DROP COLUMN "id",
ADD COLUMN     "address" TEXT NOT NULL,
ADD CONSTRAINT "Pool_pkey" PRIMARY KEY ("address");

-- AlterTable
ALTER TABLE "PoolAccumulatedAmountReleased" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PoolAccumulatedAmountReleasedEvent" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PoolAccumulatedAmountUpdated" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PoolAccumulatedAmountUpdatedEvent" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PoolManagerUpdated" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PoolManagerUpdatedEvent" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PoolRegistered" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PoolRegisteredEvent" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Trial" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TrialRegisteredEvent" DROP COLUMN "poolId",
ADD COLUMN     "poolAddress" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Casino_poolAddress_idx" ON "Casino"("poolAddress");

-- CreateIndex
CREATE UNIQUE INDEX "PoolRegistered_poolAddress_key" ON "PoolRegistered"("poolAddress");

-- CreateIndex
CREATE UNIQUE INDEX "PoolRegisteredEvent_poolAddress_key" ON "PoolRegisteredEvent"("poolAddress");

-- CreateIndex
CREATE INDEX "Trial_poolAddress_idx" ON "Trial"("poolAddress");

-- AddForeignKey
ALTER TABLE "Casino" ADD CONSTRAINT "Casino_poolAddress_fkey" FOREIGN KEY ("poolAddress") REFERENCES "Pool"("address") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_address_fkey" FOREIGN KEY ("address") REFERENCES "PoolRegistered"("poolAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolManagerUpdated" ADD CONSTRAINT "PoolManagerUpdated_poolAddress_fkey" FOREIGN KEY ("poolAddress") REFERENCES "Pool"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolAccumulatedAmountUpdated" ADD CONSTRAINT "PoolAccumulatedAmountUpdated_poolAddress_fkey" FOREIGN KEY ("poolAddress") REFERENCES "Pool"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolAccumulatedAmountReleased" ADD CONSTRAINT "PoolAccumulatedAmountReleased_poolAddress_fkey" FOREIGN KEY ("poolAddress") REFERENCES "Pool"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_poolAddress_fkey" FOREIGN KEY ("poolAddress") REFERENCES "Pool"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_poolAddress_fkey" FOREIGN KEY ("poolAddress") REFERENCES "Pool"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
