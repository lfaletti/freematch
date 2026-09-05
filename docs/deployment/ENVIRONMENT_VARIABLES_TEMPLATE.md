## Railway Backend - Environment Variables Template

Copy these settings to Railway backend service → Variables section:

```
NODE_ENV=production
DATABASE_URL=${{ Postgres.DATABASE_URL }}
REDIS_URL=${{ Redis.PRIVATE_URL }}
PORT=3000
CORS_ORIGIN=https://your-vercel-app.vercel.app
JWT_SECRET=your-generated-secret-here
```

### How to set each variable:

1. **NODE_ENV** = `production` (literal text)
2. **DATABASE_URL** = `${{ Postgres.DATABASE_URL }}` (Railway auto-injects PostgreSQL URL)
3. **REDIS_URL** = `${{ Redis.PRIVATE_URL }}` (Railway auto-injects Redis URL)
4. **PORT** = `3000` (must match Dockerfile EXPOSE)
5. **CORS_ORIGIN** = Your Vercel URL (e.g., `https://your-app.vercel.app`)
6. **JWT_SECRET** = Generated via: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Generated JWT_SECRET Example:
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
```

---

## Vercel Frontend - Environment Variables Template

Copy these settings to Vercel project → Settings → Environment Variables:

```
REACT_APP_API_URL=https://your-backend-url.railway.app
REACT_APP_WS_URL=wss://your-backend-url.railway.app
NODE_ENV=production
```

### How to set each variable:

1. **REACT_APP_API_URL** = Your Railway backend domain (e.g., `https://backend-prod-xyz.railway.app`)
2. **REACT_APP_WS_URL** = Same domain but with `wss://` prefix
3. **NODE_ENV** = `production` (literal text)

**After adding variables, click Redeploy to apply them.**

---

## Local Development (.env files)

### Backend - backend/.env (for local Docker)

```
NODE_ENV=development
DATABASE_URL=postgresql://postgres:changeme@localhost:5432/freematch
REDIS_URL=redis://localhost:6379
PORT=3000
CORS_ORIGIN=http://localhost:19006
JWT_SECRET=dev-secret-change-in-production
```

### Frontend - frontend/.env (for local web)

```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
NODE_ENV=development
```

---

## Checklist Before Deploying

- [ ] JWT_SECRET generated with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] PostgreSQL service created in Railway
- [ ] Redis service created in Railway
- [ ] Backend service added to Railway
- [ ] All 6 backend variables set correctly
- [ ] Frontend project imported to Vercel
- [ ] All 3 frontend variables set correctly
- [ ] CORS_ORIGIN on Railway matches Vercel URL exactly
- [ ] npm run check passes locally
- [ ] Backend logs show "Redis adapter connected"
- [ ] Frontend can reach API (no CORS errors)
