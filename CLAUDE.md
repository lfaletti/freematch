# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FreeMatch is a full-stack dating app prototype. Backend is Express + TypeScript with PostgreSQL; frontend is React Native (Expo). Real-time messaging uses Socket.io.

## Commands

### Root workspace
```bash
npm run check              # Run all type checks + web build (CI equivalent)
npm run typecheck:backend  # TypeScript check for backend only
npm run typecheck:frontend # TypeScript check for frontend only
npm run build:web          # Build Expo web bundle to /tmp/freematch-web-check
npm run start:web          # Start frontend on web
npm run clear:cache        # Clear Expo and Metro caches
```

### Backend (`cd backend`)
```bash
npm run dev    # Development with hot reload (ts-node-dev)
npm run build  # Compile TypeScript to dist/
npm start      # Run compiled output
```

### Frontend (`cd frontend`)
```bash
npm start       # Expo start (choose platform interactively)
npm run web     # Start on web browser
npm run android # Start on Android emulator
npm run ios     # Start on iOS simulator
npm test        # Run Jest tests (CI mode, no watch)
```

### Infrastructure
```bash
docker-compose up      # Start PostgreSQL (port 5432) + Redis (6379) + Backend (3000)
npm run docker:up      # Alias for docker-compose up
npm run docker:down    # Stop all containers
npm run docker:reset   # Full reset: remove volumes + restart
npm run docker:logs    # View backend logs
```

### Production Deployment
```bash
npm run build:backend   # Compile TypeScript to dist/
npm run deploy:railway  # Deploy to Railway (requires Railway CLI)
npm run deploy:fly      # Deploy to Fly.io (requires Fly CLI)
npm run check          # TypeScript + web build (pre-deployment check)
```

## Architecture

### Session Model
The app authenticates with created accounts: register/login (`/api/auth/register`, `/api/auth/login` with email + password) issue a JWT (`token`) + `refreshToken`, which the frontend stores via `storageService` and sends as an `Authorization: Bearer` header (see the interceptor in `frontend/src/services/api.ts`). On startup `RootNavigator.initSession()` restores the session from the stored token by validating it against `GET /api/session` — no URL query param is involved; opening the app's base URL is enough.

The backend still understands a legacy `X-User-Id` header and seeded `TEST_USERS` (`backend/src/database/migrate.ts`) as dev/test infrastructure — `getUserId()` (`backend/src/utils/session.ts`) falls back to it (and finally to the `alex` slot) when there's no Bearer token. The frontend no longer uses this path: the old query-string impersonation (`?user=<slot>`), the `POST /api/switch/:user` endpoint, and the `SessionSwitcher` component have been removed. Testing is done with self-created accounts.

### Data Flow
**Swipe → Match:**
1. Frontend dispatches `recordSwipe()` thunk → `POST /api/swipes`
2. `swipeService.recordSwipe()` checks if the other user already swiped right
3. If mutual, `matchService.createMatch()` inserts a record (IDs stored sorted to enforce uniqueness)
4. Redux `matchesSlice.addMatch()` updates state and triggers a match modal

**Real-time messaging (Socket.io):**
- Client emits `join_match` with `matchId` to join a room
- Client emits `send_message` → backend saves to DB and broadcasts `new_message` to the room
- Frontend `messagesSlice` listens via `socketService` and appends incoming messages

### Frontend State Shape (Redux)
```
session:  { userId, slot, name, photo }
users:    { all: User[], currentIndex, loading }
matches:  { all: Match[], newMatch }
messages: { byMatchId: Record<string, Message[]> }
```

Every Axios request automatically includes the `Authorization: Bearer <token>` header (when a session token is present) via an interceptor in `frontend/src/services/api.ts`.

### Backend Request Pattern
Routes call `getUserId(req)` to extract the user from the header, then delegate to service files in `backend/src/services/`. Services own all SQL and business logic; routes only validate and format responses.

### Platform-Aware API URL
`frontend/src/services/apiService.ts` sets the base URL to `http://localhost:3000` on web and `http://10.0.2.2:3000` on Android emulator.

### Database Schema
```
users → swipes (swiper_id, swiped_id) → matches (user1_id < user2_id) → messages
```
`swipes` uses `ON CONFLICT ... DO UPDATE`; `matches` uses `ON CONFLICT DO NOTHING` — both are safe to call repeatedly.

### Photo System (July 2026)
Photos are stored in **MinIO** (S3-compatible) with a local bucket `freematch-dev` on port 9000. The backend returns URLs using `S3_PUBLIC_ENDPOINT=http://127.0.0.1:9000` so the browser can reach them. The bucket is publicly readable (`mc anonymous set download`). `users.photo_url` may be empty — the `getAllUsers` query uses `COALESCE` to fall back to the `photos` table. `getPhotoUrl()` in `frontend/src/services/api.ts` replaces `localhost` with `127.0.0.1` for MinIO URLs.

**Display sizing**: Profile photos at **85% viewport width with 4:5 aspect ratio**, capped at **480px** on wide screens (notebooks). The ProfileScreen has a carousel with arrow navigation (‹/›) and dot indicators. Tapping any photo opens a full-screen viewer modal with navigation, counter (`1 / N`), and dot indicators.

**SwipeCard**: Photos use explicit pixel heights (`height: Math.round(CARD_HEIGHT * 0.65)`) instead of percentage values, which is required for correct rendering in React Native Web.

### Profile Features (July 2026)
- **Edit Profile** (`PATCH /api/users/me`): Partial updates of `name`, `bio`, `location`, `interests`. Email, phone, and birth date are locked (credentials).
- **Reset Left Swipes** (`POST /api/swipes/reset-left`): Deletes all left swipes for the user, restoring skipped users to the deck. Does NOT affect right swipes or existing matches. Shows confirmation dialog before execution.
- **Navigation menu**: `⋮` button (3-dot, top-right) with dropdown — "Editar perfil" and "Salir" options. Replaced the old confusing logout button.

### Mock Test Cleanup (July 2026)
All mock unit tests (`__tests__/` directories) and testing dependencies (`jest`, `@testing-library/*`, etc.) were removed from `package.json` files. 30 mock test user records were deleted from the database. The app now runs with real data only.

### Starting the app after a reboot
Only the Docker stack (postgres + redis + backend) comes back automatically — the **Expo web frontend runs natively, not in Docker** (there is no frontend service in `docker-compose.yml`), so it must be started by hand after every reboot. `npm run start:app` (root) runs `start-app.ps1`, which brings up the Docker stack detached, waits for the backend `/health` check, then starts Expo web on `:8081`. Then open `http://localhost:8081/` and log in (or create an account).

### Verifying Locally (running the app, not just tests)
- Fastest stack: run only the DB in Docker (`docker compose up -d postgres redis`) and the backend locally (`cd backend && npm run dev`, reads `backend/.env` → `localhost:5432`, serves `:3000`). Don't build the backend image just to verify. Frontend web: `npx expo start --web --port 8081`; Metro recompiles from disk, so an already-running server picks up edits on a fresh page load.
- Open `localhost:8081/` and log in with (or create) an account — the session is restored from the stored token; there is no `?user=` query param.
- **Triggering a *new* match modal:** there are no seeded profiles, so register **two** accounts. Have the other account like yours via `POST /api/swipes` (authenticate with that account's `Authorization: Bearer <token>`, or its `X-User-Id: <other-id>` test header, `{"swipedId":"<your-id>","direction":"right"}`), then click ♥ on that user in your UI — the first reciprocal right-swipe creates an instant match. (There is no `POST /api/reset` endpoint — it was removed because it did `DELETE FROM users`, wiping all real accounts.)
- Browser automation note: `randomuser.me` photos don't load in headless browsers; assert on `img.src`, not rendered pixels.

## Scalability & Production (Added June 2026)

### Changes for Horizontal Scaling

**Problem**: Single backend instance doesn't scale. Socket.io connections fragment with multiple instances.

**Solution implemented**:
1. **Redis Adapter** (`backend/src/index.ts`) - Socket.io pub/sub synchronized across instances
2. **Multi-Stage Dockerfile** - Production image: 500MB → 100MB
3. **Docker Compose with Redis** - Local dev mirrors production
4. **Environment variables** - `.env` for dev, `.env.production.example` for prod

### Architecture

```
Frontend (Vercel)
    ↓ WebSocket
  [Load Balancer]
    ├─ Backend 1
    ├─ Backend 2 
    └─ Backend 3... (auto-scale)
         ↓
    [Redis] ← Socket.io adapter sync
         ↓
    [PostgreSQL] + replicas
```

### Key Files Changed
- `backend/src/index.ts` - Redis client + adapter initialization
- `backend/Dockerfile` - Multi-stage build (builder + runtime)
- `docker-compose.yml` - Added Redis, healthchecks
- `backend/package.json` - Added `redis`, `@socket.io/redis-adapter`
- `package.json` (root) - New scripts: `docker:*`, `deploy:*`

### Deployment Options
1. **Railway** (Recommended MVP) - $20/month, auto-scaling
2. **Fly.io** - $15-30/month, global deployment  
3. **Vercel** (Frontend only)

See docs (start at `docs/README.md` for the full index):
- `docs/deployment/QUICK_START_DEPLOYMENT.md` - 1-min overview
- `docs/deployment/RAILWAY_SETUP.md` - Step-by-step Railway
- `docs/deployment/VERCEL_SETUP.md` - Step-by-step Vercel
- `docs/deployment/DEPLOYMENT.md` - Complete guide + troubleshooting
