#!/usr/bin/env bash
set -euo pipefail

# Idempotent: create test-stack runtime service accounts and IAM if missing.
# Matches the READON_DEPLOY_ENV=test iteration in ops/gcp/provision.sh, plus
# readon-cicd-test -> iam.serviceAccountUser on each runtime SA (for Cloud Run deploy).
#
# Usage:
#   GCP_PROJECT_ID=readon-492106 bash ops/gcp/ensure-test-runtime-sas.sh

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=vars-shared.sh
source "${script_dir}/vars-shared.sh"
# shellcheck source=readon-deploy-env.sh
source "${script_dir}/readon-deploy-env.sh"

GCP_PROJECT_ID="${GCP_PROJECT_ID:-$(load_project_id)}"
export READON_DEPLOY_ENV=test
export CLOUDSDK_CORE_PROJECT="${GCP_PROJECT_ID}"
gcloud config set project "${GCP_PROJECT_ID}" --quiet

readon_apply_deploy_env

echo "==> ensure-test-runtime-sas  project=${GCP_PROJECT_ID}  bucket=${READON_STORAGE_BUCKET}"

sa_create() {
  local sa_name="$1"
  local display="$2"
  gcloud iam service-accounts describe "${sa_name}@${GCP_PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1 \
    || gcloud iam service-accounts create "${sa_name}" \
      --display-name="${display}" \
      --quiet
}

grant_project_role() {
  local sa_email="$1"
  local role="$2"
  gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
    --member="serviceAccount:${sa_email}" \
    --role="${role}" \
    --condition=None \
    --quiet
}

grant_bucket_role() {
  local sa_email="$1"
  local role="$2"
  local bucket="gs://${READON_STORAGE_BUCKET}"
  gcloud storage buckets add-iam-policy-binding "${bucket}" \
    --member="serviceAccount:${sa_email}" \
    --role="${role}" \
    --condition=None \
    --quiet
}

grant_ar_repo_role() {
  local sa_email="$1"
  local role="$2"
  gcloud artifacts repositories add-iam-policy-binding "${ARTIFACT_REGISTRY_REPO}" \
    --location="${ARTIFACT_REGISTRY_LOCATION}" \
    --member="serviceAccount:${sa_email}" \
    --role="${role}" \
    --condition=None \
    --quiet
}

gcloud storage buckets describe "gs://${READON_STORAGE_BUCKET}" >/dev/null 2>&1 \
  || gcloud storage buckets create "gs://${READON_STORAGE_BUCKET}" \
    --location="${REGION}" \
    --uniform-bucket-level-access \
    --quiet

sa_create "${MAIN_SA_NAME}" "ReadOn main Cloud Run (test)"
sa_create "${PHONICS_SA_NAME}" "ReadOn phonics Cloud Run (test)"
sa_create "${COMPREHENSION_SA_NAME}" "ReadOn comprehension Cloud Run (test)"
sa_create "${VISUALIZATION_SA_NAME}" "ReadOn visualization Cloud Run (test)"
sa_create "${AUDIOBOOK_SA_NAME}" "ReadOn audiobook Cloud Run (test)"

SERVICE_ACCOUNTS=(
  "${MAIN_SA_EMAIL}"
  "${PHONICS_SA_EMAIL}"
  "${COMPREHENSION_SA_EMAIL}"
  "${VISUALIZATION_SA_EMAIL}"
  "${AUDIOBOOK_SA_EMAIL}"
)

for sa_email in "${SERVICE_ACCOUNTS[@]}"; do
  grant_project_role "${sa_email}" "roles/cloudsql.client"
  grant_project_role "${sa_email}" "roles/logging.logWriter"
  grant_project_role "${sa_email}" "roles/monitoring.metricWriter"
  grant_ar_repo_role "${sa_email}" "roles/artifactregistry.reader"
  grant_bucket_role "${sa_email}" "roles/storage.objectViewer"
done

CICD_TEST_EMAIL="readon-cicd-test@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
if gcloud iam service-accounts describe "${CICD_TEST_EMAIL}" >/dev/null 2>&1; then
  echo "==> Allow readon-cicd-test to actAs test runtime SAs (Cloud Run deploy)"
  for sa_email in "${SERVICE_ACCOUNTS[@]}"; do
    gcloud iam service-accounts add-iam-policy-binding "${sa_email}" \
      --member="serviceAccount:${CICD_TEST_EMAIL}" \
      --role="roles/iam.serviceAccountUser" \
      --quiet
  done
else
  echo "WARN: ${CICD_TEST_EMAIL} not found; run ops/gcp/wif/setup-github-oidc-wif.sh" >&2
fi

echo "==> Test runtime SAs ready. Re-run GitHub Actions deploy to dev."
