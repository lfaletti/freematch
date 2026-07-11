# FreeMatch — Railway Deployment Guide

## Project Info
- **Repo:** `https://github.com/lfaletti/freematch`
- **Railway Project:** `REDACTED_RW_PROJECT` (ID: `REDACTED_PROJECT_ID`)
- **Staging Environment:** `REDACTED_RW_ENV` (ID: `REDACTED_ENV_ID`)
- **Backend Service ID:** `REDACTED_SERVICE_ID`
- **Postgres Service ID:** `7de58101-4951-4f8a-9aa3-0fc2503e4c3a`
- **Redis Service ID:** `78f2b3bb-1a28-4ea4-ac33-f41ec53d1988`

## Current Working Config (as of 2026-07-11)

### `railway.toml` (repo root)
```toml
[build]
builder = "nixpacks"
rootDirectory = "backend"

[deploy]
startCommand = "cd backend && npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### Backend Environment Variables (`REDACTED_RW_ENV`)
```
NODE_ENV=staging
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=d4386cac53e585c00213cdf8bde8a967e840067faf1bc2934351140b2b324af6
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

### Failed Attempt 4: Missing `start` Script
**Error:** `npm error Missing script: "start"`
**Root cause:** `startCommand = "npm start"` runs from repo root, not `backend/` where `package.json` lives
**Fix:** Change to `startCommand = "cd backend && npm start"`
**PR:** Manual commit (no PR)

## Key Lessons

1. **Railway TOML is strict** — bare values without keys cause parse errors
2. **Dockerfile builder** looks for `Dockerfile` in repo root, not relative paths
3. **`rootDirectory`** only affects Nixpacks build context, not `startCommand` working directory
4. **`startCommand`** runs from repo root — must `cd` into subdirectory if needed
5. **Nixpacks** is better than Dockerfile builder for monorepos — auto-detects language/framework

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

- [ ] `railway.toml` has correct builder, rootDirectory, and startCommand
- [ ] `backend/package-lock.json` exists
- [ ] Environment variables are set (DATABASE_URL, REDIS_URL, JWT_SECRET, etc.)
- [ ] Postgres and Redis services are online in Railway
- [ ] Push to `master` triggers auto-deploy
- [ ] Check logs for successful startup
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
