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
| GCP Project ID (for deploy) | e.g. `maplestocks-prod` |
| GCP Region | e.g. `us-central1` |
| GCP Artifact Registry repo name | e.g. `maplestocks` |
| Cloud Run service name | e.g. `maplestocks-scheduler` (used as `serviceName`) |
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

## Step 3 — Ensure `@maplestocks/gcloud` executor lib exists

The deploy targets use `@maplestocks/gcloud:cloud-run`. Verify it's present before wiring deploy:

```bash
ls libs/gcloud/package.json   # should exist
```

If missing, it must be scaffolded first (see `libs/gcloud` in the maplestocks repo). Also confirm:

- `pnpm-workspace.yaml` has `packages: ['libs/*']`
- `tsconfig.base.json` paths includes `"@maplestocks/gcloud": ["libs/gcloud/src/index.ts"]`

---

## Step 4 — Add a Node.js app (backend / scheduler / worker)

```bash
pnpm nx g @nx/node:app apps/<name> \
  --framework=fastify \
  --unitTestRunner=vitest \
  --linter=eslint \
  --e2eTestRunner=none
```

### project.json targets to add/verify

See `reference/node-app-project-targets.json`. Substitute `<name>`, `<REGION>`, `<PROJECT_ID>`, `<REPO>`, `<service-name>`, and `<SECRET_NAME>` throughout.

For **public** services, remove `"ingress": "internal"` and add `"allowUnauthenticated": true` to the `deploy-cloudrun` production config.

### Dockerfile for Node.js app

Copy `reference/node-app.Dockerfile` to `apps/<name>/Dockerfile` and replace `<name>`.

---

## Step 5 — Add an AnalogJS/Angular SSR app (frontend)

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

See `reference/analog-app-project-targets.json`. Substitute `<name>`, `<REGION>`, `<PROJECT_ID>`, `<REPO>`, and `<service-name>` throughout.

### Dockerfile for AnalogJS app

Copy `reference/analog-app.Dockerfile` to `apps/<name>/Dockerfile` and replace `<name>`.

---

## Step 6 — Add a library

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

## Step 7 — Add pnpm scripts

In root `package.json` `scripts`:

```json
{
  "start:<name>": "nx serve <name>",
  "build:<name>": "nx build <name>",
  "deploy:<name>": "nx deploy <name>"
}
```

---

## Step 8 — Verify setup

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
- **pnpm in Dockerfile**: pin to `pnpm@9` (`RUN npm install -g pnpm@9`) — pnpm v10+ changes build script behavior.
- **Lib creation**: always use `pnpm nx g` — never create library folders manually.
- **Deploy executor**: use `@maplestocks/gcloud:cloud-run` — never inline `gcloud run deploy` shell commands.
- **Image tag**: `deploy-docker` uses `${BUILD_NUMBER:-latest}` — CI passes `BUILD_NUMBER=${{ github.sha }}`; local falls back to `latest`.
- **Internal services** (schedulers, workers): set `"ingress": "internal"` in `deploy-cloudrun` production config.
- **Public services** (web frontends): set `"allowUnauthenticated": true`, omit `ingress`.
- **Port**: Cloud Run always expects `ENV PORT=8080` in Dockerfile.
- **Nx upgrades**: use `pnpm nx migrate latest` — never `pnpm update` directly.
- **Secrets format** in `deploy-cloudrun`: `"SECRET_NAME=SECRET_NAME:latest"` as array entries.
