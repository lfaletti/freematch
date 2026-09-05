# FreeMatch — Railway Deployment Guide

## Project Info
- **Repo:** `https://github.com/lfaletti/freematch`
- **Railway Project:** `REDACTED_RW_PROJECT` (ID: `REDACTED_PROJECT_ID`)
- **Staging Environment:** `freematch-staging` (ID: `REDACTED_ENV_ID`)
- **Backend Service ID:** `REDACTED_SERVICE_ID`
- **Postgres Service ID:** `7de58101-4951-4f8a-9aa3-0fc2503e4c3a`
- **Redis Service ID:** `78f2b3bb-1a28-4ea4-ac33-f41ec53d1988`

## Current Working Config (as of 2026-07-11)

### `Dockerfile` (repo root) — Multi-stage build
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci && npm cache clean --force
COPY backend/ ./
RUN npm run build
RUN mkdir -p dist/database/migrations && \
    cp src/database/migrations/*.sql dist/database/migrations/

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

### `railway.toml` (repo root)
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### Backend Environment Variables (`freematch-staging`)
```
NODE_ENV=staging
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=*** (see Railway UI or memory files) ***
PORT=3000
CORS_ORIGIN=http://localhost:8081
```

### Key Files
| File | Location | Purpose |
|------|----------|---------|
| `railway.toml` | Repo root | Railway build/deploy config |
| `backend/package.json` | `backend/` | Scripts: `dev`, `build`, `start` |
| `backend/package-lock.json` | `backend/` | Required for `npm ci` |
| `backend/Dockerfile` | `backend/` | Alternative Docker build (not currently used) |
| `backend/.env.staging.template` | `backend/` | Template for manual staging setup |
| `docker-compose.staging.yml` | Repo root | Local staging with Docker Compose |

## Troubleshooting History

### Failed Attempt 1: Invalid TOML Syntax
**Error:** `railway.toml` parse error — unquoted bare value on line 2
**Root cause:** `[project-name]` section with `freematch-workspace` as bare value (invalid TOML)
**Fix:** Remove `[project-name]` section, use Nixpacks builder
**PR:** #1 (merged)

### Failed Attempt 2: Dockerfile Not Found
**Error:** `couldn't locate the dockerfile at path Dockerfile in code archive`
**Root cause:** `builder = "dockerfile"` searches repo root, but Dockerfile is in `backend/Dockerfile`
**Fix:** Switch to `builder = "nixpacks"` which auto-detects Node.js and respects `rootDirectory`
**PR:** None (manual fix in `master`)

### Failed Attempt 3: Missing `package-lock.json`
**Error:** `npm ci` failed — can only install with an existing package-lock.json
**Root cause:** Without `rootDirectory = "backend"`, build context was repo root (no `package-lock.json`)
**Fix:** Add `rootDirectory = "backend"` to `[build]` section
**PR:** #2 (merged)

### Failed Attempt 5: Nixpacks didn't run build
**Error:** `Missing script: "start"` / `Cannot find module '/app/backend/dist/index.js'`
**Root cause:** Nixpacks with rootDirectory detected the project but skipped `npm run build`, so dist/ never existed
**Fix:** Switch to Dockerfile builder with multi-stage build that explicitly runs `npm ci`, `npm run build`, and copies SQL migrations
**Commit:** Multi-stage Dockerfile in repo root

## Key Lessons

1. **Railway TOML is strict** — bare values without keys cause parse errors
2. **Dockerfile builder** looks for `Dockerfile` in repo root by default
3. **`rootDirectory`** with Nixpacks sets build context but may skip expected build steps
4. **`startCommand`** runs from repo root — must use correct paths
5. **TypeScript doesn't copy .sql files** — must explicitly copy migration files to dist/
6. **Multi-stage Dockerfile** is the most reliable approach for monorepos
7. **Always test the Dockerfile locally first** before pushing to Railway

## CLI Commands Reference

### Check status
```bash
railway status --project=REDACTED_PROJECT_ID --environment=REDACTED_ENV_ID
```

### View variables
```bash
railway variables --service=REDACTED_SERVICE_ID --environment=REDACTED_ENV_ID
```

### View logs
```bash
railway logs --service=REDACTED_SERVICE_ID --environment=REDACTED_ENV_ID
```

### List PRs
```bash
gh pr list --state open
gh pr diff <number>
```

## Deployment Checklist

- [ ] `Dockerfile` exists at repo root with multi-stage build
- [ ] `Dockerfile` copies SQL migrations to dist/
- [ ] `railway.toml` uses builder = "dockerfile"
- [ ] `backend/package-lock.json` exists
- [ ] Environment variables are set (DATABASE_URL, REDIS_URL, JWT_SECRET, etc.)
- [ ] Postgres and Redis services are online in Railway
- [ ] Push to `master` triggers auto-deploy
- [ ] Check logs for: "Migrations ran successfully" + "Redis adapter connected"
- [ ] Test health endpoint: `curl https://<railway-domain>/health`

## Adding a New Production Environment

1. Create new environment in Railway project
2. Add Postgres + Redis services
3. Copy `railway.toml` (same config works)
4. Set environment variables (use production JWT_SECRET, CORS_ORIGIN, etc.)
5. Push to `master` — Railway deploys to all environments
6. For separate prod config, use `railway.env.production.toml` or Railway UI variables

## Local Staging Alternative

If Railway is unavailable, use Docker Compose:
```bash
docker compose -f docker-compose.staging.yml up -d
```
- Backend: `http://localhost:3001`
- Postgres: `localhost:5433`
- Redis: `localhost:6380`
- MinIO: `http://localhost:9002`

## Frontend Deployment (Vercel)

`frontend/src/services/api.ts` reads `EXPO_PUBLIC_API_URL` env var (fallback to `localhost:3000`).

### Vercel Setup
- **Project**: connect `lfaletti/freematch`
- **Root Directory**: `frontend`
- **Build Command**: `npx expo export -p web`
- **Output Directory**: `dist`
- **Env Var**: `EXPO_PUBLIC_API_URL` = staging Railway URL

### vercel.json (not yet created)
Needs `vercel.json` in repo root or `frontend/` for proper SPA routing.
