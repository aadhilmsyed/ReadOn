#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"

source "${script_dir}/vars.sh"

DEPLOY_SERVICE_VERSION="${SERVICE_VERSION:-}"

set -a
[[ -f "${repo_root}/.env" ]] && source "${repo_root}/.env"
[[ -f "${repo_root}/microservices/image-generation-service/.env" ]] && source "${repo_root}/microservices/image-generation-service/.env"
set +a

[[ -n "${DEPLOY_SERVICE_VERSION}" ]] && SERVICE_VERSION="${DEPLOY_SERVICE_VERSION}"

# Persist metadata in Cloud SQL so GET /images/story/:storyId survives cold starts
# and matches legacy rows written from local/other environments.
# DB_SSL must stay false for Cloud SQL Auth Proxy / unix socket; do not inherit DB_SSL=true from .env (TCP dev).
EXTRA_ENV_VARS="STORAGE_DRIVER=postgres##DB_HOST=/cloudsql/${CLOUDSQL_CONNECTION_NAME:-${GCP_PROJECT_ID}:${REGION}:readon-sql}##DB_PORT=${DB_PORT:-5432}##DB_NAME=${DB_NAME:-images}##DB_USER=${DB_USER:-${READON_CLOUDSQL_TCP_USER:-postgres}}##DB_PASSWORD=${DB_PASSWORD:-${READON_CLOUDSQL_TCP_PASSWORD:-}}##DB_SSL=false##AI_IMAGE_API_KEY=${AI_IMAGE_API_KEY:-}##AI_IMAGE_API_ENDPOINT=${AI_IMAGE_API_ENDPOINT:-https://api.openai.com/v1/images/generations}##AI_IMAGE_MODEL=${AI_IMAGE_MODEL:-gpt-image-1}##AI_TIMEOUT=${AI_TIMEOUT:-60000}##CACHE_TTL=${CACHE_TTL:-3600}##RATE_LIMIT_MAX=${RATE_LIMIT_MAX:-100}##RATE_LIMIT_WINDOW=${RATE_LIMIT_WINDOW:-60000}##JSON_BODY_LIMIT=${JSON_BODY_LIMIT:-1mb}##GCP_PROJECT_ID=${GCP_PROJECT_ID}##READON_STORAGE_BUCKET=${READON_STORAGE_BUCKET}"
export EXTRA_ENV_VARS

# Cloud Run service name stays VISUALIZATION_RUN_SERVICE_NAME (e.g. readon-visualization); image is image-generation-service.
bash "${script_dir}/deploy-microservice.sh" "image-generation-service" "${VISUALIZATION_RUN_SERVICE_NAME}" "${VISUALIZATION_SA_EMAIL}"

