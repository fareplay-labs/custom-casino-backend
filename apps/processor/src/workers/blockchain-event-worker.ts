import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { config, createLogger } from '@fareplay/utils';
import { BlockchainEventJob } from '../types/events.js';
import { handleBlockchainEvent } from '../handlers/blockchain-event-handler.js';

const logger = createLogger('processor:blockchain-worker');

// Redis connection for worker
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

// Worker to process blockchain events
export const blockchainEventWorker = new Worker<BlockchainEventJob>(
  'blockchain-event',
  async (job: Job<BlockchainEventJob>) => {
    await handleBlockchainEvent(job);
    return { processed: true };
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

