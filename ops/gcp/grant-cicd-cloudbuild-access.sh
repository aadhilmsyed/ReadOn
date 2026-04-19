#!/usr/bin/env bash
set -euo pipefail

# Idempotent IAM for GitHub Actions deployer SAs to run `gcloud builds submit`:
# - Project: roles/serviceusage.serviceUsageConsumer (serviceusage.services.use)
# - Bucket gs://<PROJECT_ID>_cloudbuild: roles/storage.objectAdmin (source upload)
#
# Creates the default Cloud Build staging bucket in US multi-region if it does not exist
# (same pattern Cloud Build uses on first submit).
#
# Usage (from repo root or ops/gcp):
#   GCP_PROJECT_ID=readon-492106 bash ops/gcp/grant-cicd-cloudbuild-access.sh
#
# Requires: gcloud auth with permission to set IAM and create buckets.
# CI service accounts must already exist (run ops/gcp/wif/setup-github-oidc-wif.sh first).

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=vars-shared.sh
source "${script_dir}/vars-shared.sh"

GCP_PROJECT_ID="${GCP_PROJECT_ID:-$(load_project_id)}"
CICD_SA_TEST="${CICD_SA_TEST:-readon-cicd-test}"
CICD_SA_PROD="${CICD_SA_PROD:-readon-cicd-prod}"

export CLOUDSDK_CORE_PROJECT="${GCP_PROJECT_ID}"
gcloud config set project "${GCP_PROJECT_ID}" --quiet

CICD_TEST_EMAIL="${CICD_SA_TEST}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
CICD_PROD_EMAIL="${CICD_SA_PROD}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

CLOUDBUILD_BUCKET="gs://${GCP_PROJECT_ID}_cloudbuild"

grant_project_consumer() {
  local sa_email="$1"
  gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
    --member="serviceAccount:${sa_email}" \
    --role="roles/serviceusage.serviceUsageConsumer" \
    --condition=None \
    --quiet
}

grant_bucket_admin() {
  local sa_email="$1"
  gcloud storage buckets add-iam-policy-binding "${CLOUDBUILD_BUCKET}" \
    --member="serviceAccount:${sa_email}" \
    --role="roles/storage.objectAdmin" \
    --condition=None \
    --quiet
}

echo "==> grant-cicd-cloudbuild-access  project=${GCP_PROJECT_ID}"

for email in "${CICD_TEST_EMAIL}" "${CICD_PROD_EMAIL}"; do
  if gcloud iam service-accounts describe "${email}" >/dev/null 2>&1; then
    echo "    serviceAccount: ${email}"
    grant_project_consumer "${email}"
  else
    echo "    (skip, not found) ${email} — create with ops/gcp/wif/setup-github-oidc-wif.sh"
  fi
done

if gcloud storage buckets describe "${CLOUDBUILD_BUCKET}" >/dev/null 2>&1; then
  echo "==> Cloud Build bucket exists: ${CLOUDBUILD_BUCKET}"
else
  echo "==> Creating Cloud Build source bucket: ${CLOUDBUILD_BUCKET} (US, uniform access)"
  gcloud storage buckets create "${CLOUDBUILD_BUCKET}" \
    --location=US \
    --uniform-bucket-level-access \
    --quiet
fi

for email in "${CICD_TEST_EMAIL}" "${CICD_PROD_EMAIL}"; do
  if gcloud iam service-accounts describe "${email}" >/dev/null 2>&1; then
    grant_bucket_admin "${email}"
    echo "    granted storage.objectAdmin on ${CLOUDBUILD_BUCKET} for ${email}"
  fi
done

echo "==> Done. Re-run GitHub Actions deploy workflow."
