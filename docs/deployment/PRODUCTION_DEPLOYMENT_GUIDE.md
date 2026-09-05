# Production Deployment Guide - Session 7

**Last Updated**: June 26, 2026  
**Status**: 🚀 Ready to Deploy  
**Estimated Time**: 30-40 minutes  

---

## 🎯 Overview

This guide walks through deploying FreeMatch to production with:
- **Backend**: Railway (Node.js + PostgreSQL + Redis)
- **Frontend**: Vercel (Expo Web)
- **Features**: JWT authentication + photo uploads ready

**Prerequisites**:
- GitHub account (linked to Railway & Vercel)
- Basic terminal knowledge
- 30-40 minutes uninterrupted

---

## ⚡ Quick Checklist

Before starting, verify:

```bash
# ✅ Backend TypeScript compiles
cd backend && npx tsc --noEmit
# ✅ Frontend TypeScript compiles  
cd frontend && npx tsc --noEmit
# ✅ Full build passes
npm run check
```

All three should complete without errors. If any fail, stop and fix before deploying.

---

## 🔧 PHASE 1: Railway Backend Deployment (15-20 minutes)

### Step 1: Create Railway Account

1. Go to **https://railway.app**
2. Click **Sign Up**
3. Choose **Continue with GitHub**
4. Authorize Railway to access your GitHub
5. Complete account setup

### Step 2: Create New Project

1. In Railway dashboard, click **New Project**
2. Select **Deploy from GitHub repo**
3. Find and select `freematch-workspace`
4. Authorize if prompted
5. Click **Deploy**

### Step 3: Add PostgreSQL Service

1. In your project, click **+ Add Service**
2. Select **Database**
3. Select **PostgreSQL**
4. Railway auto-creates `DATABASE_URL` variable
5. PostgreSQL starts deploying automatically

**Note**: Wait 2-3 minutes for PostgreSQL to be ready.

### Step 4: Add Redis Service

1. Click **+ Add Service** again
2. Select **Database**
3. Select **Redis**
4. Railway auto-creates `REDIS_URL` variable
5. Redis starts deploying automatically

**Note**: Wait 1-2 minutes for Redis to be ready.

### Step 5: Add Backend Service

1. Click **+ Add Service**
2. Select **GitHub Repo**
3. Choose `freematch-workspace`
4. Configure settings:
   - **Service Name**: `backend`
   - **Root Directory**: `backend`
5. Click **Add Service**

### Step 6: Configure Backend Variables

1. Go to **backend service → Variables**
2. Add these environment variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` |
| `REDIS_URL` | `${{ Redis.PRIVATE_URL }}` |
| `PORT` | `3000` |
| `CORS_ORIGIN` | `https://your-vercel-app.vercel.app` |
| `JWT_SECRET` | (see below) |

**⚠️ CRITICAL: Generate JWT_SECRET**

Run this command locally (in terminal/PowerShell):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste as `JWT_SECRET` value in Railway.

Example output:
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
```

### Step 7: Deploy Backend

1. In Railway backend service, click **Deploy**
2. Railway auto-deploys from GitHub
3. Go to **Deployments** tab
4. Click **View Logs** on the latest deployment
5. Wait for message: **"Application is running on port 3000"**

**Troubleshooting**:
- If build fails, check logs for errors
- Ensure `backend/Dockerfile` exists
- Ensure `backend/package.json` has build script

### Step 8: Get Your Backend URL

1. In backend service, go to **Settings**
2. Find **Public Domain** section
3. Copy your domain (looks like: `backend-prod-xyz.railway.app`)
4. **Save this URL** - you'll need it for frontend

Test with curl:
```bash
curl https://your-backend-url.railway.app/health
# Should return: "OK" or 200 status
```

---

## 🎨 PHASE 2: Vercel Frontend Deployment (10-15 minutes)

### Step 1: Create Vercel Account

1. Go to **https://vercel.com**
2. Click **Sign Up**
3. Choose **Continue with GitHub**
4. Authorize Vercel
5. Complete setup

### Step 2: Import Project

1. In Vercel dashboard, click **Add New Project**
2. Click **Import Git Repository**
3. Search for `freematch-workspace`
4. Select it and click **Import**

### Step 3: Configure Build

1. On import screen, set:
   - **Framework Preset**: `Other` (Expo)
   - **Root Directory**: `frontend`
2. Click **Deploy**

**Note**: First deploy takes 3-5 minutes while installing dependencies.

### Step 4: Add Environment Variables

⏳ While building, go to **Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `REACT_APP_API_URL` | `https://your-backend-url.railway.app` |
| `REACT_APP_WS_URL` | `wss://your-backend-url.railway.app` |
| `NODE_ENV` | `production` |

**Replace** `your-backend-url.railway.app` with your actual Railway domain from Step 8 above.

### Step 5: Redeploy with Variables

1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Confirm to redeploy with new variables
4. Wait for build to complete (3-5 minutes)

### Step 6: Get Your Frontend URL

1. Deployment completes automatically
2. Click on latest deployment
3. Copy **Production URL** (looks like: `your-app.vercel.app`)
4. **Save this URL**

Test:
```bash
curl https://your-frontend-url.vercel.app
# Should return HTML
```

---

## 🔄 PHASE 3: Connect Frontend to Backend

### Step 1: Update Backend CORS

Go back to Railway:

1. **Backend service → Variables**
2. Update `CORS_ORIGIN`:
   ```
   https://your-vercel-app.vercel.app
   ```
3. Click **Redeploy** or wait for auto-redeploy

### Step 2: Verify Frontend Variables

Vercel should already have:
- `REACT_APP_API_URL=https://your-backend-url.railway.app`
- `REACT_APP_WS_URL=wss://your-backend-url.railway.app`

If not, add them in **Settings → Environment Variables** and redeploy.

---

## ✅ PHASE 4: Verification (5 minutes)

### Test 1: Backend Health

```bash
curl https://your-backend-url.railway.app/health
# Expected: 200 OK
```

### Test 2: Frontend Loads

1. Visit `https://your-vercel-app.vercel.app`
2. Should see login screen
3. Open browser DevTools (F12)
4. Go to **Console** tab
5. Should not see any CORS errors

### Test 3: Login Flow

1. Create an account with email/password
2. Should redirect to home screen
3. Verify socket.io connects (no errors in console)
4. Try uploading a photo

### Test 4: Check Logs

**Railway logs**:
```bash
# If you have railway CLI installed:
railway logs --service backend
# Or check in dashboard: Deployments → View Logs
```

Look for:
- "Redis adapter connected"
- "Database connected"
- No error messages

---

## 🚨 Troubleshooting

### Backend won't start

1. Check logs: Railway → Deployments → View Logs
2. Look for error message
3. Common issues:
   - `DATABASE_URL` not set → Add Postgres service again
   - `REDIS_URL` not set → Add Redis service again
   - `JWT_SECRET` missing → Add JWT_SECRET variable
   - Port conflict → Ensure `PORT=3000` is set

### Frontend build fails

1. Check logs: Vercel → Deployments → Failed
2. Common issues:
   - Wrong `REACT_APP_API_URL` → Fix in Settings
   - TypeScript error → Check frontend code
   - Missing dependencies → Check `frontend/package.json`

### WebSocket not connecting

1. Check browser console for errors
2. Verify `REACT_APP_WS_URL` is set (should be `wss://...`)
3. Verify backend CORS allows frontend origin
4. Check backend logs for WebSocket errors

### CORS errors

1. Backend logs show: "CORS error"
2. Solution: Update Railway backend → Variables → `CORS_ORIGIN`
3. Set to exact Vercel URL: `https://your-app.vercel.app`
4. Redeploy backend

### Slow first load

- Normal on first visit (cold start)
- Subsequent loads should be faster
- On Railway free tier, backend may sleep after 30 min inactivity

---

## 📊 Monitoring

### Railway

1. **Metrics**: Backend service → Metrics tab
   - CPU usage
   - Memory usage
   - Requests per second

2. **Logs**: Backend service → Deployments → View Logs
   - Real-time logs
   - Search by keyword
   - Export for analysis

### Vercel

1. **Analytics**: Project → Analytics tab
   - Page load times
   - Core Web Vitals
   - Geographic distribution

2. **Deployments**: Monitor each deployment
   - Build time
   - Deployment status
   - Rollback if needed

---

## 💰 Cost Breakdown

### Railway (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| Backend Node.js | Starter | $5 |
| PostgreSQL | Starter (5GB) | $10 |
| Redis | Starter (256MB) | $5 |
| **Total** | | **$20/month** |

### Vercel (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| Frontend | Hobby | **FREE** |
| Analytics | Pro | $20 (optional) |
| **Total** | | **$0-20/month** |

**Total Production Cost**: **$20-40/month**

---

## 🎯 Post-Deployment Checklist

- [ ] Backend responds to `/health` endpoint
- [ ] Frontend loads without errors
- [ ] Login/Register flow works
- [ ] Photo upload works
- [ ] Socket.io connects (check console)
- [ ] No CORS errors in console
- [ ] Email validation works
- [ ] Password validation works
- [ ] Tokens are stored and persisted
- [ ] Logout clears tokens

---

## 📱 Next Steps

### Immediately After Deploy

1. ✅ Test in production environment
2. ✅ Share URL with test users
3. ✅ Monitor logs for errors
4. ✅ Document any issues

### Phase 2 (Optional)

- [ ] Add custom domain (instead of .vercel.app)
- [ ] Setup S3 for photo storage (currently using LocalStack)
- [ ] Add email verification (SendGrid integration)
- [ ] Setup monitoring (Sentry)
- [ ] Enable rate limiting

### Phase 3 (Future)

- [ ] Add payment processing (Stripe)
- [ ] Setup analytics (LogRocket, Mixpanel)
- [ ] Configure CDN for images
- [ ] Load testing (k6, Artillery)

---

## 📚 Additional Resources

- [Railway Docs](https://railway.app/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Environment Variables](https://railway.app/docs/guides/environment-variables)
- [Deployment Troubleshooting](./DEPLOYMENT.md)

---

## 🆘 Need Help?

If deployment fails:

1. Check logs in Railway/Vercel dashboards
2. Read DEPLOYMENT.md Troubleshooting section
3. Verify all environment variables are set
4. Ensure GitHub repo is public/connected
5. Try redeploying

---

**Status**: ✅ Production Ready  
**Last Updated**: June 26, 2026  
**Next**: Monitor in production, gather feedback
