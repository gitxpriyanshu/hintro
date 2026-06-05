# Changelog

All notable changes to the Meeting Intelligence Service will be documented in this file.

---

## [1.0.0] - 2026-06-05
### Added
- Deployment configuration and infrastructure pipeline setup on Railway.
- Finished full project developer documentation including README, decisions register, AI approach breakdown, testing outlines, and completeness checklists.

---

## [0.8.0] - 2026-06-04
### Added
- Comprehensive input and payload validation using Zod schemas on authentication, meeting, and action item routes.
- Centralized custom error classes (`ValidationError`, `NotFoundError`, `ConflictError`, `UnauthorizedError`) and global error handler middleware.
- Database seed script (`prisma/seed.js`) populating initial mock data for developmental testing.

---

## [0.7.0] - 2026-06-02
### Added
- Interactive API documentation using Swagger UI mounted at `/api/docs`.
- Request-specific trace ID generation (`uuid`) and middleware inclusion.
- Structured logging configuration using Winston showing method, path, HTTP status, and trace ID context.

---

## [0.6.0] - 2026-05-30
### Added
- Scheduled reminder background job utilizing `node-cron`.
- Real third-party email service integration using Resend Email API client.
- 24-hour reminder email de-duplication verification utilizing database `ReminderLog` logs.

---

## [0.5.0] - 2026-05-25
### Added
- Action item management routes and controller functions (CRUD, filter by assignee/status/meeting).
- Status update endpoint (e.g. updating task status to `COMPLETED`).
- Overdue action item detection logic filtering items that are uncompleted and past their due date.

---

## [0.4.0] - 2026-05-20
### Added
- Meeting transcript analysis engine calling OpenRouter Claude AI model.
- Citation extraction format mapping insights to specific transcript parts.
- Hallucination validation matching generated citation timestamps back against actual transcript segments.

---

## [0.3.0] - 2026-05-15
### Added
- Meeting management endpoints (creating meeting, retrieving meeting by ID).
- Paginated listing support for meeting records with metadata summaries.

---

## [0.2.0] - 2026-05-10
### Added
- User authentication module implementing register and login services.
- Password encryption using 12-round salt hashing with `bcryptjs`.
- JWT sign and token verification middleware.

---

## [0.1.0] - 2026-05-01
### Added
- Initial project scaffold and Express.js framework setup.
- Prisma schema definition for PostgreSQL modeling User, Meeting, MeetingAnalysis, ActionItem, and ReminderLog schemas.
