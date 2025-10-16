import { FastifyInstance } from 'fastify';
import { getPrismaClient } from '@fareplay/db';
import { config } from '@fareplay/utils';

export async function casinoRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get casino info (requires casinoSlug query param or header)
  fastify.get('/info', async (request, reply) => {
    const casinoSlug = (request.query as any).casino || request.headers['x-casino-slug'];
    
    if (!casinoSlug) {
      return reply.code(400).send({ error: 'Casino slug required (query param or X-Casino-Slug header)' });
    }

    const db = getPrismaClient();
    const casino = await db.casino.findUnique({
      where: { slug: casinoSlug as string },
    });

    if (!casino) {
      return reply.code(404).send({ error: 'Casino not found' });
    }

    return {
      name: casino.name,
      slug: casino.slug,
      owner: casino.ownerAddress,
      poolAddress: casino.poolAddress,
      shortDescription: casino.shortDescription,
      longDescription: casino.longDescription,
      profileImage: casino.profileImage,
      bannerImage: casino.bannerImage,
      frontendUrl: casino.frontendUrl,
      theme: casino.theme,
    };
  });

  // Get casino stats
  fastify.get('/stats', async (request, reply) => {
    const casinoSlug = (request.query as any).casino || request.headers['x-casino-slug'];
    
    if (!casinoSlug) {
      return reply.code(400).send({ error: 'Casino slug required' });
    }

    const db = getPrismaClient();
    
    const casino = await db.casino.findUnique({
      where: { slug: casinoSlug as string },
    });

    if (!casino) {
      return reply.code(404).send({ error: 'Casino not found' });
    }

    const stats = await db.casinoStats.findFirst({
      where: { casinoId: casino.id },
      orderBy: { updatedAt: 'desc' },
    });

    const playerCount = await db.player.count({
      where: { casinoId: casino.id },
    });

    return {
      totalPlays: stats?.totalPlays || 0,
      totalWagered: stats?.totalWagered?.toString() || '0',
      totalPayout: stats?.totalPayout?.toString() || '0',
      totalPlayers: playerCount,
      lastUpdated: stats?.updatedAt || new Date(),
    };
  });

  // Get recent activity
  fastify.get('/activity', async (request) => {
    const db = getPrismaClient();

    const limit = Math.min(
      parseInt((request.query as any)['limit'] as string) || 20,
      100
    );

    const casinoSlug = (request.query as any).casino || request.headers['x-casino-slug'];
    const casino = casinoSlug ? await db.casino.findUnique({
      where: { slug: casinoSlug as string },
    }) : null;

    const recentTrials = await db.trial.findMany({
      where: casino ? { casinoId: casino.id } : {},
      take: limit,
      orderBy: { id: 'desc' },
      include: {
        trialRegistered: {
          include: {
            trialRegisteredEvent: true,
          },
        },
        trialResolved: true,
      },
    });

    return {
      trials: recentTrials.map((trial: any) => ({
        id: trial.id,
        player: `${trial.who.slice(0, 4)}...${trial.who.slice(-4)}`,
        poolAddress: trial.poolAddress,
        resolved: !!trial.trialResolved,
        deltaAmount: trial.deltaAmount?.toString(),
        timestamp: trial.trialRegistered?.trialRegisteredEvent.blockTime,
      })),
    };
  });

  // Get leaderboard
  fastify.get('/leaderboard', async (request) => {
    const db = getPrismaClient();

    const limit = Math.min(
      parseInt((request.query as any)['limit'] as string) || 10,
      100
    );

    const topPlayers = await db.player.findMany({
      take: limit,
      orderBy: { totalWagered: 'desc' },
      select: {
        id: true,
        walletAddress: true,
        username: true,
        totalBets: true,
        totalWins: true,
        totalWagered: true,
        totalPayout: true,
      },
    });

    return {
      leaderboard: topPlayers.map((player: any, index: number) => ({
        rank: index + 1,
        player: player.username || 
          `${player.walletAddress.slice(0, 4)}...${player.walletAddress.slice(-4)}`,
        totalBets: player.totalBets,
        totalWins: player.totalWins,
        totalWagered: player.totalWagered.toString(),
        totalPayout: player.totalPayout.toString(),
        winRate: player.totalBets > 0 
          ? ((player.totalWins / player.totalBets) * 100).toFixed(2) 
          : '0.00',
      })),
    };
  });
}

