# Testing Manual - URLs para Testear en el Browser

## 🌐 URLs de Testing Local

**Cuando levantes con `npm run docker:up`:**

### Backend
```
Health: http://localhost:3000/health
API Base: http://localhost:3000/api
```

### Frontend (Expo Web)
```
http://localhost:19006
```

---

## 🧪 Tests con CURL (Terminal)

### 1. Health Check
```bash
curl http://localhost:3000/health
```
**Respuesta esperada**: `{"status":"ok"}`

---

### 2. Register User
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

**Respuesta esperada**: 
```json
{
  "userId": "uuid-here",
  "email": "test@example.com",
  "name": "Test User",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Guarda el `token` para los próximos tests**

---

### 3. Login User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123!"
  }'
```

**Respuesta esperada**: Token JWT válido (status 200)

---

### 4. Login con Credenciales Incorrectas
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"WRONG"
  }'
```

**Respuesta esperada**: Status 401, error message

---

### 5. Upload Foto (con JWT Token)

Primero necesitas una imagen. Si no tienes, puedes:
- Descargar una imagen de prueba
- O crear una imagen dummy

```bash
curl -X POST http://localhost:3000/api/photos \
  -H "Authorization: Bearer <TU_TOKEN_AQUI>" \
  -F "file=@/ruta/a/imagen.jpg" \
  -F "caption=Mi primera foto"
```

**Respuesta esperada**: Status 201 + objeto photo

---

### 6. Listar Fotos del Usuario
```bash
curl http://localhost:3000/api/photos \
  -H "Authorization: Bearer <TU_TOKEN_AQUI>"
```

**Respuesta esperada**: Array de fotos del usuario

---

### 7. Borrar Foto
```bash
curl -X DELETE http://localhost:3000/api/photos/<PHOTO_ID> \
  -H "Authorization: Bearer <TU_TOKEN_AQUI>"
```

**Respuesta esperada**: Status 200 + confirmación

---

## 🌍 Testing en Browser (Frontend)

### 1. Abrir la Aplicación
```
http://localhost:19006
```

### 2. Registrar Nuevo Usuario
1. Haz click en "Create Account"
2. Ingresa:
   - Name: Tu nombre
   - Email: tu@email.com
   - Password: Test123!
   - Confirm Password: Test123!
   - Born Date: 2000-01-01
3. Haz click en "Register"
4. **Verifica**: Deberías redirigirte a Home screen

### 3. Verificar Token Guardado
1. Abre DevTools (F12)
2. Ve a Console
3. Ejecuta:
```javascript
// Ver tokens guardados
AsyncStorage.getItem('token').then(token => console.log('Token:', token))
AsyncStorage.getItem('refreshToken').then(rt => console.log('Refresh Token:', rt))
```

### 4. Logout y Verificar Tokens se Borran
1. Ve a Home screen
2. Haz click en logout button
3. Abre DevTools y verifica que los tokens se borraron:
```javascript
AsyncStorage.getItem('token').then(token => console.log('Token:', token))
// Debería devolver null
```

### 5. Login Nuevamente
1. Email: tu@email.com
2. Password: Test123!
3. Haz click en "Login"
4. **Verifica**: Redirige a Home screen correctamente

### 6. Subir Foto
1. En Home, ve a pestaña "📸 Photos"
2. Haz click en "Pick Image"
3. Selecciona una imagen de tu dispositivo
4. Haz click en "Upload Photo"
5. **Verifica**: Foto aparece en la galería

### 7. Ver Foto
1. La foto debería aparecer en la galería
2. Verifica que se vea correctamente

### 8. Borrar Foto
1. Haz click en "Delete" debajo de la foto
2. Confirma el diálogo
3. **Verifica**: Foto desaparece de la galería

---

## 🔍 DevTools Testing

### Ver Solicitudes de Red
1. Abre DevTools (F12)
2. Ve a pestaña "Network"
3. Realiza un login
4. **Verifica**:
   - Request a `/api/auth/login` con status 200
   - Response contiene token JWT

### Ver Console Logs
1. Ve a pestaña "Console"
2. Realiza un login
3. **Busca**: Mensajes de conexión a Socket.io (no debería haber errores CORS)

### Ver Storage
1. Ve a pestaña "Application" → "Local Storage"
2. **Verifica**: Que `@freematch/token` está guardado con el JWT

---

## 🔑 URLs de Debugging

### Socket.io Status
En el navegador, abre Console y ejecuta:
```javascript
// Verificar si socket está conectado
console.log('Socket connected:', socket?.connected)
```

### Ver Redux State
```javascript
// Si tienes Redux DevTools
window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
```

---

## 📊 Testing Endpoints Rápido

### Para testear rápido TODOS los endpoints:

```bash
#!/bin/bash

# 1. Health
curl http://localhost:3000/health
echo ""

# 2. Register
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Test123!","born_date":"2000-01-01"}' \
  | jq -r '.token')
echo "Token: $TOKEN"

# 3. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'
echo ""

# 4. List Photos
curl http://localhost:3000/api/photos \
  -H "Authorization: Bearer $TOKEN"
echo ""
```

---

## ✅ Checklist de Testing Manual

- [ ] Health endpoint responde (status 200)
- [ ] Puedo registrar usuario nuevo
- [ ] Recibo JWT token válido
- [ ] Puedo hacer login con credenciales correctas
- [ ] Login rechaza credenciales incorrectas (401)
- [ ] Tokens se guardan en AsyncStorage
- [ ] Tokens se restauran al refresh app
- [ ] Logout borra tokens
- [ ] Puedo subir foto (con JWT)
- [ ] Puedo ver foto en galería
- [ ] Puedo borrar foto
- [ ] Socket.io conecta sin errores CORS
- [ ] No hay errores en console

---

## 🚨 Problemas Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| 401 Unauthorized | Token inválido/expirado | Registra usuario nuevo, obtén token nuevo |
| CORS Error | Frontend origin no permitido | Verifica CORS_ORIGIN en backend |
| Photo upload falla | JWT token no enviado | Asegúrate de pasar `Authorization: Bearer <token>` |
| Socket.io no conecta | Redis/Socket.io problema | Verifica logs: `npm run docker:logs` |
| App no carga | Puerto 19006 ocupado | Mata el proceso anterior: `lsof -ti:19006 \| xargs kill` |

---

## 🎯 Testing en Producción

**Mismo que arriba pero reemplaza**:
```
http://localhost:3000  →  https://tu-backend.railway.app
http://localhost:19006 →  https://tu-frontend.vercel.app
```

**Ejemplo**:
```bash
# Production health check
curl https://tu-backend.railway.app/health

# Production login
curl -X POST https://tu-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test123!"}'
```

---

## 📝 Notas Importantes

1. **JWT_SECRET**: En producción, DEBE estar configurado como variable de entorno
2. **CORS**: En producción, CORS_ORIGIN debe ser exactamente tu URL de Vercel
3. **Tokens**: Válidos por 24 horas (JWT_EXPIRY)
4. **Refresh Tokens**: Válidos por 7 días
5. **Fotos**: Guardadas en S3 (LocalStack en dev, AWS S3 en prod)

---

**Última actualización**: June 26, 2026  
**Status**: Ready for production testing
