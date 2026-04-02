#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "${script_dir}/vars.sh"

SERVICE_VERSION="${SERVICE_VERSION:-local-dev}"

CLOUDSQL_CONNECTION_NAME="${CLOUDSQL_CONNECTION_NAME:-${GCP_PROJECT_ID}:${REGION}:${SQL_INSTANCE_NAME}}"

IMAGE_URI="${IMAGE_URI:-${ARTIFACT_REGISTRY_LOCATION}-docker.pkg.dev/${GCP_PROJECT_ID}/${ARTIFACT_REGISTRY_REPO}/${MAIN_RUN_SERVICE_NAME}:${SERVICE_VERSION}}"

DOCKERFILE_PATH="${DOCKERFILE_PATH:-Dockerfile}"

echo "==> Deploy main"
echo "    GCP_PROJECT_ID=${GCP_PROJECT_ID} REGION=${REGION} READON_DEPLOY_ENV=${READON_DEPLOY_ENV}"
echo "    service=${MAIN_RUN_SERVICE_NAME} service_account=${MAIN_SA_EMAIL}"
echo "    bucket=${READON_STORAGE_BUCKET} database=${READON_DATABASE_NAME}"
echo "    Image: ${IMAGE_URI}"

if [[ "${SKIP_BUILD:-false}" != "true" ]]; then
  bash "${script_dir}/build-image.sh" "${DOCKERFILE_PATH}" "${IMAGE_URI}"
else
  echo "Skipping build-image (SKIP_BUILD=true)."
fi

gcloud beta run deploy "${MAIN_RUN_SERVICE_NAME}" \
  --image="${IMAGE_URI}" \
  --region="${REGION}" \
  --service-account="${MAIN_SA_EMAIL}" \
  --port=8080 \
  --allow-unauthenticated \
  --ingress=all \
  --add-cloudsql-instances="${CLOUDSQL_CONNECTION_NAME}" \
  --deploy-health-check \
  --liveness-probe=httpGet.path=/health,httpGet.port=8080 \
  --readiness-probe=httpGet.path=/ready,httpGet.port=8080 \
  --startup-probe=httpGet.path=/live,httpGet.port=8080 \
  --set-env-vars="SERVICE_NAME=${MAIN_RUN_SERVICE_NAME},SERVICE_VERSION=${SERVICE_VERSION},READON_LOG_LEVEL=${READON_LOG_LEVEL:-info},READON_DEPLOY_ENV=${READON_DEPLOY_ENV},CLOUDSQL_CONNECTION_NAME=${CLOUDSQL_CONNECTION_NAME},READON_READY_REQUIRE_CLOUDSQL_MOUNT=${READON_READY_REQUIRE_CLOUDSQL_MOUNT:-false},READON_STORAGE_BUCKET=${READON_STORAGE_BUCKET},READON_DATABASE_NAME=${READON_DATABASE_NAME},READON_AUDIOBOOK_SERVICE_URL=${READON_AUDIOBOOK_SERVICE_URL:-},READON_PHONICS_SERVICE_URL=${READON_PHONICS_SERVICE_URL:-},READON_COMPREHENSION_SERVICE_URL=${READON_COMPREHENSION_SERVICE_URL:-},READON_VISUALIZATION_SERVICE_URL=${READON_VISUALIZATION_SERVICE_URL:-}" \
  --labels="app=readon,component=${MAIN_RUN_SERVICE_NAME},managed-by=ops-gcp,readon-env=${READON_DEPLOY_ENV}" \
  --quiet

echo "Done deploying ${MAIN_RUN_SERVICE_NAME}"

