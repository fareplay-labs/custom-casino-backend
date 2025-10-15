import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.js';
import { casinoRoutes } from './casino.js';
import { playerRoutes } from './player.js';
import { betRoutes } from './bet.js';
import { adminRoutes } from './admin.js';

export function registerRoutes(fastify: FastifyInstance): void {
  // API prefix
  fastify.register(async (instance) => {
    // Casino-scoped routes (can be prefixed with /casinos/:slug)
    instance.register(authRoutes, { prefix: '/auth' });
    instance.register(casinoRoutes, { prefix: '/casino' });
    instance.register(playerRoutes, { prefix: '/player' });
    instance.register(betRoutes, { prefix: '/bets' });
    
    // Admin routes for managing casinos
    instance.register(adminRoutes, { prefix: '/admin' });
  }, { prefix: '/api' });
}


