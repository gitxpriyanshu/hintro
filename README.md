# Hintro Meeting Intelligence Service

Hintro Meeting Intelligence Service is a production-grade backend built with Node.js and Express that processes meeting transcripts to extract valuable insights automatically. Using Claude AI via OpenRouter, the service analyzes transcripts to generate summaries, key decisions, action items, and follow-up suggestions, all grounded with precise timestamp and speaker citations. Additionally, it features an automated cron scheduler that uses Resend to send daily email notifications to meeting participants for overdue action items.

---

## Tech Stack

The service utilizes a robust, modern backend stack:

- **Core Runtime & Web Framework**: Node.js & Express.js
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Artificial Intelligence**: Anthropic Claude AI (via OpenRouter interface)
- **External Communications**: Resend Email API for automated notifications
- **Scheduler**: `node-cron` for periodic overdue action item checks
- **Validation**: Zod for request body and environment validation
- **Logging**: Winston for structured logging with trace ID propagation
- **API Documentation**: Swagger (via `swagger-jsdoc` and `swagger-ui-express`)

---

## Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher)
- **PostgreSQL** (running locally or accessible remotely)
- **npm** (Node Package Manager, typically bundled with Node)

---

## Environment Variables

The application requires several environment variables. Copy `.env.example` to `.env` and configure the values:

| Variable Name | Description | Default / Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URL including credentials and database schema. | `postgresql://postgres:postgres@localhost:5432/hintro_db?schema=public` |
| `JWT_SECRET` | Secret key used to sign and verify JWT authentication tokens. | `super-secret-jwt-key-replace-this-in-production` |
| `JWT_EXPIRES_IN` | Duration for which the JWT token remains valid. | `7d` |
| `OPENROUTER_API_KEY` | API key for OpenRouter to access Claude AI. (Required for meeting analysis). | `sk-or-v1-...` |
| `RESEND_API_KEY` | API key for Resend email service. If omitted, emails are printed to console. | `re_...` |
| `REMINDER_EMAIL_FROM` | Sender address used for overdue action item email alerts. | `reminders@yourdomain.com` |
| `PORT` | Local port number on which the Express server will listen. | `3000` |
| `NODE_ENV` | Environment mode (development, testing, or production). | `development` |

---

## Local Setup Steps

Follow these numbered steps to get the service running locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/priyanshukv/hintro-meeting-intelligence.git
   cd hintro-meeting-intelligence
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Copy environment template file**:
   ```bash
   cp .env.example .env
   ```

4. **Set environment variables**:
   Open `.env` in a text editor and fill in your actual credentials (especially `DATABASE_URL` and `OPENROUTER_API_KEY`).

5. **Run Prisma migrations**:
   Apply migrations to initialize your PostgreSQL database schema:
   ```bash
   npx prisma migrate dev
   ```

6. **Seed the database**:
   Insert initial mock data (users, meetings, transcripts) into the database:
   ```bash
   npx prisma db seed
   ```

7. **Start the development server**:
   Launch the server locally with live reload enabled via Nodemon:
   ```bash
   npm run dev
   ```

---

## API Documentation

Interactive Swagger API documentation is available out of the box. Start the server and navigate to:
- **Local documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

## API Usage Examples

### 1. User Registration
Creates a new account and hashes the password.

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "password": "securePassword123"
  }'
```

### 2. User Login
Authenticates credentials and returns a JWT token.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "janedoe@example.com",
    "password": "securePassword123"
  }'
```
*(Copy the returned `"token"` from the response data for use in subsequent calls).*

### 3. Create a Meeting with Transcript
Creates a new meeting record.

```bash
curl -X POST http://localhost:3000/api/meetings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "title": "Weekly Sprint Sync",
    "participants": ["Jane Doe", "janedoe@example.com", "bob@example.com"],
    "meetingDate": "2026-06-05T10:00:00Z",
    "transcript": [
      { "timestamp": "00:15", "speaker": "Jane Doe", "text": "I will finish the auth module by tomorrow morning." },
      { "timestamp": "01:30", "speaker": "Bob", "text": "Awesome. Let us meet on Monday to deploy it." }
    ]
  }'
```

### 4. Analyze Meeting (Trigger AI Analysis)
Generates AI insights (summaries, decisions, action items, follow-ups) grounded with citations.

```bash
curl -X POST http://localhost:3000/api/analysis/meetings/<MEETING_ID> \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### 5. List Action Items
Lists all action items with pagination and filters.

```bash
curl -X GET "http://localhost:3000/api/action-items?page=1&limit=5" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### 6. Get Overdue Action Items
Retrieves all action items that are past their due dates and not completed.

```bash
curl -X GET http://localhost:3000/api/action-items/overdue \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

---

## Deployment Instructions (Railway)

### Step-by-Step Railway Deployment Guide

Follow these steps to deploy the Meeting Intelligence Service directly to Railway:

1. **Push your code to GitHub**:
   Ensure all local changes (including new files like `Dockerfile`, `railway.toml`, `.dockerignore`, etc.) are committed and pushed to your remote repository:
   ```bash
   git add .
   git commit -m "chore: configure deployment infrastructure"
   git push origin main
   ```

2. **Connect to Railway**:
   Go to [railway.app](https://railway.app), log in, and click **New Project** → **Deploy from GitHub repository**. Select your repository.

3. **Provision PostgreSQL Database**:
   In your Railway project interface, click **New** (or `Ctrl + K`) and choose **Database** → **Add PostgreSQL**. This provisions a managed database instance.

4. **Set Environment Variables**:
   Go to your web service's **Variables** tab in the Railway Dashboard and configure the following:
   - `DATABASE_URL`: Automatically populated by Railway once PostgreSQL is provisioned (references `${{PostgreSQL.DATABASE_URL}}`).
   - `JWT_SECRET`: Generate a secure random string.
   - `JWT_EXPIRES_IN`: e.g., `7d`.
   - `OPENROUTER_API_KEY`: Your OpenRouter API key.
   - `RESEND_API_KEY`: Your Resend API key (optional; if left blank, emails fallback to logger outputs).
   - `REMINDER_EMAIL_FROM`: e.g., `reminders@yourdomain.com` (verified sender email).
   - `PORT`: Automatically set by Railway (internal default is usually `3000`).
   - `NODE_ENV`: Set to `production`.

5. **Automatic Deployment**:
   Railway will automatically pick up the `railway.toml` file, trigger the build using Nixpacks, apply database migrations using `npx prisma migrate deploy` defined in the restart and build triggers, and spin up the container.

6. **Seed the Database**:
   To seed your production database with initial mock users and meetings, authenticate with your CLI locally and run:
   ```bash
   railway run npm run seed
   ```

7. **Update evaluation endpoint reference**:
   Retrieve the public domain URL assigned under the **Settings** tab (or generate one). Update the returned `deployedUrl` value inside the `src/app.js` `/api/evaluation` route handler if needed to align references.

---

## Common Issues & Troubleshooting Fixes

### 1. Prisma Migration Fails
- **Issue**: Deploy logs show failures resolving databases.
- **Fix**: Ensure that `DATABASE_URL` is configured under environment variables in your web service on the Railway Dashboard, and that the PostgreSQL service has finished provisioning successfully.

### 2. Service Binding / Port Configuration Errors
- **Issue**: Railway app builds successfully but repeatedly crashes or times out during health checks.
- **Fix**: Do not hardcode port numbers. Railway binds routing dynamically. Verify the server listens on `process.env.PORT` automatically (e.g., `const PORT = process.env.PORT || 3000;`).

### 3. Resend Email Deliveries Muffled / Inactive
- **Issue**: Overdue reminders are skipped or fail with SMTP/API errors.
- **Fix**: Make sure the domain in `REMINDER_EMAIL_FROM` is verified in your Resend Dashboard, or use Resend's default sandbox domain/address (`onboarding@resend.dev`) to send test emails to your registered account during validation cycles.


---

## Running Tests

Automated unit tests are written with Jest. To run the tests, execute:
```bash
npm test
```
