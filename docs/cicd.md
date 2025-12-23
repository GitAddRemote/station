# CI/CD Overview

This repo uses GitHub Actions for CI on pull requests and Helm-based deployments on pushes to `main`.

## Pipeline Summary

- Pull requests: lint, typecheck, tests, and builds (backend + frontend).
- Main branch: builds images, deploys to staging, and waits for production approval.

## GitHub Environments

Create two environments in GitHub:

- `staging`
- `production` (require reviewers for approval)

Add the following secrets to each environment:

- `KUBE_CONFIG_STAGING`: kubeconfig content for the staging cluster.
- `KUBE_CONFIG_PRODUCTION`: kubeconfig content for the production cluster.

## Container Registry

The pipeline publishes images to GHCR:

- `ghcr.io/<owner>/<repo>/station-backend:<sha>`
- `ghcr.io/<owner>/<repo>/station-frontend:<sha>`

Make sure your cluster can pull from GHCR. If the repository is private, create a pull secret in each namespace:

```bash
kubectl -n station-staging create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<personal-access-token>
```

Reference the image pull secret in Helm values if needed.

Example values snippet:

```yaml
imagePullSecrets:
  - name: ghcr-pull
```

## Helm Charts

Charts are under `helm/charts` with environment values in `helm/environments`.

- `helm/charts/backend`
- `helm/charts/frontend`
- `helm/environments/staging/*.yaml`
- `helm/environments/production/*.yaml`

Update ingress hosts and image repositories per environment in the values files.

## Kubernetes Secrets

The backend expects a secret named `station-backend-env` in each environment namespace:

```bash
kubectl -n station-staging create secret generic station-backend-env \
  --from-literal=DATABASE_HOST=... \
  --from-literal=DATABASE_PORT=... \
  --from-literal=DATABASE_USER=... \
  --from-literal=DATABASE_PASSWORD=... \
  --from-literal=DATABASE_NAME=... \
  --from-literal=JWT_SECRET=...
```

## Manual Promotion to Production

Production deployment waits for environment approval after staging completes. Approve the `production` environment in GitHub Actions to proceed.

## Local Helm Deploy

```bash
./scripts/deploy/helm-deploy.sh staging ghcr.io/<owner>/<repo>/station-backend:<tag> ghcr.io/<owner>/<repo>/station-frontend:<tag>
```
