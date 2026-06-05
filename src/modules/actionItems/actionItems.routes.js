const express = require('express');
const actionItemsController = require('./actionItems.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: ActionItems
 *   description: Meeting Action Items and Assignee Tasks Management
 */

/**
 * @swagger
 * /api/action-items:
 *   post:
 *     summary: Create a new manual action item
 *     description: Creates a PENDING action item linked to an existing meeting owned by the user.
 *     tags: [ActionItems]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - meetingId
 *               - task
 *               - assignee
 *             properties:
 *               meetingId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               task:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Deliver the updated roadmap presentation."
 *               assignee:
 *                 type: string
 *                 maxLength: 255
 *                 example: "bob@domain.com"
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-12-31T23:59:59Z"
 *               citations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - timestamp
 *                     - speaker
 *                     - quote
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       example: "02:15"
 *                     speaker:
 *                       type: string
 *                       example: "Alice"
 *                     quote:
 *                       type: string
 *                       example: "Bob, could you deliver the presentation?"
 *     responses:
 *       201:
 *         description: Action item successfully created.
 *       400:
 *         description: Validation check failed or past due date.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       404:
 *         description: Meeting not found or access restricted.
 */
router.post('/', authenticate, actionItemsController.createActionItem);

/**
 * @swagger
 * /api/action-items/overdue:
 *   get:
 *     summary: Retrieve overdue action items
 *     description: Returns a list of action items that are not COMPLETED and have a past due date.
 *     tags: [ActionItems]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue items loaded successfully.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 */
router.get('/overdue', authenticate, actionItemsController.getOverdueActionItems);

/**
 * @swagger
 * /api/action-items:
 *   get:
 *     summary: Retrieve action items list
 *     description: Returns a paginated list of action items from meetings owned by the caller.
 *     tags: [ActionItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED]
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *       - in: query
 *         name: meetingId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Action items returned successfully.
 *       400:
 *         description: Invalid parameters.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 */
router.get('/', authenticate, actionItemsController.getActionItems);

/**
 * @swagger
 * /api/action-items/{id}/status:
 *   patch:
 *     summary: Update status of an action item
 *     description: Updates the status of a specific action item to PENDING, IN_PROGRESS, or COMPLETED.
 *     tags: [ActionItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN_PROGRESS, COMPLETED]
 *                 example: IN_PROGRESS
 *     responses:
 *       200:
 *         description: Action item status updated successfully.
 *       400:
 *         description: Invalid status value.
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       404:
 *         description: Action item not found or access restricted.
 */
router.patch('/:id/status', authenticate, actionItemsController.updateStatus);

module.exports = router;
