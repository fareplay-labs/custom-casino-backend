import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { config, createLogger } from '@fareplay/utils';
import { EventInterpretationJob } from '../types/events.js';
import { handleEventInterpretation } from '../handlers/event-interpretation-handler.js';

const logger = createLogger('processor:interpretation-worker');

// Redis connection for worker
const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

// Worker to interpret and store blockchain events
export const eventInterpretationWorker = new Worker<EventInterpretationJob>(
  'event-interpretation',
  async (job: Job<EventInterpretationJob>) => {
    await handleEventInterpretation(job);
    return { processed: true };
  },
  {
    connection,
    concurrency: 3,
  }
);

eventInterpretationWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Job completed');
});

eventInterpretationWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err }, 'Job failed');
});

logger.info('Event interpretation worker started');

