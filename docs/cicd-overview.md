# CI/CD overview (Google Cloud)

## Branch → environment mapping (when you deploy)

| Git branch | `READON_DEPLOY_ENV` | Cloud Run stack |
|------------|---------------------|-----------------|
| `dev`      | `test`              | `readon-*-test` services |
| `main`     | `prod`              | `readon-*` services (no suffix) |

This mapping is a **convention** for which stack you intend to update. Deployments are driven by the `READON_DEPLOY_ENV` you pass to the scripts, not by GitHub automatically.

## Deployments today

This repository does **not** run an automatic “deploy on push” GitHub Actions workflow. Deploy manually from a machine with `gcloud` (or wire your own CI) using:

- `ops/gcp/deploy-stack.sh` — full stack for one environment
- `ops/gcp/verify/verify-health.sh` — post-deploy checks

Set `SERVICE_VERSION` to your Git SHA for traceability (see [deployment-guide.md](deployment-guide.md)).

Typical flow:

1. **Authenticate** with user credentials or a service account you control (see [deployment-guide.md](deployment-guide.md)).
2. **Install gcloud** and select the target project.
3. **Build and deploy** via `ops/gcp/deploy-stack.sh` (Cloud Build + Cloud Run).
4. **Verify** with `ops/gcp/verify/verify-health.sh`.

## Scripts involved

- `ops/gcp/deploy-stack.sh` — single entry point for one environment.
- `ops/gcp/deploy-main.sh`, `ops/gcp/deploy-microservice*.sh` — per-service deploys (still usable standalone).
- `ops/gcp/vars.sh` + `ops/gcp/readon-deploy-env.sh` — resolve names from `READON_DEPLOY_ENV`.

## Optional: GitHub Actions + WIF

If you add your own workflow to deploy from GitHub, use **Workload Identity Federation** (no JSON keys in GitHub). One-time GCP and variable setup: [github-actions-setup.md](github-actions-setup.md).

## Related docs

- [deployment-guide.md](deployment-guide.md) — provision, deploy, verify, rollback.
- [github-actions-setup.md](github-actions-setup.md) — WIF, GitHub variables, CI deployer SAs.
- [environment-separation.md](environment-separation.md) — test vs prod resource names and isolation.
