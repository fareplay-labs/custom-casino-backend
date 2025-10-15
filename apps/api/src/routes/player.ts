import { FastifyInstance } from 'fastify';
import { getPrismaClient } from '@fareplay/db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

interface UpdateProfileBody {
  username?: string;
}

export async function playerRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get player profile
  fastify.get('/profile', {
    onRequest: [authenticate],
  }, async (request) => {
    const db = getPrismaClient();
    const user = request.user as { walletAddress: string; playerId: string };

    const player = await db.player.findUnique({
      where: { id: user.playerId },
      include: {
        bets: {
          take: 10,
          orderBy: { blockTime: 'desc' },
        },
      },
    });

    if (!player) {
      return { error: 'Player not found' };
    }

    return {
      id: player.id,
      walletAddress: player.walletAddress,
      username: player.username,
      createdAt: player.createdAt,
      lastSeenAt: player.lastSeenAt,
      stats: {
        totalBets: player.totalBets,
        totalWins: player.totalWins,
        totalLosses: player.totalLosses,
        totalWagered: player.totalWagered.toString(),
        totalPayout: player.totalPayout.toString(),
        winRate: player.totalBets > 0 
          ? ((player.totalWins / player.totalBets) * 100).toFixed(2) 
          : '0.00',
      },
      recentBets: player.bets.map((bet: any) => ({
        id: bet.id,
        signature: bet.signature,
        gameType: bet.gameType,
        amount: bet.amount.toString(),
        payout: bet.payout.toString(),
        won: bet.won,
        timestamp: bet.blockTime,
      })),
    };
  });

  // Update player profile
  fastify.patch<{ Body: UpdateProfileBody }>('/profile', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const db = getPrismaClient();
    const { username } = request.body;
    const user = request.user as { walletAddress: string; playerId: string };

    if (!username) {
      return reply.code(400).send({ error: 'Username is required' });
    }

    // Check if username is already taken
    const existing = await db.player.findFirst({
      where: {
        username,
        id: { not: user.playerId },
      },
    });

    if (existing) {
      return reply.code(400).send({ error: 'Username is already taken' });
    }

    const player = await db.player.update({
      where: { id: user.playerId },
      data: { username },
    });

    return {
      id: player.id,
      walletAddress: player.walletAddress,
      username: player.username,
    };
  });

  // Get player stats
  fastify.get('/stats', {
    onRequest: [authenticate],
  }, async (request) => {
    const db = getPrismaClient();
    const user = request.user as { walletAddress: string; playerId: string };

    const player = await db.player.findUnique({
      where: { id: user.playerId },
    });

    if (!player) {
      return { error: 'Player not found' };
    }

    return {
      totalBets: player.totalBets,
      totalWins: player.totalWins,
      totalLosses: player.totalLosses,
      totalWagered: player.totalWagered.toString(),
      totalPayout: player.totalPayout.toString(),
      winRate: player.totalBets > 0 
        ? ((player.totalWins / player.totalBets) * 100).toFixed(2) 
        : '0.00',
      profitLoss: (player.totalPayout - player.totalWagered).toString(),
    };
  });
}

