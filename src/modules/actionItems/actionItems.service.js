const prisma = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../utils/errors');
const logger = require('../../config/logger');

/**
 * Creates a new action item under a specified meeting.
 * @param {object} params - Input parameters
 * @param {string} userId - Owner of the meeting
 * @returns {Promise<object>} Created ActionItem
 */
async function createActionItem({ meetingId, task, assignee, dueDate, citations = [] }, userId) {
  // 1. Verify meeting exists and belongs to userId
  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, userId }
  });

  if (!meeting) {
    throw new NotFoundError('Meeting not found or access is restricted.');
  }

  // 2. Validate dueDate is a future date if provided
  let parsedDueDate = null;
  if (dueDate) {
    parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      throw new ValidationError('Due date must be a valid date.');
    }
    if (parsedDueDate <= new Date()) {
      throw new ValidationError('Due date must be a future date.');
    }
  }

  // 3. Create ActionItem with status PENDING
  const actionItem = await prisma.actionItem.create({
    data: {
      meetingId,
      task,
      assignee,
      dueDate: parsedDueDate,
      citations,
      status: 'PENDING'
    }
  });

  logger.info(`Action item successfully created: ${actionItem.id} under meeting ${meetingId}`, { meetingId, actionItemId: actionItem.id });
  return actionItem;
}

/**
 * Updates status of an action item.
 * @param {string} actionItemId - Action item UUID
 * @param {string} status - New status (PENDING, IN_PROGRESS, COMPLETED)
 * @param {string} userId - User UUID verifying ownership
 * @returns {Promise<object>} Updated action item
 */
async function updateActionItemStatus(actionItemId, status, userId) {
  // 1. Verify action item exists and its meeting belongs to userId
  const actionItem = await prisma.actionItem.findFirst({
    where: {
      id: actionItemId,
      meeting: { userId }
    }
  });

  if (!actionItem) {
    throw new NotFoundError('Action item not found or access is restricted.');
  }

  // 2. Validate status is one of PENDING, IN_PROGRESS, COMPLETED
  const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  // 3. Update status
  const updatedItem = await prisma.actionItem.update({
    where: { id: actionItemId },
    data: { status }
  });

  logger.info(`Action item status updated: ${actionItemId} -> ${status}`, { actionItemId, status });
  return updatedItem;
}

/**
 * Retrieve list of action items for the caller.
 * @param {string} userId - Authenticated user UUID
 * @param {object} filters - Query filters and pagination
 * @returns {Promise<object>} Paginated list of action items
 */
async function getActionItems(userId, { status, assignee, meetingId, page = 1, limit = 10 }) {
  const andConditions = [
    { meeting: { userId } }
  ];

  if (status) {
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Status filter must be one of: ${validStatuses.join(', ')}`);
    }
    andConditions.push({ status });
  }

  if (assignee) {
    andConditions.push({
      assignee: { contains: assignee, mode: 'insensitive' }
    });
  }

  if (meetingId) {
    andConditions.push({ meetingId });
  }

  const where = { AND: andConditions };
  const skip = (page - 1) * limit;

  const [actionItems, total] = await prisma.$transaction([
    prisma.actionItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            meetingDate: true
          }
        }
      }
    }),
    prisma.actionItem.count({ where })
  ]);

  return {
    actionItems,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Retrieves overdue action items for the user.
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<Array>} List of overdue action items
 */
async function getOverdueActionItems(userId) {
  const overdueItems = await prisma.actionItem.findMany({
    where: {
      status: { not: 'COMPLETED' },
      dueDate: {
        not: null,
        lt: new Date()
      },
      meeting: { userId }
    },
    include: {
      meeting: {
        select: {
          id: true,
          title: true,
          meetingDate: true
        }
      }
    },
    orderBy: { dueDate: 'asc' }
  });

  return overdueItems;
}

/**
 * Fetch a single action item by ID with ownership validation.
 * @param {string} actionItemId - Action item UUID
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<object>} Action item
 */
async function getActionItemById(actionItemId, userId) {
  const actionItem = await prisma.actionItem.findUnique({
    where: { id: actionItemId },
    include: {
      meeting: {
        select: {
          id: true,
          title: true,
          userId: true,
          meetingDate: true
        }
      }
    }
  });

  if (!actionItem || actionItem.meeting.userId !== userId) {
    throw new NotFoundError('Action item not found or access is restricted.');
  }

  return actionItem;
}

module.exports = {
  createActionItem,
  updateActionItemStatus,
  getActionItems,
  getOverdueActionItems,
  getActionItemById
};
