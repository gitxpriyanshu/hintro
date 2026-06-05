# Testing Strategy & Scenarios

This document outlines the testing strategy, specific unit test scenarios, edge cases considered, and testing limitations of the Meeting Intelligence Service.

---

## Unit Test Scenarios

Below is the list of 10 primary unit test scenarios implemented or planned for the service, specifying the mock input and expected output:

| # | Feature Area | Scenario Description | Mock Input | Expected Output |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Auth: Register** | Missing required fields (e.g. password) | Request body without `password` field. | Throws `ValidationError` (Zod validation fails on schema parsing). |
| 2 | **Auth: Register** | Existing email check | Email `existing@example.com` that matches an existing Prisma user. | Throws `ConflictError` ("A user with this email address already exists"). |
| 3 | **Auth: Login** | Wrong password provided | Correct email, but password does not match hash via `bcrypt.compare`. | Throws `UnauthorizedError` ("Invalid email or password"). |
| 4 | **Auth: Login** | Unregistered email | Email that does not exist in the database. | Throws `UnauthorizedError` ("Invalid email or password"). |
| 5 | **Meetings: Create** | Missing transcript elements | Meeting request with `transcript: []` (empty array). | Throws validation schema error (Zod schema parses and rejects). |
| 6 | **Meetings: Create** | Valid details | Valid title, date, participants list, and transcript array. | Returns newly created `Meeting` record with status `PENDING`. |
| 7 | **Analysis: Analyze** | Already analyzed meeting | Meeting ID of a meeting already in state `ANALYZED` with database analysis report attached. | Returns cached database analysis results without making external AI API calls. |
| 8 | **Analysis: Analyze** | Mock AI response parsing | Successful OpenRouter completion with valid JSON payload. | Correctly saves analysis report to DB and returns action items list. |
| 9 | **ActionItems: Update**| Mark item as `COMPLETED` | ID of a `PENDING` action item and new status `COMPLETED`. | Action item status updated to `COMPLETED` in DB, logs update, returns record. |
| 10 | **ActionItems: Overdue**| Overdue detection logic | Set `dueDate` to a past date (e.g., yesterday) and status `PENDING`. | `getOverdueActionItems` query fetches this item and returns it in results. |

---

## Edge Cases Considered

1. **Empty Transcript array**: Checked at the schema input level. Creating a meeting requires at least one transcript entry to prevent spending AI credits on blank meetings.
2. **Single Participant / Speaker**: When only one speaker is present in a transcript, the AI is still able to parse summary points but may extract fewer decisions or action items. Grounding and citations still correctly map back to the single speaker.
3. **Double AI Trigger (Race Condition)**: If a user triggers the analysis endpoint multiple times in quick succession, the database status `ANALYZED` check at step 1 immediately stops duplicate API requests and transaction writes by returning cached results.
4. **No Overdue Items**: If a scan runs when no items are overdue, the scheduler completes gracefully, logging 0 processed items and sending no email requests.
5. **Reminder De-duplication**: When scanning for overdue action items, the database logs each notification in `ReminderLog`. The service queries this log to verify that no `SENT` log exists within the last 24 hours for a specific item, preventing spamming users on daily cron cycles.

---

## Limitations

- **No Integration Tests for Resend in CI**: Sending emails via the Resend API during unit testing is bypassed. If `RESEND_API_KEY` is not set, the reminder service falls back to safe console logging (`[MOCK EMAIL]`) and returns a mock success status.
- **AI Completion Mocking**: Live API connections to OpenRouter/Claude are mocked during unit tests. We simulate both successful JSON completions and connection failures (to verify the double-retry logic) by mocking the `openai` client.
- **Prisma Client Database Isolation**: Unit tests utilize Jest mocks (`jest.mock`) to mock Prisma client interactions (`prisma.actionItem.findMany`, `prisma.actionItem.update`, etc.) to run quickly without requiring a live PostgreSQL instance.
