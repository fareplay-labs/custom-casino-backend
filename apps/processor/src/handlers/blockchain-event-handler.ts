import { Job } from 'bullmq';
import { getPrismaClient } from '@fareplay/db';
import { createLogger } from '@fareplay/utils';
import {
  BlockchainEventJob,
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
import { eventInterpretationQueue } from '../queues/index.js';

const logger = createLogger('processor:blockchain-handler');

/**
 * Helper to convert values to string for Prisma Decimal fields
 * Prisma Decimal fields accept strings, not bigints
 */
function toDecimalString(value: any): string {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  // Handle BullMQ's special BigInt object format
  if (value && typeof value === 'object' && value.$type === 'BigInt' && value.value) {
    return value.value; // Already a string
  }
  return '0';
}

/**
 * Helper to convert arrays to string arrays for Prisma Decimal arrays
 */
function toDecimalStringArray(arr: any[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(v => toDecimalString(v));
}

/**
 * Handles blockchain events by:
 * 1. Creating the event record in the database
 * 2. Queuing the event for interpretation (which creates abstraction records)
 */
export async function handleBlockchainEvent(
  job: Job<BlockchainEventJob>
): Promise<void> {
  const { eventName, eventData } = job.data;
  const db = getPrismaClient();

  logger.info(
    {
      eventName,
      signature: eventData.signature,
      slot: eventData.slot,
    },
    'Processing blockchain event'
  );

  try {
    // Convert slot from BullMQ format - it might be a number or special BigInt object
    const slotValue = (eventData as any).slot;
    const slot = typeof slotValue === 'number' ? slotValue : Number(toDecimalString(slotValue));
    
    // Calculate order index for primary key  
    const orderIndexRaw = calculateOrderIndex(
      slot,
      eventData.instructionIndex,
      eventData.innerInstructionIndex
    );
    
    // Convert to strings for Prisma Decimal fields
    const orderIndex = toDecimalString(orderIndexRaw);
    const slotDecimal = toDecimalString(slot);

    // Create event record based on type
    switch (eventName) {
      case EventName.PoolRegistered: {
        const data = eventData as PoolRegisteredEventData;
        await db.poolRegisteredEvent.create({
          data: {
            orderIndex,
            slot: slotDecimal,
            instructionIndex: data.instructionIndex,
            innerInstructionIndex: data.innerInstructionIndex,
            signature: data.signature,
            blockTime: new Date(data.blockTime),
            poolAddress: data.poolAddress,
            managerAddress: data.managerAddress,
            feePlayMultiplier: toDecimalString(data.feePlayMultiplier),
            feeLossMultiplier: toDecimalString(data.feeLossMultiplier),
            feeMintMultiplier: toDecimalString(data.feeMintMultiplier),
            feeHostPercent: toDecimalString(data.feeHostPercent),
            feePoolPercent: toDecimalString(data.feePoolPercent),
            minLimitForTicket: toDecimalString(data.minLimitForTicket),
            probability: toDecimalString(data.probability),
          },
        });
        break;
      }

      case EventName.PoolManagerUpdated: {
        const data = eventData as PoolManagerUpdatedEventData;
        await db.poolManagerUpdatedEvent.create({
          data: {
            orderIndex,
            slot: slotDecimal,
            instructionIndex: data.instructionIndex,
            innerInstructionIndex: data.innerInstructionIndex,
            signature: data.signature,
            blockTime: new Date(data.blockTime),
            poolAddress: data.poolAddress,
            newPoolManagerAddress: data.newPoolManagerAddress,
          },
        });
        break;
      }

      case EventName.PoolAccumulatedAmountUpdated: {
        const data = eventData as PoolAccumulatedAmountUpdatedEventData;
        await db.poolAccumulatedAmountUpdatedEvent.create({
          data: {
            orderIndex,
            slot: slotDecimal,
            instructionIndex: data.instructionIndex,
            innerInstructionIndex: data.innerInstructionIndex,
            signature: data.signature,
            blockTime: new Date(data.blockTime),
            poolAddress: data.poolAddress,
            trialId: data.trialId,
            newAccumulatedAmount: toDecimalString(data.newAccumulatedAmount),
          },
        });
        break;
      }

      case EventName.PoolAccumulatedAmountReleased: {
        const data = eventData as PoolAccumulatedAmountReleasedEventData;
        await db.poolAccumulatedAmountReleasedEvent.create({
          data: {
            orderIndex,
            slot: slotDecimal,
            instructionIndex: data.instructionIndex,
            innerInstructionIndex: data.innerInstructionIndex,
            signature: data.signature,
            blockTime: new Date(data.blockTime),
            poolAddress: data.poolAddress,
            trialId: data.trialId,
            receiver: data.receiver,
            releasedAmount: toDecimalString(data.releasedAmount),
          },
        });
        break;
      }

      case EventName.QkWithConfigRegistered: {
        const data = eventData as QkWithConfigRegisteredEventData;
        await db.qkWithConfigRegisteredEvent.create({
          data: {
            orderIndex,
            slot: slotDecimal,
            instructionIndex: data.instructionIndex,
            innerInstructionIndex: data.innerInstructionIndex,
            signature: data.signature,
            blockTime: new Date(data.blockTime),
            qkWithConfigHash: data.qkWithConfigHash,
            q: toDecimalStringArray(data.q),
            k: toDecimalStringArray(data.k),
            feeLossMultiplier: toDecimalString(data.feeLossMultiplier),
            feeMintMultiplier: toDecimalString(data.feeMintMultiplier),
            effectiveEv: toDecimalString(data.effectiveEv),
          },
        });
        break;
      }

      case EventName.FeeCharged: {
        const data = eventData as FeeChargedEventData;
        await db.feeChargedEvent.create({
          data: {
            orderIndex,
            slot: slotDecimal,
            instructionIndex: data.instructionIndex,
            innerInstructionIndex: data.innerInstructionIndex,
            signature: data.signature,
            blockTime: new Date(data.blockTime),
            feeType: data.feeType,
            poolAddress: data.poolAddress,
            trialId: data.trialId,
            feeAmount: toDecimalString(data.feeAmount),
          },
        });
        break;
      }

      case EventName.TrialRegistered: {
        const data = eventData as TrialRegisteredEventData;
        await db.trialRegisteredEvent.create({
          data: {
            orderIndex,
            slot: slotDecimal,
            instructionIndex: data.instructionIndex,
            innerInstructionIndex: data.innerInstructionIndex,
            signature: data.signature,
            blockTime: new Date(data.blockTime),
            trialId: data.trialId,
            who: data.who,
            poolAddress: data.poolAddress,
            multiplier: toDecimalString(data.multiplier),
            qkWithConfigHash: data.qkWithConfigHash,
            vrfCostInFare: toDecimalString(data.vrfCostInFare),
            extraDataHash: data.extraDataHash,
          },
        });
        break;
      }

      case EventName.TrialResolved: {
        const data = eventData as TrialResolvedEventData;
        await db.trialResolvedEvent.create({
          data: {
            orderIndex,
            slot: slotDecimal,
            instructionIndex: data.instructionIndex,
            innerInstructionIndex: data.innerInstructionIndex,
            signature: data.signature,
            blockTime: new Date(data.blockTime),
            trialId: data.trialId,
            resultIndex: data.resultIndex,
            randomness: toDecimalString(data.randomness),
          },
        });
        break;
      }

      default:
        logger.warn({ eventName }, 'Unknown event type');
        return;
    }

    logger.info({ eventName, orderIndex: orderIndex.toString() }, 'Event record created');

    // Queue for interpretation (creates abstraction records like Pool, Trial, etc.)
    await eventInterpretationQueue.add(
      'interpret-event',
      {
        eventName,
        eventData,
      },
      {
        jobId: `interpret-${orderIndex.toString()}`,
        priority: 1,
      }
    );

    logger.info({ eventName, orderIndex: orderIndex.toString() }, 'Event queued for interpretation');
  } catch (error) {
    // Check if it's a unique constraint violation (duplicate)
    if (
      error instanceof Error &&
      (error.message.includes('Unique constraint') ||
        error.message.includes('already exists'))
    ) {
      logger.debug(
        { eventName, signature: eventData.signature },
        'Event already processed, skipping'
      );
      return;
    }

    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        eventName,
        signature: eventData.signature,
      },
      'Error processing blockchain event'
    );
    throw error;
  }
}

