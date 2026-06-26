# Railway Setup - Guía Paso a Paso

Railway es la opción más rápida para deployar MVP con escalado automático.

## Paso 1: Crear Cuenta Railway

1. Ir a https://railway.app
2. Sign up con GitHub
3. Autorizar Railway

## Paso 2: Crear Proyecto

1. En dashboard: **New Project**
2. **Deploy from GitHub repo**
3. Conectar `freematch-workspace`

## Paso 3: Agregar Servicios

### A. Base de Datos PostgreSQL

1. **+ Add Service** → **Database** → **PostgreSQL**
2. Variables auto-generadas:
   - `DATABASE_URL` (auto)
   - `POSTGRES_USER` (auto)
   - `POSTGRES_PASSWORD` (auto)

### B. Redis

1. **+ Add Service** → **Database** → **Redis**
2. Variable auto: `REDIS_URL`

### C. Backend Node.js

1. **+ Add Service** → **GitHub Repo**
2. Seleccionar `freematch-workspace`
3. **Service Name**: `backend`
4. **Root Directory**: `backend`

## Paso 4: Configurar Variábes del Backend

En el servicio **backend**, ir a **Variables**:

```
NODE_ENV=production
DATABASE_URL=${{ Postgres.DATABASE_URL }}
REDIS_URL=${{ Redis.PRIVATE_URL }}
PORT=3000
CORS_ORIGIN=https://yourdomain.com
```

Usar referencias de Railway:
- `${{ Postgres.DATABASE_URL }}` - conexión auto desde PostgreSQL
- `${{ Redis.PRIVATE_URL }}` - conexión privada Redis
- `${{ Railway.PUBLIC_DOMAIN }}` - dominio público auto

## Paso 5: Deploy

1. **Deploy** → Auto-despliega desde GitHub
2. Ver logs en **Deployments** → **View Logs**
3. Esperar "Application is running on port 3000"

## Paso 6: Conectar Dominio (Opcional)

### Con Railway
1. **Settings** → **Domains**
2. **Generate Domain** (free con dominio *.railway.app)
3. O conectar dominio personalizado

### Con Vercel (Frontend)
1. Frontend Vercel apunta a `https://backend-railway-url.com`
2. Actualizar `REACT_APP_API_URL` en Vercel

## Paso 7: Testing

```bash
# Desde terminal
curl https://backend.railway.app/health

# WebSocket (desde app)
# Se conecta automáticamente via Socket.io
```

## Escalado Automático

Railway soporta auto-scale en tier Pro:

1. **Backend Service** → **Settings**
2. **Deploy** → **Scaling**
3. Enable auto-scale por CPU/Memory

## Costos

| Servicio | Tier | Costo |
|----------|------|-------|
| Backend | Starter (2GB RAM) | $5 |
| PostgreSQL | Starter (5GB) | $10 |
| Redis | Starter (256MB) | $5 |
| **Total** | | **$20/mes** |

## Monitoreo

### Logs en Tiempo Real
```bash
railway logs --service backend
```

### Métricas
En dashboard Railway:
- CPU / Memory usage
- Requests/sec
- Uptime

## Troubleshooting

### Backend no inicia
1. Ver logs: `railway logs`
2. Verificar variables: Backend → **Variables**
3. Verificar BD conectada: `SELECT 1;`

### Socket.io sin conectar
1. Verificar Redis: `redis-cli ping`
2. Ver logs backend para "Redis adapter connected"
3. CORS debe incluir frontend URL

### Base de datos lenta
1. Upgrade PostgreSQL a tier Standard
2. Habilitar Read Replicas

## Próximos Pasos

1. ✅ Backend deployado
2. ⏭️  Deployar Frontend en Vercel
3. ⏭️  Configurar dominio personalizado
4. ⏭️  Agregar JWT authentication
5. ⏭️  Configurar monitoring (Sentry)

---

**¿Listo?** Ejecuta:
```bash
railway login
railway link
# Continúa pasos 3-5 arriba
```
