const authService = require('../src/modules/auth/auth.service');
const authController = require('../src/modules/auth/auth.controller');
const prisma = require('../src/config/database');
const bcrypt = require('bcryptjs');
const { ZodError } = require('zod');
const { UnauthorizedError, ValidationError } = require('../src/utils/errors');
const errorHandler = require('../src/middleware/errorHandler');

// Mock Prisma database client
jest.mock('../src/config/database', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn()
  }
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

describe('Auth Module Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration Validation', () => {
    test('Should pass ZodError to next() when register is called with missing fields', async () => {
      const req = {
        body: {
          // Missing name, email, and password
        }
      };
      const res = {};
      const next = jest.fn();

      await authController.register(req, res, next);

      // Verify that next was called with a Zod validation error
      expect(next).toHaveBeenCalledTimes(1);
      const errorPassed = next.mock.calls[0][0];
      expect(errorPassed).toBeInstanceOf(ZodError);

      // Verify that running this error through the global errorHandler wraps it in a ValidationError
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockReq = { traceId: 'test-trace-id' };
      
      errorHandler(errorPassed, mockReq, mockRes, () => {});

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('Validation failed')
          })
        })
      );
    });

    test('Should throw ConflictError if user already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id', email: 'existing@example.com' });

      await expect(
        authService.register({
          name: 'Jane Doe',
          email: 'existing@example.com',
          password: 'password123'
        })
      ).rejects.toThrow('A user with this email address already exists.');

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('User Login Authentication', () => {
    test('Should throw UnauthorizedError if user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@example.com',
          password: 'somePassword'
        })
      ).rejects.toThrow(UnauthorizedError);

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    test('Should throw UnauthorizedError if password comparison fails', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        password: 'hashedPassword'
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false); // wrong password

      await expect(
        authService.login({
          email: 'user@example.com',
          password: 'wrongPassword'
        })
      ).rejects.toThrow(UnauthorizedError);

      expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongPassword', 'hashedPassword');
    });
  });
});
