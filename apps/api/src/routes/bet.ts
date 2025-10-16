import { FastifyInstance } from 'fastify';
import { getPrismaClient } from '@fareplay/db';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

export async function betRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Get trial by ID
  fastify.get<{ Params: { trialId: string } }>('/:trialId', async (request, reply) => {
    const db = getPrismaClient();
    const { trialId } = request.params;

    const trial = await db.trial.findUnique({
      where: { id: trialId },
      include: {
        trialRegistered: {
          include: {
            trialRegisteredEvent: true,
          },
        },
        trialResolved: {
          include: {
            trialResolvedEvent: true,
          },
        },
        gameInstance: true,
      },
    });

    if (!trial) {
      return reply.code(404).send({ error: 'Trial not found' });
    }

    return {
      id: trial.id,
      player: `${trial.who.slice(0, 4)}...${trial.who.slice(-4)}`,
      poolAddress: trial.poolAddress,
      resolved: !!trial.trialResolved,
      resultK: trial.resultK?.toString(),
      deltaAmount: trial.deltaAmount?.toString(),
      blockTime: trial.trialRegistered?.trialRegisteredEvent.blockTime,
      gameConfig: trial.extraDataHash,
      gameResult: trial.gameInstance?.result,
    };
  });

  // Get player's trials
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

    const trials = await db.trial.findMany({
      where: { who: user.walletAddress },
      take: limit,
      skip: offset,
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

    const total = await db.trial.count({
      where: { who: user.walletAddress },
    });

    return {
      trials: trials.map((trial: any) => ({
        id: trial.id,
        poolAddress: trial.poolAddress,
        resolved: !!trial.trialResolved,
        deltaAmount: trial.deltaAmount?.toString(),
        timestamp: trial.trialRegistered?.trialRegisteredEvent.blockTime,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  });

  // Get recent trials (public)
  fastify.get('/recent', async (request) => {
    const db = getPrismaClient();

    const limit = Math.min(
      parseInt((request.query as any)['limit'] as string) || 20,
      100
    );

    const trials = await db.trial.findMany({
      take: limit,
      orderBy: { id: 'desc' },
      where: {
        trialResolved: {
          isNot: null,
        },
      },
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
      trials: trials.map((trial: any) => ({
        id: trial.id,
        player: `${trial.who.slice(0, 4)}...${trial.who.slice(-4)}`,
        poolAddress: trial.poolAddress,
        deltaAmount: trial.deltaAmount?.toString(),
        timestamp: trial.trialRegistered?.trialRegisteredEvent.blockTime,
      })),
    };
  });
}
