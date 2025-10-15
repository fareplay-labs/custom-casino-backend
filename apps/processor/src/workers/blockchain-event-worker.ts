import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { getPrismaClient } from '@fareplay/db';
import { config, createLogger } from '@fareplay/utils';
import { eventInterpretationQueue } from '../queues/index.js';

const logger = createLogger('processor:blockchain-worker');

// Redis connection for worker
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export interface BlockchainEventJob {
  signature: string;
  slot: number;
  blockTime: number | null;
  transaction: any;
}

// Worker to process blockchain events
export const blockchainEventWorker = new Worker<BlockchainEventJob>(
  'blockchain-event',
  async (job: Job<BlockchainEventJob>) => {
    const { signature, slot, blockTime, transaction } = job.data;

    logger.info({ signature, slot }, 'Processing blockchain event');

    try {
      // Check if already processed
      const db = getPrismaClient();
      const existing = await db.bet.findUnique({
        where: { signature },
      });

      if (existing) {
        logger.debug({ signature }, 'Event already processed, skipping');
        return { processed: false, reason: 'duplicate' };
      }

      // Queue for interpretation
      await eventInterpretationQueue.add(
        'interpret-event',
        {
          signature,
          slot,
          blockTime,
          transaction,
        },
        {
          priority: 1,
          jobId: `interpret-${signature}`,
        }
      );

      logger.info({ signature }, 'Event queued for interpretation');

      return { processed: true, signature };
    } catch (error) {
      logger.error({ error, signature }, 'Error processing blockchain event');
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

blockchainEventWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Job completed');
});

blockchainEventWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Job failed');
});

blockchainEventWorker.on('error', (err) => {
  logger.error({ error: err }, 'Worker error');
});

logger.info('Blockchain event worker started');

