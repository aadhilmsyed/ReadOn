#!/usr/bin/env bash
# Shared GCP defaults (not per deploy environment). Sourced by vars.sh and provision.sh.

REGION="${REGION:-us-central1}"
VPC_NAME="${VPC_NAME:-readon-vpc}"
SUBNET_NAME="${SUBNET_NAME:-readon-subnet}"
SUBNET_IP_RANGE="${SUBNET_IP_RANGE:-10.10.0.0/24}"

VPC_ACCESS_CONNECTOR_NAME="${VPC_ACCESS_CONNECTOR_NAME:-readon-run-connector}"
VPC_ACCESS_CONNECTOR_IP_RANGE="${VPC_ACCESS_CONNECTOR_IP_RANGE:-10.8.0.0/28}"

READON_CREATE_VPC_ACCESS_CONNECTOR="${READON_CREATE_VPC_ACCESS_CONNECTOR:-false}"
READON_CREATE_CLOUD_ROUTER_NAT="${READON_CREATE_CLOUD_ROUTER_NAT:-false}"

SQL_PSA_RANGE_NAME="${SQL_PSA_RANGE_NAME:-readon-sql-psa-range}"
SQL_PSA_PREFIX_LENGTH="${SQL_PSA_PREFIX_LENGTH:-24}"

ARTIFACT_REGISTRY_REPO="${ARTIFACT_REGISTRY_REPO:-readon-artifacts}"
ARTIFACT_REGISTRY_LOCATION="${ARTIFACT_REGISTRY_LOCATION:-$REGION}"

SQL_INSTANCE_NAME="${SQL_INSTANCE_NAME:-readon-sql}"
SQL_TIER="${SQL_TIER:-db-g1-small}"
SQL_VERSION="${SQL_VERSION:-POSTGRES_16}"
SQL_EDITION="${SQL_EDITION:-enterprise}"

READON_USE_CLOUDSQL_MOUNT="false"

load_project_id() {
  local configured
  configured="$(gcloud config get-value project 2>/dev/null | tail -n 1 || true)"
  if [[ -z "${configured}" ]]; then
    echo "ERROR: Could not detect gcloud project. Set GCP_PROJECT_ID explicitly." >&2
    exit 1
  fi
  echo "$configured"
}
