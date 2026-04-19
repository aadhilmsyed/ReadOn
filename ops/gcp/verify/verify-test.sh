#!/usr/bin/env bash
set -euo pipefail
export READON_DEPLOY_ENV=test
exec bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/verify-health.sh"
