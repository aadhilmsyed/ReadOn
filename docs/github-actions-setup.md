# GitHub Actions setup (Workload Identity Federation)

This project uses **keyless** authentication: GitHub’s OIDC token is exchanged for short-lived Google credentials via **Workload Identity Federation**. Do not store GCP service account JSON keys in GitHub.

## One-time GCP setup

1. Provision shared infrastructure and **both** runtime environments (buckets, databases, runtime service accounts):

   ```bash
   GCP_PROJECT_ID=readon-492106 bash ops/gcp/provision.sh
   ```

2. Create the WIF pool, OIDC provider, and CI/CD deployer service accounts:

   ```bash
   export GCP_PROJECT_ID=readon-492106
   export GITHUB_REPO_FULL="YOUR_GITHUB_ORG/ReadOn"   # must match GitHub’s repository claim exactly
   bash ops/gcp/wif/setup-github-oidc-wif.sh
   ```

   The script prints the values to copy into GitHub.

**Order matters:** run `provision.sh` before `setup-github-oidc-wif.sh` so runtime service accounts exist when the script grants `roles/iam.serviceAccountUser` on them.

## GitHub repository variables

Configure under **Settings → Secrets and variables → Actions → Variables**:

| Variable | Example | Purpose |
|----------|---------|---------|
| `GCP_PROJECT_ID` | `readon-492106` | gcloud project |
| `WORKLOAD_IDENTITY_PROVIDER` | `projects/123456789/locations/global/workloadIdentityPools/readon-github/providers/github-oidc` | Full provider resource name from setup script output |
| `CICD_SERVICE_ACCOUNT_PROD` | `readon-cicd-prod@readon-492106.iam.gserviceaccount.com` | Deployer identity for `main` |
| `CICD_SERVICE_ACCOUNT_TEST` | `readon-cicd-test@readon-492106.iam.gserviceaccount.com` | Deployer identity for `dev` |

**Secrets:** none are required for GCP authentication if WIF is configured as above. Keep using Secrets only for true secrets you add later.

**Important:** Values must live under **Actions → Variables** for this repository (names are case-sensitive). If they are only in `.env` on your laptop or only documented in `INFRA_CREATED.md`, CI will still fail: `vars.GCP_PROJECT_ID` and friends resolve only from GitHub’s variable store.

### CI fails immediately: “missing: GCP_PROJECT_ID” (empty inputs)

If the log shows `Inputs` with blank `gcp_project_id`, `workload_identity_provider`, or `service_account`, the repository variables are not defined or the names do not match exactly.

1. Open **Settings → Secrets and variables → Actions → Variables** for the repo.
2. Add all four rows from the table above (`GCP_PROJECT_ID`, `WORKLOAD_IDENTITY_PROVIDER`, `CICD_SERVICE_ACCOUNT_PROD`, `CICD_SERVICE_ACCOUNT_TEST`).
3. Re-run the failed workflow (or push an empty commit to `dev` / `main`).

For **test** deploys (`dev` branch), `CICD_SERVICE_ACCOUNT_TEST` must be set; for **prod** (`main`), `CICD_SERVICE_ACCOUNT_PROD` must be set. Define both so either pipeline can run.

## Workflow permissions

The deploy workflow sets:

- `permissions: id-token: write` — required for OIDC.
- `permissions: contents: read` — checkout.

## WIF resources created

| Resource | Default ID / pattern |
|----------|----------------------|
| Workload Identity Pool | `readon-github` |
| OIDC provider | `github-oidc` (issuer `https://token.actions.githubusercontent.com`) |
| Attribute condition | `assertion.repository=='$GITHUB_REPO_FULL'` |
| CI/CD SA (test) | `readon-cicd-test@<project>.iam.gserviceaccount.com` |
| CI/CD SA (prod) | `readon-cicd-prod@<project>.iam.gserviceaccount.com` |

Each CI/CD account is bound to a **GitHub OIDC subject** so only workflows from the configured repo and branch can impersonate it:

- Test SA: `repo:ORG/REPO:ref:refs/heads/dev`
- Prod SA: `repo:ORG/REPO:ref:refs/heads/main`

If `gcloud iam service-accounts add-iam-policy-binding` rejects the `principal://…/subject/…` member (special characters), see Google’s [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation) troubleshooting or encode the subject as documented for your `gcloud` version.

## Branch expectations

- **`dev`** — must exist and receive pushes to deploy **test** (`readon-*-test`).
- **`main`** — deploys **prod**.

## Common failure points

| Symptom | What to check |
|--------|----------------|
| `Missing GitHub Actions Variables` in CI | Repository **Variables** (not Secrets): `GCP_PROJECT_ID`, `WORKLOAD_IDENTITY_PROVIDER`, `CICD_SERVICE_ACCOUNT_PROD`, `CICD_SERVICE_ACCOUNT_TEST` |
| `failed to generate Google OAuth access token` / WIF errors | `WORKLOAD_IDENTITY_PROVIDER` must be the full `projects/…/providers/…` string; `GITHUB_REPO_FULL` in the WIF script must match `owner/repo` exactly |
| Prod workflow can’t deploy | Push must be to **`main`** so the OIDC subject matches `refs/heads/main` for `readon-cicd-prod` |
| Test workflow can’t deploy | Push must be to **`dev`** for `readon-cicd-test` |
| Permission denied deploying Cloud Run | CI SA needs `run.admin`, `cloudbuild.builds.editor`, and `iam.serviceAccountUser` on the **five** runtime SAs for that environment (re-run `setup-github-oidc-wif.sh` after `provision.sh`) |
| `forbidden from accessing the bucket [<project>_cloudbuild]` on `gcloud builds submit` | Run **`bash ops/gcp/grant-cicd-cloudbuild-access.sh`** once with project owner credentials (creates the default `_cloudbuild` bucket in `US` if missing, grants `storage.objectAdmin` + Service Usage consumer to `readon-cicd-test` / `readon-cicd-prod`). Then re-run the workflow. This is also invoked from `provision.sh` and `wif/setup-github-oidc-wif.sh`. |

Reusable workflow uses **concurrency** per environment (`readon-deploy-prod` / `readon-deploy-test`) so overlapping pushes cancel the older in-flight job for that environment.

## Environment protection (optional)

The workflows deploy immediately on push. You can later add [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) with required reviewers for `prod`; that is optional and not required for the current skeleton.

## CI/CD deployer IAM (summary)

- **Project:** `roles/run.admin`, `roles/cloudbuild.builds.editor`, `roles/serviceusage.serviceUsageConsumer`
- **Bucket** `gs://<project-id>_cloudbuild`: `roles/storage.objectAdmin` for each CI deployer SA (so `gcloud builds submit` can upload sources from GitHub Actions)
- **Per runtime SA:** `roles/iam.serviceAccountUser` on the five prod runtime SAs for `readon-cicd-prod`, and the five test runtime SAs for `readon-cicd-test` (so Cloud Run can mount the correct service account at deploy time)

Cloud Build’s default project service account is granted `roles/artifactregistry.writer` in `provision.sh` so image pushes succeed.
