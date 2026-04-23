# API Composition Pattern (Dashboard)

The dashboard's history view is implemented with the **API Composition**
pattern: the composer calls **four independent feature microservices in
parallel**, then merges the responses into one view-shaped payload. The
composition layer never reaches into another service's database — each feature
service owns its own data and exposes the only contract the composer is
allowed to use (`GET /history?limit=N`).

## Where it lives

```
orchestrators/dashboard/
├── dashboardOrchestrator.ts          # facade — the only entry point views/dashboard imports
├── composition/
│   ├── getAggregatedHistory.ts       # the composer — Promise.allSettled of 4 client calls
│   ├── mergeHistoryResponses.ts      # shapes 4 service responses into one view payload
│   └── types.ts                      # AggregatedHistory, FeatureHistorySlice, HistoryItem
└── clients/
    ├── baseHttpClient.ts             # shared fetch wrapper (timeout, error normalization, per-call baseUrl)
    ├── phonicsHistoryClient.ts       # GET {PHONICS_URL}/history?limit=N
    ├── comprehensionHistoryClient.ts # GET {COMPREHENSION_URL}/history?limit=N
    ├── visualizationHistoryClient.ts # GET {IMAGE_GENERATION_URL}/history?limit=N
    └── audiobookHistoryClient.ts     # GET {AUDIOBOOK_URL}/history?limit=N
```

Each client imports its own base URL from
`@orchestrators/story/serviceBaseUrls` (which reads
`READON_{PHONICS,COMPREHENSION,IMAGE_GENERATION,AUDIOBOOK}_SERVICE_URL`) and
passes it to `baseHttpClient.httpGet(..., { baseUrl })`. The composer itself
stays declarative — it only names the four `listXxxHistory(limit)` functions
and aggregates their results.

## Flow

```
views/dashboard/DashboardPage
        │
        ▼  fetch('/api/dashboard/history?limit=50')
src/app/api/dashboard/history/route.ts
        │
        ▼
dashboardOrchestrator.fetchAggregatedHistory(limit)
        │
        ▼
composition/getAggregatedHistory.ts
        │
        ├──► phonicsHistoryClient.list(limit)        ──HTTP──► phonics-service        /history?limit=50  ┐
        ├──► comprehensionHistoryClient.list(limit)  ──HTTP──► comprehension-service  /history?limit=50  │  Promise.allSettled
        ├──► visualizationHistoryClient.list(limit)  ──HTTP──► image-generation-svc   /history?limit=50  │  (parallel fan-out)
        └──► audiobookHistoryClient.list(limit)      ──HTTP──► audiobook-service      /history?limit=50  ┘
                       │
                       ▼
              mergeHistoryResponses(...)
                       │
                       ▼
            { phonics: { items: [...] },
              comprehension: { items: [...] },
              visualization: { items: [...] },
              audiobook: { items: [...] } }
```

Each feature service owns its own database and is the single source of truth
for "stories that feature has processed." No cross-service SQL, no shared
schema. If a teammate later moves a service to a different database engine,
nothing in the composition layer changes.

## Why this pattern, not the alternatives

| Alternative | Why we rejected it |
|---|---|
| Join across DBs (e.g. dblink / FDW) | Couples services through their schemas; breaks data ownership; can't survive a service moving to a different DB engine. |
| One central `dashboard` DB that mirrors writes | Doubles writes; introduces eventual-consistency bugs; dashboard becomes a single point of failure for write paths. |
| Colocate all four history endpoints on a single service that reads four DBs | Violates *Database per Service* — a single service now has direct coupling to four other services' schemas. |
| Frontend calls 4 services directly and merges in the browser | Leaks service topology to the client; pushes auth/credentials to browser; harder to add cross-cutting concerns (caching, auth, retries). |

API Composition keeps each microservice's data fully encapsulated, lets the
orchestrator layer add cross-cutting concerns (timeouts, partial-failure
fallbacks, caching) in one place, and makes the topology trivially observable
because every aggregated request fans out through one named function.

## Partial-failure policy

`getAggregatedHistory` uses `Promise.allSettled` (not `Promise.all`) so a
single service outage degrades only that one card on the dashboard. Failed
services return an empty list with an `error` flag; the UI shows the empty
state instead of breaking the whole page.

## SOLID mapping

| Principle | Where |
|---|---|
| **S**ingle Responsibility | Each of the four `*HistoryClient.ts` handles exactly one feature service. `mergeHistoryResponses` only merges. |
| **O**pen/Closed | Adding a fifth feature means adding one new client file and one line in the composer's `Promise.allSettled` array; no existing client changes. |
| **L**iskov Substitution | N/A — functional interface, no inheritance. |
| **I**nterface Segregation | Each client exposes exactly one narrow function (`listXxxHistory(limit)`). |
| **D**ependency Inversion | Clients depend on the shared `baseHttpClient` abstraction, not on `fetch` directly; the base URL is injected per call via `RequestOptions.baseUrl` instead of hardcoded. |

## Feature service contract

Each feature microservice is expected to expose:

```
GET /history?limit=N
  → 200 OK { "items": [{ "story_id": "uuid", "title": "string", "created_at": "iso-8601" }, ...] }
  → 404 / 5xx for errors (caller degrades that card via Promise.allSettled)
```

The composer is tolerant to a missing `items` field (returns an empty list for
that feature) so services can roll out the endpoint independently.

## Where the *write* path fits

Writes are not API Composition — they go through an **orchestrator** at
`orchestrators/features/featureActionOrchestrator.ts` (credit charge +
single-service dispatch) or `orchestrators/story/generateStoryOrchestrator.ts`
(credit charge + parallel dispatch to all four feature services for a
Generate Story flow). Composition is read-only by design.
