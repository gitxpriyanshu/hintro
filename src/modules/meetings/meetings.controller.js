const { z } = require('zod');
const meetingsService = require('./meetings.service');
const { successResponse } = require('../../utils/response');

// Schema definitions for incoming request bodies
const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').max(255, 'Title must not exceed 255 characters'),
  participants: z.array(z.string().email('Invalid email address format')).min(1, 'At least one participant is required'),
  meetingDate: z.string().datetime({ message: 'Meeting date must be a valid ISO 8601 datetime format.' }),
  transcript: z.array(z.object({
    timestamp: z.string().min(1, 'Dialogue timestamp is required'),
    speaker: z.string().min(1, 'Speaker identification name is required'),
    text: z.string().min(1, 'Speech transcription text is required')
  })).min(1, 'Transcript must contain at least one dialogue statement.')
});

/**
 * Handle POST /api/meetings
 */
async function createMeeting(req, res, next) {
  try {
    const validatedData = createMeetingSchema.parse(req.body);
    const meeting = await meetingsService.createMeeting({
      ...validatedData,
      userId: req.user.userId
    });
    
    return successResponse(res, meeting, 201, req.traceId);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle GET /api/meetings/:id
 */
async function getMeeting(req, res, next) {
  try {
    const meetingId = req.params.id;
    const userId = req.user.userId;
    const meeting = await meetingsService.getMeetingById(meetingId, userId);
    
    return successResponse(res, meeting, 200, req.traceId);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle GET /api/meetings
 */
async function listMeetings(req, res, next) {
  try {
    const { page, limit, status, from, to } = req.query;
    
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(50, parseInt(limit, 10)) : 10;
    
    const result = await meetingsService.listMeetings(req.user.userId, {
      page: pageNum,
      limit: limitNum,
      status,
      from,
      to
    });
    
    return successResponse(res, result, 200, req.traceId);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle DELETE /api/meetings/:id
 */
async function deleteMeeting(req, res, next) {
  try {
    const meetingId = req.params.id;
    const userId = req.user.userId;
    const result = await meetingsService.deleteMeeting(meetingId, userId);
    
    return successResponse(res, result, 200, req.traceId);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createMeeting,
  getMeeting,
  listMeetings,
  deleteMeeting
};
