const express = require('express');
const analysisController = require('./analysis.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Analysis
 *   description: Meeting intelligence analysis summaries, decisions, citations, and action item extractions
 */

/**
 * @swagger
 * /api/meetings/{id}/analyze:
 *   post:
 *     summary: Trigger AI analysis on a meeting transcript
 *     description: Leverages Claude/Gemini model to analyze meeting dialog, producing summaries, decisions, action items, and follow-up topics with precise transcript citations.
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting UUID
 *     responses:
 *       200:
 *         description: Analysis report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 traceId:
 *                   type: string
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     meetingId:
 *                       type: string
 *                     summary:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           text:
 *                             type: string
 *                           citations:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 timestamp:
 *                                   type: string
 *                                 speaker:
 *                                   type: string
 *                                 quote:
 *                                   type: string
 *                     decisions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           text:
 *                             type: string
 *                           citations:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 timestamp:
 *                                   type: string
 *                                 speaker:
 *                                   type: string
 *                                 quote:
 *                                   type: string
 *                     actionItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           task:
 *                             type: string
 *                           assignee:
 *                             type: string
 *                           status:
 *                             type: string
 *                           dueDate:
 *                             type: string
 *                           citations:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 timestamp:
 *                                   type: string
 *                                 speaker:
 *                                   type: string
 *                                 quote:
 *                                   type: string
 *                     followUpSuggestions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           text:
 *                             type: string
 *                           citations:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 timestamp:
 *                                   type: string
 *                                 speaker:
 *                                   type: string
 *                                 quote:
 *                                   type: string
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       404:
 *         description: Meeting not found or access restricted.
 *       502:
 *         description: AI parse failure or connection issue.
 */
router.post('/:id/analyze', authenticate, analysisController.analyzeMeeting);

/**
 * @swagger
 * /api/meetings/{id}/analysis:
 *   get:
 *     summary: Retrieve meeting analysis details
 *     description: Fetches the previously saved MeetingAnalysis record along with extracted ActionItems.
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting UUID
 *     responses:
 *       200:
 *         description: Analysis reports retrieved successfully.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       404:
 *         description: Meeting not found or analysis has not been generated yet.
 */
router.get('/:id/analysis', authenticate, analysisController.getAnalysis);

module.exports = router;
