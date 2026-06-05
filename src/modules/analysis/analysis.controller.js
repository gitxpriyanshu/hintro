const analysisService = require('./analysis.service');
const { successResponse } = require('../../utils/response');

/**
 * Handle POST /api/meetings/:id/analyze
 * Triggers transcription scanning and intelligence processing.
 */
async function analyzeMeeting(req, res, next) {
  try {
    const meetingId = req.params.id;
    const userId = req.user.userId;
    const analysis = await analysisService.analyzeMeeting(meetingId, userId, req.traceId);
    
    return successResponse(res, analysis, 200, req.traceId);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle GET /api/meetings/:id/analysis
 * Fetches the saved intelligence report for a meeting.
 */
async function getAnalysis(req, res, next) {
  try {
    const meetingId = req.params.id;
    const userId = req.user.userId;
    const analysis = await analysisService.getAnalysisByMeetingId(meetingId, userId);
    
    return successResponse(res, analysis, 200, req.traceId);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  analyzeMeeting,
  getAnalysis
};
