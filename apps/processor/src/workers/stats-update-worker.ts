import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { getPrismaClient } from '@fareplay/db';
import { config, createLogger } from '@fareplay/utils';

const logger = createLogger('processor:stats-worker');

// Redis connection for worker
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export interface StatsUpdateJob {
  casinoId: string;
}

// Worker to update casino statistics
export const statsUpdateWorker = new Worker<StatsUpdateJob>(
  'stats-update',
  async (job: Job<StatsUpdateJob>) => {
    const { casinoId } = job.data;
    
    logger.info({ casinoId }, 'Updating casino statistics');

    try {
      const db = getPrismaClient();

      // Aggregate bet statistics for this casino
      const betStats = await db.bet.aggregate({
        where: { casinoId },
        _count: { id: true },
        _sum: {
          amount: true,
          payout: true,
        },
      });

      const playerCount = await db.player.count({
        where: { casinoId },
      });

      // Get or create stats record for this casino
      let stats = await db.casinoStats.findFirst({
        where: { casinoId },
        orderBy: { updatedAt: 'desc' },
      });

      const statsData = {
        totalBets: BigInt(betStats._count?.id || 0),
        totalWagered: betStats._sum?.amount || BigInt(0),
        totalPayout: betStats._sum?.payout || BigInt(0),
        totalPlayers: playerCount,
      };

      if (!stats) {
        stats = await db.casinoStats.create({
          data: {
            casinoId,
            ...statsData,
          },
        });
      } else {
        stats = await db.casinoStats.update({
          where: { id: stats.id },
          data: statsData,
        });
      }

      // Publish stats update event
      await publishStatsEvent(stats);

      logger.info({
        totalBets: stats.totalBets.toString(),
        totalPlayers: stats.totalPlayers,
      }, 'Stats updated');

      return { updated: true, stats: statsData };
    } catch (error) {
      logger.error({ error }, 'Error updating stats');
      throw error;
    }
  },
  {
    connection,
    concurrency: 1, // Only one stats update at a time
  }
);

// Publish stats event
async function publishStatsEvent(stats: any): Promise<void> {
  const redis = new Redis(config.redisUrl);
  try {
    const event = {
      type: 'stats.updated',
      data: {
        totalBets: stats.totalBets.toString(),
        totalWagered: stats.totalWagered.toString(),
        totalPayout: stats.totalPayout.toString(),
        totalPlayers: stats.totalPlayers,
      },
      timestamp: Date.now(),
    };

    await redis.publish('casino:events', JSON.stringify(event));
  } finally {
    await redis.quit();
  }
}

statsUpdateWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Stats update completed');
});

statsUpdateWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Stats update failed');
});

logger.info('Stats update worker started');

