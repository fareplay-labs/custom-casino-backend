import { PrismaClient } from '@prisma/client';

// Singleton instance
let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
  }
  return prisma;
}

// Export Prisma types
export * from '@prisma/client';
export { prisma, getPrismaClient as getDb };


