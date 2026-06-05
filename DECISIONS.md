# Technical Decisions & Architecture

This document outlines the key technical decisions made during the design and development of the Meeting Intelligence Service. For each decision, we present the chosen technology/approach, the rationale behind it, the alternatives considered, and the associated trade-offs.

---

## 1. Database & ORM

### Decision
Use **PostgreSQL** as the primary relational database with **Prisma ORM** for database access, schema management, and migrations.

### Why Chosen
- **Relational Consistency**: Meeting data, action items, users, and reminder logs are highly relational. Enforcing strict referential integrity (e.g., cascade deletes on meetings deleting associated analysis and action items) ensures data integrity.
- **Developer Productivity**: Prisma provides a type-safe database client generated directly from a human-readable schema (`schema.prisma`). It handles migrations automatically and supports relational joins elegantly, avoiding raw SQL strings.
- **JSON Support**: PostgreSQL has native support for binary JSON (`JSONB`), allowing us to store dynamic structures like raw meeting transcripts and citation lists directly within fields while maintaining performance and indexability.

### Alternatives Considered
- **MongoDB**: Ideal for unstructured data, but lacks robust relational modeling (like foreign key constraint enforcement), meaning orphans could be left behind if a parent meeting is deleted.
- **Sequelize / TypeORM**: Traditional Node.js ORMs, but they lack Prisma's clean declaration schema, automatic type-safety, and modern development tooling (like Prisma Studio).

### Trade-offs
- **Performance Overhead**: Prisma client adds a lightweight query-engine layer which can introduce negligible overhead compared to writing raw SQL queries using a driver like `pg`.
- **Database Migrations lock-in**: Moving to a non-relational database later would require rewriting the schema and database access layer completely.

---

## 2. Authentication

### Decision
Implement stateless **JSON Web Tokens (JWT)** for user session authentication.

### Why Chosen
- **Scalability**: Stateless authentication means the server does not need to maintain active session states in memory or in a database (like Redis). Any instance of the service can verify the token signature using the shared secret.
- **Simplicity**: Extremely simple to implement in Node.js using `jsonwebtoken`. The payload containing `userId` and `email` is easily extracted by the middleware.
- **Stateless Decoupling**: Eases horizontal scaling and containerization, making deployment on cloud platforms like Railway straightforward.

### Alternatives Considered
- **Stateful Sessions (Express-session with Redis/PostgreSQL backend)**: Excellent for instant session revocation, but introduces infrastructure overhead (needs Redis/SQL store) and adds latency to fetch session status on every request.
- **Third-Party Auth (Auth0, Clerk, Firebase Auth)**: Extremely secure but adds external dependency costs, third-party network latency, and integration complexity for a service backend.

### Trade-offs
- **Revocation Difficulty**: Once issued, a JWT is valid until its expiration (`JWT_EXPIRES_IN=7d`) unless a blacklist is implemented, which would re-introduce server-side state. We mitigate this risk by configuring a reasonable expiration time.
- **Payload Size**: Because JWTs carry user data in the payload, they increase header size slightly on every HTTP request.

---

## 3. AI Provider

### Decision
Integrate with **Anthropic Claude (claude-opus-4-5)** via OpenRouter for transcription analysis, summary generation, and action item extraction.

### Why Chosen
- **Superb Context Window & Comprehension**: Meeting transcripts can be long. Claude models are renowned for their massive context window capabilities and high-fidelity text analysis.
- **Strict Adherence to Instructions**: Claude is excellent at strict prompt grounding, which minimizes hallucination and formats complex citation hierarchies (mapping quotes back to transcript timestamps) reliably.
- **Developer API Flexibility**: OpenRouter acts as an API gateway, enabling model-swapping (e.g., swapping to a lighter/cheaper model like `meta-llama/llama-3.3-70b-instruct:free` for development/testing) without changing client libraries.

### Alternatives Considered
- **OpenAI GPT-4o**: Highly competent, but Claude historically performs slightly better on tasks requiring precise factual extraction and strict prompt formatting without hallucinating context.
- **Self-Hosted Open Source Models (Llama, Mistral)**: Avoids API fees, but requires expensive GPU hosting infrastructure and complex engineering to manage cold starts and request queuing.

### Trade-offs
- **Cost**: High-tier models like `claude-opus-4-5` are expensive per million tokens.
- **Latency**: Large LLMs take several seconds to generate structured JSON output for long transcripts. We mitigate this by using asynchronous API endpoints and caching results if a meeting has already been analyzed.

---

## 4. External Integration

### Decision
Use the **Resend Email API** as the delivery channel for overdue action item email notifications.

### Why Chosen
- **Developer Experience**: Resend provides an extremely clean, modern REST API client that replaces cumbersome SMTP setups.
- **Deliverability**: Built on highly reliable infrastructure, ensuring emails don't end up in spam folders.
- **Cost-Effective**: Features a generous free tier of 3,000 emails per month, which is perfect for development, staging, and small-scale production.

### Alternatives Considered
- **Nodemailer with custom SMTP (e.g., Gmail, SendGrid)**: Node's standard solution, but requires complex SMTP connection configuration, credentials rotation, and lacks robust API error reporting.
- **Twilio SendGrid API**: Well established but features a complex console UI, harder setup, and less developer-friendly modern documentation compared to Resend.

### Trade-offs
- **Lock-in**: The email-sending code is written using Resend's Node SDK. Changing providers would require rewriting the sending helper function.
- **Network Call**: Adds a standard REST API latency during cron run, which we manage by executing asynchronously and saving logs.

---

## 5. Scheduler

### Decision
Use **node-cron** to run scheduled background jobs.

### Why Chosen
- **In-Memory Simplicity**: `node-cron` is extremely lightweight and executes directly inside the Node.js application process without requiring external brokers or database queues.
- **Zero Configuration**: Ideal for simple recurring tasks (like scanning the database daily for overdue action items) where a dedicated broker would add unnecessary infrastructure complexity.

### Alternatives Considered
- **BullMQ (with Redis)**: Highly robust and supports persistent jobs, retries, and distributed processing. However, it requires a Redis instance, introducing extra infrastructure costs and setup complexity.
- **External Cron Jobs (e.g., Railway Cron, EasyCron)**: Triggering via HTTP webhook is reliable, but exposes cron endpoints to the public Internet, requiring additional token validation security.

### Trade-offs
- **State Loss on Restart**: Since it runs in-memory, if the Node process restarts during the exact scheduled time, the cron execution is missed.
- **Single Instance Concurrency**: If we horizontally scale the Express server to multiple instances, each instance will trigger the cron job concurrently, resulting in duplicate emails. We mitigate this by using a database-level 24-hour log de-duplication check before sending.

---

## 6. Validation

### Decision
Use **Zod** for schema validation at the HTTP and system boundaries.

### Why Chosen
- **TypeScript-Friendly / Composable**: Zod allows schema definitions that can easily infer runtime validation logic, and integrates with Express routes smoothly.
- **Robust Error Formatting**: Zod generates highly detailed parsing error arrays, mapping exactly which field failed and why.
- **Strict Schema Parsing**: Ensures incoming request bodies align exactly with the database model requirements before hitting controller logic.

### Alternatives Considered
- **Joi**: A mature validation library, but lacks Zod's concise schema parsing syntax and doesn't support TypeScript type-inference as cleanly.
- **Express-Validator**: Integrates directly as route middleware, but spreads validation rules across route arrays, making schemas less reusable.

### Trade-offs
- **Bundle/Execution Size**: Zod is slightly heavier than simpler validation engines, but this is negligible in backend services.

---

## 7. Project Structure

### Decision
Adopt **Feature-Based Modules** to organize the codebase.

### Why Chosen
- **Encapsulation**: Code relating to a single domain concept (e.g., `auth`, `meetings`, `actionItems`, `reminders`) is grouped together into a folder containing its routes, controller, service, and tests.
- **Scalability**: When adding new features (e.g., meeting recordings, transcript uploads), developers can create a self-contained module folder without modifying unrelated components.
- **Maintainability**: Eases locating files and makes file-ownership mapping in large teams straightforward.

### Alternatives Considered
- **Layer-Based Architecture (MVC)**: Grouping all controllers in a `controllers` folder, all routes in `routes`, and all models in `models`. While simple for small projects, it becomes difficult to navigate as the codebase grows.

### Trade-offs
- **Cross-Module Imports**: Requires importing database or logger utilities from parent directories using relative paths (e.g., `../../config/database`).
