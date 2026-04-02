#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=vars-shared.sh
source "${script_dir}/vars-shared.sh"
# shellcheck source=readon-deploy-env.sh
source "${script_dir}/readon-deploy-env.sh"

READON_DEPLOY_ENV="${READON_DEPLOY_ENV:-prod}"
export READON_DEPLOY_ENV

GCP_PROJECT_ID="${GCP_PROJECT_ID:-$(load_project_id)}"
export GCP_PROJECT_ID

readon_apply_deploy_env

echo "Using GCP_PROJECT_ID=${GCP_PROJECT_ID}, REGION=${REGION}, READON_DEPLOY_ENV=${READON_DEPLOY_ENV}"
