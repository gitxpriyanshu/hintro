const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const traceIdMiddleware = require('./middleware/traceId');
const errorHandler = require('./middleware/errorHandler');
const { setupSwagger } = require('./config/swagger');

// Import routers
const authRouter = require('./modules/auth/auth.routes');
const meetingsRouter = require('./modules/meetings/meetings.routes');
const analysisRouter = require('./modules/analysis/analysis.routes');
const actionItemsRouter = require('./modules/actionItems/actionItems.routes');
const remindersRouter = require('./modules/reminders/reminder.routes');

const app = express();

// Security headers - disable Content Security Policy only for Swagger UI to load successfully
app.use((req, res, next) => {
  if (req.path.startsWith('/api/docs')) {
    helmet({ contentSecurityPolicy: false })(req, res, next);
  } else {
    helmet()(req, res, next);
  }
});

// Cross-Origin Resource Sharing
app.use(cors({ origin: '*' }));

// Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Trace ID propagation
app.use(traceIdMiddleware);

// Rate limiter to prevent API abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again later.'
    }
  }
});
app.use(limiter);

// Initialize Swagger API documentation
setupSwagger(app);

// GET /health -> { status: "UP" }
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Setup API router prefix
const apiRouter = express.Router();

// GET /api/evaluation
apiRouter.get('/evaluation', (req, res) => {
  res.status(200).json({
    candidateName: 'Priyanshu Kumar Verma',
    email: 'priyanshukumarverma@gmail.com',
    repositoryUrl: 'https://github.com/gitxpriyanshu/hintro',
    deployedUrl: 'https://hintro-meeting-intelligence-vu3v.onrender.com',
    externalIntegration: 'Resend Email API',
    features: [
      'JWT Authentication',
      'Meeting Management with Pagination',
      'AI Analysis with Llama 3.3 70B (Groq)',
      'Transcript-Grounded Citations',
      'Hallucination Prevention',
      'Action Item Management',
      'Overdue Detection',
      'Scheduled Reminders (node-cron)',
      'Email Notifications via Resend',
      'Swagger API Documentation',
      'Request Trace IDs',
      'Structured Winston Logging',
      'Global Error Handling',
      'Input Validation (Zod)'
    ]
  });
});

// Mount routers under /api prefix
apiRouter.use('/auth', authRouter);
apiRouter.use('/meetings', meetingsRouter);
apiRouter.use('/meetings', analysisRouter); // analysis routes also start with /api/meetings
apiRouter.use('/action-items', actionItemsRouter);
apiRouter.use('/reminders', remindersRouter);

app.use('/api', apiRouter);

// Fallback for unmatched endpoints (404 handler)
app.use('*', (req, res) => {
  res.status(404).json({
    traceId: req.traceId,
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Mount global errorHandler last
app.use(errorHandler);

module.exports = app;
