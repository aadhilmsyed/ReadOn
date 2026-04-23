#!/usr/bin/env bash
# shellcheck shell=bash
# Resolve per-environment names (prod vs test) after GCP_PROJECT_ID is set.
# Expects: READON_DEPLOY_ENV in {prod,test}, GCP_PROJECT_ID, REGION.

readon_apply_deploy_env() {
  local deploy_env="${READON_DEPLOY_ENV:-prod}"

  case "${deploy_env}" in
    prod)
      MAIN_RUN_SERVICE_NAME="readon-main"
      PHONICS_RUN_SERVICE_NAME="readon-phonics"
      COMPREHENSION_RUN_SERVICE_NAME="readon-comprehension"
      VISUALIZATION_RUN_SERVICE_NAME="readon-visualization"
      AUDIOBOOK_RUN_SERVICE_NAME="readon-audiobook"
      DASHBOARD_RUN_SERVICE_NAME="readon-dashboard"

      MAIN_SA_NAME="readon-main-sa"
      PHONICS_SA_NAME="readon-phonics-sa"
      COMPREHENSION_SA_NAME="readon-comprehension-sa"
      VISUALIZATION_SA_NAME="readon-visualization-sa"
      AUDIOBOOK_SA_NAME="readon-audiobook-sa"
      DASHBOARD_SA_NAME="readon-dashboard-sa"

      READON_ASSETS_BUCKET_NAME="${GCP_PROJECT_ID}-assets"
      SQL_DB_NAME="readon"
      ;;
    test)
      MAIN_RUN_SERVICE_NAME="readon-main-test"
      PHONICS_RUN_SERVICE_NAME="readon-phonics-test"
      COMPREHENSION_RUN_SERVICE_NAME="readon-comprehension-test"
      VISUALIZATION_RUN_SERVICE_NAME="readon-visualization-test"
      AUDIOBOOK_RUN_SERVICE_NAME="readon-audiobook-test"
      DASHBOARD_RUN_SERVICE_NAME="readon-dashboard-test"

      MAIN_SA_NAME="readon-main-sa-test"
      PHONICS_SA_NAME="readon-phonics-sa-test"
      COMPREHENSION_SA_NAME="readon-comprehension-sa-test"
      VISUALIZATION_SA_NAME="readon-visualization-sa-test"
      AUDIOBOOK_SA_NAME="readon-audiobook-sa-test"
      DASHBOARD_SA_NAME="readon-dashboard-sa-test"

      READON_ASSETS_BUCKET_NAME="${GCP_PROJECT_ID}-assets-test"
      SQL_DB_NAME="readon_test"
      ;;
    *)
      echo "ERROR: READON_DEPLOY_ENV must be prod or test (got: ${deploy_env})" >&2
      exit 1
      ;;
  esac

  READON_STORAGE_BUCKET="${READON_ASSETS_BUCKET_NAME}"
  READON_DATABASE_NAME="${SQL_DB_NAME}"

  MAIN_SA_EMAIL="${MAIN_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
  PHONICS_SA_EMAIL="${PHONICS_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
  COMPREHENSION_SA_EMAIL="${COMPREHENSION_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
  VISUALIZATION_SA_EMAIL="${VISUALIZATION_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
  AUDIOBOOK_SA_EMAIL="${AUDIOBOOK_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
  DASHBOARD_SA_EMAIL="${DASHBOARD_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
}
