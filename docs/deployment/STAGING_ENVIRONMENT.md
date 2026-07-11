# FreeMatch — Staging Environment Setup

This document explains how to set up and run a non-local staging environment for FreeMatch.

## What is Staging?

A staging environment mirrors production as closely as possible while using test-safe infrastructure. It lets you:
- Test the full app with real network conditions
- Verify security fixes don't break anything
- Demo the app to others
- Catch integration issues before production deploy

## Option 1: Local Staging (Docker Compose)

Use this for quick testing on your machine with an isolated environment.

### Run it

```bash
cd C:\code\freematch-workspace
docker compose -f docker-compose.staging.yml up -d
```

### Ports

| Service  | Local Port | Container Port |
|----------|-----------|----------------|
| Backend  | 3001      | 3000           |
| Postgres | 5433      | 5432           |
| Redis    | 6380      | 6379           |
| MinIO    | 9002      | 9000 (API)     |
| MinIO UI | 9003      | 9001 (Console) |

### Verify it's running

```bash
# Health check
curl http://localhost:3001/health

# View logs
docker compose -f docker-compose.staging.yml logs -f backend

# Stop
docker compose -f docker-compose.staging.yml down
```

### Update frontend API URL

Point the Expo web app at staging:

```bash
# In frontend, set REACT_APP_API_URL to http://localhost:3001
# Then run: npm run start:web
```

### Customize variables

Copy the template and edit:

```bash
copy backend\.env.staging.template backend\.env.staging
# Edit .env.staging with your values, then:
docker compose -f docker-compose.staging.yml --env-file backend\.env.staging up -d
```

## Option 2: Railway (Recommended for Non-Local)

Railway gives you a cloud-hosted staging environment with auto-provisioned Postgres + Redis.

### Step 1: Create a Railway Project

1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Connect your `freematch` repo

### Step 2: Add Services

In the Railway dashboard:

1. **+ Add Service** → **Database** → **PostgreSQL** (auto-provisioned)
2. **+ Add Service** → **Database** → **Redis** (auto-provisioned)
3. **+ Add Service** → **GitHub Repo** → select `freematch`

### Step 3: Configure Backend Service

Set these variables in the backend service's **Variables** tab:

```
NODE_ENV=staging
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.PRIVATE_URL}}
JWT_SECRET=<generate-a-random-string>
CORS_ORIGIN=<your-frontend-url>
PORT=3000
```

Railway auto-injects `DATABASE_URL` and `REDIS_URL` — no need for hardcoded values.

### Step 4: Deploy

1. Railway auto-deploys on push to `master`
2. Or trigger manually: **Deploy** → **Deploy Now**
3. Check logs in **Deployments** → **View Logs**

### Step 5: Frontend (Vercel)

Deploy the Expo web frontend to Vercel:

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Connect the same GitHub repo
3. Set environment variable: `REACT_APP_API_URL=https://<your-backend-railway-url>`
4. Deploy

### Railway.toml

The project root already includes `railway.toml` which tells Railway:
- Build from `backend/` directory
- Run `npm ci && npm run build`
- Start with `npm start`

## Option 3: VPS with Docker

If you have a VPS (DigitalOcean, Hetzner, etc.):

1. Install Docker + Docker Compose on the VPS
2. Clone the repo
3. Copy `.env.staging.template` to `.env` and fill in real values
4. Run `docker compose -f docker-compose.staging.yml up -d`
5. Point your frontend to `https://<your-vps-ip>:3001`

### VPS Checklist

- [ ] Open ports: 3001 (backend), 9002 (MinIO API)
- [ ] Set up HTTPS with Let's Encrypt (nginx reverse proxy recommended)
- [ ] Configure firewall: only allow necessary inbound traffic
- [ ] Set up automated backups of Postgres data

## Option 4: GitHub Codespaces

For quick cloud-based dev:

1. Open the repo in GitHub → **Code** → **Codespaces** → **Create codespace**
2. Install Docker inside the codespace (may require elevated permissions)
3. Run `docker compose -f docker-compose.staging.yml up -d`
4. Use the codespace's forwarded ports to access the backend

⚠️ **Note**: Codespaces may have limited Docker support. Railway is more reliable.

## Storage: MinIO vs S3/R2

### Staging (MinIO)
- Uses local MinIO container (no external credentials needed)
- Bucket: `REDACTED_RW_ENV`
- Public endpoint: `http://localhost:9002` (local) or your VPS IP

### Production (S3/R2)
For production, replace MinIO with real storage:

**AWS S3:**
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_S3_ENDPOINT=<leave blank>
S3_PUBLIC_ENDPOINT=https://freematch-prod.s3.us-east-1.amazonaws.com
S3_BUCKET=freematch-prod
```

**Cloudflare R2 (cheaper, S3-compatible):**
```
AWS_REGION=auto
AWS_ACCESS_KEY_ID=<r2-access-key>
AWS_SECRET_ACCESS_KEY=<r2-secret>
AWS_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_PUBLIC_ENDPOINT=https://pub-<hash>.r2.dev
S3_BUCKET=freematch-prod
```

## Teardown

```bash
# Local staging
docker compose -f docker-compose.staging.yml down

# With volume cleanup (destroys all data)
docker compose -f docker-compose.staging.yml down -v
```

## Troubleshooting

### Backend won't start
```bash
docker compose -f docker-compose.staging.yml logs backend
# Check for database connection errors or missing env vars
```

### MinIO bucket not created
```bash
# The minio-init service should run automatically
docker compose -f docker-compose.staging.yml logs minio-init
# If it failed, restart:
docker compose -f docker-compose.staging.yml up minio-init
```

### CORS errors from frontend
Make sure `CORS_ORIGIN` in your staging env includes your frontend URL:
```
CORS_ORIGIN=http://localhost:8081,https://your-vercel-app.vercel.app
```
