// api/lib/db.js - Prisma client singleton
import { PrismaClient } from '@prisma/client';

let prisma;

try {
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
  } else {
    // In development, reuse the same instance
    if (!global.__prisma) {
      global.__prisma = new PrismaClient({
        log: ['error', 'warn'],
      });
    }
    prisma = global.__prisma;
  }
} catch (error) {
  console.error('[db] Error initializing Prisma:', error);
  console.error('[db] Make sure to run: npx prisma generate');
  // Create a mock prisma for graceful degradation
  prisma = {
    user: { findUnique: async () => null },
    business: { findUnique: async () => null, upsert: async () => null },
    event: { findMany: async () => [] },
    bulletin: { findMany: async () => [] },
  };
}

export default prisma;
