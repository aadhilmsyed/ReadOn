#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"

source "${script_dir}/vars.sh"

DEPLOY_GCP_PROJECT_ID="${GCP_PROJECT_ID}"
DEPLOY_SERVICE_VERSION="${SERVICE_VERSION:-}"

set -a
[[ -f "${repo_root}/.env" ]] && source "${repo_root}/.env"
[[ -f "${repo_root}/microservices/audiobook-service/.env" ]] && source "${repo_root}/microservices/audiobook-service/.env"
set +a

# Local .env often points GOOGLE_APPLICATION_CREDENTIALS at a repo-relative JSON key.
# That file is not in the container image; passing it breaks Cloud Run (ENOENT).
# Production uses ADC on the Cloud Run service account. Opt-in to a mounted key path:
#   READON_AUDIOBOOK_GOOGLE_APPLICATION_CREDENTIALS=/secrets/google-tts.json
unset GOOGLE_APPLICATION_CREDENTIALS

AUDIOBOOK_PROVIDER_PROJECT_ID="${GCP_PROJECT_ID:-}"
GCP_PROJECT_ID="${DEPLOY_GCP_PROJECT_ID}"
[[ -n "${DEPLOY_SERVICE_VERSION}" ]] && SERVICE_VERSION="${DEPLOY_SERVICE_VERSION}"

TTS_CRED_BLOCK=""
if [[ -n "${READON_AUDIOBOOK_GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  TTS_CRED_BLOCK="GOOGLE_APPLICATION_CREDENTIALS=${READON_AUDIOBOOK_GOOGLE_APPLICATION_CREDENTIALS}##"
fi

# Never deploy split service-account JSON fields from .env (unused by the service and
# they would expose private keys in Cloud Run configuration). TTS auth is ADC on Cloud Run.
EXTRA_ENV_VARS="${TTS_CRED_BLOCK}GCP_PROJECT_ID=${AUDIOBOOK_PROVIDER_PROJECT_ID}##GOOGLE_TTS_LANGUAGE_CODE=${GOOGLE_TTS_LANGUAGE_CODE:-en-US}##GOOGLE_TTS_VOICE_NAME=${GOOGLE_TTS_VOICE_NAME:-en-US-Neural2-J}##GOOGLE_TTS_SPEAKING_RATE=${GOOGLE_TTS_SPEAKING_RATE:-1}"
export EXTRA_ENV_VARS

bash "${script_dir}/deploy-microservice.sh" "audiobook-service" "${AUDIOBOOK_RUN_SERVICE_NAME}" "${AUDIOBOOK_SA_EMAIL}"

