const express = require('express');
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User Registration, Authentication, and Session Management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account, hashes their password, and saves them to the database.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: superSecret123
 *     responses:
 *       201:
 *         description: User registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 traceId:
 *                   type: string
 *                   example: 22fb753d-d249-4171-aa34-1c6d86a6358c
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 45dbad5e-0498-4b7f-b258-3f5f67a213e4
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       example: johndoe@example.com
 *                     createdAt:
 *                       type: string
 *                       example: "2026-06-03T15:30:00Z"
 *                     updatedAt:
 *                       type: string
 *                       example: "2026-06-03T15:30:00Z"
 *       400:
 *         description: Invalid input or validation failed.
 *       409:
 *         description: A user with this email address already exists.
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in an existing user
 *     description: Validates email and password, returning user info and a JWT session token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 example: superSecret123
 *     responses:
 *       200:
 *         description: Authentication successful. Returns user profile and access token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 traceId:
 *                   type: string
 *                   example: 22fb753d-d249-4171-aa34-1c6d86a6358c
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Invalid input fields.
 *       401:
 *         description: Invalid email or password.
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Retrieve user profile
 *     description: Returns the user profile metadata based on the verified JWT token.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 traceId:
 *                   type: string
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Missing, invalid, or expired session token.
 */
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
