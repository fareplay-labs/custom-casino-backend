import { Job } from 'bullmq';
import { getPrismaClient } from '@fareplay/db';
import { createLogger } from '@fareplay/utils';
import {
  TrialRegisteredEventData,
  TrialResolvedEventData,
  calculateOrderIndex,
} from '../types/events.js';

const logger = createLogger('processor:game-handler');

/**
 * Helper to convert values to string for Prisma Decimal fields
 */
function toDecimalString(value: any): string {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (value && typeof value === 'object' && value.$type === 'BigInt' && value.value) {
    return value.value;
  }
  return '0';
}

/**
 * Helper to convert Prisma Decimal to BigInt for calculations
 */
function decimalToBigInt(value: any): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'string') return BigInt(value);
  if (typeof value === 'number') return BigInt(value);
  // Handle Prisma Decimal object
  if (value && typeof value === 'object' && 'toString' in value) {
    return BigInt(value.toString());
  }
  return BigInt(0);
}

export interface GameJobData {
  trialId: string;
  who: string;
  extraDataHash?: string;
  resultIndex?: number;
  randomness?: string;
  event?: any;
}

/**
 * Creates game instance record (already done inline in interpretation handler)
 * This job exists for consistency with Arbitrum backend
 */
async function createGameInstance(job: Job<GameJobData>): Promise<void> {
  const { trialId, extraDataHash } = job.data;
  
  logger.info({ trialId }, 'Creating game instance');

  const db = getPrismaClient();

  // Check if game config exists
  const gameConfig = await db.gameConfig.findUnique({
    where: { gameConfigHash: extraDataHash },
  });

  if (!gameConfig) {
    throw new Error('trying to process createGameInstance before gameConfig creation');
  }

  // Check if game instance already exists
  const existing = await db.gameInstance.findUnique({
    where: { id: trialId },
  });

  if (!existing) {
    await db.gameInstance.create({
      data: {
        id: trialId,
        gameConfigHash: extraDataHash!,
      },
    });
    logger.info({ trialId }, 'Created game instance');
  }
}

/**
 * Resolves game instance with results
 * TODO: Implement full game result processing like Arbitrum backend
 */
async function resolveGameInstance(job: Job<GameJobData>): Promise<void> {
  const { trialId, resultIndex, randomness } = job.data;

  logger.info({ trialId, resultIndex }, 'Resolving game instance');

  const db = getPrismaClient();

  // Get trial with related data
  const trial = await db.trial.findUnique({
    where: { id: trialId },
    include: {
      qkWithConfigRegistered: {
        include: {
          qkWithConfigRegisteredEvent: {
            select: { q: true, k: true },
          },
        },
      },
      trialRegistered: {
        include: {
          trialRegisteredEvent: {
            select: { multiplier: true },
          },
        },
      },
    },
  });

  if (!trial) {
    throw new Error('trying to process resolveGameInstance before trial creation');
  }

  // Get the k values and calculate result
  const kValues = trial.qkWithConfigRegistered.qkWithConfigRegisteredEvent.k;
  const resultK = kValues[resultIndex!];
  const multiplier = trial.trialRegistered.trialRegisteredEvent.multiplier;

  // Convert to BigInt for calculation
  const resultKBigInt = decimalToBigInt(resultK);
  const multiplierBigInt = decimalToBigInt(multiplier);
  const unitBigInt = BigInt(1e18);

  // Calculate deltaAmount: (resultK - 1e18) * multiplier / 1e18
  const deltaAmountBigInt = ((resultKBigInt - unitBigInt) * multiplierBigInt) / unitBigInt;
  const deltaAmount = toDecimalString(deltaAmountBigInt);

  // Update trial with results
  await db.trial.update({
    where: { id: trialId },
    data: {
      resultK: toDecimalString(resultK),
      deltaAmount,
    },
  });

  // Update game instance with result
  await db.gameInstance.update({
    where: { id: trialId },
    data: {
      result: {
        resultIndex,
        randomness,
        deltaAmount,
      },
    },
  });

  logger.info({ trialId, deltaAmount }, 'Resolved game instance');

  // TODO: Queue additional jobs like Arbitrum backend:
  // - playGameAnimation
  // - addLiveTrial
  // - checkAchievementCompletion
  // - updateAccumulatedWinLossAmounts
}

/**
 * Main handler for game jobs
 */
export async function handleGameJob(job: Job<GameJobData>): Promise<void> {
  logger.info({ jobName: job.name, trialId: job.data.trialId }, 'Processing game job');

  try {
    switch (job.name) {
      case 'createGameInstance':
        await createGameInstance(job);
        break;
      case 'resolveGameInstance':
        await resolveGameInstance(job);
        break;
      default:
        logger.warn({ jobName: job.name }, 'Unknown game job type');
    }

    logger.info({ jobName: job.name }, 'Game job complete');
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        jobName: job.name,
        trialId: job.data.trialId,
      },
      'Error processing game job'
    );
    throw error;
  }
}

