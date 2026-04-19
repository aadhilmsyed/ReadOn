# CI/CD overview (GitHub Actions → Google Cloud)

## Branch → environment mapping

| Git branch | `READON_DEPLOY_ENV` | Cloud Run stack |
|------------|---------------------|-----------------|
| `dev`      | `test`              | `readon-*-test` services |
| `main`     | `prod`              | `readon-*` services (no suffix) |

Pushes to other branches do not run the deploy workflow.

## What runs on each push

Workflow: [deploy.yml](../.github/workflows/deploy.yml) calls [deploy-reusable.yml](../.github/workflows/deploy-reusable.yml).

1. **Authenticate** with Workload Identity Federation (OIDC). No long-lived JSON keys.
2. **Install gcloud** and select `vars.GCP_PROJECT_ID`.
3. **Build and deploy** via `ops/gcp/deploy-stack.sh`:
   - Cloud Build builds each image (`gcloud builds submit` + `ops/gcp/cloudbuild/build-dockerfile.yaml`).
   - Microservices deploy first; their URLs are read from Cloud Run and passed into the main app deploy.
4. **Verify** with `ops/gcp/verify/verify-health.sh` (public main + authenticated-only microservices).

`SERVICE_VERSION` is set to the Git commit SHA for traceability.

## Scripts involved

- `ops/gcp/deploy-stack.sh` — single entry point for one environment.
- `ops/gcp/deploy-main.sh`, `ops/gcp/deploy-microservice*.sh` — per-service deploys (still usable standalone).
- `ops/gcp/vars.sh` + `ops/gcp/readon-deploy-env.sh` — resolve names from `READON_DEPLOY_ENV`.

The reusable workflow sets **concurrency** groups `readon-deploy-prod` and `readon-deploy-test` so overlapping pushes to the same environment cancel the older in-flight job (`cancel-in-progress: true`).

## Related docs

- [github-actions-setup.md](github-actions-setup.md) — WIF, GitHub variables, one-time GCP setup.
- [environment-separation.md](environment-separation.md) — test vs prod resource names and isolation.
