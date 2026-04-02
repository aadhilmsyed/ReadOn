# ReadOn GCP Skeleton - Verification Checklist

## What you should validate

1. Cloud Run services are deployed and serving traffic.
2. Operational endpoints respond:
   - `readon-main`:
     - `/health` returns `200`
     - `/live` returns `200`
     - `/ready` returns `200` (including Cloud SQL mount check when enabled)
   - Microservices (`readon-phonics`, `readon-comprehension`, `readon-visualization`, `readon-audiobook`):
     - unauthenticated requests may return `403` (authenticated-only invoker)
     - Cloud Run control-plane should show `status.conditions[type=="Ready"].status == "True"`
3. Cloud SQL private connectivity plumbing works (Cloud SQL socket mount exists inside the container):
   - enable via env var `READON_READY_REQUIRE_CLOUDSQL_MOUNT=true`
   - re-check `/ready`
4. Cloud Storage bucket exists and IAM bindings were applied:
   - `gcloud storage buckets get-iam-policy gs://<bucket>`

## Commands

### Deploy (no CI/CD)

Provision:
- `bash ops/gcp/provision.sh`

Deploy:
- `bash ops/gcp/deploy-main.sh`
- `bash ops/gcp/deploy-microservice-audiobook.sh`
- `bash ops/gcp/deploy-microservice-phonics.sh`
- `bash ops/gcp/deploy-microservice-comprehension.sh`
- `bash ops/gcp/deploy-microservice-visualization.sh`

### Verify health endpoints

- `bash ops/gcp/verify/verify-health.sh`

### Validate Cloud SQL socket mount via `/ready`

Run (example values for the services created by this repo):

- `gcloud beta run services update readon-main --region=us-central1 --update-env-vars=READON_READY_REQUIRE_CLOUDSQL_MOUNT=true`
- `gcloud beta run services update readon-phonics --region=us-central1 --update-env-vars=READON_READY_REQUIRE_CLOUDSQL_MOUNT=true`
- `gcloud beta run services update readon-comprehension --region=us-central1 --update-env-vars=READON_READY_REQUIRE_CLOUDSQL_MOUNT=true`
- `gcloud beta run services update readon-visualization --region=us-central1 --update-env-vars=READON_READY_REQUIRE_CLOUDSQL_MOUNT=true`
- `gcloud beta run services update readon-audiobook --region=us-central1 --update-env-vars=READON_READY_REQUIRE_CLOUDSQL_MOUNT=true`

Then:
- `bash ops/gcp/verify/verify-health.sh`

