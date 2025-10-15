import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config, createLogger } from '@fareplay/utils';
import { getPrismaClient } from '@fareplay/db';
import { registerRoutes } from './routes/index.js';
import { registerDiscovery } from './services/discovery.js';

const logger = createLogger('api');

async function start() {
  const fastify = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  try {
    // Register plugins
    await fastify.register(helmet, {
      contentSecurityPolicy: false, // Adjust based on your needs
    });

    await fastify.register(cors, {
      origin: true, // Adjust in production
      credentials: true,
    });

    await fastify.register(jwt, {
      secret: config.jwtSecret,
    });

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    // Test database connection
    const db = getPrismaClient();
    await db.$connect();
    logger.info('Database connected successfully');

    // Register routes
    registerRoutes(fastify);

    // Health check
    fastify.get('/health', async () => {
      const db = getPrismaClient();
      const casinoCount = await db.casino.count();
      
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        casinos: casinoCount,
        network: config.network,
      };
    });

    // Start server
    await fastify.listen({
      host: config.apiHost,
      port: config.apiPort,
    });

    logger.info(`API server listening on ${config.apiHost}:${config.apiPort}`);

    // Register with Discovery service
    await registerDiscovery();

  } catch (error) {
    logger.error({ error }, 'Failed to start API server');
    process.exit(1);
  }
}

start();


