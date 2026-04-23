# ReadOn Deployment Guide (Skeleton)

This guide documents how to deploy the skeleton into Google Cloud, including **prod** and **test** stacks in the same project. Deploy from your machine (or your own CI); there is no built-in “deploy on push” workflow in this repo.

## Environments

- **prod** — `READON_DEPLOY_ENV=prod` → `readon-main`, `readon-phonics`, …  
- **test** — `READON_DEPLOY_ENV=test` → `readon-main-test`, `readon-phonics-test`, …  

See [environment-separation.md](environment-separation.md) for naming and resources.

## Provision

From repo root (creates shared VPC/SQL/AR plus **both** env buckets, runtime service accounts, and databases `readon` + `readon_test`):

```bash
GCP_PROJECT_ID=readon-492106 bash ops/gcp/provision.sh
```

Hardening defaults:

- Serverless VPC Access connector is **not** created by default.
- Cloud Router/NAT is **not** created by default.

## Deploy

**Full stack (recommended):** microservices first, then main with service URLs populated.

```bash
READON_DEPLOY_ENV=prod SERVICE_VERSION=$(git rev-parse HEAD) bash ops/gcp/deploy-stack.sh
READON_DEPLOY_ENV=test SERVICE_VERSION=$(git rev-parse HEAD) bash ops/gcp/deploy-stack.sh
```

**Individual services** (same `READON_DEPLOY_ENV` must be exported or defaults to prod):

```bash
READON_DEPLOY_ENV=prod bash ops/gcp/deploy-main.sh
READON_DEPLOY_ENV=prod bash ops/gcp/deploy-microservice-audiobook.sh
# … phonics, comprehension, visualization, dashboard
```

## CI/CD

Use `ops/gcp/deploy-stack.sh` (and related scripts) with the right `READON_DEPLOY_ENV`. Overview: [cicd-overview.md](cicd-overview.md). Optional GitHub + WIF setup if you add your own deploy workflow: [github-actions-setup.md](github-actions-setup.md).

## Verify operational endpoints

Operational endpoints:

- `/health`
- `/live`
- `/ready`

Environment-aware verification:

```bash
bash ops/gcp/verify/verify-prod.sh
bash ops/gcp/verify/verify-test.sh
```

Or:

```bash
READON_DEPLOY_ENV=prod bash ops/gcp/verify/verify-health.sh
READON_DEPLOY_ENV=test bash ops/gcp/verify/verify-health.sh
```

Behavior:

- **Main** service: unauthenticated `GET` expects `200`.
- **Microservices**: unauthenticated `GET` typically returns `401`/`403` (expected). With `VERIFY_AUTHENTICATED=true` and a user access token (`gcloud auth print-access-token`), microservices should return `200`.

Control plane:

```bash
gcloud run services describe <service> --region=us-central1 --project=readon-492106 --format='table(status.conditions.type,status.conditions.status)'
```

## Redeploy a specific commit (rollback by SHA)

Cloud Run keeps revisions; “rollback” is redeploying an **image tag** you trust.

1. Check out the commit locally (or use a known `SERVICE_VERSION` / SHA already built in Artifact Registry).
2. Deploy that SHA to the right environment:

```bash
export SERVICE_VERSION=<full-git-sha>
READON_DEPLOY_ENV=test bash ops/gcp/deploy-stack.sh
# or
READON_DEPLOY_ENV=prod bash ops/gcp/deploy-stack.sh
```

Images are tagged with `SERVICE_VERSION` (Git SHA in CI). If the image for that SHA already exists in Artifact Registry, you can set `SKIP_BUILD=true` **only if** you also set `IMAGE_URI` to that existing digest or tag (advanced); the simple path is to let `deploy-stack.sh` rebuild from that commit.

**Inspect what is running**

```bash
gcloud run services describe readon-main --region=us-central1 --project=readon-492106 --format='yaml(spec.template.spec.serviceAccountName,spec.template.spec.containers[0].image,spec.template.metadata.labels)'
```

Replace `readon-main` with any service name (including `readon-main-test`).

## Invoker bindings and bucket IAM (read-only checks)

```bash
READON_DEPLOY_ENV=prod bash ops/gcp/verify/inspect-access-model.sh
READON_DEPLOY_ENV=test bash ops/gcp/verify/inspect-access-model.sh
```

## Authenticated microservice checks

- Unauthenticated: expect `401`/`403` on `/health` for microservices (see `verify-health.sh`).
- Authenticated: run `VERIFY_AUTHENTICATED=true READON_DEPLOY_ENV=prod bash ops/gcp/verify/verify-health.sh` with application-default or user credentials that have `run.invoker` (or use identity tokens as the main app would).

## Troubleshooting (short)

| Symptom | Likely cause |
|--------|----------------|
| `gcloud` auth / permission errors when deploying | Use credentials with Cloud Run + Cloud Build IAM; see ops scripts and [github-actions-setup.md](github-actions-setup.md) if using WIF from CI |
| `service not found` in verify | Wrong `READON_DEPLOY_ENV` for the stack you deployed |
| Microservices return 200 without auth | Policy drift: re-run `deploy-microservice*.sh` for that env to re-apply invoker hardening |

See [github-actions-setup.md](github-actions-setup.md) for WIF and CI deployer service accounts if you deploy from GitHub Actions.
