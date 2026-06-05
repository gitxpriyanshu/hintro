const { PrismaClient } = require('@prisma/client');

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Factory function to instantiate the PrismaClient.
 * In development, we enable query, info, warning, and error logging.
 * In production, we restrict logging to error events.
 */
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: isDevelopment 
      ? [
          { emit: 'stdout', level: 'query' },
          { emit: 'stdout', level: 'info' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' }
        ]
      : [
          { emit: 'stdout', level: 'error' }
        ]
  });
};

// Use globalThis to persist the PrismaClient instance across hot-reloads (e.g., nodemon restarts)
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (isDevelopment) {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
