const express = require('express');
const meetingsController = require('./meetings.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Meetings
 *   description: Meeting Transcript Uploads and Record Management
 */

/**
 * @swagger
 * /api/meetings:
 *   post:
 *     summary: Create a new meeting entry with transcript
 *     description: Registers a meeting and uploads dialogue transcript details. Enforces validation.
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - participants
 *               - meetingDate
 *               - transcript
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *                 example: Q3 Product Roadmap Alignment
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 minItems: 1
 *                 example: ["alice@domain.com", "bob@domain.com"]
 *               meetingDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-06-03T10:00:00Z"
 *               transcript:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - timestamp
 *                     - speaker
 *                     - text
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       example: "00:10"
 *                     speaker:
 *                       type: string
 *                       example: Alice
 *                     text:
 *                       type: string
 *                       example: Welcome team. Let's align on the Q3 milestones.
 *     responses:
 *       201:
 *         description: Meeting record created successfully.
 *       400:
 *         description: Validation schema check failed.
 *       401:
 *         description: Unauthorized. Invalid or missing session token.
 */
router.post('/', authenticate, meetingsController.createMeeting);

/**
 * @swagger
 * /api/meetings:
 *   get:
 *     summary: Retrieve a paginated list of meetings
 *     description: Lists meetings that belong to the caller. Supports filters.
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Target page index.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 50
 *           default: 10
 *         description: Maximum records per page.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ANALYZED]
 *         description: Filter records by meeting analysis status.
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO date bounding start criteria.
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO date bounding end criteria.
 *     responses:
 *       200:
 *         description: List of meetings returned successfully.
 *       401:
 *         description: Unauthorized. Invalid or missing session token.
 */
router.get('/', authenticate, meetingsController.listMeetings);

/**
 * @swagger
 * /api/meetings/{id}:
 *   get:
 *     summary: Fetch detailed meeting data by ID
 *     description: Retrieves meeting metadata, speech transcripts, generated summaries, and action item tasks. Guarded by ownership.
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting UUID.
 *     responses:
 *       200:
 *         description: Meeting data loaded successfully.
 *       401:
 *         description: Unauthorized. Invalid or missing session token.
 *       404:
 *         description: Meeting not found or access is restricted.
 */
router.get('/:id', authenticate, meetingsController.getMeeting);

/**
 * @swagger
 * /api/meetings/{id}:
 *   delete:
 *     summary: Delete a meeting
 *     description: Deletes the specified meeting. Associated database assets (MeetingAnalysis, ActionItems) are deleted cascade.
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Meeting UUID.
 *     responses:
 *       200:
 *         description: Meeting successfully deleted.
 *       401:
 *         description: Unauthorized. Invalid or missing session token.
 *       404:
 *         description: Meeting not found or access is restricted.
 */
router.delete('/:id', authenticate, meetingsController.deleteMeeting);

module.exports = router;
