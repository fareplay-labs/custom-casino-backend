import { FastifyInstance } from 'fastify';
import { authenticateWithSignature, authenticate } from '../middleware/auth.js';
import { createSignInMessage } from '@fareplay/solana';
import { createLogger } from '@fareplay/utils';

const logger = createLogger('api:routes:auth');

interface SignInBody {
  walletAddress: string;
  message: string;
  signature: string;
}

interface GetMessageQuery {
  walletAddress: string;
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get message to sign
  fastify.get<{ Querystring: GetMessageQuery }>('/message', async (request, reply) => {
    const { walletAddress } = request.query;

    if (!walletAddress) {
      return reply.code(400).send({ error: 'Wallet address is required' });
    }

    const message = createSignInMessage(walletAddress);
    
    return { message };
  });

  // Sign in with wallet signature
  fastify.post<{ Body: SignInBody }>('/signin', async (request, reply) => {
    const { walletAddress, message, signature } = request.body;
    const casinoSlug = (request.query as any).casino || request.headers['x-casino-slug'];

    if (!walletAddress || !message || !signature) {
      return reply.code(400).send({ 
        error: 'Missing required fields: walletAddress, message, signature' 
      });
    }

    if (!casinoSlug) {
      return reply.code(400).send({ error: 'Casino slug required (query param or X-Casino-Slug header)' });
    }

    const result = await authenticateWithSignature(walletAddress, message, signature, casinoSlug as string);

    if (!result) {
      return reply.code(401).send({ error: 'Authentication failed' });
    }

    // Generate JWT token
    const token = fastify.jwt.sign({
      walletAddress: result.player.walletAddress,
      playerId: result.player.id,
      casinoId: result.casino.id,
      casinoSlug: result.casino.slug,
    }, {
      expiresIn: '7d',
    });

    logger.info({ walletAddress, casino: result.casino.slug }, 'Player signed in successfully');

    return {
      token,
      player: {
        id: result.player.id,
        walletAddress: result.player.walletAddress,
        username: result.player.username,
        createdAt: result.player.createdAt,
      },
      casino: {
        id: result.casino.id,
        name: result.casino.name,
        slug: result.casino.slug,
      },
    };
  });

  // Verify token
  fastify.get('/verify', {
    onRequest: [authenticate],
  }, async (request) => {
    return { 
      valid: true,
      user: request.user,
    };
  });
}

