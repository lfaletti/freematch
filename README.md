# FreeMatch - Dating App MVP

A production-ready full-stack dating app prototype with horizontal scaling support.

## 🚀 Quick Start (Choose One)

### Option 1: Deploy to Production (Recommended)
```bash
# Deploy backend to Railway (10 minutes)
npm run deploy:railway production

# Deploy frontend to Vercel (5 minutes) 
# Follow: docs/deployment/VERCEL_SETUP.md
```

See: [`QUICK_START_DEPLOYMENT.md`](./docs/deployment/QUICK_START_DEPLOYMENT.md)

### Option 2: Test Locally
```bash
# Requires Docker Desktop
npm run docker:up

# Visit: http://localhost:3000
```

### Option 3: Development
```bash
# Terminal 1: Frontend (Expo Web)
npm run start:web

# Terminal 2: Backend  
cd backend && npm run dev

# Terminal 3: Database + Redis
npm run docker:up
```

## 📋 What's Included

- ✅ **Backend**: Express + TypeScript + Socket.io
- ✅ **Frontend**: React Native + Expo
- ✅ **Database**: PostgreSQL with migrations
- ✅ **Real-time**: Socket.io with Redis adapter
- ✅ **Scaling**: Horizontal scaling ready (multi-instance)
- ✅ **Docker**: Production-optimized containers
- ✅ **Deployment**: Railway, Fly.io, Vercel configs
- ✅ **Auth**: JWT with email/password + bcrypt
- ✅ **Photos**: S3/MinIO upload + viewer + carousel
- ✅ **Profile Edit**: Name, bio, location, interests
- ✅ **Swipe Reset**: Restore left-swiped profiles

## 📖 Documentation

Full index: [`docs/README.md`](./docs/README.md). Current status & next steps live in [`agent-prompts/STATE.md`](./agent-prompts/STATE.md).

### For Getting Started
- [`QUICK_START_DEPLOYMENT.md`](./docs/deployment/QUICK_START_DEPLOYMENT.md) - 1-minute overview

### For Deployment
- [`RAILWAY_SETUP.md`](./docs/deployment/RAILWAY_SETUP.md) - Railway step-by-step (Recommended)
- [`VERCEL_SETUP.md`](./docs/deployment/VERCEL_SETUP.md) - Frontend on Vercel
- [`DEPLOYMENT.md`](./docs/deployment/DEPLOYMENT.md) - Complete deployment guide

### For Developers
- [`CLAUDE.md`](./CLAUDE.md) - Code guidelines & architecture
- [`SCALABILITY_ARCHITECTURE.md`](./docs/architecture/SCALABILITY_ARCHITECTURE.md) - Technical details
- [`CHANGELOG.md`](./docs/CHANGELOG.md) - History of changes

## 🏗️ Architecture

```
Frontend (Vercel)
    ↓ WebSocket/HTTP
[Load Balancer]
    ├─ Backend 1
    ├─ Backend 2
    └─ Backend 3... (auto-scales)
         ↓
    [Redis] - Socket.io sync
         ↓
    [PostgreSQL] + replicas
```

**Key feature**: Redis Adapter ensures real-time messaging stays in sync across multiple backend instances.

## 💻 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React Native, Expo, Redux |
| **Backend** | Express, TypeScript, Socket.io |
| **Database** | PostgreSQL |
| **Cache/PubSub** | Redis |
| **Deployment** | Railway, Fly.io, Vercel |
| **Infrastructure** | Docker, Docker Compose |

## 🚀 Deployment Options

### Railway (Recommended for MVP)
- Cost: $20/month
- Setup: 10 minutes
- Features: Auto-scaling, managed PostgreSQL/Redis
- Docs: [`RAILWAY_SETUP.md`](./docs/deployment/RAILWAY_SETUP.md)

```bash
npm run deploy:railway production
```

### Fly.io
- Cost: $15-30/month
- Setup: 15 minutes  
- Features: Global deployment
- Docs: Deployment section in [`DEPLOYMENT.md`](./docs/deployment/DEPLOYMENT.md)

```bash
npm run deploy:fly production
```

### Vercel (Frontend Only)
- Cost: Free tier (or $20/month Pro)
- Setup: 5 minutes (auto from GitHub)
- Works with Railway backend
- Docs: [`VERCEL_SETUP.md`](./docs/deployment/VERCEL_SETUP.md)

## 📦 NPM Scripts

### Development
```bash
npm run start:web           # Frontend on web
npm run docker:up           # Backend + DB + Redis
npm run docker:logs         # Backend logs
npm run docker:down         # Stop containers
```

### Building & Testing
```bash
npm run check              # TypeScript check + web build
npm run typecheck:backend  # Backend types only
npm run build:backend      # Compile for production
```

### Deployment
```bash
npm run deploy:railway production
npm run deploy:fly production
```

## 🔧 Prerequisites

- **Node.js** 20+
- **Docker Desktop** (for local development)
- **Git**

Optional:
- Railway CLI (for Railway deployment)
- Fly CLI (for Fly.io deployment)

## 📊 Capacity

### MVP Tier ($20/month)
- Concurrent users: 1k-5k
- Requests/sec: 100-500

### Growth Tier ($70/month)
- Concurrent users: 5k-50k
- Requests/sec: 500-5k
- Features: Auto-scale, read replicas

### Enterprise ($200+/month)
- Concurrent users: 50k-1M+
- Features: Sharding, multi-region, custom

## 🚀 Latest Updates (July 2026)

- **Photo system**: MinIO bucket with public access, carousel navigation, full-screen viewer
- **Profile editing**: Edit name, bio, location, interests from the app
- **Reset swipes**: Undo left swipes without losing matches
- **Navigation**: Clean ⋮ dropdown menu replaces old logout button
- **Cleanup**: Removed all mock tests and test data — app runs with real data only

## 🐛 Troubleshooting

### Docker issues
```bash
npm run docker:reset   # Full reset (delete volumes)
npm run docker:logs    # View logs
```

### Build issues
```bash
npm run check          # Check everything
npm run typecheck:backend  # Just backend types
```

### Deployment issues
See [`DEPLOYMENT.md`](./docs/deployment/DEPLOYMENT.md) Troubleshooting section

## 📝 Project Status

**Current State**: Production Ready 🟢
- [x] Core app features complete (swipe, match, chat, profile view)
- [x] Horizontal scaling setup
- [x] Docker + deployment configs
- [x] All tests passing (frontend 88/88, backend 43/43)
- [x] JWT authentication (email/password + bcrypt)
- [x] Photo upload system (S3/MinIO)
- [ ] Not yet deployed to production

See [`agent-prompts/STATE.md`](./agent-prompts/STATE.md) for current status and next steps.

## 🎯 Next Steps

1. **Deploy** (10 min)
   - Choose Railway or Fly.io
   - Follow deployment docs

2. **Test** (1-2 hours)
   - Invite beta users
   - Monitor performance
   - Verify Socket.io working

3. **Enhance** (1-2 weeks)
   - ~~Implement JWT authentication~~ ✅
   - ~~Add photo upload system~~ ✅
   - ~~Profile editing~~ ✅
   - ~~Photo viewer~~ ✅
   - Configure monitoring
   - Push notifications
   - In-app photo upload during registration

See [`agent-prompts/STATE.md`](./agent-prompts/STATE.md) for the up-to-date roadmap.

## 📞 Help

- **Deployment**: [`QUICK_START_DEPLOYMENT.md`](./docs/deployment/QUICK_START_DEPLOYMENT.md)
- **Architecture**: [`SCALABILITY_ARCHITECTURE.md`](./docs/architecture/SCALABILITY_ARCHITECTURE.md)
- **Code**: [`CLAUDE.md`](./CLAUDE.md)
- **Context**: [`agent-prompts/STATE.md`](./agent-prompts/STATE.md)

## 📄 License

MIT

---

**Ready?** Start with [`QUICK_START_DEPLOYMENT.md`](./docs/deployment/QUICK_START_DEPLOYMENT.md) or choose an option from "Quick Start" above.
