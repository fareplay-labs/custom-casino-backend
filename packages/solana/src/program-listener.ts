import { PublicKey, ParsedTransactionWithMeta, Connection } from '@solana/web3.js';
import { getConnection } from './connection.js';
import { createLogger } from '@fareplay/utils';

const logger = createLogger('solana:program-listener');

export interface ProgramEvent {
  signature: string;
  slot: number;
  blockTime: number | null;
  transaction: ParsedTransactionWithMeta;
}

export class ProgramListener {
  private programId: PublicKey;
  private subscriptionId: number | null = null;
  private connection: Connection;
  private processedSignatures = new Set<string>();

  constructor(programId: string) {
    this.programId = new PublicKey(programId);
    this.connection = getConnection();
  }

  /**
   * Starts listening for program transactions via WebSocket
   * @param callback Function to call for each new transaction
   */
  async start(
    callback: (event: ProgramEvent) => Promise<void>
  ): Promise<void> {
    if (this.subscriptionId !== null) {
      logger.warn('Program listener is already running');
      return;
    }

    logger.info({ programId: this.programId.toString() }, 'Starting WebSocket program listener');

    try {
      // Subscribe to logs for this program (most reliable method)
      this.subscriptionId = this.connection.onLogs(
        this.programId,
        async (logs, ctx) => {
        try {
          const signature = logs.signature;

          // Skip if already processed
          if (this.processedSignatures.has(signature)) {
            return;
          }

          // Skip if transaction had an error
          if (logs.err) {
            logger.debug({ signature }, 'Skipping failed transaction');
            this.processedSignatures.add(signature);
            return;
          }

          logger.info({ 
            signature, 
            slot: ctx.slot,
          }, 'New transaction detected');

          // Fetch the full parsed transaction
          const transaction = await this.connection.getParsedTransaction(
            signature,
            {
              maxSupportedTransactionVersion: 0,
            }
          );

          if (!transaction) {
            logger.warn({ signature }, 'Transaction not found');
            return;
          }

          const event: ProgramEvent = {
            signature,
            slot: ctx.slot,
            blockTime: transaction.blockTime || null,
            transaction,
          };

          // Mark as processed
          this.processedSignatures.add(signature);

          // Cleanup old signatures (keep last 1000)
          if (this.processedSignatures.size > 1000) {
            const toDelete = Array.from(this.processedSignatures).slice(0, 100);
            toDelete.forEach(sig => this.processedSignatures.delete(sig));
          }

          await callback(event);

        } catch (error) {
          logger.error({ error, signature: logs.signature }, 'Error processing log event');
        }
        },
        'confirmed' // Commitment level
      );

      logger.info({ 
        subscriptionId: this.subscriptionId,
        programId: this.programId.toString(),
      }, 'WebSocket subscription active');
    } catch (error) {
      logger.warn({ 
        error: error instanceof Error ? error.message : String(error),
      }, 'WebSocket subscription failed, will rely on backfill only');
      // WebSocket subscriptions not supported - that's okay, backfill will handle it
    }

    // Do an initial backfill of recent transactions
    await this.backfillRecentTransactions(callback, 10);

    // If WebSocket subscription failed, exit with error
    if (this.subscriptionId === null) {
      throw new Error(
        'WebSocket subscription failed. Your RPC provider may not support logsSubscribe. ' +
        'Please use Helius (https://helius.dev) or QuickNode (https://quicknode.com) for WebSocket support.'
      );
    }
  }

  /**
   * Stops the program listener
   */
  async stop(): Promise<void> {
    if (this.subscriptionId !== null) {
      logger.info({ subscriptionId: this.subscriptionId }, 'Stopping program listener');
      await this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = null;
    }
  }

  /**
   * Backfill recent transactions on startup
   */
  private async backfillRecentTransactions(
    callback: (event: ProgramEvent) => Promise<void>,
    limit: number = 10
  ): Promise<void> {
    try {
      logger.info({ limit }, 'Backfilling recent transactions');

      const signatures = await this.connection.getSignaturesForAddress(
        this.programId,
        { limit }
      );

      // Process in reverse order (oldest first)
      const sortedSignatures = signatures.reverse();

      for (const sigInfo of sortedSignatures) {
        // Skip if already processed or has error
        if (this.processedSignatures.has(sigInfo.signature) || sigInfo.err) {
          continue;
        }

        const transaction = await this.connection.getParsedTransaction(
          sigInfo.signature,
          { maxSupportedTransactionVersion: 0 }
        );

        if (transaction) {
          const event: ProgramEvent = {
            signature: sigInfo.signature,
            slot: sigInfo.slot,
            blockTime: sigInfo.blockTime || null,
            transaction,
          };

          this.processedSignatures.add(sigInfo.signature);
          await callback(event);
        }
      }

      logger.info({ count: sortedSignatures.length }, 'Backfill complete');
    } catch (error) {
      logger.error({ error }, 'Error during backfill');
    }
  }
}

