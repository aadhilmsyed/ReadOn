# ReadOn Architecture

## Architectural Style

ReadOn follows a **Microservices** architecture with an **Orchestrator (Backend-for-Frontend)** layer in front of the services, deployed on Google Cloud Run. The overall style combines three well-known patterns:

1. **Microservices** — Each product capability (phonics, comprehension, visualization, audiobook) is a separately deployable service with its own container image, runtime, and service account. Services do not share code paths at runtime; they communicate only through explicit interfaces.
2. **Backend-for-Frontend (BFF) / Orchestrator** — The Next.js frontend never calls microservices directly. It calls orchestrator modules, which aggregate and coordinate downstream service calls and expose frontend-shaped contracts. This decouples UI evolution from service evolution.
3. **Layered separation of concerns** — UI (`views/`), application coordination (`orchestrators/`), domain services (`microservices/`), and cross-cutting contracts (`shared/`) are kept in distinct top-level directories so dependencies only flow in one direction: `views → orchestrators → microservices`, with `shared/` available to all layers.

Infrastructure-as-code and CI/CD are treated as first-class and live outside the application layers (`ops/gcp/`, `.github/workflows/`), keeping operational concerns separated from business code.

## How the Code Organization Reflects the Style

```text
ReadOn/
├── views/              # UI layer (Next.js pages + components)
├── src/app/            # Next.js app-router entry points, delegate to views/
├── orchestrators/      # BFF layer: auth, dashboard, features, serviceOrchestrator.ts
├── microservices/      # One directory per independently deployable service
│   ├── phonics-service/        (routes, controllers, models, services, Dockerfile, server.js)
│   ├── comprehension-service/  (same MVC shape)
│   ├── visualization-service/  (same MVC shape)
│   └── audiobook-service/      (same MVC shape)
├── shared/             # Cross-cutting contracts: types, session, content, helpers
├── ops/gcp/            # Infrastructure-as-code (Cloud Run, Cloud SQL, GCS, IAM)
└── .github/workflows/  # CI/CD pipelines (Workload Identity Federation)
```

Key structural guarantees that make the style visible at a glance:

- **Service autonomy** — Every microservice owns its own `Dockerfile`, `server.js`, and MVC folders (`routes/`, `controllers/`, `models/`, `services/`). No service imports another service's internals.
- **Orchestrator seam** — The frontend depends on `orchestrators/*`, never on `microservices/*`. This is the single seam where cross-service composition lives.
- **Contract-only sharing** — `shared/` holds types, session abstractions, and the explicit `notImplemented()` placeholder used by stubbed skeleton code. It never holds service business logic.
- **Dual-environment deployment topology** — The same code organization deploys to parallel stacks (`*-test` and prod) via branch mapping (`dev` → test, `main` → prod). See [environment-separation.md](environment-separation.md).

## Dependency Direction

```
views/  ──►  orchestrators/  ──►  microservices/
    │              │                    │
    └──────────────┴─────► shared/ ◄────┘
```

`shared/` is consumed by every layer but depends on none of them. Nothing depends on `views/`.

## Why This Style

- **Independent deployability** — Each service can be iterated and rolled out without redeploying the whole app (matches Cloud Run's per-service deploy model).
- **Scoped blast radius** — A bug or outage in one service degrades one capability; the BFF can surface a partial result.
- **Team parallelism** — Different capabilities (phonics, comprehension, visualization, audiobook) can be owned by different sub-teams with minimal cross-cutting changes.
- **Frontend stability** — Orchestrators absorb service-shape churn, so frontend code doesn't break when a downstream service evolves.

## Related Documents

- [infrastructure-overview.md](infrastructure-overview.md) — Cloud Run, Cloud SQL, GCS topology
- [service-access-model.md](service-access-model.md) — Service-to-service auth and IAM
- [environment-separation.md](environment-separation.md) — Prod/test stack separation
- [cicd-overview.md](cicd-overview.md) — CI/CD pipeline
- [deployment-guide.md](deployment-guide.md) — Deployment procedures
