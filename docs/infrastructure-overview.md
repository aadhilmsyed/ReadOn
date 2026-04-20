# ReadOn GCP Infrastructure Overview (Skeleton)

## Deployed services (Cloud Run)

The repo deploys **two parallel stacks** in the same project (see [environment-separation.md](environment-separation.md)):

**Production**

- Main app: `readon-main` (public)
- Microservices: `readon-phonics`, `readon-comprehension`, `readon-visualization`, `readon-audiobook`

**Test**

- Main app: `readon-main-test` (public)
- Microservices: `readon-phonics-test`, `readon-comprehension-test`, `readon-visualization-test`, `readon-audiobook-test`

All services listen on container port `8080` and expose:

- `GET /health`
- `GET /live`
- `GET /ready` (optionally checks Cloud SQL socket mount existence)

## Cloud SQL connectivity model

Cloud SQL is provisioned as a private-IP instance; Cloud Run uses socket mounts:

- Instance: `readon-sql` (PostgreSQL 16)
- Wiring: `--add-cloudsql-instances=<project>:<region>:readon-sql`
- Socket path: `/cloudsql/<INSTANCE_CONNECTION_NAME>`
- **Databases:** `readon` (prod target), `readon_test` (test target) — same instance, separate logical databases

Readiness is controlled by `READON_READY_REQUIRE_CLOUDSQL_MOUNT` (default `false` in `.env.example`).

## Cloud Storage model

- Prod bucket: `readon-<project-id>-assets`
- Test bucket: `readon-<project-id>-assets-test`

Each runtime service account has `roles/storage.objectViewer` on **its** bucket only. That is **read-only** object access, which matches the current skeleton (no upload/generation flows). When you implement writes, add an appropriate write role **on the same bucket** (still env-specific); do not widen to project-wide storage roles without need.

## Networking model (hardened)

- No Serverless VPC Access connector by default
- No Cloud Router/NAT by default
- VPC/subnet/private service access remain for the Cloud SQL private-IP instance

## CI/CD

Deploy with `ops/gcp/` scripts (and optionally your own GitHub Actions + WIF). See [cicd-overview.md](cicd-overview.md).
