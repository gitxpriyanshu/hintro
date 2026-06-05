const logger = require('../config/logger');
const { errorResponse } = require('../utils/response');
const { AppError, ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const { ZodError } = require('zod');

/**
 * Global Express error handling middleware.
 * Normalizes different error types (AppError subclasses, Zod validations, Prisma database constraints)
 * into consistent HTTP error responses, and logs failures using the trace ID.
 */
function errorHandler(err, req, res, next) {
  let error = err;
  const traceId = req.traceId;

  // 1. Catches Zod Validation Errors -> ValidationError
  if (err instanceof ZodError || err.name === 'ZodError') {
    const details = err.errors && Array.isArray(err.errors)
      ? err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      : err.message;
    error = new ValidationError(`Validation failed: ${details}`);
  }

  // 2. Catches Prisma Known Request Errors
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      const target = err.meta && Array.isArray(err.meta.target)
        ? ` on field(s): (${err.meta.target.join(', ')})`
        : '';
      error = new ConflictError(`Unique constraint violation${target}`);
    } else if (err.code === 'P2025') {
      error = new NotFoundError(err.meta?.cause || 'Requested record was not found');
    }
  }

  // 3. Resolve status code and application error code
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const errorCode = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  
  // Do not expose full stack trace/raw messages in production for 500 errors
  const isProduction = process.env.NODE_ENV === 'production';
  const errorMessage = statusCode === 500 && isProduction
    ? 'An unexpected error occurred'
    : error.message || 'Internal Server Error';

  // 4. Log the error with request details and traceId
  logger.error(`Error processing request: ${req.method} ${req.path}`, {
    traceId,
    method: req.method,
    path: req.path,
    statusCode,
    errorCode,
    stack: err.stack,
    originalError: {
      name: err.name,
      code: err.code,
      meta: err.meta
    }
  });

  // 5. Send unified error response
  return errorResponse(res, errorCode, errorMessage, statusCode, traceId);
}

module.exports = errorHandler;
