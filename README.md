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
│   └── visualization-service/
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

## Architectural Separation

### `views/`
Contains UI-facing modules, reusable layout primitives, providers, and route-backed page views. The Next.js app router imports from this layer so page structure remains clean and easy to extend.

### `orchestrators/`
Contains application-flow coordination interfaces that the frontend can call when an action conceptually belongs to backend behavior. In this scaffold, backend-oriented orchestrator functions remain intentionally stubbed or lightweight where needed for mock navigation.

### `microservices/`
Contains feature-specific service skeletons organized as lightweight MVC-style service apps. Each microservice includes routes, controllers, models, and optional services placeholders with implementation pending.

### `shared/`
Contains reusable interfaces, mock content, session abstractions, and common helpers such as the shared `notImplemented()` placeholder used by backend-oriented skeleton code.

## Running the App

```bash
npm install
npm run dev
```

The app runs from the repository root using Next.js.

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
