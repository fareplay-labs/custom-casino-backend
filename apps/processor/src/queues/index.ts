import { Queue, QueueOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { config, createLogger } from '@fareplay/utils';

const logger = createLogger('processor:queues');

// Create Redis connection for BullMQ
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

// Queue options
const defaultQueueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100,
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
};

// Define queues
export const blockchainEventQueue = new Queue('blockchain-event', defaultQueueOptions);
export const eventInterpretationQueue = new Queue('event-interpretation', defaultQueueOptions);
export const statsUpdateQueue = new Queue('stats-update', defaultQueueOptions);

logger.info('BullMQ queues initialized');

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  logger.info('Closing queues...');
  await Promise.all([
    blockchainEventQueue.close(),
    eventInterpretationQueue.close(),
    statsUpdateQueue.close(),
  ]);
  await connection.quit();
  logger.info('Queues closed');
}

