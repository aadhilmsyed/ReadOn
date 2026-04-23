#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"

source "${script_dir}/vars.sh"

DEPLOY_SERVICE_VERSION="${SERVICE_VERSION:-}"

set -a
[[ -f "${repo_root}/.env" ]] && source "${repo_root}/.env"
[[ -f "${repo_root}/microservices/phonics-service/.env" ]] && source "${repo_root}/microservices/phonics-service/.env"
set +a

[[ -n "${DEPLOY_SERVICE_VERSION}" ]] && SERVICE_VERSION="${DEPLOY_SERVICE_VERSION}"

EXTRA_ENV_VARS="MERRIAM_WEBSTER_API_KEY=${MERRIAM_WEBSTER_API_KEY:-}##MERRIAM_WEBSTER_API_KEY_COLLEGIATE=${MERRIAM_WEBSTER_API_KEY_COLLEGIATE:-}##PHONICS_DB_SSL=false##PHONICS_DATABASE_URL=##PHONICS_DB_HOST=/cloudsql/${CLOUDSQL_CONNECTION_NAME:-${GCP_PROJECT_ID}:${REGION}:readon-sql}##PHONICS_DB_PORT=5432##PHONICS_DB_NAME=phonics##PHONICS_DB_USER=${READON_CLOUDSQL_TCP_USER:-postgres}##PHONICS_DB_PASSWORD=${READON_CLOUDSQL_TCP_PASSWORD:-}"
export EXTRA_ENV_VARS

bash "${script_dir}/deploy-microservice.sh" "phonics-service" "${PHONICS_RUN_SERVICE_NAME}" "${PHONICS_SA_EMAIL}"

