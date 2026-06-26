# NEXT_AGENT_CHECKLIST.md

Si eres un agente retomando este proyecto, sigue esta checklist en orden.

## ✅ Phase 1: Understand Context (10 minutes)

- [ ] Read `README.md` (2 min)
- [ ] Read `AGENT_NOTES.md` (5 min)
- [ ] Skim `CLAUDE.md` "Scalability" section (3 min)

**Stop and ask yourself**: "What did they do to make this scale?"
**Answer should be**: "Added Redis adapter to Socket.io for multi-instance sync"

## ✅ Phase 2: Verify Local Environment (5 minutes)

```bash
# Check Node version
node --version          # Should be 20+

# Check Docker (if you want to test locally)
docker --version

# Check dependencies
cd backend && npm ls redis @socket.io/redis-adapter
# Should show both packages installed
```

- [ ] Node.js is 20 or higher
- [ ] Docker Desktop is installed (optional but recommended)
- [ ] Backend dependencies installed (redis + socket.io/redis-adapter)

## ✅ Phase 3: Choose Your Path

### Path A: Deploy to Production (Recommended Next Step)

- [ ] Choose platform:
  - [ ] Railway (recommended, $20/month) → Follow `RAILWAY_SETUP.md`
  - [ ] Fly.io ($15-30/month) → Follow `DEPLOYMENT.md` Fly.io section
  - [ ] Vercel (frontend only, free) → Follow `VERCEL_SETUP.md`

- [ ] Create account on chosen platform
- [ ] Deploy backend first, then frontend
- [ ] Test that Socket.io connects: Open browser console and check for "Redis adapter connected"

**Estimated time**: 20-30 minutes total

### Path B: Test Locally First

```bash
npm run docker:up
# Wait ~10 seconds
npm run docker:logs
# Should show "Redis adapter connected" + "running on port 3000"
```

- [ ] Docker containers start successfully
- [ ] PostgreSQL is healthy
- [ ] Redis is healthy  
- [ ] Backend starts without errors
- [ ] Can visit http://localhost:3000

**Estimated time**: 10 minutes

### Path C: Make Code Changes

Before changing code:

- [ ] Read `CLAUDE.md` architecture section
- [ ] Understand current patterns (services own business logic, routes validate/format)
- [ ] Make your changes
- [ ] Run verification:

```bash
npm run check              # Must pass
npm run typecheck:backend  # Must pass
npm run build:backend      # Must pass
```

## ✅ Phase 4: Understand the Scaling Architecture

The key addition was **Redis Adapter**:

```typescript
// In backend/src/index.ts (lines 26-35)
const pubClient = createClient({ url: redisUrl });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

This means:
- Instance 1 sends message → Redis
- Instance 2 receives message ← Redis  
- Both users see the message (sync maintained)

**Why**: Without Redis adapter, Instance 1's Socket.io wouldn't know about Instance 2's sockets.

## ✅ Phase 5: Know What's NOT Done Yet

**High Priority** (needed for production):
- [ ] JWT authentication (currently unsafe X-User-Id header)
- [ ] User login/register endpoints
- [ ] Photo upload system

See `PROJECT_STATUS.md` for full list and effort estimates.

## ✅ Phase 6: Common Tasks

### If you need to...

**...deploy backend to Railway**
```bash
# 1. Create account at railway.app
# 2. Connect GitHub repo
# 3. Follow RAILWAY_SETUP.md exactly
# 4. Test: curl https://your-app.railway.app/health
```

**...deploy frontend to Vercel**  
```bash
# 1. Create account at vercel.com
# 2. Connect GitHub repo (auto-deploys)
# 3. Set REACT_APP_API_URL env var to Railway backend URL
# 4. Done!
```

**...make backend changes**
```bash
cd backend
# Edit files
npm run build    # Compile
npm run dev      # Hot reload (for development)
npm run start    # Run compiled version
```

**...verify Redis is connected**
```bash
# Option 1: Local development
npm run docker:logs | grep "Redis adapter"

# Option 2: Production (Railway)
railway logs | grep "Redis adapter"

# Should show: "Redis adapter connected for Socket.io"
```

**...debug Socket.io issues**
```bash
# Check browser console (client)
const socket = io('https://your-backend.com');
socket.on('connect', () => console.log('✅ Connected!'));
socket.on('connect_error', (err) => console.log('❌ Error:', err));

# Check backend logs
npm run docker:logs  # Local
railway logs         # Railway
# Should show "Redis adapter connected"
```

## ✅ Phase 7: Files You'll Likely Need

| File | Purpose | When |
|------|---------|------|
| `backend/src/index.ts` | Socket.io + Redis setup | Understanding scaling |
| `backend/src/app.ts` | Express routes | Adding new endpoints |
| `backend/src/services/` | Business logic | Implementing features |
| `docker-compose.yml` | Local dev environment | Running locally |
| `CLAUDE.md` | Code guidelines | Before coding |
| `AGENT_NOTES.md` | Current status | Understanding context |
| `.env.example` | Environment template | Setting up deployment |

## ✅ Phase 8: Before You Commit

Run this checklist:

```bash
# 1. Types check
npm run typecheck:backend  ← Must pass (0 errors)

# 2. Build check  
npm run build:backend      ← Must pass

# 3. Full check
npm run check              ← Must pass (types + frontend + web)
```

If any fail:
- Fix the errors (don't ignore them)
- Don't commit until all pass
- See error messages for details

## ✅ Phase 9: Update Documentation

If you make changes, update relevant docs:

1. If you change architecture:
   - Update `CLAUDE.md` architecture section
   - Update `SCALABILITY_ARCHITECTURE.md`

2. If you add features:
   - Update `PROJECT_STATUS.md` (mark as ✅ done)
   - Update `AGENT_NOTES.md` (add note about what was done)

3. If you find issues:
   - Update `DEPLOYMENT.md` troubleshooting section
   - Update `PROJECT_STATUS.md` (Known Issues)

## ✅ Phase 10: Questions to Ask Yourself

After reading docs, you should be able to answer:

1. **Architecture**: "Why does this app scale horizontally?"
   - Answer: "Redis adapter keeps Socket.io sync across instances"

2. **Deployment**: "How do I get this to production?"
   - Answer: "Follow RAILWAY_SETUP.md or VERCEL_SETUP.md"

3. **Local Dev**: "How do I run this locally?"
   - Answer: "`npm run docker:up` starts backend + DB + Redis"

4. **Code Changes**: "Where do I add new API endpoints?"
   - Answer: "Create route in `backend/src/routes/`, logic in `backend/src/services/`"

5. **Testing**: "How do I know my changes work?"
   - Answer: "`npm run check` must pass, `npm run docker:up` must work"

If you can't answer any of these, re-read the docs.

## 🚨 If You Get Stuck

1. **Error during `npm install`**: 
   - Run `npm cache clean --force`
   - Try again
   - Check `DEPLOYMENT.md` Troubleshooting

2. **Docker won't start**:
   - Make sure Docker Desktop is running
   - Try `npm run docker:reset`
   - See `DEPLOYMENT.md` Troubleshooting

3. **TypeScript errors**:
   - Read the error message carefully
   - Check `CLAUDE.md` for code patterns
   - Fix the type mismatch

4. **Socket.io not connecting**:
   - Check `DEPLOYMENT.md` Troubleshooting section
   - Verify Redis is running: `npm run docker:logs | grep Redis`
   - Check CORS settings in `.env`

5. **Still stuck**:
   - Re-read `AGENT_NOTES.md` for context
   - Check `DEPLOYMENT.md` entire troubleshooting section
   - Review error logs thoroughly

## ✅ Success Criteria

You've successfully picked up this project when you can:

- [ ] Explain why Redis adapter is needed
- [ ] Deploy backend to Railway in <30 minutes
- [ ] Deploy frontend to Vercel in <10 minutes  
- [ ] Run local dev with `npm run docker:up`
- [ ] Make a code change and pass `npm run check`
- [ ] Find and read relevant documentation quickly

## 📞 Final Notes

- **This is an MVP**: Not everything is perfect, and that's OK
- **Scaling is built in**: You can add instances without rewriting code
- **Documentation exists**: Before asking questions, check docs
- **Docker is your friend**: Use `npm run docker:*` commands
- **Tests matter**: Always run `npm run check` before committing

---

**Ready to start?**

Choose one:
1. **`npm run docker:up`** (test locally)
2. **Follow `RAILWAY_SETUP.md`** (deploy to production)
3. **Read `PROJECT_STATUS.md`** (understand what's next)

Good luck! 🚀
