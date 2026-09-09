>[🌐 es](#es) &nbsp;|&nbsp; [🌐 en](#en)

---

# FreeMatch (es)

Una app de citas construida **enteramente en producción, lista para escalar**, realizada con un **asistente de código de IA**.

---

## Qué es

FreeMatch es simple y transparente.

- **Sin algoritmo de ranking.** El deck aplica sólo *filtros de preferencia* que vos controlás — género que te interesa, distancia (radio desde tu ciudad) y rango de edad — y entre esa gente elegís con un swipe. No hay puntuación oculta ni ranking: nadie es empujado ni enterrado por un algoritmo.
- **Sin seguimiento constante de tu ubicación.** Tu zona general se usa sólo para mostrarte gente cercana, desde un centroide a nivel de ciudad — nunca tu posición exacta.

Incluye funcionalidad real: autenticación y recuperación de contraseña, fotos, matches, chat en tiempo real, edición de perfil, preferencias de matching (género, distancia y rango de edad), moderación NSFW de fotos, donaciones e internacionalización completa **ES/EN**.

---

## Entrega continua (Continuous Delivery)

El repositorio está conectado a **Vercel** (frontend) y a **Railway** (backend). Cada commit que se hace a `master` se **auto-despliega** en producción automáticamente, sin intervención manual.

---

## Estrategia de desarrollo

**Objetivo general:** FreeMatch es un caso de uso para testear cómo guiar a un asistente de IA en la generación de una aplicación de forma iterativa. Se busca entender los límites y lo que implica desarrollar una app en serio: qué cosas hay que ajustar o tener en cuenta, y en qué puntos se puede delegar.

La app se construyó de forma **iterativa**:

- **Indicaciones paso a paso**, no prompts grandes ni monolíticos.
- **Pasos incrementales**: cada cambio se testeaba a medida que se avanzaba.
- **Corrección continua** sobre la marcha, ajustando según los resultados de las pruebas.

En lugar de pedirle a la IA que generara todo de una sola vez, el trabajo se fue guiando por pequeños pasos verificables, corrigiendo los errores detectados en cada iteración y construyendo la app de forma estable y gradual — pero sin tocar una línea de código.

---

## Modelos usados

Toda la app fue desarrollada por una IA programadora corriendo en **OpenClaw**:

- **Claude** — se usó inicialmente, pero se abandonó por caro.
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

## Correr localmente

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

---

---

# FreeMatch (en)

A dating app built **entirely for production, ready to scale**, made with an **AI code assistant**.

---

## What it is

FreeMatch is simple and transparent.

- **No ranking algorithm.** The deck applies only *preference filters* that you control — gender you're into, distance (radius from your city), and age range — and among those people you decide with a swipe. There is no hidden scoring or ranking: nobody is pushed up or buried by an algorithm.
- **No constant location tracking.** Your general area is used only to show people near you, from a coarse city-level centroid — never your exact position.

It includes a real feature set: auth and password recovery, photos, matching, real-time chat, profile editing, matching preferences (gender, distance and age range), NSFW photo moderation, donations, and full **ES/EN** i18n.

---

## Continuous delivery

The repository is connected to **Vercel** (frontend) and **Railway** (backend). Every commit pushed to `master` **auto-deploys** to production automatically, with no manual steps.

---

## Development strategy

**General goal:** FreeMatch is a use case to test how to guide an AI assistant to build an application iteratively. The aim is to understand the limits and what building a real app seriously entails: what needs to be adjusted or taken into account, and where tasks can be delegated.

The app was built **iteratively**:

- **Step-by-step prompts**, not large or monolithic ones.
- **Incremental steps**: each change was tested as we went along.
- **Continuous correction** on the fly, adjusting based on test results.

Instead of asking the AI to generate everything at once, the work was guided through small, verifiable steps — fixing issues as they appeared in each iteration and building the app in a stable, gradual way — without touching a single line of code.

---

## Models used

The entire app was developed by an AI pair-programmer running on **OpenClaw**:

- **Claude** — used initially, but abandoned because it was too expensive.
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

## Run locally

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
