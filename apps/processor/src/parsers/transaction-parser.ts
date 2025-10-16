import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { FareVaultParser } from '@fareplay/solana';
import { config, createLogger } from '@fareplay/utils';
import {
  ParsedEvent,
  EventName,
  PoolRegisteredEventData,
  PoolManagerUpdatedEventData,
  PoolAccumulatedAmountUpdatedEventData,
  PoolAccumulatedAmountReleasedEventData,
  QkWithConfigRegisteredEventData,
  FeeChargedEventData,
  TrialRegisteredEventData,
  TrialResolvedEventData,
} from '../types/events.js';

const logger = createLogger('processor:transaction-parser');

// Initialize Fare Vault parser
const fareVaultParser = new FareVaultParser(config.fareVaultProgramId);

/**
 * Parses a Solana transaction and extracts blockchain events
 * Returns an array of parsed events (a transaction can contain multiple events)
 */
export function parseTransaction(
  signature: string,
  slot: number,
  blockTime: number | null,
  transaction: ParsedTransactionWithMeta
): ParsedEvent[] {
  const events: ParsedEvent[] = [];

  try {
    // Parse using Fare Vault parser
    const parsed = fareVaultParser.parseTransaction(transaction);

    if (!parsed) {
      logger.debug({ signature }, 'Not a Fare Vault transaction or unsupported instruction');
      return [];
    }

    const baseEventData = {
      signature,
      slot,
      instructionIndex: 0, // TODO: Extract from metadata
      innerInstructionIndex: 0,
      blockTime: blockTime ? new Date(blockTime * 1000) : new Date(),
    };

    // Map parsed instruction to event(s)
    switch (parsed.type) {
      case 'pool_register': {
        // Extract data from metadata
        const poolAccount = parsed.metadata.poolAccount || '';
        const managerAddress = parsed.metadata.managerAddress || '';

        // Skip if critical data is missing
        if (!poolAccount || !managerAddress) {
          logger.warn(
            { signature, poolAccount, managerAddress },
            'Missing critical pool data, skipping'
          );
          break;
        }

        // Pool registration emits: PoolRegistered
        // Extract values from parsed event data in metadata
        const metadata = parsed.metadata as any;
        
        // Convert f64 values to BigInt (multiply by 1e18 for precision)
        const toFixed = (value: number) => BigInt(Math.floor(value * 1e18));
        
        const poolEvent: ParsedEvent = {
          eventName: EventName.PoolRegistered,
          eventData: {
            ...baseEventData,
            poolAddress: poolAccount,
            managerAddress,
            feePlayMultiplier: toFixed(metadata.feePlayMultiplier || 0),
            feeLossMultiplier: toFixed(metadata.feeLossMultiplier || 0),
            feeMintMultiplier: toFixed(metadata.feeMintMultiplier || 0),
            feeHostPercent: toFixed(metadata.feeHostPercent || 0),
            feePoolPercent: toFixed(metadata.feePoolPercent || 0),
            minLimitForTicket: toFixed(metadata.minLimitForTicket || 0),
            probability: toFixed(metadata.probability || 0),
          } as PoolRegisteredEventData,
        };
        events.push(poolEvent);
        logger.info({ poolAccount, managerAddress }, 'Pool registration event created');
        break;
      }

      case 'trial_register': {
        // Extract data from metadata (includes Q/K arrays from parsed event)
        const trialAccount = parsed.metadata.trialAccount || '';
        const poolAddress = parsed.metadata.poolId || '';
        const q = parsed.metadata.q || [];
        const k = parsed.metadata.k || [];
        const qkWithConfigHash = parsed.metadata.qkWithConfigHash || '';
        const extraDataHash = parsed.metadata.extraDataHash || '';
        const multiplier = parsed.metadata.multiplier || 0;

        // Skip if critical data is missing
        if (!trialAccount || !poolAddress || !qkWithConfigHash || !extraDataHash) {
          logger.warn(
            { signature, trialAccount, poolAddress, qkWithConfigHash, extraDataHash },
            'Missing critical trial data, skipping'
          );
          break;
        }

        // Create synthetic QkWithConfigRegistered event first (innerInstructionIndex: 0)
        // This doesn't exist on-chain but we need it for our database schema
        const qkEvent: ParsedEvent = {
          eventName: EventName.QkWithConfigRegistered,
          eventData: {
            ...baseEventData,
            innerInstructionIndex: 0, // First synthetic event
            qkWithConfigHash,
            q,
            k,
            feeLossMultiplier: BigInt(0), // TODO: Extract from gameConfig
            feeMintMultiplier: BigInt(0), // TODO: Extract from gameConfig
            effectiveEv: BigInt(0), // TODO: Calculate
          } as QkWithConfigRegisteredEventData,
        };
        events.push(qkEvent);

        // Then create TrialRegistered event (innerInstructionIndex: 1)
        const trialEvent: ParsedEvent = {
          eventName: EventName.TrialRegistered,
          eventData: {
            ...baseEventData,
            innerInstructionIndex: 1, // Second synthetic event
            trialId: trialAccount,
            who: parsed.player,
            poolAddress,
            multiplier: BigInt(multiplier),
            qkWithConfigHash,
            vrfCostInFare: BigInt(0), // TODO: Extract if available
            extraDataHash,
          } as TrialRegisteredEventData,
        };
        events.push(trialEvent);

        // Add FeeCharged event for play fee (innerInstructionIndex: 2)
        if (parsed.amount && parsed.amount > BigInt(0)) {
          const feeEvent: ParsedEvent = {
            eventName: EventName.FeeCharged,
            eventData: {
              ...baseEventData,
              innerInstructionIndex: 2, // Third synthetic event
              feeType: 'FeePlay',
              poolAddress,
              trialId: trialAccount,
              feeAmount: parsed.amount,
            } as FeeChargedEventData,
          };
          events.push(feeEvent);
        }
        
        logger.info({ trialAccount, qkWithConfigHash, qLength: q.length, kLength: k.length }, 'Trial registration events created (including synthetic QK event)');
        break;
      }

      case 'trial_resolve': {
        // Extract data from metadata
        const trialAccount = parsed.metadata.trialAccount || '';
        const poolAddress = parsed.metadata.poolId || ''; // poolId is actually the pool address
        const randomnessArray = parsed.metadata.randomness || [];
        const randomnessBigInt = randomnessArray.length > 0 
          ? BigInt('0x' + Buffer.from(randomnessArray.slice(0, 8)).toString('hex'))
          : BigInt(0);

        // Skip if critical data is missing
        if (!trialAccount || !poolAddress) {
          logger.warn(
            { signature, trialAccount, poolAddress },
            'Missing critical trial resolve data, skipping'
          );
          break;
        }

        // Trial resolution emits: TrialResolved
        const resolveEvent: ParsedEvent = {
          eventName: EventName.TrialResolved,
          eventData: {
            ...baseEventData,
            trialId: trialAccount,
            resultIndex: 0, // TODO: Calculate from randomness
            randomness: randomnessBigInt,
          } as TrialResolvedEventData,
        };
        events.push(resolveEvent);

        // If player won, emit PoolAccumulatedAmountReleased
        if (parsed.won && parsed.payout && parsed.payout > BigInt(0)) {
          const releaseEvent: ParsedEvent = {
            eventName: EventName.PoolAccumulatedAmountReleased,
            eventData: {
              ...baseEventData,
              poolAddress,
              trialId: trialAccount,
              receiver: parsed.player,
              releasedAmount: parsed.payout,
            } as PoolAccumulatedAmountReleasedEventData,
          };
          events.push(releaseEvent);

          // Mint fee on win (if applicable)
          // TODO: Calculate fee amount from payout
        } else {
          // If player lost, emit PoolAccumulatedAmountUpdated
          if (parsed.amount && parsed.amount > BigInt(0)) {
            const updateEvent: ParsedEvent = {
              eventName: EventName.PoolAccumulatedAmountUpdated,
              eventData: {
                ...baseEventData,
                poolAddress,
                trialId: trialAccount,
                newAccumulatedAmount: parsed.amount,
              } as PoolAccumulatedAmountUpdatedEventData,
            };
            events.push(updateEvent);
          }

          // Loss fee on loss
          // TODO: Calculate fee amount from amount lost
        }
        break;
      }

      default:
        logger.debug(
          { signature, type: parsed.type },
          'Unsupported instruction type for event parsing'
        );
    }

    logger.info(
      { signature, eventCount: events.length },
      'Parsed transaction events'
    );

    return events;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        signature,
      },
      'Error parsing transaction'
    );
    return [];
  }
}

