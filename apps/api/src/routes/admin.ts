import { FastifyInstance } from 'fastify';
import { getPrismaClient } from '@fareplay/db';
import { createLogger } from '@fareplay/utils';

const logger = createLogger('api:routes:admin');

interface CreateCasinoBody {
  name: string;
  slug: string;
  ownerAddress: string;
  poolAddress?: string;
  shortDescription?: string;
  longDescription?: string;
  frontendUrl?: string;
  profileImage?: string;
  bannerImage?: string;
  theme?: any;
}

interface UpdateCasinoBody {
  name?: string;
  shortDescription?: string;
  longDescription?: string;
  frontendUrl?: string;
  profileImage?: string;
  bannerImage?: string;
  theme?: any;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'SUSPENDED';
}

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Create a new casino
  fastify.post<{ Body: CreateCasinoBody }>('/casinos', async (request, reply) => {
    const { name, slug, ownerAddress, poolAddress, shortDescription, longDescription, frontendUrl, profileImage, bannerImage, theme } = request.body;

    if (!name || !slug || !ownerAddress) {
      return reply.code(400).send({ error: 'Missing required fields: name, slug, ownerAddress' });
    }

    const db = getPrismaClient();

    // Check if slug is already taken
    const existing = await db.casino.findUnique({
      where: { slug },
    });

    if (existing) {
      return reply.code(400).send({ error: 'Slug already taken' });
    }

    // Ensure user exists
    let user = await db.user.findUnique({
      where: { walletAddress: ownerAddress },
    });

    if (!user) {
      user = await db.user.create({
        data: { walletAddress: ownerAddress },
      });
    }

    const casino = await db.casino.create({
      data: {
        name,
        slug,
        ownerAddress,
        poolAddress,
        shortDescription,
        longDescription,
        frontendUrl,
        profileImage,
        bannerImage,
        theme,
      },
    });

    logger.info({ casinoId: casino.id, slug }, 'Casino created');

    return {
      casino: {
        id: casino.id,
        name: casino.name,
        slug: casino.slug,
        ownerAddress: casino.ownerAddress,
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
        ownerAddress: casino.ownerAddress,
        frontendUrl: casino.frontendUrl,
        shortDescription: casino.shortDescription,
        profileImage: casino.profileImage,
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
        ownerAddress: casino.ownerAddress,
        poolAddress: casino.poolAddress,
        shortDescription: casino.shortDescription,
        longDescription: casino.longDescription,
        profileImage: casino.profileImage,
        bannerImage: casino.bannerImage,
        theme: casino.theme,
        frontendUrl: casino.frontendUrl,
        status: casino.status,
        isPublic: casino.isPublic,
        playerCount: casino._count.players,
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

