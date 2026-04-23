#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=vars-shared.sh
source "${script_dir}/vars-shared.sh"
# shellcheck source=readon-deploy-env.sh
source "${script_dir}/readon-deploy-env.sh"

GCP_PROJECT_ID="${GCP_PROJECT_ID:-$(load_project_id)}"

echo "==> Provisioning skeleton GCP resources  project=${GCP_PROJECT_ID}  region=${REGION}"

export CLOUDSDK_CORE_PROJECT="${GCP_PROJECT_ID}"
gcloud config set project "${GCP_PROJECT_ID}" --quiet

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 1; }
}

require_cmd gcloud
require_cmd openssl

########################################
# Optional: root password for Cloud SQL
########################################
if [[ -z "${SQL_ROOT_PASSWORD:-}" ]]; then
  SQL_PASSWORD_WAS_GENERATED=true
  echo "SQL_ROOT_PASSWORD is not set."
  echo "Generating a temporary password for provisioning (you may want to rotate later)."
  SQL_ROOT_PASSWORD="$(openssl rand -base64 24 | tr -d '\n' | tr -d '+/=' | cut -c1-24 || true)"
  if [[ -z "${SQL_ROOT_PASSWORD}" ]]; then
    echo "ERROR: failed to generate SQL_ROOT_PASSWORD" >&2
    exit 1
  fi
else
  SQL_PASSWORD_WAS_GENERATED=false
fi

########################################
# Enable required APIs
########################################
echo "==> Enabling required Google APIs"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  compute.googleapis.com \
  sqladmin.googleapis.com \
  servicenetworking.googleapis.com \
  storage-api.googleapis.com \
  vpcaccess.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  iam.googleapis.com \
  --quiet

########################################
# Artifact Registry
########################################
echo "==> Artifact Registry repo: ${ARTIFACT_REGISTRY_REPO} (${ARTIFACT_REGISTRY_LOCATION})"
gcloud artifacts repositories describe "${ARTIFACT_REGISTRY_REPO}" \
  --location="${ARTIFACT_REGISTRY_LOCATION}" >/dev/null 2>&1 \
  || gcloud artifacts repositories create "${ARTIFACT_REGISTRY_REPO}" \
    --location="${ARTIFACT_REGISTRY_LOCATION}" \
    --repository-format=docker \
    --description="ReadOn Docker images" \
    --quiet

# Cloud Build pushes images to Artifact Registry during gcloud builds submit.
PROJECT_NUMBER="$(gcloud projects describe "${GCP_PROJECT_ID}" --format='value(projectNumber)')"
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
echo "==> Artifact Registry writer for Cloud Build service account"
gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:${CLOUD_BUILD_SA}" \
  --role="roles/artifactregistry.writer" \
  --condition=None \
  --quiet

########################################
# VPC + subnet (for Cloud SQL private IP + Run VPC access connector)
########################################
echo "==> VPC network: ${VPC_NAME}"
gcloud compute networks describe "${VPC_NAME}" >/dev/null 2>&1 \
  || gcloud compute networks create "${VPC_NAME}" --subnet-mode=custom --quiet

echo "==> Subnet: ${SUBNET_NAME} (${SUBNET_IP_RANGE})"
gcloud compute networks subnets describe "${SUBNET_NAME}" --region="${REGION}" >/dev/null 2>&1 \
  || gcloud compute networks subnets create "${SUBNET_NAME}" \
    --network="${VPC_NAME}" \
    --range="${SUBNET_IP_RANGE}" \
    --region="${REGION}" \
    --enable-private-ip-google-access \
    --quiet

########################################
# Serverless VPC Access connector
########################################
if [[ "${READON_CREATE_VPC_ACCESS_CONNECTOR}" == "true" ]]; then
  echo "==> Serverless VPC access connector: ${VPC_ACCESS_CONNECTOR_NAME}"
  gcloud compute networks vpc-access connectors describe "${VPC_ACCESS_CONNECTOR_NAME}" --region="${REGION}" >/dev/null 2>&1 \
    || gcloud compute networks vpc-access connectors create "${VPC_ACCESS_CONNECTOR_NAME}" \
      --region="${REGION}" \
      --network="${VPC_NAME}" \
      --range="${VPC_ACCESS_CONNECTOR_IP_RANGE}" \
      --machine-type=e2-micro \
      --min-instances=2 \
      --max-instances=10 \
      --quiet
else
  echo "==> Skipping Serverless VPC access connector (hardening: READON_CREATE_VPC_ACCESS_CONNECTOR=false)"
fi

########################################
# Cloud Router + NAT (for general egress compatibility)
########################################
if [[ "${READON_CREATE_CLOUD_ROUTER_NAT}" == "true" ]]; then
  echo "==> Cloud Router + Cloud NAT"
  gcloud compute routers describe "${VPC_NAME}-router" --region="${REGION}" >/dev/null 2>&1 \
    || gcloud compute routers create "${VPC_NAME}-router" \
      --network="${VPC_NAME}" \
      --region="${REGION}" \
      --quiet

  gcloud compute routers nats describe "${VPC_NAME}-nat" --router="${VPC_NAME}-router" --router-region="${REGION}" >/dev/null 2>&1 \
    || gcloud compute routers nats create "${VPC_NAME}-nat" \
      --router="${VPC_NAME}-router" \
      --region="${REGION}" \
      --nat-all-subnet-ip-ranges \
      --auto-allocate-nat-external-ips \
      --quiet
else
  echo "==> Skipping Cloud Router/NAT (hardening: READON_CREATE_CLOUD_ROUTER_NAT=false)"
fi

########################################
# Cloud SQL private IP (VPC peering / private service access)
########################################
echo "==> Reserving Cloud SQL private service access range"
gcloud compute addresses describe "${SQL_PSA_RANGE_NAME}" --global >/dev/null 2>&1 \
  || gcloud compute addresses create "${SQL_PSA_RANGE_NAME}" \
    --global \
    --purpose=VPC_PEERING \
    --prefix-length="${SQL_PSA_PREFIX_LENGTH}" \
    --description="ReadOn Cloud SQL PSA range" \
    --network="${VPC_NAME}" \
    --quiet

echo "==> Creating service networking peering for Cloud SQL"
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges="${SQL_PSA_RANGE_NAME}" \
  --network="${VPC_NAME}" \
  --quiet >/dev/null 2>&1 || true

########################################
# Cloud SQL instance (skeleton: just provision connectivity plumbing)
########################################
echo "==> Cloud SQL instance: ${SQL_INSTANCE_NAME} (${SQL_VERSION}, ${SQL_TIER})"
gcloud sql instances describe "${SQL_INSTANCE_NAME}" --quiet >/dev/null 2>&1 \
  || gcloud beta sql instances create "${SQL_INSTANCE_NAME}" \
    --database-version="${SQL_VERSION}" \
    --tier="${SQL_TIER}" \
    --edition="${SQL_EDITION}" \
    --region="${REGION}" \
    --no-assign-ip \
    --network="${VPC_NAME}" \
    --allocated-ip-range-name="${SQL_PSA_RANGE_NAME}" \
    --root-password="${SQL_ROOT_PASSWORD}" \
    --no-backup \
    --quiet

########################################
# Logical databases (prod + test targets, same instance)
########################################
echo "==> Cloud SQL databases: readon (prod target), readon_test (test target)"
for db_name in readon readon_test; do
  if gcloud sql databases describe "${db_name}" --instance="${SQL_INSTANCE_NAME}" >/dev/null 2>&1; then
    echo "    (exists) ${db_name}"
  else
    gcloud sql databases create "${db_name}" --instance="${SQL_INSTANCE_NAME}" --quiet
    echo "    (created) ${db_name}"
  fi
done

########################################
# Per-environment buckets + runtime service accounts + IAM
########################################
sa_create() {
  local sa_name="$1"
  local display="$2"
  gcloud iam service-accounts describe "${sa_name}@${GCP_PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1 \
    || gcloud iam service-accounts create "${sa_name}" \
      --display-name="${display}" \
      --quiet
}

grant_project_role() {
  local sa_email="$1"
  local role="$2"
  gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
    --member="serviceAccount:${sa_email}" \
    --role="${role}" \
    --condition=None \
    --quiet
}

grant_bucket_role() {
  local sa_email="$1"
  local role="$2"
  local bucket="gs://${READON_STORAGE_BUCKET}"
  gcloud storage buckets add-iam-policy-binding "${bucket}" \
    --member="serviceAccount:${sa_email}" \
    --role="${role}" \
    --condition=None \
    --quiet
}

grant_ar_repo_role() {
  local sa_email="$1"
  local role="$2"
  gcloud artifacts repositories add-iam-policy-binding "${ARTIFACT_REGISTRY_REPO}" \
    --location="${ARTIFACT_REGISTRY_LOCATION}" \
    --member="serviceAccount:${sa_email}" \
    --role="${role}" \
    --condition=None \
    --quiet
}

for READON_DEPLOY_ENV in prod test; do
  export READON_DEPLOY_ENV
  readon_apply_deploy_env

  echo "==> Environment ${READON_DEPLOY_ENV}: bucket ${READON_STORAGE_BUCKET}"
  gcloud storage buckets describe "gs://${READON_STORAGE_BUCKET}" >/dev/null 2>&1 \
    || gcloud storage buckets create "gs://${READON_STORAGE_BUCKET}" \
      --location="${REGION}" \
      --uniform-bucket-level-access \
      --quiet

  echo "==> Environment ${READON_DEPLOY_ENV}: service accounts"
  sa_create "${MAIN_SA_NAME}" "ReadOn main Cloud Run (${READON_DEPLOY_ENV})"
  sa_create "${PHONICS_SA_NAME}" "ReadOn phonics Cloud Run (${READON_DEPLOY_ENV})"
  sa_create "${COMPREHENSION_SA_NAME}" "ReadOn comprehension Cloud Run (${READON_DEPLOY_ENV})"
  sa_create "${VISUALIZATION_SA_NAME}" "ReadOn visualization Cloud Run (${READON_DEPLOY_ENV})"
  sa_create "${AUDIOBOOK_SA_NAME}" "ReadOn audiobook Cloud Run (${READON_DEPLOY_ENV})"
  sa_create "${DASHBOARD_SA_NAME}" "ReadOn dashboard Cloud Run (${READON_DEPLOY_ENV})"

  SERVICE_ACCOUNTS=(
    "${MAIN_SA_EMAIL}"
    "${PHONICS_SA_EMAIL}"
    "${COMPREHENSION_SA_EMAIL}"
    "${VISUALIZATION_SA_EMAIL}"
    "${AUDIOBOOK_SA_EMAIL}"
    "${DASHBOARD_SA_EMAIL}"
  )

  echo "==> Environment ${READON_DEPLOY_ENV}: IAM for runtime service accounts"
  for sa_email in "${SERVICE_ACCOUNTS[@]}"; do
    grant_project_role "${sa_email}" "roles/cloudsql.client"
    grant_project_role "${sa_email}" "roles/logging.logWriter"
    grant_project_role "${sa_email}" "roles/monitoring.metricWriter"
    grant_ar_repo_role "${sa_email}" "roles/artifactregistry.reader"
    grant_bucket_role "${sa_email}" "roles/storage.objectViewer"
  done

done

# Audiobook: Cloud Text-to-Speech (ADC uses the Cloud Run runtime service account).
gcloud services enable texttospeech.googleapis.com --project="${GCP_PROJECT_ID}" --quiet || true

########################################
# GitHub Actions: Cloud Build source bucket (CI deployer SAs must exist — run wif/setup-github-oidc-wif.sh if missing)
########################################
echo "==> Cloud Build source bucket IAM for CI deployers (if SAs exist)"
bash "${script_dir}/grant-cicd-cloudbuild-access.sh"

########################################
# Output key names for handoff
########################################
echo ""
echo "Provisioning complete. Key resources:"
echo "  VPC: ${VPC_NAME}"
echo "  Subnet: ${SUBNET_NAME} (${SUBNET_IP_RANGE})"
echo "  Serverless VPC connector: ${VPC_ACCESS_CONNECTOR_NAME} (${VPC_ACCESS_CONNECTOR_IP_RANGE})"
echo "  Cloud SQL instance: ${SQL_INSTANCE_NAME} (private IP)"
echo "  Cloud SQL connection name (expected): ${GCP_PROJECT_ID}:${REGION}:${SQL_INSTANCE_NAME}"
echo "  Cloud SQL databases: readon (prod), readon_test (test)"
echo "  Cloud Storage buckets: ${GCP_PROJECT_ID}-assets (prod), ${GCP_PROJECT_ID}-assets-test (test)"
echo "  Bucket IAM: each runtime SA has storage.objectViewer only on its environment bucket (no cross-bucket grants)."
echo "  Artifact Registry repo: ${ARTIFACT_REGISTRY_REPO} (${ARTIFACT_REGISTRY_LOCATION})"
echo "  Note: roles/cloudsql.client is project-level (shared instance socket); use separate DB names/users for logical data isolation."

if [[ "${SQL_PASSWORD_WAS_GENERATED}" == "true" ]]; then
  echo "  NOTE: SQL_ROOT_PASSWORD was generated during provisioning. Copy it from this script's environment output if needed."
  echo "        (Set SQL_ROOT_PASSWORD explicitly on the next run to avoid regenerating.)"
fi
