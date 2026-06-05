const dotenv = require('dotenv');
// Load environment variables before importing any other modules
dotenv.config();

const app = require('./src/app');
const initializeScheduler = require('./src/modules/reminders/reminder.scheduler');
const logger = require('./src/config/logger');
const prisma = require('./src/config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  // 1. Attempt Database Connection (log warning instead of crashing if database is not reachable)
  try {
    await prisma.$connect();
    logger.info('Database connected successfully.');
  } catch (err) {
    logger.warn(`⚠️ Database connection could not be established on startup: ${err.message}`);
  }

  // 2. Start Express HTTP Server
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  // 3. Initialize background reminders scheduler
  try {
    initializeScheduler();
    logger.info('Scheduler initialized');
  } catch (err) {
    logger.error(`Failed to initialize scheduler: ${err.message}`);
  }

  // 4. Graceful Shutdown Management
  const handleShutdown = async (signal) => {
    logger.warn(`Shutdown signal [${signal}] received. Commencing graceful termination...`);
    
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
    } catch (err) {
      logger.error('Error while disconnecting from the database:', err);
    }

    server.close(() => {
      logger.info('HTTP server listener closed.');
      process.exit(0);
    });

    // Force termination after 10s if connections persist
    setTimeout(() => {
      logger.error('Forceful shutdown triggered: active connections could not be closed in time.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.error('Critical failure during server startup bootstrap:', err);
  process.exit(1);
});
