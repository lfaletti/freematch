# FreeMatch

A dating app born out of a simple question: **what can artificial intelligence really do when asked to build a product from scratch?**

FreeMatch was created by an AI assistant as an experiment to test the power of AI to design and build a real, production-ready application — from backend to mobile frontend — working together with a human developer.

> **FreeMatch is licensed under a Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0).** You may copy, share and adapt it — but **not** use it for commercial purposes. See [`LICENSE`](./LICENSE).

---

## What this app actually is

FreeMatch is intentionally **simple and transparent**. We made a deliberate choice *not* to copy the dark patterns of mainstream dating products.

- **No matching algorithms.** There are no ranking heuristics, no "optimal match scores", no engagement-optimizing feeds. Profiles are simply shown to you, and you decide with a swipe. Nothing guesses who you "should" like.
- **No constant location tracking.** Your general area is only used to show you people near you and to order the deck by distance — and even then it works from a coarse city-level centroid, never your precise position.
- **Simple by design.** No endless engagement loops, no daily streaks to keep you hooked, no algorithmic pressure. Just profiles, swipes, matches and chat.
- **Real feature set.** Authentication and password recovery, photos, matching, real-time chat, profile editing, photo moderation (NSFW filtering), donations, and full **ES/EN** internationalization.

---

## The real purpose

FreeMatch is essentially a **showcase and a proof of concept**: what an AI pair-programmer can build when it works alongside a person to ship a complete product.

We wanted to prove that AI isn't just for code snippets or autocomplete — it can architect, implement, debug and ship an entire cross-platform application. This repository is the evidence.

If you are a developer curious about AI-assisted development, or a maker who wants to see a full-stack app built with an AI partner, this codebase is for you. Fork it, study it, and learn from it — but remember the non-commercial license.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Mobile & Web frontend** | React Native + Expo |
| **Backend** | Node.js + Express + TypeScript |
| **Real-time chat** | Socket.IO (Redis adapter) |
| **Database** | PostgreSQL |
| **Storage** | S3-compatible (MinIO / Cloudflare R2) |
| **Photo moderation** | nsfwjs (on-device / backend) |

---

## Getting started

```bash
# 1) Spin up local services (PostgreSQL + Redis + MinIO)
#    Requires Docker Desktop
npm run docker:up

# 2) Backend
cd backend && npm run dev

# 3) Frontend (Expo Web) — another terminal
npm run start:web
```

Full setup and deployment guides live in [`docs/`](./docs).

---

## License

**FreeMatch** © 2026 is licensed under the
**Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).**

You are free to **share** (copy and redistribute) and **adapt** (remix, transform, build upon) the material — as long as you give appropriate credit and do **not** use it for **commercial** purposes.

See the full legal text in [`LICENSE`](./LICENSE) or at
<https://creativecommons.org/licenses/by-nc/4.0/>.

---

# FreeMatch (Español)

Una app de citas nacida de una pregunta simple: **¿qué puede hacer realmente la inteligencia artificial cuando se le pide crear un producto desde cero?**

FreeMatch fue creada por un asistente de IA como un experimento para poner a prueba el poder de la IA para diseñar y construir una aplicación real, lista para producción — desde el backend hasta el frontend móvil — trabajando junto a un desarrollador humano.

> **FreeMatch está bajo una licencia Creative Commons Atribución-NoComercial 4.0 (CC BY-NC 4.0).** Podés copiar, compartir y adaptarla — pero **no** usarla con fines comerciales. Ver [`LICENSE`](./LICENSE).

---

## Qué es realmente esta app

FreeMatch es, a propósito, **simple y transparente**. Tomamos una decisión deliberada de *no* copiar los patrones oscuros de los productos de citas mainstream.

- **Sin algoritmos de matching.** No hay heurísticas de ranking, ni "puntajes de match óptimo", ni feeds optimizados para el engagement. Los perfiles simplemente se te muestran, y vos decidís con un swipe. Nada adivina quién "debería" gustarte.
- **Sin seguimiento constante de tu ubicación.** Tu zona general se usa solo para mostrarte gente cercana y ordenar el mazo por distancia — y aun así funciona desde un centroide a nivel de ciudad, nunca tu posición exacta.
- **Simple por diseño.** Sin loops infinitos de engagement, sin rachas diarias para mantenerte enganchado, sin presión algorítmica. Solo perfiles, swipes, matches y chat.
- **Funcionalidad real.** Autenticación y recuperación de contraseña, fotos, matches, chat en tiempo real, edición de perfil, moderación de fotos (filtro NSFW), donaciones e internacionalización completa **ES/EN**.

---

## El propósito real

FreeMatch es, en esencia, una **demostración y una prueba de concepto**: lo que un programador-IA puede construir cuando trabaja junto a una persona para publicar un producto completo.

Queríamos probar que la IA no es solo para snippets de código o autocompletado — puede **arquitecturar, implementar, depurar y publicar** una aplicación multiplataforma completa. Este repositorio es la evidencia.

Si sos una persona desarrolladora curiosa sobre el desarrollo asistido por IA, o un maker que quiere ver una app full-stack construida con un socio de IA, este código es para vos. Hacé fork, estudiá y aprendé — pero recordá la licencia no comercial.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend móvil y web** | React Native + Expo |
| **Backend** | Node.js + Express + TypeScript |
| **Chat en tiempo real** | Socket.IO (adaptador Redis) |
| **Base de datos** | PostgreSQL |
| **Almacenamiento** | Compatible S3 (MinIO / Cloudflare R2) |
| **Moderación de fotos** | nsfwjs (backend) |

---

## Cómo empezar

```bash
# 1) Levantar servicios locales (PostgreSQL + Redis + MinIO)
#    Requiere Docker Desktop
npm run docker:up

# 2) Backend
cd backend && npm run dev

# 3) Frontend (Expo Web) — en otra terminal
npm run start:web
```

Las guías completas de setup y deployment están en [`docs/`](./docs).

---

## Licencia

**FreeMatch** © 2026 está bajo la
**licencia Creative Commons Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0).**

Sos libre de **compartir** (copiar y redistribuir) y **adaptar** (remezclar, transformar, construir sobre) el material — siempre que des el crédito correspondiente y **no** lo uses con fines **comerciales**.

Texto legal completo en [`LICENSE`](./LICENSE) o en
<https://creativecommons.org/licenses/by-nc/4.0/>.
