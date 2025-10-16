import { Job } from 'bullmq';
import { getPrismaClient } from '@fareplay/db';
import { createLogger } from '@fareplay/utils';
import {
  EventInterpretationJob,
  EventName,
  calculateOrderIndex,
  PoolRegisteredEventData,
  PoolManagerUpdatedEventData,
  PoolAccumulatedAmountUpdatedEventData,
  PoolAccumulatedAmountReleasedEventData,
  QkWithConfigRegisteredEventData,
  FeeChargedEventData,
  TrialRegisteredEventData,
  TrialResolvedEventData,
} from '../types/events.js';
import { gameQueue } from '../queues/index.js';

const logger = createLogger('processor:interpretation-handler');

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

/**
 * Interprets blockchain events by creating abstraction records
 * (Pool, Trial, Fee, etc.) that link events together
 */
export async function handleEventInterpretation(
  job: Job<EventInterpretationJob>
): Promise<void> {
  const { eventName, eventData } = job.data;

  logger.info(
    {
      eventName,
      signature: eventData.signature,
    },
    'Interpreting event'
  );

  try {
    switch (eventName) {
      case EventName.PoolRegistered:
        await interpretPoolRegistered(eventData as PoolRegisteredEventData);
        break;
      case EventName.PoolManagerUpdated:
        await interpretPoolManagerUpdated(
          eventData as PoolManagerUpdatedEventData
        );
        break;
      case EventName.PoolAccumulatedAmountUpdated:
        await interpretPoolAccumulatedAmountUpdated(
          eventData as PoolAccumulatedAmountUpdatedEventData
        );
        break;
      case EventName.PoolAccumulatedAmountReleased:
        await interpretPoolAccumulatedAmountReleased(
          eventData as PoolAccumulatedAmountReleasedEventData
        );
        break;
      case EventName.QkWithConfigRegistered:
        await interpretQkWithConfigRegistered(
          eventData as QkWithConfigRegisteredEventData
        );
        break;
      case EventName.FeeCharged:
        await interpretFeeCharged(eventData as FeeChargedEventData);
        break;
      case EventName.TrialRegistered:
        await interpretTrialRegistered(eventData as TrialRegisteredEventData);
        break;
      case EventName.TrialResolved:
        await interpretTrialResolved(eventData as TrialResolvedEventData);
        break;
      default:
        logger.warn({ eventName }, 'Unknown event type for interpretation');
    }

    logger.info({ eventName }, 'Event interpretation complete');
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        eventName,
        signature: eventData.signature,
      },
      'Error interpreting event'
    );
    throw error;
  }
}

/**
 * Pool Registered - Creates pool and user if needed
 */
async function interpretPoolRegistered(
  data: PoolRegisteredEventData
): Promise<void> {
  const db = getPrismaClient();
  const idBigInt = calculateOrderIndex(
    data.slot,
    data.instructionIndex,
    data.innerInstructionIndex
  );
  const id = toDecimalString(idBigInt);

  // Ensure user exists
  const user = await db.user.findUnique({
    where: { walletAddress: data.managerAddress },
  });

  if (!user) {
    await db.user.create({
      data: {
        walletAddress: data.managerAddress,
      },
    });
    logger.info({ walletAddress: data.managerAddress }, 'Created user');
  }

  // Create PoolRegistered abstraction
  const poolRegistered = await db.poolRegistered.findUnique({
    where: { id },
  });

  if (!poolRegistered) {
    await db.poolRegistered.create({
      data: {
        id,
        poolAddress: data.poolAddress,
        managerAddress: data.managerAddress,
      },
    });
    logger.info({ poolAddress: data.poolAddress }, 'Created pool registered');
  }

  // Create Pool
  const pool = await db.pool.findUnique({
    where: { address: data.poolAddress },
  });

  if (!pool) {
    await db.pool.create({
      data: {
        address: data.poolAddress,
      },
    });
    logger.info({ poolAddress: data.poolAddress }, 'Created pool');
  }
}

/**
 * Pool Manager Updated - Updates pool manager
 */
async function interpretPoolManagerUpdated(
  data: PoolManagerUpdatedEventData
): Promise<void> {
  const db = getPrismaClient();
  const idBigInt = calculateOrderIndex(
    data.slot,
    data.instructionIndex,
    data.innerInstructionIndex
  );
  const id = toDecimalString(idBigInt);

  // Ensure user exists
  const user = await db.user.findUnique({
    where: { walletAddress: data.newPoolManagerAddress },
  });

  if (!user) {
    await db.user.create({
      data: {
        walletAddress: data.newPoolManagerAddress,
      },
    });
  }

  // Ensure pool exists
  const pool = await db.pool.findUnique({
    where: { address: data.poolAddress },
  });

  if (!pool) {
    throw new Error(
      `Pool ${data.poolAddress} not found when processing poolManagerUpdated`
    );
  }

  // Create PoolManagerUpdated abstraction
  const poolManagerUpdated = await db.poolManagerUpdated.findUnique({
    where: { id },
  });

  if (!poolManagerUpdated) {
    await db.poolManagerUpdated.create({
      data: {
        id,
        poolAddress: data.poolAddress,
        newPoolManagerAddress: data.newPoolManagerAddress,
      },
    });
    logger.info({ poolAddress: data.poolAddress }, 'Created pool manager updated');
  }
}

/**
 * Pool Accumulated Amount Updated - Tracks pool accumulation
 */
async function interpretPoolAccumulatedAmountUpdated(
  data: PoolAccumulatedAmountUpdatedEventData
): Promise<void> {
  const db = getPrismaClient();
  const idBigInt = calculateOrderIndex(
    data.slot,
    data.instructionIndex,
    data.innerInstructionIndex
  );
  const id = toDecimalString(idBigInt);

  // Ensure pool and trial exist
  const [pool, trial] = await Promise.all([
    db.pool.findUnique({ where: { address: data.poolAddress } }),
    db.trial.findUnique({ where: { id: data.trialId } }),
  ]);

  if (!pool) {
    throw new Error(
      `Pool ${data.poolAddress} not found when processing poolAccumulatedAmountUpdated`
    );
  }

  if (!trial) {
    throw new Error(
      `Trial ${data.trialId} not found when processing poolAccumulatedAmountUpdated`
    );
  }

  // Create PoolAccumulatedAmountUpdated abstraction
  const existing = await db.poolAccumulatedAmountUpdated.findUnique({
    where: { id },
  });

  if (!existing) {
    await db.poolAccumulatedAmountUpdated.create({
      data: {
        id,
        poolAddress: data.poolAddress,
        trialId: data.trialId,
      },
    });
    logger.info(
      { poolAddress: data.poolAddress, trialId: data.trialId },
      'Created pool accumulated amount updated'
    );
  }
}

/**
 * Pool Accumulated Amount Released - Tracks pool payouts
 */
async function interpretPoolAccumulatedAmountReleased(
  data: PoolAccumulatedAmountReleasedEventData
): Promise<void> {
  const db = getPrismaClient();
  const idBigInt = calculateOrderIndex(
    data.slot,
    data.instructionIndex,
    data.innerInstructionIndex
  );
  const id = toDecimalString(idBigInt);

  // Ensure pool, trial, and user exist
  const [pool, trial, user] = await Promise.all([
    db.pool.findUnique({ where: { address: data.poolAddress } }),
    db.trial.findUnique({ where: { id: data.trialId } }),
    db.user.findUnique({ where: { walletAddress: data.receiver } }),
  ]);

  if (!pool) {
    throw new Error(
      `Pool ${data.poolAddress} not found when processing poolAccumulatedAmountReleased`
    );
  }

  if (!trial) {
    throw new Error(
      `Trial ${data.trialId} not found when processing poolAccumulatedAmountReleased`
    );
  }

  if (!user) {
    await db.user.create({
      data: {
        walletAddress: data.receiver,
      },
    });
  }

  // Create PoolAccumulatedAmountReleased abstraction
  const existing = await db.poolAccumulatedAmountReleased.findUnique({
    where: { id },
  });

  if (!existing) {
    await db.poolAccumulatedAmountReleased.create({
      data: {
        id,
        poolAddress: data.poolAddress,
        trialId: data.trialId,
        receiver: data.receiver,
      },
    });
    logger.info(
      { poolAddress: data.poolAddress, trialId: data.trialId },
      'Created pool accumulated amount released'
    );
  }
}

/**
 * QK With Config Registered - Stores probability configuration
 */
async function interpretQkWithConfigRegistered(
  data: QkWithConfigRegisteredEventData
): Promise<void> {
  const db = getPrismaClient();
  const idBigInt = calculateOrderIndex(
    data.slot,
    data.instructionIndex,
    data.innerInstructionIndex
  );
  const id = toDecimalString(idBigInt);

  // Create QkWithConfigRegistered abstraction
  const existing = await db.qkWithConfigRegistered.findUnique({
    where: { qkWithConfigHash: data.qkWithConfigHash },
  });

  if (!existing) {
    await db.qkWithConfigRegistered.create({
      data: {
        id,
        qkWithConfigHash: data.qkWithConfigHash,
      },
    });
    logger.info(
      { qkWithConfigHash: data.qkWithConfigHash },
      'Created QK with config registered'
    );
  }
}

/**
 * Fee Charged - Creates fee record
 */
async function interpretFeeCharged(data: FeeChargedEventData): Promise<void> {
  const db = getPrismaClient();
  const idBigInt = calculateOrderIndex(
    data.slot,
    data.instructionIndex,
    data.innerInstructionIndex
  );
  const id = toDecimalString(idBigInt);

  // Ensure pool and trial exist
  const [pool, trial] = await Promise.all([
    db.pool.findUnique({
      where: { address: data.poolAddress },
      include: {
        poolRegistered: {
          include: {
            poolRegisteredEvent: {
              select: {
                feeHostPercent: true,
                feePoolPercent: true,
              },
            },
          },
        },
      },
    }),
    db.trial.findUnique({ where: { id: data.trialId } }),
  ]);

  if (!pool) {
    throw new Error(`Pool ${data.poolAddress} not found when processing feeCharged`);
  }

  if (!trial) {
    throw new Error(
      `Trial ${data.trialId} not found when processing feeCharged`
    );
  }

  // Create FeeCharged abstraction
  const feeCharged = await db.feeCharged.findUnique({ where: { id } });

  if (!feeCharged) {
    await db.feeCharged.create({
      data: { id },
    });
  }

  // Create Fee with calculated amounts
  const fee = await db.fee.findUnique({ where: { id } });

  if (!fee) {
    const hostPercent = pool.poolRegistered.poolRegisteredEvent.feeHostPercent;
    const poolPercent = pool.poolRegistered.poolRegisteredEvent.feePoolPercent;
    
    // Convert Decimals to BigInt for calculation
    const feeAmountBigInt = decimalToBigInt(data.feeAmount);
    const hostPercentBigInt = decimalToBigInt(hostPercent);
    const poolPercentBigInt = decimalToBigInt(poolPercent);
    
    // Calculate amounts (feeAmount * percent / 1e18 for percent denominator)
    const hostAmountBigInt = (feeAmountBigInt * hostPercentBigInt) / BigInt(1e18);
    const poolAmountBigInt = (feeAmountBigInt * poolPercentBigInt) / BigInt(1e18);
    
    // Convert back to strings for Prisma
    const hostAmount = toDecimalString(hostAmountBigInt);
    const poolAmount = toDecimalString(poolAmountBigInt);

    await db.fee.create({
      data: {
        id,
        poolAddress: data.poolAddress,
        trialId: data.trialId,
        hostPercent,
        poolPercent,
        hostAmount,
        poolAmount,
      },
    });
    logger.info({ trialId: data.trialId }, 'Created fee record');
  }
}

/**
 * Trial Registered - Creates trial record
 */
async function interpretTrialRegistered(
  data: TrialRegisteredEventData
): Promise<void> {
  const db = getPrismaClient();
  const idBigInt = calculateOrderIndex(
    data.slot,
    data.instructionIndex,
    data.innerInstructionIndex
  );
  const id = toDecimalString(idBigInt);

  logger.info({ trialId: data.trialId, who: data.who }, 'Interpreting trial registered');

  // Query all dependencies in parallel
  const [trialRegistered, pool, user, qkWithConfigRegistered, gameConfig, trial] =
    await Promise.all([
      db.trialRegistered.findUnique({ where: { trialId: data.trialId } }),
      db.pool.findUnique({ where: { address: data.poolAddress } }),
      db.user.findUnique({ where: { walletAddress: data.who } }),
      db.qkWithConfigRegistered.findUnique({
        where: { qkWithConfigHash: data.qkWithConfigHash },
      }),
      db.gameConfig.findUnique({
        where: { gameConfigHash: data.extraDataHash },
      }),
      db.trial.findUnique({ where: { id: data.trialId } }),
    ]);

  // Create TrialRegistered abstraction if it doesn't exist
  if (!trialRegistered) {
    await db.trialRegistered.create({
      data: {
        id,
        trialId: data.trialId,
      },
    });
  }

  // Throw error if pool doesn't exist - will retry
  if (!pool) {
    throw new Error('trying to process trialRegistered event before pool creation');
  }

  // Create user if doesn't exist
  if (!user) {
    await db.user.create({
      data: {
        walletAddress: data.who,
      },
    });
    logger.info({ walletAddress: data.who }, 'Created user for trial');
  }

  // Throw error if qkWithConfigRegistered doesn't exist - will retry
  if (!qkWithConfigRegistered) {
    throw new Error('trying to process trialRegistered event before qkWithConfig creation');
  }

  // Throw error if gameConfig doesn't exist - will retry
  if (!gameConfig) {
    throw new Error(
      'trying to process trialRegistered event but `extraDataHash` does not correspond to any existing `gameConfig`'
    );
  }

  // Create Trial and GameInstance if they don't exist
  if (!trial) {
    await db.trial.create({
      data: {
        id: data.trialId,
        poolAddress: data.poolAddress,
        who: data.who,
        qkWithConfigHash: data.qkWithConfigHash,
        extraDataHash: data.extraDataHash,
      },
    });
    logger.info({ trialId: data.trialId }, 'Created trial');

    // Create GameInstance
    await db.gameInstance.create({
      data: {
        id: data.trialId,
        gameConfigHash: data.extraDataHash,
      },
    });
    logger.info({ trialId: data.trialId }, 'Created game instance');
    
    // Queue game job to process game instance creation
    // (This is mostly for consistency with Arbitrum backend; we already created it above)
    await gameQueue.add(
      'createGameInstance',
      {
        trialId: data.trialId,
        who: data.who,
        extraDataHash: data.extraDataHash,
        event: { slot: data.slot, instructionIndex: data.instructionIndex, innerInstructionIndex: data.innerInstructionIndex },
      },
      {
        jobId: `createGameInstance-${data.trialId}`,
      }
    );
    
    // TODO: Add other game jobs like Arbitrum backend:
    // - delayedUsdcUpdateForMultiplier (requires Uniswap-like price feed)
  }
}

/**
 * Trial Resolved - Updates trial with result
 */
async function interpretTrialResolved(
  data: TrialResolvedEventData
): Promise<void> {
  const db = getPrismaClient();
  const idBigInt = calculateOrderIndex(
    data.slot,
    data.instructionIndex,
    data.innerInstructionIndex
  );
  const id = toDecimalString(idBigInt);

  logger.info({ trialId: data.trialId }, 'Interpreting trial resolved');

  // Ensure trial exists
  const trial = await db.trial.findUnique({
    where: { id: data.trialId },
  });

  if (!trial) {
    throw new Error(
      `Trial ${data.trialId} not found when processing trialResolved`
    );
  }

  // Create TrialResolved abstraction
  const trialResolved = await db.trialResolved.findUnique({ where: { id } });

  if (!trialResolved) {
    await db.trialResolved.create({
      data: {
        id,
        trialId: data.trialId,
      },
    });
    logger.info({ trialId: data.trialId }, 'Created trial resolved');
    
    // Queue game job to process game resolution
    // This will calculate deltaAmount and update game instance with result
    await gameQueue.add(
      'resolveGameInstance',
      {
        trialId: data.trialId,
        who: trial.who,
        resultIndex: data.resultIndex,
        randomness: toDecimalString(data.randomness),
        event: { slot: data.slot, instructionIndex: data.instructionIndex, innerInstructionIndex: data.innerInstructionIndex },
      },
      {
        jobId: `resolveGameInstance-${data.trialId}`,
      }
    );
    logger.info({ trialId: data.trialId }, 'Queued game resolution job');
  }
}

