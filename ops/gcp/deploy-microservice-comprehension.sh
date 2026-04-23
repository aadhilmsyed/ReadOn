#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"

source "${script_dir}/vars.sh"

DEPLOY_SERVICE_VERSION="${SERVICE_VERSION:-}"

set -a
[[ -f "${repo_root}/.env" ]] && source "${repo_root}/.env"
[[ -f "${repo_root}/microservices/comprehension-service/.env" ]] && source "${repo_root}/microservices/comprehension-service/.env"
set +a

[[ -n "${DEPLOY_SERVICE_VERSION}" ]] && SERVICE_VERSION="${DEPLOY_SERVICE_VERSION}"

EXTRA_ENV_VARS="DATABASE_URL=##OPENAI_API_KEY=${OPENAI_API_KEY:-}##READON_DATABASE_HOST=/cloudsql/${CLOUDSQL_CONNECTION_NAME:-${GCP_PROJECT_ID}:${REGION}:readon-sql}##READON_DATABASE_PORT=5432##READON_DATABASE_USER=${READON_CLOUDSQL_TCP_USER:-postgres}##READON_DATABASE_PASSWORD=${READON_CLOUDSQL_TCP_PASSWORD:-}##READON_DATABASE_NAME=comprehension##READON_COMPREHENSION_LLM_TIMEOUT_MS=${READON_COMPREHENSION_LLM_TIMEOUT_MS:-30000}##READON_COMPREHENSION_CIRCUIT_BREAKER_FAILURE_THRESHOLD=${READON_COMPREHENSION_CIRCUIT_BREAKER_FAILURE_THRESHOLD:-3}##READON_COMPREHENSION_CIRCUIT_BREAKER_RESET_MS=${READON_COMPREHENSION_CIRCUIT_BREAKER_RESET_MS:-60000}"
export EXTRA_ENV_VARS

bash "${script_dir}/deploy-microservice.sh" "comprehension-service" "${COMPREHENSION_RUN_SERVICE_NAME}" "${COMPREHENSION_SA_EMAIL}"

