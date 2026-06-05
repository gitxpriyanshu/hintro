const { z } = require('zod');
const actionItemsService = require('./actionItems.service');
const { successResponse } = require('../../utils/response');

// Schema definitions for Action Item operations
const createActionItemSchema = z.object({
  meetingId: z.string().uuid({ message: 'meetingId must be a valid UUID format.' }),
  task: z.string().min(1, 'Task description cannot be empty.').max(500, 'Task description cannot exceed 500 characters.'),
  assignee: z.string().min(1, 'Assignee cannot be empty.').max(255, 'Assignee name/email cannot exceed 255 characters.'),
  dueDate: z.string().datetime({ message: 'dueDate must be a valid ISO 8601 datetime format.' }).optional(),
  citations: z.array(
    z.object({
      timestamp: z.string().min(1, 'Citation timestamp is required.'),
      speaker: z.string().min(1, 'Citation speaker is required.'),
      quote: z.string().min(1, 'Citation quote is required.')
    })
  ).optional()
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED'], {
    errorMap: () => ({ message: "Status must be 'PENDING', 'IN_PROGRESS', or 'COMPLETED'." })
  })
});

/**
 * Handles POST /api/action-items
 */
async function createActionItem(req, res, next) {
  try {
    const validatedData = createActionItemSchema.parse(req.body);
    const actionItem = await actionItemsService.createActionItem(validatedData, req.user.userId);
    return successResponse(res, actionItem, 201, req.traceId);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles PATCH /api/action-items/:id/status
 */
async function updateStatus(req, res, next) {
  try {
    const actionItemId = req.params.id;
    const validatedData = updateStatusSchema.parse(req.body);

    const updatedItem = await actionItemsService.updateActionItemStatus(
      actionItemId,
      validatedData.status,
      req.user.userId
    );

    return successResponse(res, updatedItem, 200, req.traceId);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/action-items
 */
async function getActionItems(req, res, next) {
  try {
    const { page, limit, status, assignee, meetingId } = req.query;

    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(50, parseInt(limit, 10)) : 10;

    const result = await actionItemsService.getActionItems(req.user.userId, {
      status,
      assignee,
      meetingId,
      page: pageNum,
      limit: limitNum
    });

    return successResponse(res, result, 200, req.traceId);
  } catch (err) {
    next(err);
  }
}

/**
 * Handles GET /api/action-items/overdue
 */
async function getOverdueActionItems(req, res, next) {
  try {
    const overdueItems = await actionItemsService.getOverdueActionItems(req.user.userId);
    return successResponse(res, overdueItems, 200, req.traceId);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createActionItem,
  updateStatus,
  getActionItems,
  getOverdueActionItems
};
