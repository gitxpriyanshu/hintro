const prisma = require('../../config/database');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates a new meeting record in the database.
 * @param {object} params
 * @param {string} params.title
 * @param {string[]} params.participants
 * @param {string} params.meetingDate
 * @param {object[]} params.transcript
 * @param {string} params.userId
 * @returns {Promise<object>}
 */
async function createMeeting({ title, participants, meetingDate, transcript, userId }) {
  // Service-level defensive validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new ValidationError('Meeting title is required.');
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    throw new ValidationError('Participants must be a non-empty array of email strings.');
  }

  for (const email of participants) {
    if (typeof email !== 'string' || !emailRegex.test(email.trim())) {
      throw new ValidationError(`Invalid participant email address found: ${email}`);
    }
  }

  if (!meetingDate) {
    throw new ValidationError('Meeting date is required.');
  }
  const parsedDate = new Date(meetingDate);
  if (isNaN(parsedDate.getTime())) {
    throw new ValidationError('Invalid meeting date representation.');
  }

  if (!Array.isArray(transcript)) {
    throw new ValidationError('Transcript must be a structured array of speech objects.');
  }

  for (const utterance of transcript) {
    if (
      !utterance ||
      typeof utterance !== 'object' ||
      typeof utterance.timestamp !== 'string' ||
      typeof utterance.speaker !== 'string' ||
      typeof utterance.text !== 'string'
    ) {
      throw new ValidationError('Each transcript entry must specify timestamp, speaker, and text fields.');
    }
  }

  return await prisma.meeting.create({
    data: {
      title: title.trim(),
      participants: participants.map(email => email.trim().toLowerCase()),
      meetingDate: parsedDate,
      transcript,
      status: 'PENDING',
      userId
    }
  });
}

/**
 * Fetches a single meeting by ID, guarded by ownership check.
 * @param {string} meetingId - Meeting UUID
 * @param {string} userId - User UUID
 * @returns {Promise<object>} Meeting object with nested analysis and actionItems
 */
async function getMeetingById(meetingId, userId) {
  const meeting = await prisma.meeting.findFirst({
    where: {
      id: meetingId,
      userId
    },
    include: {
      analysis: true,
      actionItems: true
    }
  });

  if (!meeting) {
    throw new NotFoundError('Meeting could not be found or access is restricted.');
  }

  return meeting;
}

/**
 * Query a paginated list of meetings, filtered by status and date range.
 * @param {string} userId - User UUID
 * @param {object} filters
 * @param {number} [filters.page]
 * @param {number} [filters.limit]
 * @param {string} [filters.status]
 * @param {string} [filters.from]
 * @param {string} [filters.to]
 * @returns {Promise<object>} Paginated details
 */
async function listMeetings(userId, { page = 1, limit = 10, status, from, to }) {
  const where = { userId };

  if (status) {
    where.status = status;
  }

  // Handle date filters
  if (from || to) {
    where.meetingDate = {};
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        where.meetingDate.gte = fromDate;
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        where.meetingDate.lte = toDate;
      }
    }
  }

  // Parse and boundary-check pagination limits
  const parsedPage = Math.max(1, parseInt(page, 10));
  const parsedLimit = Math.max(1, Math.min(50, parseInt(limit, 10)));
  const skip = (parsedPage - 1) * parsedLimit;

  const [meetings, total] = await prisma.$transaction([
    prisma.meeting.findMany({
      where,
      skip,
      take: parsedLimit,
      orderBy: { meetingDate: 'desc' }
    }),
    prisma.meeting.count({ where })
  ]);

  const totalPages = Math.ceil(total / parsedLimit);

  return {
    meetings,
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages
  };
}

/**
 * Deletes a meeting by ID, checking ownership first.
 * @param {string} meetingId - Meeting UUID
 * @param {string} userId - User UUID
 * @returns {Promise<{deleted: boolean}>}
 */
async function deleteMeeting(meetingId, userId) {
  const meeting = await prisma.meeting.findFirst({
    where: {
      id: meetingId,
      userId
    }
  });

  if (!meeting) {
    throw new NotFoundError('Meeting could not be found or access is restricted.');
  }

  await prisma.meeting.delete({
    where: { id: meetingId }
  });

  return { deleted: true };
}

module.exports = {
  createMeeting,
  getMeetingById,
  listMeetings,
  deleteMeeting
};
