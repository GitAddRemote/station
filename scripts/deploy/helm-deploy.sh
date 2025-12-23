#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT=${1:?Environment name required (staging|production)}
BACKEND_IMAGE=${2:?Backend image required}
FRONTEND_IMAGE=${3:?Frontend image required}

NAMESPACE="station-${ENVIRONMENT}"
VALUES_DIR="helm/environments/${ENVIRONMENT}"

kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install station-backend helm/charts/backend \
  --namespace "${NAMESPACE}" \
  --values "${VALUES_DIR}/backend-values.yaml" \
  --set image.repository="${BACKEND_IMAGE%:*}" \
  --set image.tag="${BACKEND_IMAGE##*:}"

helm upgrade --install station-frontend helm/charts/frontend \
  --namespace "${NAMESPACE}" \
  --values "${VALUES_DIR}/frontend-values.yaml" \
  --set image.repository="${FRONTEND_IMAGE%:*}" \
  --set image.tag="${FRONTEND_IMAGE##*:}"

kubectl -n "${NAMESPACE}" rollout status deployment/station-backend
kubectl -n "${NAMESPACE}" rollout status deployment/station-frontend
