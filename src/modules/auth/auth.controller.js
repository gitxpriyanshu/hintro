const { z } = require('zod');
const authService = require('./auth.service');
const { successResponse } = require('../../utils/response');

// Zod validation schemas
const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' })
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' })
});

/**
 * Handle POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);
    
    // Call service to register user
    const user = await authService.register(validatedData);
    
    // Return unified success response
    return successResponse(res, user, 201, req.traceId);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);
    
    // Call service to login user
    const result = await authService.login(validatedData);
    
    // Return unified success response
    return successResponse(res, result, 200, req.traceId);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle GET /api/auth/profile
 */
async function getProfile(req, res, next) {
  try {
    // Retrieve userId from verified JWT payload attached by authentication middleware
    const userId = req.user.userId;
    
    // Fetch profile info
    const user = await authService.getUserById(userId);
    
    // Return unified success response
    return successResponse(res, user, 200, req.traceId);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getProfile
};
