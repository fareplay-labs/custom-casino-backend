import { FastifyInstance } from 'fastify';
import { getPrismaClient } from '@fareplay/db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

export async function betRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get bet by signature
  fastify.get<{ Params: { signature: string } }>('/:signature', async (request, reply) => {
    const db = getPrismaClient();
    const { signature } = request.params;

    const bet = await db.bet.findUnique({
      where: { signature },
      include: {
        player: {
          select: {
            walletAddress: true,
            username: true,
          },
        },
      },
    });

    if (!bet) {
      return reply.code(404).send({ error: 'Bet not found' });
    }

    return {
      id: bet.id,
      signature: bet.signature,
      player: bet.player.username || 
        `${bet.player.walletAddress.slice(0, 4)}...${bet.player.walletAddress.slice(-4)}`,
      gameType: bet.gameType,
      amount: bet.amount.toString(),
      payout: bet.payout.toString(),
      multiplier: bet.multiplier,
      status: bet.status,
      won: bet.won,
      blockTime: bet.blockTime,
      slot: bet.slot.toString(),
      metadata: bet.metadata,
    };
  });

  // Get player's bets
  fastify.get('/player/history', {
    onRequest: [authenticate],
  }, async (request) => {
    const db = getPrismaClient();
    const user = request.user as { walletAddress: string; playerId: string };

    const limit = Math.min(
      parseInt((request.query as any)['limit'] as string) || 20,
      100
    );
    const offset = parseInt((request.query as any)['offset'] as string) || 0;

    const bets = await db.bet.findMany({
      where: { playerId: user.playerId },
      take: limit,
      skip: offset,
      orderBy: { blockTime: 'desc' },
    });

    const total = await db.bet.count({
      where: { playerId: user.playerId },
    });

    return {
      bets: bets.map((bet: any) => ({
        id: bet.id,
        signature: bet.signature,
        gameType: bet.gameType,
        amount: bet.amount.toString(),
        payout: bet.payout.toString(),
        multiplier: bet.multiplier,
        status: bet.status,
        won: bet.won,
        timestamp: bet.blockTime,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  });

  // Get recent bets (public)
  fastify.get('/recent', async (request) => {
    const db = getPrismaClient();

    const limit = Math.min(
      parseInt((request.query as any)['limit'] as string) || 20,
      100
    );

    const bets = await db.bet.findMany({
      take: limit,
      orderBy: { blockTime: 'desc' },
      where: { status: 'SETTLED' },
      include: {
        player: {
          select: {
            walletAddress: true,
            username: true,
          },
        },
      },
    });

    return {
      bets: bets.map((bet: any) => ({
        id: bet.id,
        signature: bet.signature,
        player: bet.player.username || 
          `${bet.player.walletAddress.slice(0, 4)}...${bet.player.walletAddress.slice(-4)}`,
        gameType: bet.gameType,
        amount: bet.amount.toString(),
        payout: bet.payout.toString(),
        won: bet.won,
        timestamp: bet.blockTime,
      })),
    };
  });
}

