/*
  Warnings:

  - The primary key for the `Fee` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `FeeCharged` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `FeeChargedEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PoolAccumulatedAmountReleased` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PoolAccumulatedAmountReleasedEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PoolAccumulatedAmountUpdated` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PoolAccumulatedAmountUpdatedEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PoolManagerUpdated` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PoolManagerUpdatedEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PoolRegistered` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PoolRegisteredEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `QKWithConfigRegistered` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `QKWithConfigRegisteredEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TrialRegistered` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TrialRegisteredEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TrialResolved` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TrialResolvedEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Fee" DROP CONSTRAINT "Fee_id_fkey";

-- DropForeignKey
ALTER TABLE "FeeCharged" DROP CONSTRAINT "FeeCharged_id_fkey";

-- DropForeignKey
ALTER TABLE "PoolAccumulatedAmountReleased" DROP CONSTRAINT "PoolAccumulatedAmountReleased_id_fkey";

-- DropForeignKey
ALTER TABLE "PoolAccumulatedAmountUpdated" DROP CONSTRAINT "PoolAccumulatedAmountUpdated_id_fkey";

-- DropForeignKey
ALTER TABLE "PoolManagerUpdated" DROP CONSTRAINT "PoolManagerUpdated_id_fkey";

-- DropForeignKey
ALTER TABLE "PoolRegistered" DROP CONSTRAINT "PoolRegistered_id_fkey";

-- DropForeignKey
ALTER TABLE "QKWithConfigRegistered" DROP CONSTRAINT "QKWithConfigRegistered_id_fkey";

-- DropForeignKey
ALTER TABLE "TrialRegistered" DROP CONSTRAINT "TrialRegistered_id_fkey";

-- DropForeignKey
ALTER TABLE "TrialResolved" DROP CONSTRAINT "TrialResolved_id_fkey";

-- AlterTable
ALTER TABLE "CasinoStats" ALTER COLUMN "totalWagered" SET DEFAULT 0,
ALTER COLUMN "totalWagered" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "totalPayout" SET DEFAULT 0,
ALTER COLUMN "totalPayout" SET DATA TYPE DECIMAL(78,0);

-- AlterTable
ALTER TABLE "Fee" DROP CONSTRAINT "Fee_pkey",
ALTER COLUMN "id" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "hostPercent" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "poolPercent" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "burnPercent" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "networkPercent" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "hostAmount" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "poolAmount" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "burnAmount" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "networkAmount" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "Fee_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "FeeCharged" DROP CONSTRAINT "FeeCharged_pkey",
ALTER COLUMN "id" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "FeeCharged_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "FeeChargedEvent" DROP CONSTRAINT "FeeChargedEvent_pkey",
ALTER COLUMN "orderIndex" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "slot" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "feeAmount" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "FeeChargedEvent_pkey" PRIMARY KEY ("orderIndex");

-- AlterTable
ALTER TABLE "GameSetup" ALTER COLUMN "emittedSortedQ" SET DATA TYPE DECIMAL(78,0)[],
ALTER COLUMN "emittedSortedK" SET DATA TYPE DECIMAL(78,0)[];

-- AlterTable
ALTER TABLE "Player" ALTER COLUMN "totalWagered" SET DEFAULT 0,
ALTER COLUMN "totalWagered" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "totalPayout" SET DEFAULT 0,
ALTER COLUMN "totalPayout" SET DATA TYPE DECIMAL(78,0);

-- AlterTable
ALTER TABLE "PoolAccumulatedAmountReleased" DROP CONSTRAINT "PoolAccumulatedAmountReleased_pkey",
ALTER COLUMN "id" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "PoolAccumulatedAmountReleased_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PoolAccumulatedAmountReleasedEvent" DROP CONSTRAINT "PoolAccumulatedAmountReleasedEvent_pkey",
ALTER COLUMN "orderIndex" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "slot" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "releasedAmount" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "PoolAccumulatedAmountReleasedEvent_pkey" PRIMARY KEY ("orderIndex");

-- AlterTable
ALTER TABLE "PoolAccumulatedAmountUpdated" DROP CONSTRAINT "PoolAccumulatedAmountUpdated_pkey",
ALTER COLUMN "id" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "PoolAccumulatedAmountUpdated_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PoolAccumulatedAmountUpdatedEvent" DROP CONSTRAINT "PoolAccumulatedAmountUpdatedEvent_pkey",
ALTER COLUMN "orderIndex" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "slot" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "newAccumulatedAmount" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "PoolAccumulatedAmountUpdatedEvent_pkey" PRIMARY KEY ("orderIndex");

-- AlterTable
ALTER TABLE "PoolManagerUpdated" DROP CONSTRAINT "PoolManagerUpdated_pkey",
ALTER COLUMN "id" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "PoolManagerUpdated_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PoolManagerUpdatedEvent" DROP CONSTRAINT "PoolManagerUpdatedEvent_pkey",
ALTER COLUMN "orderIndex" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "slot" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "PoolManagerUpdatedEvent_pkey" PRIMARY KEY ("orderIndex");

-- AlterTable
ALTER TABLE "PoolRegistered" DROP CONSTRAINT "PoolRegistered_pkey",
ALTER COLUMN "id" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "PoolRegistered_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PoolRegisteredEvent" DROP CONSTRAINT "PoolRegisteredEvent_pkey",
ALTER COLUMN "orderIndex" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "slot" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "feePlayMultiplier" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "feeLossMultiplier" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "feeMintMultiplier" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "feeHostPercent" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "feePoolPercent" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "minLimitForTicket" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "probability" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "PoolRegisteredEvent_pkey" PRIMARY KEY ("orderIndex");

-- AlterTable
ALTER TABLE "QKWithConfigRegistered" DROP CONSTRAINT "QKWithConfigRegistered_pkey",
ALTER COLUMN "id" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "QKWithConfigRegistered_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "QKWithConfigRegisteredEvent" DROP CONSTRAINT "QKWithConfigRegisteredEvent_pkey",
ALTER COLUMN "orderIndex" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "slot" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "q" SET DATA TYPE DECIMAL(78,0)[],
ALTER COLUMN "k" SET DATA TYPE DECIMAL(78,0)[],
ALTER COLUMN "feeLossMultiplier" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "feeMintMultiplier" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "effectiveEv" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "QKWithConfigRegisteredEvent_pkey" PRIMARY KEY ("orderIndex");

-- AlterTable
ALTER TABLE "Trial" ALTER COLUMN "resultK" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "deltaAmount" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "multiplierInUsdc" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "deltaAmountInUsdc" SET DATA TYPE DECIMAL(78,0);

-- AlterTable
ALTER TABLE "TrialRegistered" DROP CONSTRAINT "TrialRegistered_pkey",
ALTER COLUMN "id" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "TrialRegistered_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TrialRegisteredEvent" DROP CONSTRAINT "TrialRegisteredEvent_pkey",
ALTER COLUMN "orderIndex" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "slot" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "multiplier" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "vrfCostInFare" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "TrialRegisteredEvent_pkey" PRIMARY KEY ("orderIndex");

-- AlterTable
ALTER TABLE "TrialResolved" DROP CONSTRAINT "TrialResolved_pkey",
ALTER COLUMN "id" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "TrialResolved_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TrialResolvedEvent" DROP CONSTRAINT "TrialResolvedEvent_pkey",
ALTER COLUMN "orderIndex" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "slot" SET DATA TYPE DECIMAL(78,0),
ALTER COLUMN "randomness" SET DATA TYPE DECIMAL(78,0),
ADD CONSTRAINT "TrialResolvedEvent_pkey" PRIMARY KEY ("orderIndex");

-- AddForeignKey
ALTER TABLE "PoolRegistered" ADD CONSTRAINT "PoolRegistered_id_fkey" FOREIGN KEY ("id") REFERENCES "PoolRegisteredEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolManagerUpdated" ADD CONSTRAINT "PoolManagerUpdated_id_fkey" FOREIGN KEY ("id") REFERENCES "PoolManagerUpdatedEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolAccumulatedAmountUpdated" ADD CONSTRAINT "PoolAccumulatedAmountUpdated_id_fkey" FOREIGN KEY ("id") REFERENCES "PoolAccumulatedAmountUpdatedEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolAccumulatedAmountReleased" ADD CONSTRAINT "PoolAccumulatedAmountReleased_id_fkey" FOREIGN KEY ("id") REFERENCES "PoolAccumulatedAmountReleasedEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeCharged" ADD CONSTRAINT "FeeCharged_id_fkey" FOREIGN KEY ("id") REFERENCES "FeeChargedEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_id_fkey" FOREIGN KEY ("id") REFERENCES "FeeCharged"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialRegistered" ADD CONSTRAINT "TrialRegistered_id_fkey" FOREIGN KEY ("id") REFERENCES "TrialRegisteredEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialResolved" ADD CONSTRAINT "TrialResolved_id_fkey" FOREIGN KEY ("id") REFERENCES "TrialResolvedEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QKWithConfigRegistered" ADD CONSTRAINT "QKWithConfigRegistered_id_fkey" FOREIGN KEY ("id") REFERENCES "QKWithConfigRegisteredEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;
