# Read On

Read On is a reading support platform designed to help learners engage with text through pronunciation support, comprehension activities, visualization workflows, and read-aloud experiences. This repository has been refactored into an architecture-aligned scaffold for Carnegie Mellon 18-653 so a new team can rebuild backend capabilities from a clean foundation while preserving the current frontend stack and navigable product shell.

## Product Vision

Read On aims to provide a user-centered reading experience that can support different learning preferences in one place:

- phonics and pronunciation support for difficult words
- reading comprehension activities and feedback
- visualization support for stories and concepts
- read-aloud and audiobook-style assistance
- dashboard and account surfaces for saved work, history, and future personalization

## Current Repository State

The application currently runs as a static Next.js and Chakra UI experience with mock client-side behavior only.

- Frontend routes remain navigable.
- Text entry is persisted client-side for cross-page continuity.
- Authentication is represented by a mock local session strategy.
- Backend-oriented flows are intentionally stubbed and routed through orchestrator interfaces.
- Real provider integrations, database logic, storage logic, caching logic, and business logic have been removed.

## Repository Structure

```text
.
├── microservices/
│   ├── audiobook-service/
│   ├── comprehension-service/
│   ├── phonics-service/
│   ├── image-generation-service/
│   └── dashboard-service/
├── orchestrators/
│   ├── auth/
│   ├── dashboard/
│   └── features/
├── shared/
│   ├── content/
│   ├── session/
│   ├── types/
│   └── notImplemented.ts
├── src/app/
│   └── ... Next.js routes rooted at the repository root
└── views/
    ├── auth/
    ├── components/
    ├── dashboard/
    ├── features/
    ├── home/
    ├── not-found/
    └── providers/
```

## Architectural Style

ReadOn follows a **Microservices + Orchestrator (Backend-for-Frontend)** architecture, layered over a Next.js UI and deployed on Google Cloud Run. The top-level directories (`views/`, `orchestrators/`, `microservices/`, `shared/`, `ops/gcp/`) directly reflect this style — each microservice is independently deployable with its own Dockerfile and MVC structure, the orchestrator layer is the single seam through which the UI composes service calls, and infrastructure-as-code is kept separate from application code.

See [docs/architecture.md](docs/architecture.md) for the full architectural style write-up, dependency direction, and rationale.

## Architectural Separation

### `views/`
Contains UI-facing modules, reusable layout primitives, providers, and route-backed page views. The Next.js app router imports from this layer so page structure remains clean and easy to extend.

### `orchestrators/`
Contains application-flow coordination interfaces that the frontend can call when an action conceptually belongs to backend behavior. In this scaffold, backend-oriented orchestrator functions remain intentionally stubbed or lightweight where needed for mock navigation.

### `microservices/`
Contains feature-specific service skeletons organized as lightweight MVC-style service apps. Each microservice includes routes, controllers, models, and optional services placeholders with implementation pending.

### `shared/`
Contains reusable interfaces, mock content, session abstractions, and common helpers such as the shared `notImplemented()` placeholder used by backend-oriented skeleton code.

## Running the App (local dev)

The **Next.js app** (orchestrator / BFF) and each **microservice** are separate processes. Configure the repo root `.env` with microservice base URLs (see `.env.example`), and put secrets and DB URLs in each service’s own `.env` under `microservices/<name>/.env`.

**Fixed local ports**

| Process | Port |
| --- | --- |
| Main Next.js app | 3000 |
| phonics-service | 3001 |
| comprehension-service | 3002 |
| image-generation-service | 3003 |
| audiobook-service | 3004 |
| dashboard-service | 3005 |

**Typical startup (one terminal per service)**

```bash
npm install
# optional: npm install in each microservices/*/ that has its own package.json

npm run dev                              # main app → http://127.0.0.1:3000
npm run dev:phonics                      # http://127.0.0.1:3001
npm run dev:comprehension                # http://127.0.0.1:3002
npm run dev:image-generation             # http://127.0.0.1:3003
npm run dev:audiobook                    # http://127.0.0.1:3004
npm run dev:dashboard                    # http://127.0.0.1:3005
```

**Optional:** `npm run dev:all` runs the main app plus all of the above via `concurrently` (local only).

**Health checks:** each microservice exposes `GET /health` (and usually `/live`, `/ready`, `/meta` where applicable). With nothing bound on 3001–3005, run `npm run verify:services` to spawn each service briefly and `curl` its `/health`.

**Deeper checks:** `npm run verify:endpoints` exercises `/health`, `/live`, `/ready`, `/meta`, and one representative feature route per microservice (ports 3001–3005). **Comprehension local DB:** set `DATABASE_URL` in `microservices/comprehension-service/.env`; it takes precedence over `READON_DATABASE_NAME` + Cloud SQL socket (see that service’s `.env.example`).

**Cloud Run:** containers listen on `PORT` (typically **8080** from the platform). URLs between services are set at deploy time, not via localhost.

## Frontend Behavior

Available routes:

- `/`
- `/auth`
- `/dashboard`
- `/phonics`
- `/comprehension`
- `/visualization`
- `/audiobook`

Notes:

- `/interactive` has been removed.
- The homepage preserves the overall product feel while updating the product-facing copy.
- The dashboard requires a mock session token stored in local storage.
- Feature page action buttons intentionally surface placeholder behavior through orchestrators instead of direct service calls.

## Backend Scaffold Expectations

Each microservice directory is intentionally implementation-pending. Route handlers call controller placeholders, controller functions delegate conceptually to future business logic, and critical backend-oriented functions use explicit `NotImplemented` behavior.

This keeps the codebase ready for teammates to add real APIs, storage, data models, and service coordination without inheriting previous implementation constraints.

## Google Cloud Deployment (Skeleton Infra)

This repository includes infrastructure wiring (containerization, Cloud Run deployment scaffolding, health endpoints, and operational config plumbing) while keeping all feature/business logic intentionally stubbed.

- **Ops scripts:** `ops/gcp/README.md` — provision, prod/test deploy, verify.
- **Dual environment:** same project; `dev` branch → test Cloud Run services, `main` → prod ([docs/environment-separation.md](docs/environment-separation.md)).
- **CI/CD:** GitHub Actions + Workload Identity Federation ([docs/cicd-overview.md](docs/cicd-overview.md)).
- **Config template:** `.env.example`

Planned or partial future pieces (not fully productized here) include Redis/Memorystore and richer service auth beyond the skeleton.
