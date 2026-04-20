# ReadOn Environment Variables

Deployment scripts and the skeleton runtime use the variables below. See `.env.example` for a template.

## Environment selection (scripts)

- `READON_DEPLOY_ENV`
  - `prod` or `test`
  - Drives Cloud Run service names, bucket, database name, and runtime service accounts via `ops/gcp/readon-deploy-env.sh`
  - Default in `ops/gcp/vars.sh`: `prod`
  - `ops/gcp/vars.sh` **exports** `READON_DEPLOY_ENV` (and `GCP_PROJECT_ID`) so child `bash` processes invoked by `deploy-stack.sh` inherit the same environment.

## Shared infrastructure (typical)

- `GCP_PROJECT_ID` — Google Cloud project (detected via gcloud if unset)
- `REGION` — default `us-central1`
- `ARTIFACT_REGISTRY_REPO`, `ARTIFACT_REGISTRY_LOCATION` — single Docker repo for all images
- `SQL_INSTANCE_NAME` — shared Cloud SQL instance (`readon-sql` default)

## Per-environment resolved values (computed in scripts)

When `READON_DEPLOY_ENV=prod`:

- `MAIN_RUN_SERVICE_NAME=readon-main`, microservices without `-test` suffix
- `READON_STORAGE_BUCKET=<project>-assets`
- `SQL_DB_NAME` / `READON_DATABASE_NAME=readon`

When `READON_DEPLOY_ENV=test`:

- `MAIN_RUN_SERVICE_NAME=readon-main-test`, microservices with `-test` suffix
- `READON_STORAGE_BUCKET=<project>-assets-test`
- `SQL_DB_NAME` / `READON_DATABASE_NAME=readon_test`

## Cloud Run runtime (set by deploy scripts)

- `SERVICE_NAME` — identity in `/health` (main uses the Cloud Run service name; microservices use folder name)
- `SERVICE_VERSION` — image/version label (Git SHA in CI)
- `READON_LOG_LEVEL` — logging convention
- `READON_DEPLOY_ENV` — `prod` or `test` (surfaced at runtime for logs/ops)
- `CLOUDSQL_CONNECTION_NAME` — `<project>:<region>:<instance>` (same for both envs)
- `READON_DATABASE_NAME` — `readon` or `readon_test` (logical DB target; skeleton does not query yet)
- `READON_READY_REQUIRE_CLOUDSQL_MOUNT` — optional strict readiness vs Cloud SQL socket
- `READON_STORAGE_BUCKET` — env-specific bucket name

## Service URLs (main app)

- `READON_AUDIOBOOK_SERVICE_URL`, `READON_PHONICS_SERVICE_URL`, `READON_COMPREHENSION_SERVICE_URL`, `READON_IMAGE_GENERATION_SERVICE_URL`
  - Optional legacy alias: `READON_VISUALIZATION_SERVICE_URL` (same target as image generation).
  - Local defaults are documented in `.env.example` (ports **3001–3005** for microservices; main app **3000**).
- Comprehension microservice `DATABASE_URL` (in `microservices/comprehension-service/.env`) is preferred over `READON_DATABASE_NAME` + Cloud SQL socket when set — see `microservices/comprehension-service/db/client.js`.
  - `ops/gcp/deploy-stack.sh` sets these on the **main** service after microservices deploy.
  - Standalone `deploy-main.sh` leaves them empty unless exported.

## Redis placeholders (future)

- `READON_REDIS_HOST`, `READON_REDIS_PORT`, `READON_REDIS_URL`

## GitHub Actions (repository Variables, not app env — optional)

If you add a deploy workflow that uses WIF, define:

- `GCP_PROJECT_ID`, `WORKLOAD_IDENTITY_PROVIDER`, `CICD_SERVICE_ACCOUNT_PROD`, `CICD_SERVICE_ACCOUNT_TEST`

See [github-actions-setup.md](github-actions-setup.md).
