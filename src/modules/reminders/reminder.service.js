const { Resend } = require('resend');
const prisma = require('../../config/database');
const logger = require('../../config/logger');

// Lazy-initialized Resend client
let resendClient = null;
function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Validates whether a string is a valid email format.
 * @param {string} email - Email string to validate
 * @returns {boolean} True if valid email
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Sends a reminder email for an overdue action item.
 * @param {object} actionItem - ActionItem with meeting included
 * @returns {Promise<object>} Result with success flag and emailId
 */
async function sendReminderEmail(actionItem) {
  const fromEmail = process.env.REMINDER_EMAIL_FROM || 'reminders@yourdomain.com';

  // Resolve recipients from meeting participants
  let recipients = [];
  if (actionItem.meeting && Array.isArray(actionItem.meeting.participants)) {
    recipients = actionItem.meeting.participants.filter(p => isValidEmail(p));
  }

  if (recipients.length === 0) {
    logger.warn(`No valid email recipients found for action item ${actionItem.id}. Meeting participants: ${JSON.stringify(actionItem.meeting?.participants)}`, {
      actionItemId: actionItem.id,
      meetingId: actionItem.meetingId
    });
    return { success: false, error: 'No valid email recipients found.' };
  }

  // Format due date
  const formattedDueDate = actionItem.dueDate
    ? new Date(actionItem.dueDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    : 'No due date set';

  const subject = `⏰ Reminder: Action Item Overdue - ${actionItem.task}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 24px 32px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">⏰ Action Item Overdue</h1>
      </div>
      <div style="padding: 28px 32px; color: #1f2937; line-height: 1.6;">
        <p style="font-size: 15px; margin-top: 0;">An action item from a recent meeting requires your immediate attention.</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr>
            <td style="padding: 10px 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #f3f4f6; width: 130px; vertical-align: top;">Task</td>
            <td style="padding: 10px 12px; color: #111827; border-bottom: 1px solid #f3f4f6; vertical-align: top; font-weight: 600;">${actionItem.task}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #f3f4f6; vertical-align: top;">Assigned To</td>
            <td style="padding: 10px 12px; color: #111827; border-bottom: 1px solid #f3f4f6; vertical-align: top;">${actionItem.assignee}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #f3f4f6; vertical-align: top;">Due Date</td>
            <td style="padding: 10px 12px; color: #dc2626; border-bottom: 1px solid #f3f4f6; vertical-align: top; font-weight: 600;">${formattedDueDate}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #f3f4f6; vertical-align: top;">Meeting</td>
            <td style="padding: 10px 12px; color: #111827; border-bottom: 1px solid #f3f4f6; vertical-align: top;">${actionItem.meeting?.title || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; font-weight: 600; color: #6b7280; vertical-align: top;">Status</td>
            <td style="padding: 10px 12px; vertical-align: top;">
              <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: ${actionItem.status === 'PENDING' ? '#fef3c7' : '#dbeafe'}; color: ${actionItem.status === 'PENDING' ? '#92400e' : '#1e40af'};">${actionItem.status}</span>
            </td>
          </tr>
        </table>

        <p style="font-size: 14px; color: #6b7280;">Please take action on this item as soon as possible and update its status accordingly.</p>
      </div>
      <div style="background-color: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated reminder from Hintro Meeting Intelligence</p>
      </div>
    </div>
  `;

  const client = getResendClient();

  if (client) {
    try {
      const result = await client.emails.send({
        from: fromEmail,
        to: recipients,
        subject,
        html
      });

      logger.info(`Reminder email sent via Resend for action item ${actionItem.id}`, {
        actionItemId: actionItem.id,
        recipients,
        emailId: result.data?.id
      });

      return { success: true, emailId: result.data?.id || null };
    } catch (err) {
      logger.error(`Resend email delivery failed for action item ${actionItem.id}: ${err.message}`, {
        actionItemId: actionItem.id,
        recipients,
        error: err.message
      });
      return { success: false, error: err.message };
    }
  } else {
    // Mock mode when RESEND_API_KEY is absent
    logger.info(`[MOCK EMAIL] Reminder for action item ${actionItem.id}:\n  From: ${fromEmail}\n  To: ${recipients.join(', ')}\n  Subject: ${subject}\n  Task: ${actionItem.task}\n  Due: ${formattedDueDate}`, {
      actionItemId: actionItem.id,
      recipients,
      mode: 'mock'
    });

    return { success: true, emailId: `mock-${Date.now()}` };
  }
}

/**
 * Creates a ReminderLog record in the database.
 * @param {string} actionItemId - Action item UUID
 * @param {string} channel - Delivery channel (e.g., 'email')
 * @param {string} recipient - Recipient address
 * @param {string} status - SENT or FAILED
 * @param {string|null} errorMessage - Error details if failed
 * @returns {Promise<object>} Created ReminderLog record
 */
async function logReminder(actionItemId, channel, recipient, status, errorMessage = null) {
  const reminderLog = await prisma.reminderLog.create({
    data: {
      actionItemId,
      channel,
      recipient,
      status,
      errorMessage
    }
  });

  return reminderLog;
}

/**
 * Processes all overdue action items and sends reminder emails.
 * Includes 24-hour de-duplication to prevent spamming.
 * @returns {Promise<object>} Processing statistics { processed, sent, skipped, failed }
 */
async function sendOverdueReminders() {
  const traceId = 'reminder-cron';
  logger.info('Starting overdue action items reminder scan...', { traceId });

  const stats = { processed: 0, sent: 0, skipped: 0, failed: 0 };

  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Query ALL overdue action items
    const overdueItems = await prisma.actionItem.findMany({
      where: {
        status: { not: 'COMPLETED' },
        dueDate: {
          not: null,
          lt: now
        }
      },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            participants: true,
            meetingDate: true
          }
        }
      }
    });

    logger.info(`Found ${overdueItems.length} overdue action items`, { traceId });
    stats.processed = overdueItems.length;

    for (const item of overdueItems) {
      // Check if a reminder was sent in the last 24 hours
      const recentReminder = await prisma.reminderLog.findFirst({
        where: {
          actionItemId: item.id,
          sentAt: { gte: twentyFourHoursAgo },
          status: 'SENT'
        }
      });

      if (recentReminder) {
        logger.debug(`Skipping action item ${item.id}: reminder already sent within 24 hours.`, {
          traceId,
          actionItemId: item.id,
          lastSentAt: recentReminder.sentAt
        });
        stats.skipped++;
        continue;
      }

      // Send the reminder email
      const emailResult = await sendReminderEmail(item);

      // Determine recipient string for logging
      const recipientStr = item.meeting?.participants?.filter(p => isValidEmail(p)).join(', ') || item.assignee || 'unknown';

      if (emailResult.success) {
        await logReminder(item.id, 'email', recipientStr, 'SENT');
        logger.info(`Reminder SENT for action item ${item.id} (meeting: ${item.meetingId})`, {
          traceId,
          actionItemId: item.id,
          meetingId: item.meetingId,
          recipient: recipientStr
        });
        stats.sent++;
      } else {
        await logReminder(item.id, 'email', recipientStr, 'FAILED', emailResult.error);
        logger.warn(`Reminder FAILED for action item ${item.id}: ${emailResult.error}`, {
          traceId,
          actionItemId: item.id,
          meetingId: item.meetingId,
          recipient: recipientStr
        });
        stats.failed++;
      }
    }

    logger.info(`Overdue reminders scan complete. Processed: ${stats.processed}, Sent: ${stats.sent}, Skipped: ${stats.skipped}, Failed: ${stats.failed}`, { traceId, stats });
  } catch (err) {
    logger.error(`Fatal error during overdue reminders scan: ${err.message}`, { traceId, error: err.stack });
  }

  return stats;
}

module.exports = {
  sendReminderEmail,
  logReminder,
  sendOverdueReminders
};
