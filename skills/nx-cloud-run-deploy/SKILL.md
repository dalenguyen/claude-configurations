---
name: nx-cloud-run-deploy
description: Deploy one or more Nx workspace apps to Google Cloud Run. Builds with Nx, pushes Docker images to Artifact Registry, deploys to Cloud Run. Use when deploying an Nx monorepo app to GCP Cloud Run locally or setting up a GitHub Actions deploy workflow.
allowed-tools: Bash(gcloud:*), Bash(docker:*), Bash(pnpm:*), Bash(git:*), Read, Glob, Write, Edit
---

# Deploy Nx App(s) to Cloud Run

Deploy one or more apps from an Nx monorepo to Google Cloud Run.

## Required context to gather first

Before starting, ask the user for any missing values:

| Variable | Description | Example |
|---|---|---|
| `PROJECT_ID` | GCP project ID | `my-gcp-project` |
| `REGION` | GCP region | `us-central1` |
| `REPO_NAME` | Artifact Registry repo name | `maplestocks` |
| `apps` | List of app names to deploy | `web`, `scheduler` |

For each app, also determine:
- **Public or internal?** Public → `--allow-unauthenticated`. Internal → `--no-allow-unauthenticated --ingress internal`
- **Secrets?** List of Secret Manager secret names to mount as env vars
- **Env vars?** Any plain env vars (e.g. `NODE_ENV=production`)
- **Cloud Run service name?** Defaults to `<repo>-<app>` (e.g. `maplestocks-web`)

## Steps

### 1. Verify prerequisites
```bash
# Check gcloud auth
gcloud auth list
gcloud config get-value project

# Check Docker
docker info
```

If not authenticated:
```bash
gcloud auth login
gcloud config set project $PROJECT_ID
gcloud auth configure-docker $REGION-docker.pkg.dev
```

### 2. Build all apps with Nx
```bash
pnpm nx build <app> --configuration=production
# Repeat for each app
```

Build output lands in `dist/apps/<app>/`.

### 3. Build Docker images

Each app needs a `Dockerfile` at `apps/<app>/Dockerfile`. Standard pattern:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm nx build <app> --configuration=production

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist/apps/<app> ./

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "<entrypoint>"]
```

- AnalogJS/Nitro entrypoint: `analog/server/index.mjs`
- Fastify/Node entrypoint: `main.js`

Build and tag:
```bash
SHA=$(git rev-parse --short HEAD)
IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/<app>:$SHA"
docker build -t "$IMAGE" -f apps/<app>/Dockerfile .
docker push "$IMAGE"
```

### 4. Deploy to Cloud Run

**Public service (web app):**
```bash
gcloud run deploy <service-name> \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "SECRET_NAME=SECRET_NAME:latest"
```

**Internal service (scheduler, workers):**
```bash
gcloud run deploy <service-name> \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --no-allow-unauthenticated \
  --ingress internal \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "SECRET_A=SECRET_A:latest,SECRET_B=SECRET_B:latest"
```

Multiple secrets: comma-separated in `--set-secrets`.

### 5. Verify deployment
```bash
gcloud run services describe <service-name> --region $REGION --format "value(status.url)"
# Curl the health endpoint or homepage
curl -s <url>
```

### 6. Report
Output:
- Service URL for each deployed app
- Image tag (git SHA) used
- Any secrets mounted

---

## GitHub Actions workflow template

When the user wants CI/CD, generate `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  workflow_run:
    workflows: [CI]
    types: [completed]
    branches: [main]

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1
  REPO_NAME: <repo-name>

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    permissions:
      contents: read
      id-token: write   # Required for Workload Identity Federation

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: latest

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: |
          pnpm nx build web --configuration=production
          pnpm nx build scheduler --configuration=production

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WORKLOAD_IDENTITY_PROVIDER }}
          service_account: ${{ secrets.GCP_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev

      - name: Build and push Docker images
        run: |
          IMAGE_WEB="${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPO_NAME }}/web:${{ github.sha }}"
          IMAGE_SCHEDULER="${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPO_NAME }}/scheduler:${{ github.sha }}"

          docker build -t "$IMAGE_WEB" -f apps/web/Dockerfile .
          docker build -t "$IMAGE_SCHEDULER" -f apps/scheduler/Dockerfile .

          docker push "$IMAGE_WEB"
          docker push "$IMAGE_SCHEDULER"

          echo "IMAGE_WEB=$IMAGE_WEB" >> $GITHUB_ENV
          echo "IMAGE_SCHEDULER=$IMAGE_SCHEDULER" >> $GITHUB_ENV

      - name: Deploy web to Cloud Run
        run: |
          gcloud run deploy <repo>-web \
            --image "$IMAGE_WEB" \
            --region "${{ env.REGION }}" \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars "NODE_ENV=production" \
            --set-secrets "SECRET_NAME=SECRET_NAME:latest"

      - name: Deploy scheduler to Cloud Run
        run: |
          gcloud run deploy <repo>-scheduler \
            --image "$IMAGE_SCHEDULER" \
            --region "${{ env.REGION }}" \
            --platform managed \
            --no-allow-unauthenticated \
            --ingress internal \
            --set-env-vars "NODE_ENV=production" \
            --set-secrets "SECRET_A=SECRET_A:latest,SECRET_B=SECRET_B:latest"
```

Required GitHub secrets:
- `GCP_PROJECT_ID`
- `GCP_WORKLOAD_IDENTITY_PROVIDER` — from Workload Identity Federation setup
- `GCP_SERVICE_ACCOUNT` — SA email with Cloud Run deployer + Artifact Registry writer roles

---

## One-time GCP setup checklist

Run these once per project. Ask the user if already done.

```bash
# Enable APIs
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com

# Create Artifact Registry repo
gcloud artifacts repositories create <repo-name> \
  --repository-format=docker \
  --location=$REGION \
  --project=$PROJECT_ID

# Create secrets (interactive)
./infra/setup-secrets.sh  # if the project has this script

# Or manually:
echo -n "value" | gcloud secrets create SECRET_NAME \
  --project=$PROJECT_ID \
  --replication-policy=automatic \
  --data-file=-

# Grant Cloud Run SA access to secrets
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --project=$PROJECT_ID \
  --member="serviceAccount:<SA_EMAIL>" \
  --role="roles/secretmanager.secretAccessor"
```

## Key constraints

- Scheduler/worker services: always `--no-allow-unauthenticated --ingress internal` — Cloud Scheduler can still invoke them; public internet cannot.
- Port: Cloud Run expects `$PORT` (default 8080). Ensure Dockerfile sets `ENV PORT=8080`.
- Image tag: use git SHA for traceability (`${{ github.sha }}` in CI, `git rev-parse --short HEAD` locally).
- pnpm: use `pnpm install --frozen-lockfile` in Docker build to ensure reproducible installs.
- Nx build runs inside Docker (self-contained) — no need to pre-build outside the container for CI.
