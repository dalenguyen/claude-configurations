---
name: nx-scaffold
description: Scaffold a new Nx monorepo project or add a new app/lib to an existing one. Covers workspace init, Node.js/AnalogJS apps, shared libs (models, data-access, services, ui), and GCP Cloud Run deployment wiring. Use when starting a new project or adding an app/lib.
allowed-tools: Bash(pnpm:*), Bash(nx:*), Bash(git:*), Bash(mkdir:*), Bash(ls:*), Bash(cat:*), Read, Write, Edit
---

# Nx Scaffold

Scaffold a new Nx monorepo or extend an existing one with apps and libs.

## Step 1 — Determine scope

Ask the user if any values are missing:

| Question | Values |
|---|---|
| New workspace or add to existing? | `new-workspace` / `add-app` / `add-lib` |
| App type (if adding app) | `node` (Fastify/backend) / `analog` (Angular SSR frontend) |
| Lib type (if adding lib) | `models` / `data-access` / `service` / `ui` / `util` |
| App/lib name | e.g. `api`, `dashboard`, `notifications` |
| GCP Project ID (for deploy) | e.g. `my-gcp-project` |
| GCP Region | e.g. `us-central1` |
| GCP Artifact Registry repo name | e.g. `myapp` |
| Public or internal service? | `public` → unauthenticated / `internal` → no public access |
| Secrets to mount from Secret Manager | e.g. `DB_URL`, `API_KEY` |
| Plain env vars | e.g. `NODE_ENV=production`, `GCP_PROJECT_ID=xxx` |

---

## Step 2 — New workspace (if applicable)

```bash
pnpm dlx create-nx-workspace@latest <workspace-name> \
  --preset=ts \
  --packageManager=pnpm \
  --nxCloud=skip

cd <workspace-name>

# Install core plugins
pnpm add -D @nx/node @nx/js @nx/eslint @nx/vite @nx/vitest nx
```

Commit: `chore: init Nx workspace`

---

## Step 3 — Add a Node.js app (backend / scheduler / worker)

```bash
pnpm nx g @nx/node:app apps/<name> \
  --framework=fastify \
  --unitTestRunner=vitest \
  --linter=eslint \
  --e2eTestRunner=none
```

### project.json targets to add/verify

Open `apps/<name>/project.json` and ensure:

```json
{
  "name": "<name>",
  "projectType": "application",
  "tags": ["scope:app", "type:<name>"],
  "targets": {
    "build": {
      "executor": "@nx/esbuild:esbuild",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/<name>",
        "main": "apps/<name>/src/main.ts",
        "tsConfig": "apps/<name>/tsconfig.app.json",
        "platform": "node",
        "format": ["cjs"],
        "bundle": true,
        "thirdParty": true,
        "esbuildOptions": { "outExtension": { ".js": ".js" } }
      }
    },
    "serve": {
      "executor": "@nx/js:node",
      "options": { "buildTarget": "<name>:build" }
    },
    "test": {
      "executor": "@nx/vitest:test",
      "options": { "config": "apps/<name>/vite.config.ts" }
    },
    "deploy": {
      "executor": "nx:run-commands",
      "dependsOn": ["build"],
      "options": {
        "command": "docker build --platform linux/amd64 -f apps/<name>/Dockerfile -t <REGION>-docker.pkg.dev/<PROJECT_ID>/<REPO>/<name>:latest . && gcloud auth configure-docker --quiet && docker push <REGION>-docker.pkg.dev/<PROJECT_ID>/<REPO>/<name>:latest && gcloud run deploy <project>-<name> --image <REGION>-docker.pkg.dev/<PROJECT_ID>/<REPO>/<name>:latest --region <REGION> --platform managed --no-allow-unauthenticated --ingress internal --project <PROJECT_ID> --port 8080 --set-env-vars NODE_ENV=production --set-secrets <SECRETS>"
      }
    }
  }
}
```

For **public** services replace `--no-allow-unauthenticated --ingress internal` with `--allow-unauthenticated`.

### Dockerfile for Node.js app

Create `apps/<name>/Dockerfile`:

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm nx build <name> --configuration=production

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist/apps/<name> ./

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "main.js"]
```

---

## Step 4 — Add an AnalogJS/Angular SSR app (frontend)

```bash
# Install AnalogJS if not present
pnpm add -D @analogjs/platform @analogjs/vite-plugin-angular @nx/angular @nx/vite

pnpm nx g @nx/angular:app apps/<name> \
  --bundler=vite \
  --unitTestRunner=vitest \
  --linter=eslint \
  --e2eTestRunner=none \
  --style=css \
  --ssr
```

### project.json targets

```json
{
  "name": "<name>",
  "projectType": "application",
  "tags": ["scope:app", "type:web"],
  "targets": {
    "build": {
      "executor": "@analogjs/platform:vite",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/<name>",
        "configFile": "apps/<name>/vite.config.ts",
        "main": "apps/<name>/src/main.ts",
        "tsConfig": "apps/<name>/tsconfig.app.json"
      }
    },
    "serve": {
      "executor": "@analogjs/platform:vite-dev-server",
      "options": { "buildTarget": "<name>:build", "port": 4200 }
    },
    "test": {
      "executor": "@nx/vitest:test",
      "options": { "config": "apps/<name>/vitest.config.ts" }
    },
    "deploy": {
      "executor": "nx:run-commands",
      "dependsOn": ["build"],
      "options": {
        "command": "docker build --platform linux/amd64 -f apps/<name>/Dockerfile -t <REGION>-docker.pkg.dev/<PROJECT_ID>/<REPO>/<name>:latest . && gcloud auth configure-docker --quiet && docker push <REGION>-docker.pkg.dev/<PROJECT_ID>/<REPO>/<name>:latest && gcloud run deploy <project>-<name> --image <REGION>-docker.pkg.dev/<PROJECT_ID>/<REPO>/<name>:latest --region <REGION> --platform managed --allow-unauthenticated --project <PROJECT_ID> --port 8080 --set-env-vars NODE_ENV=production"
      }
    }
  }
}
```

### Dockerfile for AnalogJS app

Create `apps/<name>/Dockerfile`:

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm nx build <name> --configuration=production

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist/apps/<name> ./

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "analog/server/index.mjs"]
```

---

## Step 5 — Add a library

Use the official Nx generator — never create folders manually.

### Models lib (`libs/shared/models`)

```bash
pnpm nx g @nx/js:lib shared-models \
  --directory=libs/shared/models \
  --unitTestRunner=vitest \
  --linter=eslint \
  --bundler=none
```

Tag in `project.json`: `["scope:shared", "type:models"]`

Pattern: pure TypeScript interfaces/types/enums, no runtime deps.

### Validation lib (`libs/shared/validation`)

```bash
pnpm nx g @nx/js:lib shared-validation \
  --directory=libs/shared/validation \
  --unitTestRunner=vitest \
  --linter=eslint \
  --bundler=none
```

Tag: `["scope:shared", "type:validation"]` — Zod schemas, validators.

### Data-access lib (`libs/data-access/<name>`)

```bash
pnpm nx g @nx/js:lib data-access-<name> \
  --directory=libs/data-access/<name> \
  --unitTestRunner=vitest \
  --linter=eslint \
  --bundler=none
```

Tag: `["scope:data-access", "type:service"]` — DB clients, external API wrappers.

### Domain / util lib (`libs/<name>`)

```bash
pnpm nx g @nx/js:lib <name> \
  --directory=libs/<name> \
  --unitTestRunner=vitest \
  --linter=eslint \
  --bundler=none
```

Tag: `["scope:shared", "type:util"]` — pure domain logic (no side effects, no I/O).

### UI component lib (`libs/ui`)

```bash
pnpm nx g @nx/angular:library ui \
  --directory=libs/ui \
  --unitTestRunner=jest \
  --linter=eslint \
  --standalone
```

Tag: `["scope:shared", "type:ui"]`

### Wiring a lib into an app

In `tsconfig.base.json` at workspace root, add a path alias:

```json
{
  "compilerOptions": {
    "paths": {
      "@<workspace>/shared/models": ["libs/shared/models/src/index.ts"],
      "@<workspace>/data-access/<name>": ["libs/data-access/<name>/src/index.ts"]
    }
  }
}
```

Export public API from `libs/<path>/src/index.ts`.

---

## Step 6 — Add pnpm scripts

In root `package.json` `scripts`:

```json
{
  "start:<name>": "nx serve <name>",
  "build:<name>": "nx build <name>",
  "deploy:<name>": "nx deploy <name>"
}
```

---

## Step 7 — Verify setup

```bash
# Type check
pnpm run typecheck

# Tests
pnpm test

# Lint
pnpm nx run-many --target=lint --all

# Serve locally
pnpm start:<name>
```

---

## Tagging conventions

| Tag | Meaning |
|---|---|
| `scope:app` | Deployable application |
| `scope:shared` | Shared across apps |
| `scope:data-access` | DB / API access layer |
| `type:web` | AnalogJS/Angular SSR frontend |
| `type:scheduler` | Cron / background job runner |
| `type:models` | Pure TypeScript types/interfaces |
| `type:validation` | Zod schemas and validators |
| `type:service` | Stateful service / DB client |
| `type:util` | Pure functions / domain logic |
| `type:ui` | Angular component library |

---

## Key constraints (never skip)

- **Docker platform**: always `--platform linux/amd64` — Cloud Run runs amd64; building on Mac arm64 without this flag causes `exec format error`.
- **Package manager**: `pnpm` only — never `npm` or `yarn`.
- **Lib creation**: always use `pnpm nx g` — never create library folders manually.
- **Internal services** (schedulers, workers): `--no-allow-unauthenticated --ingress internal`.
- **Port**: Cloud Run always expects `ENV PORT=8080` in Dockerfile.
- **Nx upgrades**: use `pnpm nx migrate latest` — never `pnpm update` directly.
- **Secrets format** in deploy command: `SECRET_NAME=SECRET_NAME:latest`, comma-separated for multiple.
