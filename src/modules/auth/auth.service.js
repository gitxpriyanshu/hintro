const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');
const { ConflictError, UnauthorizedError, NotFoundError } = require('../../utils/errors');

/**
 * Helper to remove sensitive fields (e.g. password) from user object.
 * @param {object} user - Raw database user object
 * @returns {object} Cleaned user object
 */
function sanitizeUser(user) {
  if (!user) return null;
  const sanitized = { ...user };
  delete sanitized.password;
  return sanitized;
}

/**
 * Register a new user.
 * @param {object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<object>} The registered user object without password
 */
async function register({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    throw new ConflictError('A user with this email address already exists.');
  }

  // Hash the password with 12 salt rounds
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create the new user record
  const newUser = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      password: hashedPassword
    }
  });

  return sanitizeUser(newUser);
}

/**
 * Authenticate a user and return user data and JWT token.
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<{user: object, token: string}>}
 */
async function login({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  // Compare passwords
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  // Generate JWT token
  const jwtSecret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!jwtSecret) {
    throw new Error('Server Configuration Error: JWT_SECRET environment variable is missing.');
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    jwtSecret,
    { expiresIn }
  );

  return {
    user: sanitizeUser(user),
    token
  };
}

/**
 * Fetch a user profile by ID.
 * @param {string} userId - UUID of the user
 * @returns {Promise<object>} Sanatized user profile
 */
async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new NotFoundError('User could not be found.');
  }

  return sanitizeUser(user);
}

module.exports = {
  register,
  login,
  getUserById
};
