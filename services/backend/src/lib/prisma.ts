import { PrismaClient } from '@prisma/client';

// Prevent multiple Prisma client instances during hot-reload in development.
// globalThis persists across module re-evaluations; the module registry does not.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasources: {
      db: {
        // Raise pool timeout from the default 10 s to 30 s.
        // Supabase's transaction pooler caps connections; a generous timeout
        // prevents P2024 bursts when multiple admin queries fire at once.
        url: (() => {
          const base = process.env['DATABASE_URL'] ?? '';
          if (!base) return base;
          try {
            const u = new URL(base);
            u.searchParams.set('connection_limit', '5');
            u.searchParams.set('pool_timeout', '30');
            return u.toString();
          } catch {
            return base;
          }
        })(),
      },
    },
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
