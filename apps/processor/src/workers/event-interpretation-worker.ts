import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { getPrismaClient } from '@fareplay/db';
import { config, createLogger } from '@fareplay/utils';
import { FareVaultParser, getConnection, getTrialAccountData } from '@fareplay/solana';
import { statsUpdateQueue } from '../queues/index.js';

const logger = createLogger('processor:interpretation-worker');

// Initialize Fare Vault parser
const fareVaultParser = new FareVaultParser(config.programId);

// Redis connection for worker
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export interface EventInterpretationJob {
  signature: string;
  slot: number;
  blockTime: number | null;
  transaction: any;
}

// Worker to interpret and store blockchain events
export const eventInterpretationWorker = new Worker<EventInterpretationJob>(
  'event-interpretation',
  async (job: Job<EventInterpretationJob>) => {
    const { signature, slot, blockTime, transaction } = job.data;

    logger.info({ signature }, 'Interpreting event');

    try {
      const db = getPrismaClient();

      // Parse transaction (customize based on your program structure)
      const betData = await parseTransaction(signature, slot, blockTime, transaction);

      if (!betData) {
        logger.warn({ signature }, 'Could not parse transaction');
        return { processed: false, reason: 'parse_failed' };
      }

      // Determine which casino this bet belongs to
      // Match by poolId from the transaction metadata
      const poolId = betData.metadata.poolId;
      
      let casino = null;
      if (poolId) {
        casino = await db.casino.findFirst({
          where: { poolId },
        });
      }

      // If no casino found by poolId, try to find by programId
      if (!casino) {
        casino = await db.casino.findFirst({
          where: { 
            programId: betData.metadata.programId || process.env.PROGRAM_ID,
            status: 'ACTIVE',
          },
        });
      }

      if (!casino) {
        logger.warn({ poolId, signature: betData.signature }, 'No casino found for bet, skipping');
        return { processed: false, reason: 'no_casino' };
      }

      // Get or create player (scoped to casino)
      let player = await db.player.findUnique({
        where: { 
          casinoId_walletAddress: {
            casinoId: casino.id,
            walletAddress: betData.playerAddress,
          },
        },
      });

      if (!player) {
        player = await db.player.create({
          data: {
            casinoId: casino.id,
            walletAddress: betData.playerAddress,
            lastSeenAt: betData.blockTime,
          },
        });
        logger.info({ 
          casinoId: casino.id,
          walletAddress: betData.playerAddress 
        }, 'New player created');
      }
      // Create bet (scoped to casino)
      await db.bet.create({
        data: {
          casinoId: casino.id,
          signature: betData.signature,
          playerId: player.id,
          blockTime: betData.blockTime,
          slot: betData.slot,
          gameType: betData.gameType,
          amount: betData.amount,
          payout: betData.payout,
          multiplier: betData.multiplier,
          status: betData.status,
          won: betData.won,
          metadata: betData.metadata,
        },
      });

      // Update player stats
      await db.player.update({
        where: { id: player.id },
        data: {
          totalBets: { increment: 1 },
          totalWins: betData.won ? { increment: 1 } : undefined,
          totalLosses: !betData.won ? { increment: 1 } : undefined,
          totalWagered: { increment: betData.amount },
          totalPayout: { increment: betData.payout },
          lastSeenAt: betData.blockTime,
        },
      });

      // Publish event to Redis for WebSocket
      await publishBetEvent(betData);

      // Queue stats update (debounced, per casino)
      await statsUpdateQueue.add(
        'update-stats',
        { casinoId: casino.id },
        {
          jobId: `update-stats-${casino.id}`,
          delay: 5000, // Wait 5 seconds before updating
        }
      );

      logger.info({ 
        signature, 
        won: betData.won,
        casinoId: casino.id,
        casinoSlug: casino.slug,
      }, 'Event interpreted and stored');

      return { processed: true, signature, won: betData.won, casino: casino.slug };
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        signature,
      }, 'Error interpreting event');
      throw error;
    }
  },
  {
    connection,
    concurrency: 3,
  }
);

// Parse transaction using Fare Vault parser
async function parseTransaction(
  signature: string,
  slot: number,
  blockTime: number | null,
  transaction: any
): Promise<any | null> {
  try {
    // Parse using Fare Vault parser
    const parsed = fareVaultParser.parseTransaction(transaction);

    if (!parsed) {
      logger.debug({ signature }, 'Not a Fare Vault transaction or unsupported instruction');
      return null;
    }

    // Only process trial_register and trial_resolve
    if (!['trial_register', 'trial_resolve'].includes(parsed.type)) {
      logger.debug({ signature, type: parsed.type }, 'Skipping non-trial transaction');
      return null;
    }

    let trialAmount = parsed.amount;
    let trialGameType = parsed.gameType;
    let trialMultiplier = parsed.multiplier || 0;
    let playerAddress = parsed.player;

    // For trial_resolve, fetch the trial account to get original bet details
    if (parsed.type === 'trial_resolve' && parsed.metadata.trialAccount) {
      const trialData = await getTrialAccountData(
        getConnection(),
        parsed.metadata.trialAccount
      );

      if (trialData) {
        playerAddress = trialData.user;
        // Multiplier from trial account (stored as u64, represents decimal)
        trialMultiplier = Number(trialData.mult) / 10000; // Assuming 4 decimal places
        trialGameType = extractGameTypeFromHash(trialData.extraDataHash);
        // Amount needs to be calculated from mult and payout
        if (parsed.payout && trialMultiplier > 0) {
          trialAmount = BigInt(Math.floor(Number(parsed.payout) / trialMultiplier));
        }
      }
    }

    // Determine bet status
    const isSettled = parsed.type === 'trial_resolve';
    const status = isSettled ? 'SETTLED' : 'PENDING';

    return {
      signature,
      slot: BigInt(slot),
      blockTime: blockTime ? new Date(blockTime * 1000) : new Date(),
      playerAddress,
      gameType: trialGameType,
      amount: trialAmount,
      payout: parsed.payout || BigInt(0),
      multiplier: trialMultiplier,
      won: parsed.won || false,
      status,
      metadata: {
        type: parsed.type,
        ...parsed.metadata,
      },
    };
  } catch (error) {
    logger.error({ error, signature }, 'Error parsing transaction');
    return null;
  }
}

// Extract game type from extra_data_hash
function extractGameTypeFromHash(hash: string): string {
  // TODO: Implement actual parsing based on your hash format
  // The hash contains encoded game data - decode it based on your format
  return 'casino_game';
}

// Publish bet event to Redis
async function publishBetEvent(betData: any): Promise<void> {
  const redis = new Redis(config.redisUrl);
  try {
    const event = {
      type: 'bet.settled',
      data: {
        signature: betData.signature,
        player: `${betData.playerAddress.slice(0, 4)}...${betData.playerAddress.slice(-4)}`,
        gameType: betData.gameType,
        amount: betData.amount.toString(),
        payout: betData.payout.toString(),
        won: betData.won,
      },
      timestamp: Date.now(),
    };

    await redis.publish('casino:events', JSON.stringify(event));
  } finally {
    await redis.quit();
  }
}

eventInterpretationWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Job completed');
});

eventInterpretationWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Job failed');
});

logger.info('Event interpretation worker started');

