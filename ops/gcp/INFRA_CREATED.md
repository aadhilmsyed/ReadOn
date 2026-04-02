# ReadOn GCP Resources (Created/Used)

This file records resources created by:

- `bash ops/gcp/provision.sh`
- `bash ops/gcp/wif/setup-github-oidc-wif.sh` (CI/CD identities)
- Deploy scripts under `ops/gcp/`

For the **prod vs test** model, see [../../docs/environment-separation.md](../../docs/environment-separation.md).

## Project / Region

- `GCP_PROJECT_ID`: `readon-492106`
- `REGION`: `us-central1`

## Networking

- VPC: `readon-vpc`
- Subnet: `readon-subnet` (`10.10.0.0/24`)
- Serverless VPC Access connector: not used by default
- Cloud Router/NAT: not used by default

## Cloud SQL (private IP)

- Instance: `readon-sql`
- Engine: PostgreSQL 16
- Tier: `db-g1-small`
- PSA range: `readon-sql-psa-range`
- Connection name: `readon-492106:us-central1:readon-sql`
- **Databases:** `readon` (prod), `readon_test` (test)

## Cloud Storage

- Prod bucket: `readon-492106-assets`
- Test bucket: `readon-492106-assets-test`
- Cloud Build staging (default): `readon-492106_cloudbuild` — CI deployer SAs need object access here for `gcloud builds submit` from GitHub Actions

## Artifact Registry

- Repository: `readon-artifacts` (docker)
- Location: `us-central1`
- Cloud Build default SA: granted `roles/artifactregistry.writer` at project level (for image push)

## Runtime service accounts (Cloud Run)

**Prod**

- `readon-main-sa@readon-492106.iam.gserviceaccount.com`
- `readon-phonics-sa@…`
- `readon-comprehension-sa@…`
- `readon-visualization-sa@…`
- `readon-audiobook-sa@…`

**Test** (`*-sa-test`)

- `readon-main-sa-test@readon-492106.iam.gserviceaccount.com`
- `readon-phonics-sa-test@…`
- `readon-comprehension-sa-test@…`
- `readon-visualization-sa-test@…`
- `readon-audiobook-sa-test@…`

## CI/CD service accounts (GitHub Actions via WIF)

- `readon-cicd-test@readon-492106.iam.gserviceaccount.com` — branch `dev` only (OIDC subject binding)
- `readon-cicd-prod@readon-492106.iam.gserviceaccount.com` — branch `main` only

## IAM (runtime, per account)

Each runtime service account receives:

- `roles/cloudsql.client`
- `roles/logging.logWriter`
- `roles/monitoring.metricWriter`
- `roles/artifactregistry.reader`
- `roles/storage.objectViewer` on **its** environment bucket only

## IAM (CI/CD deployers)

Per deployer SA (project level):

- `roles/run.admin`
- `roles/cloudbuild.builds.editor`
- `roles/serviceusage.serviceUsageConsumer`

On bucket `gs://readon-492106_cloudbuild` (when it exists):

- `roles/storage.objectAdmin` for each CI deployer SA (source upload for Cloud Build)

Plus `roles/iam.serviceAccountUser` on **only** the five runtime SAs in the matching environment.

## Cloud Run services (example URLs vary by project)

**Prod:** `readon-main`, `readon-phonics`, `readon-comprehension`, `readon-visualization`, `readon-audiobook`

**Test:** `readon-main-test`, `readon-phonics-test`, `readon-comprehension-test`, `readon-visualization-test`, `readon-audiobook-test`

Historical example URLs (prod) from an earlier deploy:

- `readon-main` -> https://readon-main-lcgt5lhoya-uc.a.run.app
- (other prod services similarly under the same project/region)
