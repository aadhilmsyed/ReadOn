# Comprehension Service

Backend-only microservice for ReadOn reading comprehension workflows.

The browser must not call this service directly. The main Next.js app calls it through server-side BFF routes under `/api/comprehension`, using `READON_COMPREHENSION_SERVICE_URL`.

## Runtime

This service runs from plain Node.js:

```bash
node microservices/comprehension-service/server.js
```

Runtime code is JavaScript and is reachable from `server.js`. There is no Express/Fastify app, ORM, queue, worker, or event bus.

## API

Swagger UI:

```text
GET /swagger
```

Raw contract used by the Swagger UI:

```text
GET /swagger/comprehensionservice.yaml
```

Feature endpoints:

```text
POST /comprehension/questions
GET  /comprehension/questions/{resultId}
POST /comprehension/questions/{resultId}/answers
GET  /comprehension/history
```

Operational endpoints inherited from the shared HTTP server:

```text
GET /health
GET /live
GET /ready
GET /meta
```

## Required Environment

Comprehension persistence uses the shared database environment format from `.env.example`.

```bash
READON_DATABASE_NAME=comprehension
READON_DATABASE_HOST=localhost
READON_DATABASE_PORT=5432
READON_DATABASE_USER=readon
READON_DATABASE_PASSWORD=REPLACE_ME
```

`DATABASE_URL` is still supported as a fallback when `READON_DATABASE_NAME` is not set. If the password contains special characters in `DATABASE_URL`, URL-encode them.

The main app needs this to call the service:

```bash
READON_COMPREHENSION_SERVICE_URL=http://127.0.0.1:3002
```

Circuit breaker and provider settings:

```bash
READON_COMPREHENSION_LLM_PROVIDER=scaffold
READON_COMPREHENSION_LLM_ENDPOINT=
READON_COMPREHENSION_LLM_TIMEOUT_MS=30000
READON_COMPREHENSION_CIRCUIT_BREAKER_FAILURE_THRESHOLD=3
READON_COMPREHENSION_CIRCUIT_BREAKER_RESET_MS=60000
```

When `READON_COMPREHENSION_LLM_ENDPOINT` is missing or failing, the service returns fallback questions. It first tries a saved result for the same text hash, then deterministic backup questions.

## Database

Database name expected for this feature:

```text
comprehension
```

Migration runner:

```bash
READON_DATABASE_NAME=comprehension \
READON_DATABASE_HOST=localhost \
READON_DATABASE_USER=readon \
READON_DATABASE_PASSWORD=REPLACE_ME \
node microservices/comprehension-service/db/migrate.js
```

Tables:

```text
comprehension_results
comprehension_questions
comprehension_answer_history
comprehension_schema_migrations
```

The migration files live in:

```text
microservices/comprehension-service/db/migrations/
```

## Local Run

From the repo root, apply migrations:

```bash
READON_DATABASE_NAME=comprehension \
READON_DATABASE_HOST=localhost \
READON_DATABASE_USER=kuhoos \
node microservices/comprehension-service/db/migrate.js
```

Start the service:

```bash
READON_DATABASE_NAME=comprehension \
READON_DATABASE_HOST=localhost \
READON_DATABASE_USER=kuhoos \
HOST=127.0.0.1 \
PORT=3002 \
node microservices/comprehension-service/server.js
```

In another terminal, start the main app:

```bash
READON_COMPREHENSION_SERVICE_URL=http://127.0.0.1:3002 \
npm run dev
```

Open:

```text
http://localhost:3000/comprehension
```

## Cloud SQL Assumptions

Cloud SQL database:

```text
comprehension
```

The service needs `READON_DATABASE_NAME=comprehension` at runtime. With Cloud Run Cloud SQL connectivity, `CLOUDSQL_CONNECTION_NAME` is mounted at `/cloudsql/<connection-name>` and is used as the socket host when `READON_DATABASE_HOST` is not set. Provide `READON_DATABASE_USER` and `READON_DATABASE_PASSWORD` through Secret Manager or Cloud Run environment variables rather than committing credentials.

For public-IP local access to Cloud SQL, the client IP must be authorized in Cloud SQL authorized networks. If direct public-IP access times out, use one of these instead:

- Cloud SQL Auth Proxy
- Cloud Run with Cloud SQL connectivity
- Cloud Build or another environment with Cloud SQL access

## How To Demo

1. Start PostgreSQL and ensure the `comprehension` database exists.
2. Run the migration command above.
3. Start the Comprehension service.
4. Start the main app with `READON_COMPREHENSION_SERVICE_URL`.
5. Open the home page and paste reading text.
6. Open `/comprehension`.
7. Click `Generate Questions`.
8. Select an answer for each question.
9. Click `Submit Answers`.
10. Confirm the score and answer feedback appear.
11. Sign in with the mock auth flow and repeat to see recent history.

Fallback demo:

```bash
READON_COMPREHENSION_CIRCUIT_BREAKER_FAILURE_THRESHOLD=1 \
READON_COMPREHENSION_LLM_ENDPOINT= \
READON_DATABASE_NAME=comprehension \
READON_DATABASE_HOST=localhost \
READON_DATABASE_USER=kuhoos \
HOST=127.0.0.1 \
PORT=3002 \
node microservices/comprehension-service/server.js
```

Generate questions. The response and UI should show backup questions.

## Tests

Circuit breaker tests:

```bash
npm test
```

Full app checks:

```bash
npm run lint
npm run build
```
