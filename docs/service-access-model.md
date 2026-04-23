# ReadOn Service Access Model

This document describes the default service access model for **prod** and **test** stacks.

## Public (browser-facing UI shell)

- **Prod:** `readon-main`
- **Test:** `readon-main-test`

These are deployed with unauthenticated access enabled.

## Microservices

**Prod:** `readon-phonics`, `readon-comprehension`, `readon-visualization`, `readon-audiobook`, `readon-dashboard`

**Test:** `readon-phonics-test`, `readon-comprehension-test`, `readon-visualization-test`, `readon-audiobook-test`, `readon-dashboard-test`

Deploy behavior is controlled by `READON_MICROSERVICES_PUBLIC` in `ops/gcp/deploy-microservice.sh`:

- `true` (default): grant `allUsers` invoker (public endpoints) and also keep main service-account invoker.
- `false`: remove `allUsers` invoker and keep only main service-account invoker.

## Health endpoints

All services expose `/health`, `/live`, `/ready`.

Depending on `READON_MICROSERVICES_PUBLIC`, external unauthenticated calls may return either `200` (public) or `401`/`403` (invoker-only). Control-plane health can remain healthy in either model.
