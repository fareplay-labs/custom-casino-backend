import { ProgramListener } from '@fareplay/solana';
import { config, createLogger } from '@fareplay/utils';
import { getPrismaClient } from '@fareplay/db';
import { blockchainEventQueue, closeQueues } from './queues/index.js';
import { blockchainEventWorker } from './workers/blockchain-event-worker.js';
import { eventInterpretationWorker } from './workers/event-interpretation-worker.js';
import gameWorker from './workers/game-worker.js';
import { statsUpdateWorker } from './workers/stats-update-worker.js';
import { parseTransaction } from './parsers/transaction-parser.js';

const logger = createLogger('processor');

async function start() {
  try {
    // Test database connection
    const db = getPrismaClient();
    await db.$connect();
    logger.info('Database connected successfully');

    // Start BullMQ workers
    logger.info('Starting BullMQ workers...');
    // Workers are already started when imported

    // Create program listener
    const listener = new ProgramListener(config.fareVaultProgramId);

    // Start listening for program transactions
    logger.info({ programId: config.fareVaultProgramId }, 'Starting Solana program listener');

    await listener.start(
      async (event) => {
        try {
          // Parse transaction to extract events
          const parsedEvents = parseTransaction(
            event.signature,
            event.slot,
            event.blockTime,
            event.transaction
          );

          if (parsedEvents.length === 0) {
            logger.debug({ signature: event.signature }, 'No events found in transaction');
            return;
          }

          // Queue each parsed event
          for (const parsedEvent of parsedEvents) {
            const jobId = `${parsedEvent.eventName}-${event.signature}-${parsedEvent.eventData.instructionIndex}`;
            
            await blockchainEventQueue.add(
              'process-event',
              {
                eventName: parsedEvent.eventName,
                eventData: parsedEvent.eventData,
              },
              {
                jobId, // Prevent duplicates
                priority: 1,
              }
            );

            logger.debug(
              { 
                signature: event.signature,
                eventName: parsedEvent.eventName,
                jobId,
              },
              'Event added to queue'
            );
          }
        } catch (error) {
          // If job already exists, that's fine (duplicate)
          if ((error as any).message?.includes('already exists')) {
            logger.debug({ signature: event.signature }, 'Event already queued');
          } else {
            logger.error({ 
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              signature: event.signature 
            }, 'Error queueing event');
            console.error('Full error:', error);
          }
        }
      }
    );

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down processor...');
      
      // Stop listener
      listener.stop();
      
      // Close workers
      await blockchainEventWorker.close();
      await eventInterpretationWorker.close();
      await statsUpdateWorker.close();
      
      // Close queues
      await closeQueues();
      
      // Disconnect database
      await db.$disconnect();
      
      logger.info('Processor shut down successfully');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Failed to start processor');
    console.error('Processor startup error:', error);
    process.exit(1);
  }
}

start();


