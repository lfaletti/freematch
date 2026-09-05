>[🌐 English](#freematch) &nbsp;|&nbsp; [🌐 Español](#freematch-español)

---

# FreeMatch

A dating app built to test what artificial intelligence can do when asked to create a real product from scratch — with an AI assistant working alongside a human developer from idea to production.

> **License:** Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0). Copy and share freely — but no commercial use. See [`LICENSE`](./LICENSE).

---

## What it is

FreeMatch is **simple and transparent**.

- **No matching algorithms.** Profiles are shown to you and you decide with a swipe. Nothing guesses who you "should" like.
- **No constant location tracking.** Your general area is used only to show people near you, from a coarse city-level centroid — never your exact position.

It includes a real feature set: auth and password recovery, photos, matching, real-time chat, profile editing, NSFW photo moderation, donations, and full **ES/EN** i18n.

---

## Models used

The entire app was developed by an AI pair-programmer running on **OpenClaw**:

- **Claude** — used initially.
- **DeepSeek Flash** — used for most of the rest of the development.

The whole project cost less than $100 in AI usage.

---

## Development time

The work was spread over several months with real breaks in between. Based on the commit history:

- **Calendar span:** ~71 days (26 Jun – 4 Sep)
- **Active days:** 26 (with commits)
- **Total commits:** ~187
- **Estimated real work invested: ~100 hours** across 26 development days — roughly 13 8-hour working days of focused effort to go from idea to a production-ready app.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Mobile & Web frontend** | React Native + Expo |
| **Backend** | Node.js + Express + TypeScript |
| **Real-time chat** | Socket.IO (Redis adapter) |
| **Database** | PostgreSQL |
| **Storage** | S3-compatible (MinIO / Cloudflare R2) |
| **Photo moderation** | nsfwjs |

---

## Getting started

```bash
# 1) Local services (PostgreSQL + Redis + MinIO) — requires Docker
npm run docker:up

# 2) Backend
cd backend && npm run dev

# 3) Frontend (Expo Web) — another terminal
npm run start:web
```

Full setup and deployment guides live in [`docs/`](./docs).

---

## License

**FreeMatch** © 2026 is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**. You may share and adapt it with credit, but not for commercial purposes. Full text in [`LICENSE`](./LICENSE) or at <https://creativecommons.org/licenses/by-nc/4.0/>.

---

---

# FreeMatch (Español)

Una app de citas construida para probar lo que la inteligencia artificial puede hacer cuando se le pide crear un producto real desde cero — con un asistente de IA trabajando junto a una persona desarrolladora, de la idea a la producción.

> **Licencia:** Creative Commons Atribución-NoComercial 4.0 (CC BY-NC 4.0). Podés copiar y compartir libremente — pero no usar con fines comerciales. Ver [`LICENSE`](./LICENSE).

---

## Qué es

FreeMatch es **simple y transparente**.

- **Sin algoritmos de matching.** Los perfiles se te muestran y vos decidís con un swipe. Nada adivina quién "debería" gustarte.
- **Sin seguimiento constante de tu ubicación.** Tu zona general se usa solo para mostrarte gente cercana, desde un centroide a nivel de ciudad — nunca tu posición exacta.

Incluye funcionalidad real: autenticación y recuperación de contraseña, fotos, matches, chat en tiempo real, edición de perfil, moderación NSFW de fotos, donaciones e internacionalización completa **ES/EN**.

---

## Modelos usados

Toda la app fue desarrollada por una IA programadora corriendo en **OpenClaw**:

- **Claude** — se usó inicialmente.
- **DeepSeek Flash** — se usó para la mayoría del resto del desarrollo.

Todo el proyecto costó menos de $100 en uso de IA.

---

## Tiempo de desarrollo

El trabajo se extendió por varios meses con cortes reales en el medio. Según el historial de commits:

- **Período de calendario:** ~71 días (26 jun – 4 sep)
- **Días activos:** 26 (con commits)
- **Total de commits:** ~187
- **Tiempo real de trabajo estimado: ~100 horas** repartidas en 26 días de desarrollo — unas **13 jornadas de 8 h** de esfuerzo concentrado para pasar de la idea a una app lista para producción.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend móvil y web** | React Native + Expo |
| **Backend** | Node.js + Express + TypeScript |
| **Chat en tiempo real** | Socket.IO (adaptador Redis) |
| **Base de datos** | PostgreSQL |
| **Almacenamiento** | Compatible S3 (MinIO / Cloudflare R2) |
| **Moderación de fotos** | nsfwjs |

---

## Cómo empezar

```bash
# 1) Servicios locales (PostgreSQL + Redis + MinIO) — requiere Docker
npm run docker:up

# 2) Backend
cd backend && npm run dev

# 3) Frontend (Expo Web) — en otra terminal
npm run start:web
```

Las guías completas de setup y deployment están en [`docs/`](./docs).

---

## Licencia

**FreeMatch** © 2026 está bajo la **licencia Creative Commons Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0)**. Podés compartir y adaptarla con crédito, pero no con fines comerciales. Texto completo en [`LICENSE`](./LICENSE) o en <https://creativecommons.org/licenses/by-nc/4.0/>.
