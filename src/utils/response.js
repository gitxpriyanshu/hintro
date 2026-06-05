/**
 * Unified success response sender.
 * @param {object} res - Express response object
 * @param {any} data - The response data payload
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} [traceId] - Optional request trace ID
 * @returns {object} Express response object
 */
function successResponse(res, data, statusCode = 200, traceId) {
  return res.status(statusCode).json({
    traceId,
    success: true,
    data
  });
}

/**
 * Unified error response sender.
 * @param {object} res - Express response object
 * @param {string} code - Application-level error code
 * @param {string} message - Descriptive error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {string} [traceId] - Optional request trace ID
 * @returns {object} Express response object
 */
function errorResponse(res, code, message, statusCode = 400, traceId) {
  return res.status(statusCode).json({
    traceId,
    success: false,
    error: {
      code,
      message
    }
  });
}

module.exports = {
  successResponse,
  errorResponse
};
