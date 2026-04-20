#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "${script_dir}/vars.sh"

# Cloud Run service name stays VISUALIZATION_RUN_SERVICE_NAME (e.g. readon-visualization); image is image-generation-service.
bash "${script_dir}/deploy-microservice.sh" "image-generation-service" "${VISUALIZATION_RUN_SERVICE_NAME}" "${VISUALIZATION_SA_EMAIL}"

