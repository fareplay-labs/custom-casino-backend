import { FastifyInstance } from 'fastify';
import { getPrismaClient } from '@fareplay/db';
import { createLogger } from '@fareplay/utils';

const logger = createLogger('api:routes:admin');

interface CreateCasinoBody {
  name: string;
  slug: string;
  ownerWallet: string;
  poolId?: string;
  description?: string;
  frontendUrl?: string;
  config?: any;
}

interface UpdateCasinoBody {
  name?: string;
  description?: string;
  frontendUrl?: string;
  logo?: string;
  banner?: string;
  theme?: any;
  config?: any;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'SUSPENDED';
}

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Create a new casino
  fastify.post<{ Body: CreateCasinoBody }>('/casinos', async (request, reply) => {
    const { name, slug, ownerWallet, poolId, description, frontendUrl, config } = request.body;

    if (!name || !slug || !ownerWallet) {
      return reply.code(400).send({ error: 'Missing required fields: name, slug, ownerWallet' });
    }

    const db = getPrismaClient();

    // Check if slug is already taken
    const existing = await db.casino.findUnique({
      where: { slug },
    });

    if (existing) {
      return reply.code(400).send({ error: 'Slug already taken' });
    }

    const casino = await db.casino.create({
      data: {
        name,
        slug,
        ownerWallet,
        programId: process.env.PROGRAM_ID || '',
        network: process.env.NETWORK || 'devnet',
        poolId,
        description,
        frontendUrl,
        config,
      },
    });

    logger.info({ casinoId: casino.id, slug }, 'Casino created');

    return {
      casino: {
        id: casino.id,
        name: casino.name,
        slug: casino.slug,
        ownerWallet: casino.ownerWallet,
        status: casino.status,
        createdAt: casino.createdAt,
      },
    };
  });

  // List all casinos
  fastify.get('/casinos', async (request) => {
    const db = getPrismaClient();

    const casinos = await db.casino.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      casinos: casinos.map(casino => ({
        id: casino.id,
        name: casino.name,
        slug: casino.slug,
        ownerWallet: casino.ownerWallet,
        frontendUrl: casino.frontendUrl,
        description: casino.description,
        status: casino.status,
        createdAt: casino.createdAt,
      })),
    };
  });

  // Get casino by slug
  fastify.get<{ Params: { slug: string } }>('/casinos/:slug', async (request, reply) => {
    const { slug } = request.params;
    const db = getPrismaClient();

    const casino = await db.casino.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            players: true,
            bets: true,
          },
        },
      },
    });

    if (!casino) {
      return reply.code(404).send({ error: 'Casino not found' });
    }

    return {
      casino: {
        id: casino.id,
        name: casino.name,
        slug: casino.slug,
        ownerWallet: casino.ownerWallet,
        poolId: casino.poolId,
        description: casino.description,
        logo: casino.logo,
        banner: casino.banner,
        theme: casino.theme,
        frontendUrl: casino.frontendUrl,
        status: casino.status,
        isPublic: casino.isPublic,
        playerCount: casino._count.players,
        betCount: casino._count.bets,
        createdAt: casino.createdAt,
      },
    };
  });

  // Update casino
  fastify.patch<{ Params: { slug: string }; Body: UpdateCasinoBody }>(
    '/casinos/:slug',
    async (request, reply) => {
      const { slug } = request.params;
      const updates = request.body;
      const db = getPrismaClient();

      // TODO: Add authentication - only owner can update
      
      const casino = await db.casino.update({
        where: { slug },
        data: updates,
      });

      logger.info({ casinoId: casino.id, slug }, 'Casino updated');

      return {
        casino: {
          id: casino.id,
          name: casino.name,
          slug: casino.slug,
          status: casino.status,
          updatedAt: casino.updatedAt,
        },
      };
    }
  );

  // Delete casino
  fastify.delete<{ Params: { slug: string } }>('/casinos/:slug', async (request, reply) => {
    const { slug } = request.params;
    const db = getPrismaClient();

    // TODO: Add authentication - only owner can delete
    
    await db.casino.delete({
      where: { slug },
    });

    logger.info({ slug }, 'Casino deleted');

    return { success: true };
  });
}

