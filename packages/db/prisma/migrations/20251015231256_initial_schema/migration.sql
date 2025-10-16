-- CreateEnum
CREATE TYPE "CasinoStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('FeePlay', 'FeeLoss', 'FeeMint');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'CONVERTED', 'ERROR', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "username" TEXT,
    "email" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Casino" (
    "id" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "longDescription" TEXT,
    "poolId" INTEGER,
    "profileImage" TEXT,
    "bannerImage" TEXT,
    "font" TEXT,
    "colors" JSONB,
    "theme" JSONB,
    "apiUrl" TEXT,
    "wsUrl" TEXT,
    "frontendUrl" TEXT,
    "socialLinks" JSONB,
    "status" "CasinoStatus" NOT NULL DEFAULT 'INACTIVE',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Casino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasinoSection" (
    "id" TEXT NOT NULL,
    "casinoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gameIds" TEXT[],
    "layout" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CasinoSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasinoGame" (
    "id" TEXT NOT NULL,
    "casinoId" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CasinoGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomGameConfig" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parameters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomGameConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasinoStats" (
    "id" TEXT NOT NULL,
    "casinoId" TEXT NOT NULL,
    "totalPlays" INTEGER NOT NULL DEFAULT 0,
    "totalWagered" BIGINT NOT NULL DEFAULT 0,
    "totalPayout" BIGINT NOT NULL DEFAULT 0,
    "totalPlayers" INTEGER NOT NULL DEFAULT 0,
    "hourlyVolume" JSONB,
    "dailyVolume" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CasinoStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "casinoId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "username" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalBets" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "totalLosses" INTEGER NOT NULL DEFAULT 0,
    "totalWagered" BIGINT NOT NULL DEFAULT 0,
    "totalPayout" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "casinoId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "s3Key" TEXT NOT NULL,
    "cdnUrl" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" INTEGER NOT NULL,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolRegisteredEvent" (
    "orderIndex" BIGINT NOT NULL,
    "slot" BIGINT NOT NULL,
    "instructionIndex" INTEGER NOT NULL,
    "innerInstructionIndex" INTEGER NOT NULL,
    "signature" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "poolId" INTEGER NOT NULL,
    "managerAddress" TEXT NOT NULL,
    "feePlayMultiplier" BIGINT NOT NULL,
    "feeLossMultiplier" BIGINT NOT NULL,
    "feeMintMultiplier" BIGINT NOT NULL,
    "feeHostPercent" BIGINT NOT NULL,
    "feePoolPercent" BIGINT NOT NULL,
    "minLimitForTicket" BIGINT NOT NULL,
    "probability" BIGINT NOT NULL,

    CONSTRAINT "PoolRegisteredEvent_pkey" PRIMARY KEY ("orderIndex")
);

-- CreateTable
CREATE TABLE "PoolRegistered" (
    "id" BIGINT NOT NULL,
    "poolId" INTEGER NOT NULL,
    "managerAddress" TEXT NOT NULL,

    CONSTRAINT "PoolRegistered_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolManagerUpdatedEvent" (
    "orderIndex" BIGINT NOT NULL,
    "slot" BIGINT NOT NULL,
    "instructionIndex" INTEGER NOT NULL,
    "innerInstructionIndex" INTEGER NOT NULL,
    "signature" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "poolId" INTEGER NOT NULL,
    "newPoolManagerAddress" TEXT NOT NULL,

    CONSTRAINT "PoolManagerUpdatedEvent_pkey" PRIMARY KEY ("orderIndex")
);

-- CreateTable
CREATE TABLE "PoolManagerUpdated" (
    "id" BIGINT NOT NULL,
    "poolId" INTEGER NOT NULL,
    "newPoolManagerAddress" TEXT NOT NULL,

    CONSTRAINT "PoolManagerUpdated_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolAccumulatedAmountUpdatedEvent" (
    "orderIndex" BIGINT NOT NULL,
    "slot" BIGINT NOT NULL,
    "instructionIndex" INTEGER NOT NULL,
    "innerInstructionIndex" INTEGER NOT NULL,
    "signature" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "poolId" INTEGER NOT NULL,
    "trialId" TEXT NOT NULL,
    "newAccumulatedAmount" BIGINT NOT NULL,

    CONSTRAINT "PoolAccumulatedAmountUpdatedEvent_pkey" PRIMARY KEY ("orderIndex")
);

-- CreateTable
CREATE TABLE "PoolAccumulatedAmountUpdated" (
    "id" BIGINT NOT NULL,
    "poolId" INTEGER NOT NULL,
    "trialId" TEXT NOT NULL,

    CONSTRAINT "PoolAccumulatedAmountUpdated_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolAccumulatedAmountReleasedEvent" (
    "orderIndex" BIGINT NOT NULL,
    "slot" BIGINT NOT NULL,
    "instructionIndex" INTEGER NOT NULL,
    "innerInstructionIndex" INTEGER NOT NULL,
    "signature" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "poolId" INTEGER NOT NULL,
    "trialId" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "releasedAmount" BIGINT NOT NULL,

    CONSTRAINT "PoolAccumulatedAmountReleasedEvent_pkey" PRIMARY KEY ("orderIndex")
);

-- CreateTable
CREATE TABLE "PoolAccumulatedAmountReleased" (
    "id" BIGINT NOT NULL,
    "poolId" INTEGER NOT NULL,
    "trialId" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,

    CONSTRAINT "PoolAccumulatedAmountReleased_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeChargedEvent" (
    "orderIndex" BIGINT NOT NULL,
    "slot" BIGINT NOT NULL,
    "instructionIndex" INTEGER NOT NULL,
    "innerInstructionIndex" INTEGER NOT NULL,
    "signature" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "feeType" "FeeType" NOT NULL,
    "poolId" INTEGER NOT NULL,
    "trialId" TEXT NOT NULL,
    "feeAmount" BIGINT NOT NULL,

    CONSTRAINT "FeeChargedEvent_pkey" PRIMARY KEY ("orderIndex")
);

-- CreateTable
CREATE TABLE "FeeCharged" (
    "id" BIGINT NOT NULL,

    CONSTRAINT "FeeCharged_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fee" (
    "id" BIGINT NOT NULL,
    "poolId" INTEGER NOT NULL,
    "trialId" TEXT NOT NULL,
    "hostPercent" BIGINT NOT NULL,
    "poolPercent" BIGINT NOT NULL,
    "burnPercent" BIGINT,
    "networkPercent" BIGINT,
    "hostAmount" BIGINT NOT NULL,
    "poolAmount" BIGINT NOT NULL,
    "burnAmount" BIGINT,
    "networkAmount" BIGINT,

    CONSTRAINT "Fee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialRegisteredEvent" (
    "orderIndex" BIGINT NOT NULL,
    "slot" BIGINT NOT NULL,
    "instructionIndex" INTEGER NOT NULL,
    "innerInstructionIndex" INTEGER NOT NULL,
    "signature" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "trialId" TEXT NOT NULL,
    "who" TEXT NOT NULL,
    "poolId" INTEGER NOT NULL,
    "multiplier" BIGINT NOT NULL,
    "qkWithConfigHash" TEXT NOT NULL,
    "vrfCostInFare" BIGINT NOT NULL,
    "extraDataHash" TEXT NOT NULL,

    CONSTRAINT "TrialRegisteredEvent_pkey" PRIMARY KEY ("orderIndex")
);

-- CreateTable
CREATE TABLE "TrialRegistered" (
    "id" BIGINT NOT NULL,
    "trialId" TEXT NOT NULL,

    CONSTRAINT "TrialRegistered_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialResolvedEvent" (
    "orderIndex" BIGINT NOT NULL,
    "slot" BIGINT NOT NULL,
    "instructionIndex" INTEGER NOT NULL,
    "innerInstructionIndex" INTEGER NOT NULL,
    "signature" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "trialId" TEXT NOT NULL,
    "resultIndex" INTEGER NOT NULL,
    "randomness" BIGINT NOT NULL,

    CONSTRAINT "TrialResolvedEvent_pkey" PRIMARY KEY ("orderIndex")
);

-- CreateTable
CREATE TABLE "TrialResolved" (
    "id" BIGINT NOT NULL,
    "trialId" TEXT NOT NULL,

    CONSTRAINT "TrialResolved_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trial" (
    "id" TEXT NOT NULL,
    "poolId" INTEGER NOT NULL,
    "who" TEXT NOT NULL,
    "casinoId" TEXT,
    "qkWithConfigHash" TEXT NOT NULL,
    "extraDataHash" TEXT NOT NULL,
    "resultK" BIGINT,
    "deltaAmount" BIGINT,
    "multiplierInUsdc" BIGINT,
    "deltaAmountInUsdc" BIGINT,

    CONSTRAINT "Trial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QKWithConfigRegisteredEvent" (
    "orderIndex" BIGINT NOT NULL,
    "slot" BIGINT NOT NULL,
    "instructionIndex" INTEGER NOT NULL,
    "innerInstructionIndex" INTEGER NOT NULL,
    "signature" TEXT NOT NULL,
    "blockTime" TIMESTAMP(3) NOT NULL,
    "qkWithConfigHash" TEXT NOT NULL,
    "q" BIGINT[],
    "k" BIGINT[],
    "feeLossMultiplier" BIGINT NOT NULL,
    "feeMintMultiplier" BIGINT NOT NULL,
    "effectiveEv" BIGINT NOT NULL,

    CONSTRAINT "QKWithConfigRegisteredEvent_pkey" PRIMARY KEY ("orderIndex")
);

-- CreateTable
CREATE TABLE "QKWithConfigRegistered" (
    "id" BIGINT NOT NULL,
    "qkWithConfigHash" TEXT NOT NULL,

    CONSTRAINT "QKWithConfigRegistered_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "qkRelatedFields" TEXT[],
    "otherFields" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "GameConfig" (
    "gameConfigHash" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "gameName" TEXT NOT NULL,
    "gameSetupId" INTEGER,

    CONSTRAINT "GameConfig_pkey" PRIMARY KEY ("gameConfigHash")
);

-- CreateTable
CREATE TABLE "GameSetup" (
    "id" SERIAL NOT NULL,
    "kToMs" JSONB NOT NULL,
    "mToPossibleOrderingCount" JSONB NOT NULL,
    "emittedSortedQ" BIGINT[],
    "emittedSortedK" BIGINT[],

    CONSTRAINT "GameSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameInstance" (
    "id" TEXT NOT NULL,
    "gameConfigHash" TEXT NOT NULL,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasinoDesignJob" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "casinoName" TEXT NOT NULL,
    "userPrompt" TEXT NOT NULL,
    "poolId" INTEGER,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "stepResults" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "config" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CasinoDesignJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElementGenerationJob" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "parameterId" TEXT,
    "userPrompt" TEXT NOT NULL,
    "finalPrompt" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "result" JSONB,
    "error" TEXT,
    "config" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ElementGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "elementJobId" TEXT,
    "userAddress" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationMetadata" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "gameId" TEXT,
    "prompt" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Casino_slug_key" ON "Casino"("slug");

-- CreateIndex
CREATE INDEX "Casino_slug_idx" ON "Casino"("slug");

-- CreateIndex
CREATE INDEX "Casino_ownerAddress_idx" ON "Casino"("ownerAddress");

-- CreateIndex
CREATE INDEX "Casino_status_idx" ON "Casino"("status");

-- CreateIndex
CREATE INDEX "Casino_poolId_idx" ON "Casino"("poolId");

-- CreateIndex
CREATE INDEX "CasinoSection_casinoId_idx" ON "CasinoSection"("casinoId");

-- CreateIndex
CREATE INDEX "CasinoGame_casinoId_idx" ON "CasinoGame"("casinoId");

-- CreateIndex
CREATE INDEX "CasinoGame_gameType_idx" ON "CasinoGame"("gameType");

-- CreateIndex
CREATE UNIQUE INDEX "CustomGameConfig_gameId_key" ON "CustomGameConfig"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "CasinoStats_casinoId_key" ON "CasinoStats"("casinoId");

-- CreateIndex
CREATE INDEX "CasinoStats_casinoId_idx" ON "CasinoStats"("casinoId");

-- CreateIndex
CREATE INDEX "Player_walletAddress_idx" ON "Player"("walletAddress");

-- CreateIndex
CREATE INDEX "Player_casinoId_idx" ON "Player"("casinoId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_casinoId_walletAddress_key" ON "Player"("casinoId", "walletAddress");

-- CreateIndex
CREATE INDEX "ChatMessage_casinoId_idx" ON "ChatMessage"("casinoId");

-- CreateIndex
CREATE INDEX "ChatMessage_playerId_idx" ON "ChatMessage"("playerId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "Media_userId_idx" ON "Media"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PoolRegisteredEvent_poolId_key" ON "PoolRegisteredEvent"("poolId");

-- CreateIndex
CREATE INDEX "PoolRegisteredEvent_signature_idx" ON "PoolRegisteredEvent"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "PoolRegisteredEvent_slot_instructionIndex_innerInstructionI_key" ON "PoolRegisteredEvent"("slot", "instructionIndex", "innerInstructionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "PoolRegistered_poolId_key" ON "PoolRegistered"("poolId");

-- CreateIndex
CREATE INDEX "PoolManagerUpdatedEvent_signature_idx" ON "PoolManagerUpdatedEvent"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "PoolManagerUpdatedEvent_slot_instructionIndex_innerInstruct_key" ON "PoolManagerUpdatedEvent"("slot", "instructionIndex", "innerInstructionIndex");

-- CreateIndex
CREATE INDEX "PoolAccumulatedAmountUpdatedEvent_signature_idx" ON "PoolAccumulatedAmountUpdatedEvent"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "PoolAccumulatedAmountUpdatedEvent_slot_instructionIndex_inn_key" ON "PoolAccumulatedAmountUpdatedEvent"("slot", "instructionIndex", "innerInstructionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "PoolAccumulatedAmountReleasedEvent_trialId_key" ON "PoolAccumulatedAmountReleasedEvent"("trialId");

-- CreateIndex
CREATE INDEX "PoolAccumulatedAmountReleasedEvent_signature_idx" ON "PoolAccumulatedAmountReleasedEvent"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "PoolAccumulatedAmountReleasedEvent_slot_instructionIndex_in_key" ON "PoolAccumulatedAmountReleasedEvent"("slot", "instructionIndex", "innerInstructionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "PoolAccumulatedAmountReleased_trialId_key" ON "PoolAccumulatedAmountReleased"("trialId");

-- CreateIndex
CREATE INDEX "FeeChargedEvent_signature_idx" ON "FeeChargedEvent"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "FeeChargedEvent_slot_instructionIndex_innerInstructionIndex_key" ON "FeeChargedEvent"("slot", "instructionIndex", "innerInstructionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "TrialRegisteredEvent_trialId_key" ON "TrialRegisteredEvent"("trialId");

-- CreateIndex
CREATE INDEX "TrialRegisteredEvent_signature_idx" ON "TrialRegisteredEvent"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "TrialRegisteredEvent_slot_instructionIndex_innerInstruction_key" ON "TrialRegisteredEvent"("slot", "instructionIndex", "innerInstructionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "TrialRegistered_trialId_key" ON "TrialRegistered"("trialId");

-- CreateIndex
CREATE UNIQUE INDEX "TrialResolvedEvent_trialId_key" ON "TrialResolvedEvent"("trialId");

-- CreateIndex
CREATE INDEX "TrialResolvedEvent_signature_idx" ON "TrialResolvedEvent"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "TrialResolvedEvent_slot_instructionIndex_innerInstructionIn_key" ON "TrialResolvedEvent"("slot", "instructionIndex", "innerInstructionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "TrialResolved_trialId_key" ON "TrialResolved"("trialId");

-- CreateIndex
CREATE INDEX "Trial_who_idx" ON "Trial"("who");

-- CreateIndex
CREATE INDEX "Trial_poolId_idx" ON "Trial"("poolId");

-- CreateIndex
CREATE INDEX "Trial_casinoId_idx" ON "Trial"("casinoId");

-- CreateIndex
CREATE UNIQUE INDEX "QKWithConfigRegisteredEvent_qkWithConfigHash_key" ON "QKWithConfigRegisteredEvent"("qkWithConfigHash");

-- CreateIndex
CREATE INDEX "QKWithConfigRegisteredEvent_signature_idx" ON "QKWithConfigRegisteredEvent"("signature");

-- CreateIndex
CREATE UNIQUE INDEX "QKWithConfigRegisteredEvent_slot_instructionIndex_innerInst_key" ON "QKWithConfigRegisteredEvent"("slot", "instructionIndex", "innerInstructionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "QKWithConfigRegistered_qkWithConfigHash_key" ON "QKWithConfigRegistered"("qkWithConfigHash");

-- CreateIndex
CREATE INDEX "GameConfig_gameName_idx" ON "GameConfig"("gameName");

-- CreateIndex
CREATE INDEX "CasinoDesignJob_userAddress_idx" ON "CasinoDesignJob"("userAddress");

-- CreateIndex
CREATE INDEX "CasinoDesignJob_status_idx" ON "CasinoDesignJob"("status");

-- CreateIndex
CREATE INDEX "CasinoDesignJob_startedAt_idx" ON "CasinoDesignJob"("startedAt");

-- CreateIndex
CREATE INDEX "ElementGenerationJob_userAddress_idx" ON "ElementGenerationJob"("userAddress");

-- CreateIndex
CREATE INDEX "ElementGenerationJob_status_idx" ON "ElementGenerationJob"("status");

-- CreateIndex
CREATE INDEX "ElementGenerationJob_startedAt_idx" ON "ElementGenerationJob"("startedAt");

-- CreateIndex
CREATE INDEX "GeneratedImage_jobId_idx" ON "GeneratedImage"("jobId");

-- CreateIndex
CREATE INDEX "GeneratedImage_elementJobId_idx" ON "GeneratedImage"("elementJobId");

-- CreateIndex
CREATE INDEX "GeneratedImage_userAddress_idx" ON "GeneratedImage"("userAddress");

-- CreateIndex
CREATE INDEX "GeneratedImage_createdAt_idx" ON "GeneratedImage"("createdAt");

-- CreateIndex
CREATE INDEX "GenerationMetadata_userAddress_idx" ON "GenerationMetadata"("userAddress");

-- CreateIndex
CREATE INDEX "GenerationMetadata_type_idx" ON "GenerationMetadata"("type");

-- CreateIndex
CREATE INDEX "GenerationMetadata_timestamp_idx" ON "GenerationMetadata"("timestamp");

-- AddForeignKey
ALTER TABLE "Casino" ADD CONSTRAINT "Casino_ownerAddress_fkey" FOREIGN KEY ("ownerAddress") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Casino" ADD CONSTRAINT "Casino_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasinoSection" ADD CONSTRAINT "CasinoSection_casinoId_fkey" FOREIGN KEY ("casinoId") REFERENCES "Casino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasinoGame" ADD CONSTRAINT "CasinoGame_casinoId_fkey" FOREIGN KEY ("casinoId") REFERENCES "Casino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasinoGame" ADD CONSTRAINT "CasinoGame_gameType_fkey" FOREIGN KEY ("gameType") REFERENCES "Game"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomGameConfig" ADD CONSTRAINT "CustomGameConfig_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "CasinoGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasinoStats" ADD CONSTRAINT "CasinoStats_casinoId_fkey" FOREIGN KEY ("casinoId") REFERENCES "Casino"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_casinoId_fkey" FOREIGN KEY ("casinoId") REFERENCES "Casino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_casinoId_fkey" FOREIGN KEY ("casinoId") REFERENCES "Casino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_id_fkey" FOREIGN KEY ("id") REFERENCES "PoolRegistered"("poolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolRegistered" ADD CONSTRAINT "PoolRegistered_id_fkey" FOREIGN KEY ("id") REFERENCES "PoolRegisteredEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolManagerUpdated" ADD CONSTRAINT "PoolManagerUpdated_id_fkey" FOREIGN KEY ("id") REFERENCES "PoolManagerUpdatedEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolManagerUpdated" ADD CONSTRAINT "PoolManagerUpdated_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolAccumulatedAmountUpdated" ADD CONSTRAINT "PoolAccumulatedAmountUpdated_id_fkey" FOREIGN KEY ("id") REFERENCES "PoolAccumulatedAmountUpdatedEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolAccumulatedAmountUpdated" ADD CONSTRAINT "PoolAccumulatedAmountUpdated_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolAccumulatedAmountUpdated" ADD CONSTRAINT "PoolAccumulatedAmountUpdated_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolAccumulatedAmountReleased" ADD CONSTRAINT "PoolAccumulatedAmountReleased_id_fkey" FOREIGN KEY ("id") REFERENCES "PoolAccumulatedAmountReleasedEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolAccumulatedAmountReleased" ADD CONSTRAINT "PoolAccumulatedAmountReleased_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolAccumulatedAmountReleased" ADD CONSTRAINT "PoolAccumulatedAmountReleased_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeCharged" ADD CONSTRAINT "FeeCharged_id_fkey" FOREIGN KEY ("id") REFERENCES "FeeChargedEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_id_fkey" FOREIGN KEY ("id") REFERENCES "FeeCharged"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fee" ADD CONSTRAINT "Fee_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialRegistered" ADD CONSTRAINT "TrialRegistered_id_fkey" FOREIGN KEY ("id") REFERENCES "TrialRegisteredEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialResolved" ADD CONSTRAINT "TrialResolved_id_fkey" FOREIGN KEY ("id") REFERENCES "TrialResolvedEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialResolved" ADD CONSTRAINT "TrialResolved_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_id_fkey" FOREIGN KEY ("id") REFERENCES "TrialRegistered"("trialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_casinoId_who_fkey" FOREIGN KEY ("casinoId", "who") REFERENCES "Player"("casinoId", "walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_qkWithConfigHash_fkey" FOREIGN KEY ("qkWithConfigHash") REFERENCES "QKWithConfigRegistered"("qkWithConfigHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_extraDataHash_fkey" FOREIGN KEY ("extraDataHash") REFERENCES "GameConfig"("gameConfigHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QKWithConfigRegistered" ADD CONSTRAINT "QKWithConfigRegistered_id_fkey" FOREIGN KEY ("id") REFERENCES "QKWithConfigRegisteredEvent"("orderIndex") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameConfig" ADD CONSTRAINT "GameConfig_gameName_fkey" FOREIGN KEY ("gameName") REFERENCES "Game"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameConfig" ADD CONSTRAINT "GameConfig_gameSetupId_fkey" FOREIGN KEY ("gameSetupId") REFERENCES "GameSetup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameInstance" ADD CONSTRAINT "GameInstance_id_fkey" FOREIGN KEY ("id") REFERENCES "Trial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameInstance" ADD CONSTRAINT "GameInstance_gameConfigHash_fkey" FOREIGN KEY ("gameConfigHash") REFERENCES "GameConfig"("gameConfigHash") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasinoDesignJob" ADD CONSTRAINT "CasinoDesignJob_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElementGenerationJob" ADD CONSTRAINT "ElementGenerationJob_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CasinoDesignJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedImage" ADD CONSTRAINT "GeneratedImage_elementJobId_fkey" FOREIGN KEY ("elementJobId") REFERENCES "ElementGenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
