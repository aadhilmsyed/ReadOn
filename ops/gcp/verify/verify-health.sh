#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../vars.sh
source "${script_dir}/../vars.sh"

VERIFY_AUTHENTICATED="${VERIFY_AUTHENTICATED:-false}"

services=(
  "${MAIN_RUN_SERVICE_NAME}"
  "${PHONICS_RUN_SERVICE_NAME}"
  "${COMPREHENSION_RUN_SERVICE_NAME}"
  "${VISUALIZATION_RUN_SERVICE_NAME}"
  "${AUDIOBOOK_RUN_SERVICE_NAME}"
  "${DASHBOARD_RUN_SERVICE_NAME}"
)

probe_paths=(
  "/health"
  "/live"
  "/ready"
)

tmp_dir="$(mktemp -d)"
cleanup() { rm -rf "${tmp_dir}"; }
trap cleanup EXIT

ACCESS_TOKEN=""
if [[ "${VERIFY_AUTHENTICATED}" == "true" ]]; then
  ACCESS_TOKEN="$(gcloud auth print-access-token)"
fi

echo "==> verify-health  GCP_PROJECT_ID=${GCP_PROJECT_ID}  REGION=${REGION}  READON_DEPLOY_ENV=${READON_DEPLOY_ENV}"

for svc in "${services[@]}"; do
  echo "==> ${svc}"
  url="$(gcloud run services describe "${svc}" --region="${REGION}" --project="${GCP_PROJECT_ID}" --format='value(status.url)' 2>/dev/null || true)"
  if [[ -z "${url}" ]]; then
    echo "ERROR: Cloud Run service not found or not accessible: ${svc} (wrong READON_DEPLOY_ENV or not deployed?)" >&2
    exit 1
  fi
  echo "URL: ${url}"

  echo "Cloud Run conditions (control plane):"
  gcloud run services describe "${svc}" --region="${REGION}" --project="${GCP_PROJECT_ID}" \
    --format='table(status.conditions.type,status.conditions.status)' 2>/dev/null || true

  if [[ "${svc}" == "${MAIN_RUN_SERVICE_NAME}" ]]; then
    for p in "${probe_paths[@]}"; do
      full="${url}${p}"
      echo "GET ${full} (main is public)"
      http_code="$(curl -sS -o /dev/null -w '%{http_code}' "${full}" || true)"
      echo "${http_code}"
      if [[ "${http_code}" != "200" ]]; then
        echo "ERROR: expected 200 from main ${p}" >&2
        exit 1
      fi
    done
  else
    echo "Microservice unauthenticated probes: accept 200 (public) or 401/403 (invoker-only)."
    for p in "${probe_paths[@]}"; do
      full="${url}${p}"
      http_code="$(curl -sS -o /dev/null -w '%{http_code}' "${full}" || true)"
      echo "GET ${full} -> ${http_code}"
      if [[ "${http_code}" != "200" && "${http_code}" != "401" && "${http_code}" != "403" ]]; then
        echo "ERROR: expected one of 200/401/403 for microservice unauth probe on ${p}" >&2
        exit 1
      fi
    done
    if [[ "${VERIFY_AUTHENTICATED}" == "true" ]]; then
      for p in "${probe_paths[@]}"; do
        full="${url}${p}"
        echo "GET ${full} (authenticated)"
        http_code="$(curl -sS -o /dev/null -w '%{http_code}' \
          -H "Authorization: Bearer ${ACCESS_TOKEN}" \
          "${full}" || true)"
        echo "${http_code}"
        if [[ "${http_code}" != "200" ]]; then
          echo "ERROR: expected 200 with invoker auth on ${p}" >&2
          exit 1
        fi
      done
    fi
  fi
done

echo "==> verify-health complete for READON_DEPLOY_ENV=${READON_DEPLOY_ENV}"
