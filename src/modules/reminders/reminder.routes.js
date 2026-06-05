const express = require('express');
const { authenticate } = require('../../middleware/auth');
const { sendOverdueReminders } = require('./reminder.service');
const prisma = require('../../config/database');
const { successResponse } = require('../../utils/response');
const logger = require('../../config/logger');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reminders
 *   description: Scheduled Reminder System and Logs
 */

/**
 * @swagger
 * /api/reminders/trigger:
 *   post:
 *     summary: Manually trigger overdue reminder processing
 *     description: Runs the overdue action item reminder scan on-demand. Intended for testing and evaluation purposes.
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reminder scan completed. Returns processing statistics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     processed:
 *                       type: integer
 *                       example: 5
 *                     sent:
 *                       type: integer
 *                       example: 3
 *                     skipped:
 *                       type: integer
 *                       example: 1
 *                     failed:
 *                       type: integer
 *                       example: 1
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 */
router.post('/trigger', authenticate, async (req, res, next) => {
  try {
    logger.info('Manual reminder trigger invoked by user.', { traceId: req.traceId, userId: req.user.userId });
    const result = await sendOverdueReminders();
    return successResponse(res, result, 200, req.traceId);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/reminders/logs:
 *   get:
 *     summary: Retrieve recent reminder logs
 *     description: Returns the last 50 ReminderLog entries for action items belonging to the authenticated user's meetings.
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reminder logs returned successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       actionItemId:
 *                         type: string
 *                       sentAt:
 *                         type: string
 *                         format: date-time
 *                       channel:
 *                         type: string
 *                         example: email
 *                       recipient:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [SENT, FAILED]
 *                       errorMessage:
 *                         type: string
 *                         nullable: true
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 */
router.get('/logs', authenticate, async (req, res, next) => {
  try {
    const logs = await prisma.reminderLog.findMany({
      where: {
        actionItem: {
          meeting: {
            userId: req.user.userId
          }
        }
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
      include: {
        actionItem: {
          select: {
            id: true,
            task: true,
            assignee: true,
            meetingId: true
          }
        }
      }
    });
    return successResponse(res, logs, 200, req.traceId);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
