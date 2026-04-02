#!/usr/bin/env bash
set -euo pipefail

# Deploy all microservices then the main app for one environment (prod | test).
# Usage: READON_DEPLOY_ENV=prod [SERVICE_VERSION=...] bash ops/gcp/deploy-stack.sh
# Or:    bash ops/gcp/deploy-stack.sh prod

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -n "${1:-}" ]]; then
  if [[ "${1}" != "prod" && "${1}" != "test" ]]; then
    echo "ERROR: first argument must be prod or test (got: ${1})" >&2
    echo "Usage: READON_DEPLOY_ENV=prod bash ops/gcp/deploy-stack.sh   or: bash ops/gcp/deploy-stack.sh prod" >&2
    exit 1
  fi
  export READON_DEPLOY_ENV="$1"
fi

# shellcheck source=vars.sh
source "${script_dir}/vars.sh"

export SERVICE_VERSION="${SERVICE_VERSION:-local-dev}"

echo "==> Deploy stack"
echo "    GCP_PROJECT_ID=${GCP_PROJECT_ID}"
echo "    REGION=${REGION}"
echo "    READON_DEPLOY_ENV=${READON_DEPLOY_ENV}"
echo "    SERVICE_VERSION=${SERVICE_VERSION}"
echo "    READON_STORAGE_BUCKET=${READON_STORAGE_BUCKET}"
echo "    READON_DATABASE_NAME=${READON_DATABASE_NAME}"
echo "    MAIN_RUN_SERVICE_NAME=${MAIN_RUN_SERVICE_NAME} (service_account=${MAIN_SA_EMAIL})"

bash "${script_dir}/deploy-microservice-phonics.sh"
bash "${script_dir}/deploy-microservice-comprehension.sh"
bash "${script_dir}/deploy-microservice-visualization.sh"
bash "${script_dir}/deploy-microservice-audiobook.sh"

run_url() {
  gcloud run services describe "$1" --region="${REGION}" --project="${GCP_PROJECT_ID}" --format='value(status.url)'
}

export READON_PHONICS_SERVICE_URL="$(run_url "${PHONICS_RUN_SERVICE_NAME}")"
export READON_COMPREHENSION_SERVICE_URL="$(run_url "${COMPREHENSION_RUN_SERVICE_NAME}")"
export READON_VISUALIZATION_SERVICE_URL="$(run_url "${VISUALIZATION_RUN_SERVICE_NAME}")"
export READON_AUDIOBOOK_SERVICE_URL="$(run_url "${AUDIOBOOK_RUN_SERVICE_NAME}")"

bash "${script_dir}/deploy-main.sh"

echo "==> Stack deploy complete for ${READON_DEPLOY_ENV}"
