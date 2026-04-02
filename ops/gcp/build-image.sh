#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/../.." && pwd)"

source "${script_dir}/vars.sh"

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <DOCKERFILE_PATH> <IMAGE_URI>" >&2
  exit 1
fi

DOCKERFILE_PATH="$1"
IMAGE_URI="$2"

echo "Building image: ${IMAGE_URI}"

gcloud builds submit "${repo_root}" \
  --config="${repo_root}/ops/gcp/cloudbuild/build-dockerfile.yaml" \
  --substitutions=_DOCKERFILE_PATH="${DOCKERFILE_PATH}",_IMAGE_URI="${IMAGE_URI}" \
  --quiet

