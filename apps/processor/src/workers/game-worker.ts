import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { config, createLogger } from '@fareplay/utils';
import { handleGameJob, GameJobData } from '../handlers/game-handler.js';

const logger = createLogger('processor:game-worker');

// Create Redis connection for the worker
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

// Create game worker
const gameWorker = new Worker<GameJobData>(
  'game',
  async (job: Job<GameJobData>) => {
    await handleGameJob(job);
  },
  {
    connection,
    concurrency: 10, // Process up to 10 game jobs concurrently
  }
);

// Event handlers
gameWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, jobName: job.name }, 'Job completed');
});

gameWorker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      jobName: job?.name,
      error: err.message,
    },
    'Job failed'
  );
});

gameWorker.on('error', (err) => {
  logger.error({ error: err.message }, 'Worker error');
});

logger.info('Game worker started');

export default gameWorker;

