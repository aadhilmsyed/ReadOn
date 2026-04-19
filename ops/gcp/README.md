# ReadOn - GCP Skeleton Deployment

This directory deploys the **skeleton only** of ReadOn (no business logic): main Next.js app plus four microservices to Cloud Run, with **prod** and **test** stacks in the same project.

## Prerequisites

1. A Google Cloud project (e.g. `readon-492106`).
2. `gcloud` installed and authenticated (local use).
3. For GitHub Actions: Workload Identity Federation configured per [docs/github-actions-setup.md](../../docs/github-actions-setup.md).

## Environment model

Set `READON_DEPLOY_ENV` to `prod` or `test` before sourcing `vars.sh` or running deploy scripts. Names resolve in `readon-deploy-env.sh`. Overview: [docs/environment-separation.md](../../docs/environment-separation.md).

## Scripts

| Script | Purpose |
|--------|---------|
| `provision.sh` | APIs, VPC/SQL/AR, **both** buckets, databases `readon` + `readon_test`, runtime SAs + IAM |
| `wif/setup-github-oidc-wif.sh` | WIF pool/provider + `readon-cicd-test` / `readon-cicd-prod` deployer SAs |
| `grant-cicd-cloudbuild-access.sh` | Fix `gcloud builds submit` from CI: Service Usage + `_cloudbuild` bucket IAM (creates bucket if missing) |
| `ensure-test-runtime-sas.sh` | Create test-stack runtime SAs + IAM + CI `actAs` if `provision.sh` was never run for test |
| `deploy-stack.sh` | Deploy all microservices then main for one environment |
| `deploy-main.sh` | Main app only |
| `deploy-microservice.sh` | Generic microservice deploy (wrappers below) |
| `deploy-microservice-*.sh` | One wrapper per microservice |
| `build-image.sh` | Cloud Build submit for a Dockerfile + image URI |
| `verify/verify-health.sh` | Health checks for current `READON_DEPLOY_ENV` |
| `verify/verify-prod.sh` / `verify-test.sh` | Wrappers with env preset |
| `verify/inspect-access-model.sh` | Print Cloud Run IAM + current env bucket IAM (read-only inspection) |

`vars-shared.sh` holds shared defaults; `vars.sh` loads project id and applies `readon-deploy-env.sh`.

## Local builds

Images are built with `gcloud builds submit` (no local Docker required). Dockerfiles: repo root `Dockerfile` (main), `microservices/<name>/Dockerfile`.

## CI/CD

- [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) — push to `main` or `dev`
- [docs/cicd-overview.md](../../docs/cicd-overview.md)

## References

- [docs/deployment-guide.md](../../docs/deployment-guide.md)
- [docs/environment-variables.md](../../docs/environment-variables.md)
- `/.env.example`
