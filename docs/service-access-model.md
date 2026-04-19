# ReadOn Service Access Model

This document describes which services are public vs authenticated-only for **prod** and **test** stacks.

## Public (browser-facing UI shell)

- **Prod:** `readon-main`
- **Test:** `readon-main-test`

These are deployed with unauthenticated access enabled.

## Authenticated-only (microservices)

**Prod:** `readon-phonics`, `readon-comprehension`, `readon-visualization`, `readon-audiobook`

**Test:** `readon-phonics-test`, `readon-comprehension-test`, `readon-visualization-test`, `readon-audiobook-test`

For each stack:

- Public `allUsers` invoker is removed after deploy.
- The corresponding **main** runtime service account is granted `roles/run.invoker`:
  - Prod: `readon-main-sa@<project>.iam.gserviceaccount.com`
  - Test: `readon-main-sa-test@<project>.iam.gserviceaccount.com`

## Health endpoints

All services expose `/health`, `/live`, `/ready`.

External unauthenticated calls to microservices may receive `403` (or `401`) while Cloud Run control-plane health checks still succeed. Verification scripts treat that as expected for microservices.
