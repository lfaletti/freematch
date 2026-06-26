# Quick Start - Escalado a Producción

## Resumen de Cambios Realizados

✅ **Dockerfile optimizado** con multi-stage build (compilación + runtime separados)  
✅ **Redis Adapter** para sincronizar Socket.io entre múltiples instancias  
✅ **docker-compose mejorado** con PostgreSQL + Redis + healthchecks  
✅ **Variables de entorno** para dev/prod  
✅ **Scripts de deployment** para Railway y Fly.io  
✅ **Documentación completa** de deployment  

## Prueba Local (1 minuto)

Requiere Docker Desktop:

```bash
npm run docker:up
```

Luego visita: http://localhost:3000

Para detener:
```bash
npm run docker:down
```

## Deployment a Producción (10 minutos)

### Opción 1: Railway (RECOMENDADO para MVP)

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Conectar proyecto
railway link

# 4. Configurar en dashboard: 
# - 3 servicios: Backend (Node), PostgreSQL, Redis
# - Variables de entorno (ver .env.production.example)

# 5. Desplegar
npm run deploy:railway production
```

Costo: $20/mes (Backend + DB + Redis)

### Opción 2: Fly.io

```bash
# 1. Instalar Fly CLI
npm install -g flyctl

# 2. Login
flyctl auth login

# 3. Crear apps
flyctl apps create freematch-prod
flyctl postgres create --app freematch-prod
flyctl redis create --app freematch-prod

# 4. Desplegar
npm run deploy:fly production
```

Costo: $15-30/mes

### Opción 3: Vercel (Solo Frontend)

Frontend Vercel + Backend Railway/Fly.io

```bash
# Vercel: conectar GitHub → auto-deploy
# Backend: railway/fly.io (pasos arriba)
```

## Estructura de Deployment

```
Internet
   ↓
Frontend: https://freematch.vercel.app
   ↓ HTTP/WebSocket
Backend Load Balancer: https://backend.example.com (Railway/Fly.io)
   ↓ (múltiples instancias)
Redis + PostgreSQL
```

## Testing Manual

1. **Conectar backend**
```bash
npm run docker:up
# Esperar 10s a que levante
```

2. **Validar en otra terminal**
```bash
# Health check
curl http://localhost:3000

# Ver logs
npm run docker:logs
```

3. **Detener**
```bash
npm run docker:down
```

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run docker:up` | Inicia contenedores |
| `npm run docker:down` | Detiene contenedores |
| `npm run docker:build` | Rebuild sin caché |
| `npm run docker:reset` | Limpia BD y reinicia |
| `npm run check` | TypeCheck + build (CI) |
| `npm run build:backend` | Compila backend |

## Verificación Pre-Deployment

```bash
# Verificar todo compila
npm run check

# Verificar tipos
npm run typecheck:backend

# Compilar backend para producción
npm run build:backend
```

Si todo pasa ✅, estás listo para deployar!

## Documento Completo

Ver `DEPLOYMENT.md` para:
- Monitoreo en producción
- Troubleshooting
- Configuración de scaling automático
- Estimación de costos para diferentes volúmenes
- Próximos pasos (JWT, rate limiting, CDN)

---

**¿Preguntas?** Ver DEPLOYMENT.md o contactar soporte.
