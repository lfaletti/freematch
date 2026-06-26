# Vercel Setup - Frontend Deployment

Despliega el frontend de FreeMatch en Vercel con auto-deploy desde GitHub.

## Paso 1: Preparar Frontend para Vercel

El frontend (Expo) necesita un adaptador para web.

### Opción A: Usar Next.js Wrapper (Recomendado)

Si quieres server-side rendering + mejor SEO:

```bash
npx create-next-app@latest --yes \
  --typescript \
  --tailwind \
  --src-dir
```

Luego integrar Expo RN Web.

### Opción B: Expo Web Direct (MVP rápido)

Usar Expo web bundle que ya existe.

## Paso 2: Crear Cuenta Vercel

1. Ir a https://vercel.com
2. Sign up con GitHub
3. Autorizar Vercel

## Paso 3: Importar Proyecto

1. **Add New Project** → **Import Git Repository**
2. Buscar y seleccionar `freematch-workspace`
3. **Framework Preset**: Expo (o Custom)
4. **Root Directory**: `frontend`

## Paso 4: Configurar Variables de Entorno

En Vercel, ir a **Settings** → **Environment Variables**:

```
REACT_APP_API_URL=https://backend.railway.app
REACT_APP_WS_URL=wss://backend.railway.app
NODE_ENV=production
```

## Paso 5: Configurar Build

En **Settings** → **Build & Development Settings**:

- **Build Command**: `npm run web` o `expo export --platform web`
- **Output Directory**: `web-build` (o `.expo/web` según config)
- **Install Command**: `npm ci`

## Paso 6: Deploy

1. **Deploy** - Vercel auto-despliega
2. Ver progreso en **Deployments**
3. URL pública: `freematch-workspace.vercel.app` (o personalizada)

## Paso 7: Conectar Dominio Personalizado

1. **Settings** → **Domains**
2. Agregar `app.yourdomain.com`
3. Configurar DNS según instrucciones Vercel
4. SSL automático con Let's Encrypt

## Paso 8: Configurar CORS en Backend

Backend debe permitir requests desde Vercel:

```bash
# En Railway Backend → Variables
CORS_ORIGIN=https://freematch-workspace.vercel.app,https://app.yourdomain.com
```

## Verificar Conectividad

En Vercel Deployments, verificar en console del navegador:

```javascript
// Debe conectar sin errores
const socket = io('https://backend.railway.app');
socket.on('connect', () => console.log('Conectado!'));
```

## Auto-Deploy desde GitHub

Vercel auto-deploya en cada push a `main`:

```bash
git push origin main
# Vercel: automáticamente deploy
```

Desactivar en **Settings** → **Git** si no quieres auto-deploy.

## Monitoreo

### Vercel Analytics
- Ir a **Analytics** para ver Core Web Vitals
- Performance: LCP, FID, CLS

### Custom Domain
- **Settings** → **Domains** → ver SSL status
- SSL debe ser "Valid"

## Troubleshooting

### Frontend conecta pero no funciona
1. Verificar `REACT_APP_API_URL` en Vercel
2. Verificar backend CORS permite dominio Vercel
3. Ver console del navegador para errores

### Builds falla
1. Ver logs en **Deployments** → **Failed**
2. Verificar Node version: `node --version`
3. Verificar dependencies: `npm ci`

### WebSocket no conecta
1. Verificar WSS (WebSocket Secure) disponible en backend
2. Ver `REACT_APP_WS_URL` configurado
3. Verificar backend no bloquea WSS

## Costos

| Servicio | Tier | Costo |
|----------|------|-------|
| Vercel Frontend | Hobby | **Free** |
| Custom Domain | - | Free (dominio propio) |
| Analytics | Pro | $20/mes (opcional) |

## Stack Completo

```
Frontend: https://app.yourdomain.com (Vercel)
    ↓ API/WebSocket
Backend: https://api.yourdomain.com (Railway)
    ↓
PostgreSQL + Redis (Railway)
```

## Próximos Pasos

1. ✅ Backend en Railway
2. ✅ Frontend en Vercel
3. ⏭️  Conectar dominio personalizado
4. ⏭️  Configurar monitoring
5. ⏭️  Load testing (10k+ usuarios)

---

**Comenzar:**
```bash
git push origin main
# Vercel: automáticamente deploy
```
