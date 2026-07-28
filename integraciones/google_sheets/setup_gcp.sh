#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-boda-500805}"
SA_NAME="${2:-boda-sheets-mcp}"
SA_DISPLAY_NAME="${3:-Boda Sheets MCP Service Account}"
KEY_OUT="${4:-integraciones/google_sheets/service_account.json}"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud CLI no esta instalado. Instala Google Cloud SDK y vuelve a correr este script."
  exit 1
fi

echo "[1/6] Set project ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}" >/dev/null

echo "[2/6] Enable APIs (Sheets + Drive)"
gcloud services enable sheets.googleapis.com drive.googleapis.com --project "${PROJECT_ID}"

echo "[3/6] Create service account if missing"
if ! gcloud iam service-accounts describe "${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name "${SA_DISPLAY_NAME}" \
    --project "${PROJECT_ID}"
fi

echo "[4/6] Grant role roles/editor to service account"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/editor" >/dev/null

echo "[5/6] Create key file at ${KEY_OUT}"
mkdir -p "$(dirname "${KEY_OUT}")"
gcloud iam service-accounts keys create "${KEY_OUT}" \
  --iam-account "${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project "${PROJECT_ID}"

echo "[6/6] Done"
echo "Service account email: ${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
echo "Ahora comparte tu Google Sheet con ese email como Editor."
