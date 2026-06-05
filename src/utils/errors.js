/**
 * Base custom error class for the application.
 */
class AppError extends Error {
  /**
   * Create an AppError.
   * @param {string} message - Error description
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Application-specific error code
   */
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error raised when input validation fails.
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * Error raised when a resource is not found.
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Error raised when access is unauthorized.
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Error raised when there is a state conflict (e.g., unique key violation).
 */
class ConflictError extends AppError {
  constructor(message = 'Conflict occurred') {
    super(message, 409, 'CONFLICT');
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError
};
