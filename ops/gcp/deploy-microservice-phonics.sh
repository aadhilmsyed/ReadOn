#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "${script_dir}/vars.sh"

bash "${script_dir}/deploy-microservice.sh" "phonics-service" "${PHONICS_RUN_SERVICE_NAME}" "${PHONICS_SA_EMAIL}"

