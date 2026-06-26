# Session 8 - Quick Testing Checklist

## 🚀 Instrucciones Rápidas

### PASO 1: Levanta Docker Desktop
⏸️ **PAUSA AQUÍ** - Abre Docker Desktop (busca en Windows → Docker)
- Espera 30-60 segundos a que esté listo
- Vuelve cuando veas la ballena Docker en system tray

---

### PASO 2: Inicia los servicios
```bash
cd c:\code\freematch-workspace
npm run docker:up
```

✅ Espera a ver estas líneas (puede tomar 15-30 seg):
```
backend           | FreeMatch backend running on port 3000
postgres_1        | database system is ready to accept connections
redis_1           | * Ready to accept connections
```

**En otra ventana, abre logs:**
```bash
npm run docker:logs
```

---

## 🧪 Tests Rápidos (Copia/Pega en Terminal)

### Test 1: Health Endpoint ✅ (2 min)
```bash
curl http://localhost:3000/health
```
**Resultado esperado**: 200 OK

---

### Test 2: Register Usuario ✅ (2 min)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123!","born_date":"2000-01-01"}'
```

**Esperado**:
```json
{
  "userId":"<uuid>",
  "email":"test@example.com",
  "token":"<jwt>",
  "refreshToken":"<jwt>"
}
```

✏️ **Guarda el `token` para los próximos tests**

---

### Test 3: Login ✅ (2 min)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

**Esperado**: Token válido (igual que register)

---

### Test 4: Login Incorrecto ✅ (1 min)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"WRONG"}'
```

**Esperado**: 401 error "Invalid email or password"

---

### Test 5: Socket.io Connection ✅ (3 min)
1. Abre navegador: `http://localhost:19006`
2. Abre DevTools (F12)
3. Ve a Console tab
4. Busca mensaje de conexión (sin CORS errors)

**Esperado**: `Socket.io connected` o similar (sin red X)

---

### Test 6: Base de Datos ✅ (2 min)
```bash
docker-compose exec postgres psql -U postgres -d freematch -c "SELECT email, name FROM users LIMIT 5;"
```

**Esperado**: Ver usuario `test@example.com` en la lista

---

### Test 7: Redis ✅ (1 min)
```bash
docker-compose exec redis redis-cli PING
```

**Esperado**: `PONG`

---

## 🛑 Posibles Problemas

| Problema | Causa Común | Solución |
|----------|------------|----------|
| `docker version` no funciona | Docker Desktop no está abierto | Abre Docker Desktop |
| `npm run docker:up` falla | Puertos ocupados | `npm run docker:down` primero |
| 401 en login | JWT_SECRET no configurado | Está ok para local (default usado) |
| CORS error en frontend | Backend bloqueando origen | Revisar index.ts cors config |
| Socket.io no conecta | Redis no levantó | Esperar más, verificar logs |

---

## ✅ Checklist Final

- [ ] Docker Desktop está abierto y funcionando
- [ ] `npm run docker:up` completó exitosamente
- [ ] Health endpoint responde 200
- [ ] Register crea usuario con token
- [ ] Login funciona con credenciales correctas
- [ ] Login rechaza credenciales incorrectas
- [ ] Socket.io conecta sin errores
- [ ] Base de datos tiene usuarios creados
- [ ] Redis responde PONG

---

## 📝 Si algo falla:

1. Anota el error exacto
2. Verifica logs: `npm run docker:logs`
3. Avísame qué test falló y qué error viste

---

**¿Listo?** Levanta Docker Desktop y dime cuando esté abierto.
