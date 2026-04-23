#!/usr/bin/env bash
set -euo pipefail

# Print Cloud Run invoker bindings for the current READON_DEPLOY_ENV stack and bucket IAM
# for READON_STORAGE_BUCKET. Requires gcloud auth with run.services.getIamPolicy and
# storage buckets IAM read access.

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../vars.sh
source "${script_dir}/../vars.sh"

echo "=== ReadOn access model (read-only inspection) ==="
echo "GCP_PROJECT_ID=${GCP_PROJECT_ID} REGION=${REGION} READON_DEPLOY_ENV=${READON_DEPLOY_ENV}"
echo "READON_STORAGE_BUCKET=${READON_STORAGE_BUCKET} READON_DATABASE_NAME=${READON_DATABASE_NAME}"
echo ""

services=(
  "${MAIN_RUN_SERVICE_NAME}"
  "${PHONICS_RUN_SERVICE_NAME}"
  "${COMPREHENSION_RUN_SERVICE_NAME}"
  "${VISUALIZATION_RUN_SERVICE_NAME}"
  "${AUDIOBOOK_RUN_SERVICE_NAME}"
  "${DASHBOARD_RUN_SERVICE_NAME}"
)

for svc in "${services[@]}"; do
  echo "--- Cloud Run IAM: ${svc} ---"
  if gcloud run services get-iam-policy "${svc}" --region="${REGION}" --project="${GCP_PROJECT_ID}" --format=yaml 2>/dev/null; then
    :
  else
    echo "(service missing or no permission)"
  fi
  echo ""
done

echo "--- Bucket IAM: gs://${READON_STORAGE_BUCKET} ---"
gcloud storage buckets get-iam-policy "gs://${READON_STORAGE_BUCKET}" --format=yaml 2>/dev/null \
  || echo "(bucket missing or no permission)"
