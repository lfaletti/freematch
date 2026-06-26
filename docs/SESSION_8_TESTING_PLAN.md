# Session 8 - Local Testing Plan & Results

## Estado Previo a Testing

### ✅ Backend Code Review (Verificado Estáticamente)
- **auth.ts**: ✅ Rutas de register, login, refresh correctamente implementadas
- **authService.ts**: ✅ JWT generation, password hashing, token validation implementados
- **jwtAuth.ts**: ✅ Middleware JWT con extracción de tokens en Authorization header
- **migrate.ts**: ✅ 4 migraciones SQL (init, auth, photos, jwt_auth)
- **004_jwt_auth.sql**: ✅ password_hash y last_login columns añadidas
- **index.ts**: ✅ Redis adapter configurado, Socket.io listo

### 🔍 Código Análisis

**Migraciones en lugar:**
- 001_init.sql ← Tabla users base
- 002_auth.sql ← Auth relacionado
- 003_photos.sql ← Tabla photos
- 004_jwt_auth.sql ← password_hash + last_login

**Auth Flow Completo:**
1. POST /api/auth/register → Crea usuario con password_hash
2. POST /api/auth/login → Valida email/password, genera JWT
3. POST /api/auth/refresh → Regenera tokens con refreshToken

**Frontend Integration:**
- LoginScreen.tsx ← Email/password login + JWT token storage
- CreateAccountScreen.tsx ← Registration con email/password
- RootNavigator.tsx ← Token restoration on app startup
- StorageService.ts ← Token persistence

---

## Plan de Verificación Local

### Fase 1: Levantar Environment (10 min)
**Status**: ⏳ Esperando que el usuario levante Docker Desktop

**Pasos:**
1. Abrir Docker Desktop (desde menú de Windows)
2. Esperar 30-60 segundos
3. Volver aquí

**Verificar con:**
```bash
docker version  # Debe mostrar Client y Server info
docker ps      # Debe mostrar contenedores
```

---

### Fase 2: Iniciar Servicios (5 min)
**Once Docker is Running:**

```bash
cd c:\code\freematch-workspace
npm run docker:up
```

**Esperar a que termine con:**
```
backend           |  FreeMatch backend running on port 3000
postgres_1        |  database system is ready to accept connections
redis_1           |  * Ready to accept connections
```

**En otra terminal, verifica:**
```bash
npm run docker:logs    # Ver logs en tiempo real
```

---

### Fase 3: Test Health Endpoint (2 min)

```bash
curl http://localhost:3000/health
```

**Expected Response**: 200 OK

---

### Fase 4: Test JWT Auth Flow (10 min)

#### 4.1 Register con email/password

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"test@example.com",
    "password":"Test123!",
    "born_date":"2000-01-01"
  }'
```

**Expected Response:**
```json
{
  "userId":"<uuid>",
  "email":"test@example.com",
  "name":"Test User",
  "token":"<jwt>",
  "refreshToken":"<jwt>"
}
```

**Guardar**: `userId` y `token` para próximos tests

---

#### 4.2 Login con mismo email/password

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123!"
  }'
```

**Expected Response**: Mismo que register (token válido)

---

#### 4.3 Login con password incorrecto

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"WrongPassword"
  }'
```

**Expected Response**: 401 "Invalid email or password"

---

### Fase 5: Test Photo Upload (15 min)

#### 5.1 POST /api/photos (Upload con JWT)

```bash
# Necesitas un archivo de imagen. Si no tienes, crea uno dummy:
# O usa una URL de imagen real

curl -X POST http://localhost:3000/api/photos \
  -H "Authorization: Bearer <token>" \
  -F "file=@<ruta-a-imagen>" \
  -F "caption=My first photo"
```

**Expected Response**: 201 + photo object con `id`, `url`, `userId`

---

#### 5.2 GET /api/photos (Listar fotos del usuario)

```bash
curl http://localhost:3000/api/photos \
  -H "Authorization: Bearer <token>"
```

**Expected Response**: Array de fotos del usuario

---

#### 5.3 DELETE /api/photos/{photoId} (Borrar foto)

```bash
curl -X DELETE http://localhost:3000/api/photos/<photoId> \
  -H "Authorization: Bearer <token>"
```

**Expected Response**: 200 + mensaje de confirmación

---

### Fase 6: Test Socket.io Connection (5 min)

**Opción A: Desde Frontend**
1. Abre navegador: `http://localhost:19006`
2. Abre DevTools (F12)
3. Ve a Console
4. Debería ver: `Socket connected` (sin errores)

**Opción B: Desde Terminal (requiere socket.io client)**

```bash
# Si tienes node instalado
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3000');
socket.on('connect', () => console.log('Connected!'));
socket.on('error', (err) => console.error('Error:', err));
setTimeout(() => process.exit(0), 5000);
"
```

---

### Fase 7: Test Database (5 min)

```bash
# Conectarse a PostgreSQL y ver usuarios creados
docker-compose exec postgres psql -U postgres -d freematch -c "SELECT id, email, name, password_hash FROM users LIMIT 5;"
```

**Expected**: Ver usuarios registrados con password_hash

---

### Fase 8: Test Redis (2 min)

```bash
docker-compose exec redis redis-cli PING
```

**Expected Response**: `PONG`

---

## Bugs Potenciales a Buscar

### 🔴 Críticos
- [ ] Backend no levanta (error en migrations)
- [ ] JWT token no se genera
- [ ] Login falla con email válido
- [ ] Socket.io no conecta

### 🟡 Importantes
- [ ] Photo upload falla
- [ ] CORS errors en frontend
- [ ] Database queries lentas
- [ ] Tokens no persisten

### 🟢 Menores
- [ ] Error messages no claros
- [ ] Missing validations
- [ ] Performance issues

---

## Testing Frontend (Manual)

### Si Docker está corriendo:

```bash
cd frontend
npm start
# O
npx expo start --web
```

**Visita**: http://localhost:19006

**Test:**
1. Register con email/password
2. Verifica tokens se guardan
3. Refresh app y verifica tokens persisten
4. Logout y verifica tokens se borran
5. Login y verifica redirect a home
6. Upload foto
7. Ver lista de fotos

---

## Checklist de Testing Completo

### Antes de Docker
- [ ] Usuario levanta Docker Desktop (REQUERIDO)
- [ ] Verifica `docker version` funciona

### Fases 1-2: Environment
- [ ] `npm run docker:up` completa exitosamente
- [ ] Logs muestran todos los servicios levantando
- [ ] No hay errores críticos

### Fase 3: Health
- [ ] Health endpoint responde 200

### Fase 4: JWT Auth
- [ ] Register crea usuario con token
- [ ] Login con credenciales correctas funciona
- [ ] Login con credenciales incorrectas rechaza
- [ ] Tokens son JWTs válidos

### Fase 5: Photos
- [ ] Upload foto con JWT token
- [ ] GET /photos lista fotos del usuario
- [ ] DELETE /photos/{id} borra foto del usuario

### Fase 6: Socket.io
- [ ] Frontend conecta a Socket.io sin errores
- [ ] Logs muestran "Redis adapter connected"

### Fase 7: Database
- [ ] PostgreSQL tiene usuarios con password_hash
- [ ] Usuarios registrados aparecen en BD

### Fase 8: Redis
- [ ] Redis responde PONG

### Frontend Manual
- [ ] Register flow completo funciona
- [ ] Login/logout funciona
- [ ] Tokens persisten al refresh
- [ ] Photo upload funciona

---

## Próximos Pasos

Si todo pasa ✅:
1. Documentar resultados
2. Commit con "Session 8: Local testing verification complete"
3. Proceder con production deployment

Si hay bugs 🐛:
1. Documentar error específico
2. Crear fixes localmente
3. Re-test para validar
4. Commit fixes
5. Deployment cuando todo esté listo

---

**Status**: Listos para empezar. Necesita que levantes Docker Desktop primero.
