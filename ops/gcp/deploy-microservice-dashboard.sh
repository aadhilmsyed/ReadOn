#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"

source "${script_dir}/vars.sh"

DEPLOY_SERVICE_VERSION="${SERVICE_VERSION:-}"

set -a
[[ -f "${repo_root}/.env" ]] && source "${repo_root}/.env"
set +a

[[ -n "${DEPLOY_SERVICE_VERSION}" ]] && SERVICE_VERSION="${DEPLOY_SERVICE_VERSION}"

EXTRA_ENV_VARS="NODE_ENV=${NODE_ENV:-production}##CORS_ORIGIN=${CORS_ORIGIN:-*}##PGHOST=/cloudsql/${CLOUDSQL_CONNECTION_NAME:-${GCP_PROJECT_ID}:${REGION}:readon-sql}##PGPORT=${PGPORT:-5432}##PGUSER=${PGUSER:-${READON_CLOUDSQL_TCP_USER:-postgres}}##PGPASSWORD=${PGPASSWORD:-${READON_CLOUDSQL_TCP_PASSWORD:-}}##PHONICS_DB=${PHONICS_DB:-phonics}##COMPREHENSION_DB=${COMPREHENSION_DB:-comprehension}##VISUALIZATION_DB=${VISUALIZATION_DB:-images}##AUDIOBOOK_DB=${AUDIOBOOK_DB:-audiobook}##DASHBOARD_DB=${DASHBOARD_DB:-dashboard}"
export EXTRA_ENV_VARS

bash "${script_dir}/deploy-microservice.sh" "dashboard-service" "${DASHBOARD_RUN_SERVICE_NAME}" "${DASHBOARD_SA_EMAIL}"
