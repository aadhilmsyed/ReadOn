# dashboard-service

Owns the `stories` metadata CRUD that backs the dashboard's history view and
the home page's button-click create flow. Holds **four** pg connection pools —
one per feature database (`phonics`, `comprehension`, `images`, `audiobook`)
— and exposes a per-feature REST surface so the Next.js orchestrator layer can
fan out across features without taking on cross-DB concerns itself.

This service exists so the four feature-team microservices stay untouched
while the dashboard still has a clean place to own its own data lifecycle.

## Endpoints

| Method | Path                              | Purpose                                        |
| ------ | --------------------------------- | ---------------------------------------------- |
| POST   | `/history/:feature`               | Create a story (`{title, source_text}`)        |
| GET    | `/history/:feature?limit=N`       | List N most-recent stories (default 10, max 100) |
| GET    | `/history/:feature/:storyId`      | Fetch one story (used to prefill home page)    |
| GET    | `/health` `/live` `/ready` `/meta`| Operational                                    |

`:feature` ∈ `phonics | comprehension | visualization | audiobook`.

## Local run

```bash
cp microservices/dashboard-service/.env.example microservices/dashboard-service/.env
# fill PGPASSWORD
node microservices/dashboard-service/server.js
# listening on http://localhost:4100
```

## Architectural role

This is **not** the API Composition pattern itself — composition lives one
layer up, in `orchestrators/dashboard/composition/`. This service is the
**data source** that composition fans out to. See
[docs/patterns/api-composition.md](../../docs/patterns/api-composition.md).
