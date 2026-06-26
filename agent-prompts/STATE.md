# FreeMatch — Project State

_Last updated: 2026-06-26 · Session 8_

## Status
MVP is feature-complete and verified locally. JWT auth (email/password + bcrypt), photo
upload (S3 via LocalStack), and Redis-scaled Socket.io all work; Session 8 ran 7/7 local
tests green. **Not yet deployed to production.**

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
- `docker-compose up`, then hit `/health`, register/login, and upload a photo.

## Guardrails
- Services own all SQL + business logic; routes only validate and format (see `CLAUDE.md`).
- Keep every change backward-compatible with the `X-User-Id` header — seeded test users rely on it.
- No secrets in git. `.env` is gitignored; document config in `docs/deployment/ENVIRONMENT_VARIABLES_TEMPLATE.md`.
- Match existing code style and patterns; don't add dependencies without a clear reason.

## Log (newest first, one line per session)
- **S8** (2026-06-26): Local testing — 7/7 green; fixed missing `bcrypt` in the Docker image.
- **S7**: Production deployment guide + env-var templates.
- **S6**: Frontend JWT login/register UI + token storage.
- **S5**: JWT auth backend (bcrypt, access/refresh tokens, migration).
- **S4**: Frontend photo gallery UI (picker, upload, delete).
- **S3**: Photo upload backend (S3 service + multer + `/api/photos`).
- **S2**: Local dev strategy doc.
- **S1**: Redis adapter for Socket.io, multi-stage Dockerfile, deploy scripts.
