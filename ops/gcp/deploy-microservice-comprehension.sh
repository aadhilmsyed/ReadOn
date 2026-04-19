#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "${script_dir}/vars.sh"

bash "${script_dir}/deploy-microservice.sh" "comprehension-service" "${COMPREHENSION_RUN_SERVICE_NAME}" "${COMPREHENSION_SA_EMAIL}"

