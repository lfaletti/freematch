# FreeMatch — Project State

_Last updated: 2026-07-11 · Session 13 (housekeeping + state sync)_

## Status
Feature-complete MVP. Photo system (MinIO S3), profile editing, swipe reset, and photo carousel/viewer all working. Mock tests and test data removed. App runs with real user data only. Backend rebuilt in Docker with all changes. All changes committed and pushed to `origin/master`. **Not yet deployed to production.**

## Next up
1. **Production readiness fixes** — security gaps identified in audit (auth enforcement, socket auth, CORS, rate limiting, password validation). See session notes for details.
2. **Staging/dev environment** — non-local environment for testing (Railway preview, VPS with Docker, or Codespaces).
3. **Push notifications** — alert on new matches/messages.
4. **Monitoring** — error tracking, analytics.
5. **Deploy to production** (~40 min, human-driven) — blocked by #1 and #2 above.

## How to verify any change
- `npm run check` — typecheck backend + frontend + web build. Must pass.
- `npm run start:app` — starts Docker stack + Expo web on `:8081`. Log in with a created account.
- Backend rebuild after route/service changes: `docker compose up -d --build backend`.
- Photos: MinIO bucket `freematch-dev` is public. URLs use `127.0.0.1:9000`.

## Guardrails
- Services own all SQL + business logic; routes only validate and format (see `CLAUDE.md`).
- Auth is JWT-based (Bearer token). Backend still honors legacy `X-User-Id` for dev, but frontend is token-only.
- No secrets in git. `.env` is gitignored.
- No mock tests or seeded users. Only real registered accounts.
- Profile edits limited to non-credential fields (name, bio, location, interests).
- Reset swipes only affects left swipes; preserves matches and right swipes.
- Web layout: avoid `FlatList` with `pagingEnabled`; use explicit pixel heights and state-based navigation.
- Match existing code style; don't add dependencies without a clear reason.

## Log (newest first, one line per session)
- **S13** (2026-07-11): Housekeeping — cleaned up `.qwen/`, `RootNavigator_copy.txt`, and stray files. Confirmed in-app photo upload is fully implemented (CreateAccountScreen + PhotoScreen with ImagePicker, backend POST /api/photos). Updated STATE.md to reflect photo upload as complete.
- **S14** (2026-07-11): Security audit + fixes — enforced JWT auth on all protected routes, removed `X-User-Id` header impersonation in prod, added Socket.io JWT auth + senderId derivation from token, added CORS restriction, rate limiting (express-rate-limit), password minimum length, photo endpoint auth, verified local dev compatibility.
- **S12** (2026-07-10): Docs + prompts update — rewrote README.md, CLAUDE.md, CHANGELOG.md, STATE.md to reflect all features. Profile photos (85% width, 4:5 ratio, max 480px), carousel with arrows/dots, full-screen viewer, EditProfile screen, reset left swipes, ⋮ dropdown menu, MinIO public bucket, mock cleanup.
- **S11** (2026-07-10): Profile view — added `ProfileScreen` (carousel + info), `GET /api/users/:id/photos` endpoint, navigation from ChatScreen, MatchesScreen, SwipeCard.
- **S10** (2026-06-27): Auth-flow cleanup — removed query-string impersonation; frontend is now token-only.
- **S9** (2026-06-26): Housekeeping — root `.gitignore`, redesigned `agent-prompts/` into PROMPT+STATE, reorganized `docs/`, absorbed `frontend/` into monorepo.
- **S8** (2026-06-26): Local testing — fixed missing `bcrypt` in Docker image.
- **S7**: Production deployment guide + env-var templates.
- **S6**: Frontend JWT login/register UI + token storage.
- **S5**: JWT auth backend (bcrypt, access/refresh tokens).
- **S1–S4**: Photo upload, Socket.io Redis adapter, Docker, deploy scripts.
