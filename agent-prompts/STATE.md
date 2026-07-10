# FreeMatch — Project State

_Last updated: 2026-07-10 · Session 11 (profile view)_

## Status
Profile view feature implemented. Users can now view full profiles (all photos, bio, location, interests) by tapping the avatar in ChatScreen, the match row in MatchesScreen, or the photo on a SwipeCard. Backend: new `GET /api/users/:id/photos` endpoint. Tests green: frontend 88/88, backend 43/43. The repo is a clean single monorepo (`frontend/` is a normal directory, not a nested repo; deps and build output are gitignored). **Not yet deployed to production.**

## Next up
1. **Deploy to production** (~40 min, human-driven) — Railway (PostgreSQL + Redis + backend)
   and Vercel (frontend). Needs dashboard access, so a person clicks through while the agent
   preps env vars. Guide: `docs/deployment/PRODUCTION_DEPLOYMENT_GUIDE.md` · vars: `docs/deployment/ENVIRONMENT_VARIABLES_TEMPLATE.md`.
2. **Real AWS S3** (~1–2 h) — currently LocalStack. Create bucket + IAM creds, swap env vars,
   test a real upload. See `docs/architecture/PHOTO_UPLOAD_IMPLEMENTATION.md`.
3. **Rotate the dev credentials** that used to live in `backend/.env` (now untracked) before
   anything goes live.

## How to verify any change
- `npm run check` — typecheck backend + frontend + web build. Must pass.
- `cd frontend && npm test` — frontend Jest suite (88/88). Must stay green.
- `cd backend && npx jest` — backend Jest suite (43/43). Must stay green.
- `docker-compose up`, then hit `/health`, register/login, and upload a photo. App runs on
  `http://localhost:8081` (Expo web); log in with a created account — the session restores from
  the stored token (no `?user=` query param).

## Guardrails
- Services own all SQL + business logic; routes only validate and format (see `CLAUDE.md`).
- Auth is token-based (JWT from register/login). The backend still honors the legacy `X-User-Id` header for seeded test users, but the frontend uses Bearer tokens only — don't reintroduce the `?user=` / slot-switch impersonation flow.
- No secrets in git. `.env` is gitignored; document config in `docs/deployment/ENVIRONMENT_VARIABLES_TEMPLATE.md`.
- Match existing code style and patterns; don't add dependencies without a clear reason.

## Log (newest first, one line per session)
- **S11** (2026-07-10): Profile view — added `ProfileScreen` (carousel + info), `GET /api/users/:id/photos` endpoint, navigation from ChatScreen (tap avatar), MatchesScreen (tap avatar), SwipeCard (tap photo). Tests: +3 backend, +10 frontend, +2 flaky axios mocks fixed. Totals: frontend 88/88, backend 43/43.
- **S10** (2026-06-27): Auth-flow cleanup — removed the query-string impersonation flow (`?user=<slot>` branch in `RootNavigator`, `switchUser`, `POST /api/switch/:user`, `SessionSwitcher`, `config/testUsers.json`); frontend is now token-only (`Authorization: Bearer`, token-based session restore). Backend keeps the `X-User-Id` header + `TEST_USERS` as dev/test infra. Also fixed the stale `POST /api/auth/register` tests (now send email+password). Tests green: frontend 63/63, backend 40/40.
- **S9** (2026-06-26): Housekeeping — added root `.gitignore` (untracked node_modules/dist/.env), removed junk files, redesigned `agent-prompts/` into PROMPT+STATE, reorganized `docs/` (deployment/architecture/testing + single CHANGELOG), fixed slot-name docs (alex/jordan), repaired frontend Jest suite to 70/70, and absorbed `frontend/` into the monorepo (removed its nested git repo).
- **S8** (2026-06-26): Local testing — 7/7 green; fixed missing `bcrypt` in the Docker image.
- **S7**: Production deployment guide + env-var templates.
- **S6**: Frontend JWT login/register UI + token storage.
- **S5**: JWT auth backend (bcrypt, access/refresh tokens, migration).
- **S4**: Frontend photo gallery UI (picker, upload, delete).
- **S3**: Photo upload backend (S3 service + multer + `/api/photos`).
- **S2**: Local dev strategy doc.
- **S1**: Redis adapter for Socket.io, multi-stage Dockerfile, deploy scripts.
