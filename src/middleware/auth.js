const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');

/**
 * Middleware to enforce authentication via JWT.
 * Validates 'Authorization: Bearer <token>' header.
 * Attaches { userId, email } payload to req.user on success.
 * Throws UnauthorizedError on failure.
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const token = authHeader.substring(7); // Extract token from "Bearer <token>"
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      throw new Error('Server Configuration Error: JWT_SECRET environment variable is missing.');
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = {
        userId: decoded.userId,
        email: decoded.email
      };
      next();
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware to optionally authenticate a request.
 * If token is absent, calls next() directly.
 * If token is present but invalid/expired, throws UnauthorizedError.
 * If token is present and valid, attaches req.user.
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Proceed without req.user
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('Server Configuration Error: JWT_SECRET environment variable is missing.');
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = {
        userId: decoded.userId,
        email: decoded.email
      };
      next();
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  authenticate,
  optionalAuth
};
