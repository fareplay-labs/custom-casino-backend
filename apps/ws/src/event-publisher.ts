import { Redis } from 'ioredis';
import { config, createLogger } from '@fareplay/utils';
import { CasinoEvent } from './broadcaster.js';

const logger = createLogger('ws:publisher');

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl);
  }
  return redisClient;
}

/**
 * Publishes an event to Redis for broadcasting
 * This can be called from any service (API, Processor) to broadcast events
 */
export async function publishEvent(event: CasinoEvent): Promise<void> {
  try {
    const redis = getRedisClient();
    const message = JSON.stringify(event);
    
    await redis.publish('casino:events', message);
    
    logger.debug({ type: event.type }, 'Event published to Redis');
  } catch (error) {
    logger.error({ error, event }, 'Error publishing event');
  }
}

/**
 * Helper functions for common events
 */

export async function publishBetPlaced(bet: any): Promise<void> {
  await publishEvent({
    type: 'bet.placed',
    data: {
      signature: bet.signature,
      player: bet.player,
      gameType: bet.gameType,
      amount: bet.amount.toString(),
    },
    timestamp: Date.now(),
  });
}

export async function publishBetSettled(bet: any): Promise<void> {
  await publishEvent({
    type: 'bet.settled',
    data: {
      signature: bet.signature,
      player: bet.player,
      gameType: bet.gameType,
      amount: bet.amount.toString(),
      payout: bet.payout.toString(),
      won: bet.won,
    },
    timestamp: Date.now(),
  });
}

export async function publishJackpotWon(data: any): Promise<void> {
  await publishEvent({
    type: 'jackpot.won',
    data,
    timestamp: Date.now(),
  });
}

export async function publishPlayerJoined(player: any): Promise<void> {
  await publishEvent({
    type: 'player.joined',
    data: {
      player: player.username || 
        `${player.walletAddress.slice(0, 4)}...${player.walletAddress.slice(-4)}`,
    },
    timestamp: Date.now(),
  });
}

export async function publishStatsUpdated(stats: any): Promise<void> {
  await publishEvent({
    type: 'stats.updated',
    data: stats,
    timestamp: Date.now(),
  });
}

