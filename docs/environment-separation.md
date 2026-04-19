# Environment separation (same GCP project)

ReadOn uses **one Google Cloud project** with two logical environments: **prod** and **test**. Names and backing resources are isolated; there is no second “environment” beyond these two.

## Why same project

This matches an implementation-phase class skeleton: lower overhead, one billing boundary, and clear naming/IAM separation without multi-project complexity.

## Cloud Run services

**Production (`READON_DEPLOY_ENV=prod`):**

- `readon-main` (browser-accessible, unauthenticated invoker allowed)
- `readon-phonics`
- `readon-comprehension`
- `readon-visualization`
- `readon-audiobook`

**Test (`READON_DEPLOY_ENV=test`):**

- `readon-main-test`
- `readon-phonics-test`
- `readon-comprehension-test`
- `readon-visualization-test`
- `readon-audiobook-test`

Microservices remain **authenticated-only** in both environments: `readon-main` (or `readon-main-test`) is the only public invoker by default.

## Cloud Storage buckets

Pattern: `<project-id>-assets` (prod) and `<project-id>-assets-test` (test).

Example project `readon-492106`:

- Prod: `readon-492106-assets`
- Test: `readon-492106-assets-test`

Runtime service accounts receive `roles/storage.objectViewer` **only** on their environment’s bucket. That role is intentionally **read-only** for the skeleton; when you add uploads or generated assets, plan to grant a write-capable role scoped to the same bucket (for example `roles/storage.objectCreator` or a custom role), still **per environment**—see [infrastructure-overview.md](infrastructure-overview.md).

## Cloud SQL

- **One instance** (e.g. `readon-sql`) shared by both environments.
- **Two databases** on that instance:
  - `readon` — production logical target (`READON_DATABASE_NAME` / `SQL_DB_NAME` for prod)
  - `readon_test` — test logical target

Connection name is the same (`CLOUDSQL_CONNECTION_NAME`); only the database name differs. The skeleton does not implement application-level queries yet; variables exist for clean future wiring.

**IAM nuance:** `roles/cloudsql.client` is granted at **project** scope and allows the Cloud SQL Auth Proxy / socket path to the shared instance. It does **not** select a database by itself. **Logical** separation relies on using different database names and (when you add real usage) distinct Postgres users/passwords per environment—not on per-database IAM.

## Cloud Run invoker (microservices)

`ops/gcp/deploy-microservice.sh` grants `roles/run.invoker` on each microservice **only** to `MAIN_SA_EMAIL` for the **same** `READON_DEPLOY_ENV`. Prod main (`readon-main-sa`) is not bound to test microservices, and test main (`readon-main-sa-test`) is not bound to prod microservices.

## Service accounts

**Runtime (Cloud Run):**

- Prod: `readon-main-sa`, `readon-phonics-sa`, … (no suffix)
- Test: `readon-main-sa-test`, `readon-phonics-sa-test`, …

**CI/CD (GitHub Actions via WIF):**

- `readon-cicd-prod` — may impersonate only prod runtime SAs (and deploy prod services).
- `readon-cicd-test` — may impersonate only test runtime SAs.

## Artifact Registry

A **single** repository (e.g. `readon-artifacts`) holds images for both environments. Images are distinguished by image name (includes Cloud Run service name) and tag (e.g. Git SHA). Runtime SAs have `roles/artifactregistry.reader` on that repo (they can pull any image in the repo); rely on deploy tags and process—not separate repos—for which revision runs where.

## Resolution in scripts

`ops/gcp/readon-deploy-env.sh` maps `READON_DEPLOY_ENV` to service names, bucket, database name, and service account names. `ops/gcp/vars.sh` loads shared settings from `ops/gcp/vars-shared.sh`, then applies that mapping.
