# FreeMatch - Production Deployment Guide

Esta guía documenta cómo deployar FreeMatch a producción.

## Cambios Realizados para Escalado

### 1. Redis Adapter para Socket.io
- **Problema**: Con múltiples instancias de backend, Socket.io no se sincroniza entre servidores
- **Solución**: Redis Adapter centraliza los eventos de Socket.io
- **Archivo**: `backend/src/index.ts` - línea 24-35

### 2. Dockerfile Multi-Stage
- Reducida la imagen de ~500MB a ~100MB
- Compilación separada (builder) de runtime
- Solo incluye dependencias de producción

### 3. Docker Compose Mejorado
- PostgreSQL con healthcheck
- Redis para Socket.io adapter
- Variables de entorno centralizadas

## Arquitectura de Escalado

```
┌─────────────────────────────────────────┐
│         Frontend (Vercel/Web)           │
└─────────────┬──────────────────────────┘
              │
              │ HTTP/WebSocket
              │
    ┌─────────▼──────────┐
    │  Load Balancer     │
    │  (Railway/Fly.io)  │
    └──┬──────────────┬──┘
       │              │
    ┌──▼──┐       ┌──▼──┐
    │ API 1│       │ API 2│
    └──┬──┘       └──┬──┘
       │              │
       └──────┬───────┘
              │
      ┌───────▼────────┐
      │  Redis (Pub/Sub)│ ◄─── Socket.io Synchronization
      └────────────────┘
              │
      ┌───────▼────────────┐
      │ PostgreSQL + Replicas │
      └──────────────────────┘
```

## Deployment en Railway (Recomendado para MVP)

### Pre-requisitos
- Cuenta en [railway.app](https://railway.app)
- Railway CLI instalado
- GitHub conectado a Railway

### Pasos

1. **Conectar repositorio**
```bash
railway login
railway link
```

2. **Configurar variables de entorno**
```bash
# En el dashboard de Railway
# Backend > Variables
NODE_ENV=production
POSTGRES_USER=freematch
POSTGRES_PASSWORD=[generar contraseña fuerte]
REDIS_URL=redis://${{ Redis.PRIVATE_URL }}
DATABASE_URL=postgresql://${{ Postgres.PRIVATE_URL }}:${{ Postgres.PRIVATE_PORT }}/freematch_db
```

3. **Desplegar**
```bash
npm run deploy:railway production
```

## Deployment en Fly.io

### Pre-requisitos
- Cuenta en [fly.io](https://fly.io)
- Fly CLI instalado

### Pasos

1. **Crear aplicaciones**
```bash
flyctl apps create freematch-prod
flyctl postgres create --app freematch-prod
flyctl redis create --app freematch-prod
```

2. **Configurar variables**
```bash
flyctl secrets set -a freematch-prod NODE_ENV=production
```

3. **Desplegar**
```bash
npm run deploy:fly production
```

## Deployment en Vercel (Frontend)

### Pre-requisitos
- Cuenta en [vercel.com](https://vercel.com)
- GitHub conectado

### Pasos

1. **Conectar repositorio en Vercel**
   - Ir a vercel.com/new
   - Conectar GitHub
   - Importar `freematch-workspace`

2. **Configurar variables de entorno**
```
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_WS_URL=wss://api.yourdomain.com
```

3. **Deploy automático** - Vercel deploya automáticamente en cada push a main

## Desarrollo Local con Docker

### Iniciar
```bash
npm run docker:up
```

### Ver logs
```bash
npm run docker:logs
```

### Detener
```bash
npm run docker:down
```

### Reset completo (borrar datos)
```bash
npm run docker:reset
```

## Monitoreo en Producción

### Railway
- Dashboard: https://railway.app
- Logs: `railway logs`
- Métricas: Dashboard > Deployments

### Fly.io
- Dashboard: https://fly.io/apps
- Logs: `flyctl logs`
- Status: `flyctl status`

## Checklist de Pre-Deployment

- [ ] Todos los tests pasan: `npm run check`
- [ ] Variables de entorno configuradas
- [ ] Base de datos respaldada
- [ ] Redis configurado
- [ ] SSL/HTTPS habilitado
- [ ] CORS configurado correctamente
- [ ] Rate limiting en API
- [ ] Logs centralizados configurados

## Troubleshooting

### Socket.io no conecta en producción
1. Verificar CORS en backend
2. Verificar Redis conectado: `redis-cli ping`
3. Ver logs: `railway logs` o `flyctl logs`

### Base de datos lenta
1. Verificar conexiones: `SELECT count(*) FROM pg_stat_activity;`
2. Habilitar read replicas en Railway/Fly.io
3. Implementar caching en Redis

### Frontend no se conecta
1. Verificar REACT_APP_API_URL apunta a dominio correcto
2. Verificar CORS en backend
3. Verificar certificado SSL válido

## Scaling Automático

### Railway
- Auto-scale por CPU/Memory en tier Pro
- Configurar en Dashboard > Settings

### Fly.io
- Auto-scale configurado en fly.toml
- Max 25 conexiones por proceso

## Costos Estimados (Mensual)

| Servicio | Tier | Costo |
|----------|------|-------|
| Railway Backend | Starter | $5 |
| Railway PostgreSQL | Starter | $10 |
| Railway Redis | Starter | $5 |
| Vercel Frontend | Hobby | Free |
| **Total** | | **$20** |

Para escalar a 10k+ usuarios, considerar:
- Upgrade a Railway Pro: +$20/mes
- CDN global (Cloudflare): Free - $200/mes
- Monitoring (Sentry/DataDog): $10-99/mes

## Próximos Pasos

1. Agregar autenticación JWT
2. Implementar rate limiting
3. Agregar logging centralizado (Sentry)
4. Configurar monitoring (Uptime Robot)
5. Backup automático de base de datos
6. Image optimization para fotos (Cloudinary)
