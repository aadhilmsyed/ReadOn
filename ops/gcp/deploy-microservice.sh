#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "${script_dir}/vars.sh"

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <microservice-folder-name> <run-service-name> <service-account-email>" >&2
  exit 1
fi

microservice_folder="$1"
run_service_name="$2"
service_account_email="$3"

SERVICE_VERSION="${SERVICE_VERSION:-local-dev}"

CLOUDSQL_CONNECTION_NAME="${CLOUDSQL_CONNECTION_NAME:-${GCP_PROJECT_ID}:${REGION}:${SQL_INSTANCE_NAME}}"

IMAGE_URI="${IMAGE_URI:-${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${run_service_name}:${SERVICE_VERSION}}"

DOCKERFILE_PATH="${DOCKERFILE_PATH:-microservices/${microservice_folder}/Dockerfile}"
EXTRA_ENV_VARS="${EXTRA_ENV_VARS:-}"
READON_MICROSERVICES_PUBLIC="${READON_MICROSERVICES_PUBLIC:-true}"

ENV_VARS="SERVICE_NAME=${microservice_folder}##SERVICE_VERSION=${SERVICE_VERSION}##READON_LOG_LEVEL=${READON_LOG_LEVEL:-info}##READON_DEPLOY_ENV=${READON_DEPLOY_ENV}##CLOUDSQL_CONNECTION_NAME=${CLOUDSQL_CONNECTION_NAME}##READON_READY_REQUIRE_CLOUDSQL_MOUNT=${READON_USE_CLOUDSQL_MOUNT}##READON_STORAGE_BUCKET=${READON_STORAGE_BUCKET}##READON_DATABASE_NAME=${READON_DATABASE_NAME}"
if [[ -n "${EXTRA_ENV_VARS}" ]]; then
  ENV_VARS="${ENV_VARS}##${EXTRA_ENV_VARS}"
fi

echo "==> Deploy microservice"
echo "    GCP_PROJECT_ID=${GCP_PROJECT_ID} REGION=${REGION} READON_DEPLOY_ENV=${READON_DEPLOY_ENV}"
echo "    service=${run_service_name} folder=${microservice_folder} runtime_sa=${service_account_email}"
echo "    invoker_grant_to_main_sa=${MAIN_SA_EMAIL}"
echo "    bucket=${READON_STORAGE_BUCKET} database=${READON_DATABASE_NAME}"
echo "    Image: ${IMAGE_URI}"

if [[ "${SKIP_BUILD:-false}" != "true" ]]; then
  bash "${script_dir}/build-image.sh" "${DOCKERFILE_PATH}" "${IMAGE_URI}"
else
  echo "Skipping build-image (SKIP_BUILD=true)."
fi

gcloud beta run deploy "${run_service_name}" \
  --image="${IMAGE_URI}" \
  --region="${REGION}" \
  --service-account="${service_account_email}" \
  --port=8080 \
  --ingress=all \
  --add-cloudsql-instances="${CLOUDSQL_CONNECTION_NAME}" \
  --deploy-health-check \
  --liveness-probe=httpGet.path=/health,httpGet.port=8080 \
  --readiness-probe=httpGet.path=/ready,httpGet.port=8080 \
  --startup-probe=httpGet.path=/live,httpGet.port=8080 \
  --set-env-vars="^##^${ENV_VARS}" \
  --labels="app=readon,component=${run_service_name},managed-by=ops-gcp,readon-env=${READON_DEPLOY_ENV}" \
  --quiet

if [[ "${READON_MICROSERVICES_PUBLIC}" == "true" ]]; then
  gcloud run services add-iam-policy-binding "${run_service_name}" \
    --region="${REGION}" \
    --project="${GCP_PROJECT_ID}" \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --quiet
else
  # Harden access model: revoke public invoker access and allow the main app.
  gcloud run services remove-iam-policy-binding "${run_service_name}" \
    --region="${REGION}" \
    --project="${GCP_PROJECT_ID}" \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --quiet || true
fi

gcloud run services add-iam-policy-binding "${run_service_name}" \
  --region="${REGION}" \
  --project="${GCP_PROJECT_ID}" \
  --member="serviceAccount:${MAIN_SA_EMAIL}" \
  --role="roles/run.invoker" \
  --quiet

echo "Done deploying ${run_service_name}"

