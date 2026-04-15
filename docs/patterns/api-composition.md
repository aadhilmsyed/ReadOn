# API Composition Pattern (Dashboard)

The dashboard's history view is implemented with the **API Composition** pattern:
a single endpoint aggregates data from multiple downstream microservices by
calling each service's API in parallel, then merging the responses into one
view-shaped payload. The composition layer never reaches into another service's
database — each service owns its own `stories` table and exposes the only
contract the composer is allowed to use.

## Where it lives

```
orchestrators/dashboard/
├── dashboardOrchestrator.ts          # facade — the only entry point views/dashboard imports
├── composition/
│   ├── getAggregatedHistory.ts       # the composer — Promise.all of 4 client calls
│   ├── mergeHistoryResponses.ts      # shapes 4 service responses into one view payload
│   └── types.ts                      # AggregatedHistory, FeatureHistoryItem
└── clients/
    ├── baseHttpClient.ts             # shared fetch wrapper (timeout, error normalization)
    ├── phonicsHistoryClient.ts       # GET {PHONICS_URL}/stories?limit=N
    ├── comprehensionHistoryClient.ts # GET {COMPREHENSION_URL}/stories?limit=N
    ├── visualizationHistoryClient.ts # GET {VISUALIZATION_URL}/stories?limit=N
    └── audiobookHistoryClient.ts     # GET {AUDIOBOOK_URL}/stories?limit=N
```

## Flow

```
views/dashboard/DashboardPage
        │
        ▼
dashboardOrchestrator.getAggregatedHistory()
        │
        ▼
composition/getAggregatedHistory.ts
        │
        ├──► phonicsHistoryClient.list({ limit: 5 })       ┐
        ├──► comprehensionHistoryClient.list({ limit: 5 }) │  Promise.all (parallel)
        ├──► visualizationHistoryClient.list({ limit: 5 }) │
        └──► audiobookHistoryClient.list({ limit: 5 })     ┘
                       │
                       ▼
              mergeHistoryResponses(...)
                       │
                       ▼
            { phonics: [...], comprehension: [...],
              visualization: [...], audiobook: [...] }
```

## Why this pattern, not the alternatives

| Alternative | Why we rejected it |
|---|---|
| Join across DBs (e.g. dblink / FDW) | Couples services through their schemas; breaks data ownership; can't survive a service moving to a different DB engine. |
| One central `dashboard` DB that mirrors writes | Doubles writes; introduces eventual-consistency bugs; dashboard becomes a single point of failure for write paths. |
| Frontend calls 4 services directly and merges in the browser | Leaks service topology to the client; pushes auth/credentials to browser; harder to add cross-cutting concerns (caching, auth, retries). |

API Composition keeps each microservice's data fully encapsulated, lets the
dashboard-service add cross-cutting concerns (timeouts, partial-failure
fallbacks, caching) in one place, and makes the topology trivially observable
because every aggregated request fans out through one named function.

## Partial-failure policy

`getAggregatedHistory` uses `Promise.allSettled` (not `Promise.all`) so a single
service outage degrades only that one card on the dashboard. Failed services
return an empty list with an `error` flag; the UI shows the empty state instead
of breaking the whole page.

## Where the *write* path fits

Writes are not API Composition — they go through an **orchestrator** at
`orchestrators/features/featureActionOrchestrator.ts`, which validates input,
deducts credits, and dispatches the create call to exactly one microservice.
Composition is read-only by design.
