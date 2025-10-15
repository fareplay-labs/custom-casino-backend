import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { Redis } from 'ioredis';
import { config, createLogger } from '@fareplay/utils';
import { EventBroadcaster } from './broadcaster.js';
import { handleConnection } from './connection-handler.js';

const logger = createLogger('ws');

async function start() {
  try {
    // Create HTTP server
    const server = createServer();
    
    // Create WebSocket server
    const wss = new WebSocketServer({ 
      server,
      path: '/ws',
    });

    // Connect to Redis for pub/sub
    const redis = new Redis(config.redisUrl);
    const redisSub = redis.duplicate();

    await redis.ping();
    logger.info('Redis connected successfully');

    // Create event broadcaster
    const broadcaster = new EventBroadcaster(wss, redisSub);
    await broadcaster.start();

    // Handle WebSocket connections
    wss.on('connection', (ws: WebSocket, request) => {
      handleConnection(ws, request, broadcaster);
    });

    // Start HTTP server
    server.listen(config.wsPort, config.wsHost, () => {
      logger.info(`WebSocket server listening on ${config.wsHost}:${config.wsPort}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down WebSocket server...');
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      });

      await redis.quit();
      await redisSub.quit();
      
      server.close(() => {
        logger.info('WebSocket server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error({ error }, 'Failed to start WebSocket server');
    process.exit(1);
  }
}

start();

