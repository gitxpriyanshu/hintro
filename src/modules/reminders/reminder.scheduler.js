const cron = require('node-cron');
const { sendOverdueReminders } = require('./reminder.service');
const logger = require('../../config/logger');

/**
 * Initializes the background cron scheduler for overdue action item reminders.
 * Runs every hour on the hour (cron: '0 * * * *').
 * Errors are caught and logged — the job will never crash the application.
 * @returns {object} The cron task instance
 */
function initializeScheduler() {
  const traceId = 'reminder-scheduler-init';

  logger.info('Registering overdue action item reminder cron job (schedule: every hour at :00)', { traceId });

  const task = cron.schedule('0 * * * *', async () => {
    const runTraceId = `reminder-cron-${Date.now()}`;
    logger.info('Cron trigger fired: starting overdue reminders processing...', { traceId: runTraceId });

    try {
      const result = await sendOverdueReminders();
      logger.info(`Cron job completed. Results: ${JSON.stringify(result)}`, { traceId: runTraceId, result });
    } catch (err) {
      // Catch all errors — the cron job must never crash the server
      logger.error(`Cron job encountered an unhandled error: ${err.message}`, {
        traceId: runTraceId,
        error: err.stack
      });
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  logger.info('Overdue reminder scheduler registered and running.', { traceId });
  return task;
}

module.exports = initializeScheduler;
