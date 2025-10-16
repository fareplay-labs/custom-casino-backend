import { config, createLogger } from '@fareplay/utils';

const logger = createLogger('api:discovery');

/**
 * Registers the casino with the Discovery service
 * This will use the @fareplay/sdk package once it's available
 */
export async function registerDiscovery(): Promise<void> {
  try {
    logger.info('Registering casino with Discovery service...');

    // TODO: Replace with actual SDK call when @fareplay/sdk is available
    // Example:
    // import { DiscoveryClient } from '@fareplay/sdk';
    // const client = new DiscoveryClient(config.discoveryUrl, config.discoveryApiKey);
    // await client.register({
    //   name: config.casinoName,
    //   owner: config.ownerWallet,
    //   network: config.network,
    //   apiUrl: `http://${config.apiHost}:${config.apiPort}`,
    //   wsUrl: `ws://${config.wsHost}:${config.wsPort}`,
    // });

    logger.info('Casino discovery registration - will register all active casinos');

    // Start heartbeat
    startHeartbeat();

  } catch (error) {
    logger.error({ error }, 'Failed to register with Discovery service');
    // Don't crash the app if registration fails
  }
}

/**
 * Sends periodic heartbeats to the Discovery service
 */
function startHeartbeat(): void {
  const heartbeatInterval = 60000; // 1 minute

  setInterval(async () => {
    try {
      // TODO: Replace with actual SDK call
      // await client.heartbeat();
      logger.debug('Heartbeat sent to Discovery service');
    } catch (error) {
      logger.error({ error }, 'Failed to send heartbeat');
    }
  }, heartbeatInterval);
}


