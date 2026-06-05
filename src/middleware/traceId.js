const { generateTraceId } = require('../utils/traceId');

/**
 * Express middleware to assign a trace ID to the request and response.
 * Reads 'x-trace-id' header, if absent generates a new UUID, and adds it
 * to both req.traceId and the 'X-Trace-Id' response header.
 */
function traceIdMiddleware(req, res, next) {
  const traceId = req.headers['x-trace-id'] || generateTraceId();
  req.traceId = traceId;
  res.setHeader('X-Trace-Id', traceId);
  next();
}

module.exports = traceIdMiddleware;
