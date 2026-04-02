#!/usr/bin/env bash
set -euo pipefail

# Creates Workload Identity Federation for GitHub Actions (OIDC) and two CI/CD deployer
# service accounts (test + prod) with least-privilege-style deploy permissions.
#
# Prerequisites: gcloud authenticated as a project owner (or equivalent).
#
# Required env:
#   GCP_PROJECT_ID
#   GITHUB_REPO_FULL   e.g. "myorg/ReadOn" (must match GitHub's repository claim)
#
# Optional env:
#   WIF_POOL_ID        default: readon-github
#   WIF_PROVIDER_ID    default: github-oidc
#   CICD_SA_TEST       default: readon-cicd-test
#   CICD_SA_PROD       default: readon-cicd-prod
#
# After this script:
# - Set GitHub repo variable WORKLOAD_IDENTITY_PROVIDER to:
#     projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/<POOL>/providers/<PROVIDER>
# - Set CICD_SERVICE_ACCOUNT_TEST / CICD_SERVICE_ACCOUNT_PROD to the SA emails printed below.

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../vars-shared.sh
source "${script_dir}/../vars-shared.sh"

GCP_PROJECT_ID="${GCP_PROJECT_ID:-$(load_project_id)}"
GITHUB_REPO_FULL="${GITHUB_REPO_FULL:-}"

if [[ -z "${GITHUB_REPO_FULL}" ]]; then
  echo "ERROR: Set GITHUB_REPO_FULL to owner/repo (e.g. myorg/ReadOn)." >&2
  exit 1
fi

WIF_POOL_ID="${WIF_POOL_ID:-readon-github}"
WIF_PROVIDER_ID="${WIF_PROVIDER_ID:-github-oidc}"
CICD_SA_TEST="${CICD_SA_TEST:-readon-cicd-test}"
CICD_SA_PROD="${CICD_SA_PROD:-readon-cicd-prod}"

export CLOUDSDK_CORE_PROJECT="${GCP_PROJECT_ID}"
gcloud config set project "${GCP_PROJECT_ID}" --quiet

echo "==> WIF / CI setup  GCP_PROJECT_ID=${GCP_PROJECT_ID}  GITHUB_REPO_FULL=${GITHUB_REPO_FULL}"

echo "==> Enabling APIs for Workload Identity Federation"
gcloud services enable \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  iam.googleapis.com \
  --quiet

PROJECT_NUMBER="$(gcloud projects describe "${GCP_PROJECT_ID}" --format='value(projectNumber)')"
WIF_POOL="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL_ID}"
WIF_PROVIDER_RESOURCE="${WIF_POOL}/providers/${WIF_PROVIDER_ID}"

echo "==> Workload Identity Pool: ${WIF_POOL_ID} (project_number=${PROJECT_NUMBER})"
if gcloud iam workload-identity-pools describe "${WIF_POOL_ID}" --location=global >/dev/null 2>&1; then
  echo "    (exists)"
else
  gcloud iam workload-identity-pools create "${WIF_POOL_ID}" \
    --project="${GCP_PROJECT_ID}" \
    --location="global" \
    --display-name="ReadOn GitHub Actions" \
    --quiet
fi

echo "==> OIDC provider (GitHub Actions): ${WIF_PROVIDER_ID}"
if gcloud iam workload-identity-pools providers describe "${WIF_PROVIDER_ID}" \
  --workload-identity-pool="${WIF_POOL_ID}" \
  --location=global >/dev/null 2>&1; then
  echo "    (exists)"
else
  gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER_ID}" \
    --project="${GCP_PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${WIF_POOL_ID}" \
    --display-name="GitHub Actions OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO_FULL}'" \
    --quiet
fi

sa_create() {
  local sa_name="$1"
  local display="$2"
  gcloud iam service-accounts describe "${sa_name}@${GCP_PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1 \
    || gcloud iam service-accounts create "${sa_name}" \
      --display-name="${display}" \
      --quiet
}

echo "==> CI/CD deployer service accounts"
sa_create "${CICD_SA_TEST}" "ReadOn CI/CD deploy (test / dev branch)"
sa_create "${CICD_SA_PROD}" "ReadOn CI/CD deploy (prod / main branch)"

CICD_TEST_EMAIL="${CICD_SA_TEST}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
CICD_PROD_EMAIL="${CICD_SA_PROD}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

grant_deployer_roles() {
  local sa_email="$1"
  gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
    --member="serviceAccount:${sa_email}" \
    --role="roles/run.admin" \
    --condition=None \
    --quiet
  gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
    --member="serviceAccount:${sa_email}" \
    --role="roles/cloudbuild.builds.editor" \
    --condition=None \
    --quiet
  # gcloud builds submit uploads sources to gs://<PROJECT_ID>_cloudbuild; the *invoking* identity needs object access.
  gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
    --member="serviceAccount:${sa_email}" \
    --role="roles/serviceusage.serviceUsageConsumer" \
    --condition=None \
    --quiet
}

echo "==> Project-level roles for deployers (Run admin, Cloud Build editor, Service Usage consumer)"
grant_deployer_roles "${CICD_TEST_EMAIL}"
grant_deployer_roles "${CICD_PROD_EMAIL}"

echo "==> Cloud Build staging bucket + CI deployer object access (idempotent)"
GCP_PROJECT_ID="${GCP_PROJECT_ID}" bash "${script_dir}/../grant-cicd-cloudbuild-access.sh"

allow_actas_runtime() {
  local cicd_email="$1"
  shift
  local sa_name
  for sa_name in "$@"; do
    local runtime_email="${sa_name}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
    if gcloud iam service-accounts describe "${runtime_email}" >/dev/null 2>&1; then
      gcloud iam service-accounts add-iam-policy-binding "${runtime_email}" \
        --member="serviceAccount:${cicd_email}" \
        --role="roles/iam.serviceAccountUser" \
        --quiet
    else
      echo "WARN: runtime SA not found yet (run provision.sh first?): ${runtime_email}" >&2
    fi
  done
}

echo "==> Allow CI/CD accounts to actAs runtime service accounts (deploy-time only; env-scoped lists)"
allow_actas_runtime "${CICD_TEST_EMAIL}" \
  readon-main-sa-test readon-phonics-sa-test readon-comprehension-sa-test readon-visualization-sa-test readon-audiobook-sa-test
allow_actas_runtime "${CICD_PROD_EMAIL}" \
  readon-main-sa readon-phonics-sa readon-comprehension-sa readon-visualization-sa readon-audiobook-sa

bind_wif_subject() {
  local sa_email="$1"
  local ref="$2"
  local subject="repo:${GITHUB_REPO_FULL}:ref:${ref}"
  echo "==> Workload Identity binding: ${sa_email} <- subject ${subject}"
  gcloud iam service-accounts add-iam-policy-binding "${sa_email}" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principal://iam.googleapis.com/${WIF_POOL}/subject/${subject}" \
    --quiet
}

bind_wif_subject "${CICD_TEST_EMAIL}" "refs/heads/dev"
bind_wif_subject "${CICD_PROD_EMAIL}" "refs/heads/main"

echo ""
echo "----------------------------------------------------------------"
echo "GitHub repository variables to configure:"
echo "  GCP_PROJECT_ID=${GCP_PROJECT_ID}"
echo "  WORKLOAD_IDENTITY_PROVIDER=${WIF_PROVIDER_RESOURCE}"
echo "  CICD_SERVICE_ACCOUNT_TEST=${CICD_TEST_EMAIL}"
echo "  CICD_SERVICE_ACCOUNT_PROD=${CICD_PROD_EMAIL}"
echo ""
echo "GitHub Actions auth step should use:"
echo "  workload_identity_provider: \${{ vars.WORKLOAD_IDENTITY_PROVIDER }}"
echo "  service_account: \${{ github.ref_name == 'main' && vars.CICD_SERVICE_ACCOUNT_PROD || vars.CICD_SERVICE_ACCOUNT_TEST }}"
echo "----------------------------------------------------------------"
