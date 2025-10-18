# 🚀 INSTRUCCIONES RÁPIDAS DE DEPLOYMENT

## 📂 Archivos Abiertos en VS Code

1. **mercadopago-money-out/index.ts** - Procesa retiros con MercadoPago
2. **withdrawal-webhook/index.ts** - Recibe confirmaciones de MercadoPago
3. **DEPLOYMENT_GUIDE.md** - Guía completa de deployment

---

## ⚡ PASOS RÁPIDOS (5 minutos)

### 1️⃣ Ir al Dashboard de Supabase

**URL directo a Edge Functions:**
https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions

---

### 2️⃣ Crear Primera Función: mercadopago-money-out

1. Click **"Create a new function"**
2. **Name**: `mercadopago-money-out`
3. **Copiar TODO el contenido** del archivo abierto en VS Code:
   - `/home/edu/autorenta/supabase/functions/mercadopago-money-out/index.ts`
4. **Pegar** en el editor de Supabase
5. Click **"Deploy function"**

---

### 3️⃣ Crear Segunda Función: withdrawal-webhook

1. Click **"Create a new function"** (de nuevo)
2. **Name**: `withdrawal-webhook`
3. **Copiar TODO el contenido** del archivo abierto en VS Code:
   - `/home/edu/autorenta/supabase/functions/withdrawal-webhook/index.ts`
4. **Pegar** en el editor de Supabase
5. Click **"Deploy function"**

---

### 4️⃣ Configurar Secret de MercadoPago

**URL directo a Secrets:**
https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/vault

1. Click **"New secret"**
2. **Name**: `MERCADOPAGO_ACCESS_TOKEN`
3. **Value**: Tu Access Token de MercadoPago
   - Obtenerlo de: https://www.mercadopago.com.ar/developers/panel
   - Ir a tu aplicación → Credenciales → **Access Token de Producción**
4. Click **"Add new secret"**

---

### 5️⃣ Configurar Webhook en MercadoPago

1. Ir a https://www.mercadopago.com.ar/developers/panel
2. Seleccionar tu aplicación
3. Ir a **"Webhooks"**
4. Click **"Agregar nueva URL"**
5. Pegar esta URL:
   ```
   https://obxvffplochgeiclibng.supabase.co/functions/v1/withdrawal-webhook
   ```
6. Seleccionar eventos:
   - ✅ `money_requests`
7. Click **"Guardar"**

---

## ✅ VERIFICACIÓN

Después de deployar, verifica que las funciones respondan:

**mercadopago-money-out:**
```
https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-money-out
```
- Debería responder con error 400 "Missing required field" (normal, significa que está deployada)

**withdrawal-webhook:**
```
https://obxvffplochgeiclibng.supabase.co/functions/v1/withdrawal-webhook
```
- Debería responder con "OK" (normal)

---

## 🎯 URLs DE REFERENCIA

| Recurso | URL |
|---------|-----|
| **Edge Functions Dashboard** | https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions |
| **Secrets Vault** | https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/vault |
| **MercadoPago Developers** | https://www.mercadopago.com.ar/developers/panel |
| **Database (verificar datos)** | https://supabase.com/dashboard/project/obxvffplochgeiclibng/editor |

---

## 📊 ESTADO ACTUAL DEL SISTEMA

| Componente | Estado |
|------------|--------|
| ✅ Tablas de Base de Datos | Configuradas |
| ✅ Funciones RPC | Configuradas |
| ✅ Triggers Automáticos | Activados |
| ❌ Edge Function: mercadopago-money-out | **FALTA DEPLOY** |
| ❌ Edge Function: withdrawal-webhook | **FALTA DEPLOY** |
| ❓ Secret: MERCADOPAGO_ACCESS_TOKEN | Verificar |
| ❓ Webhook en MercadoPago | Verificar |

---

## 🚨 IMPORTANTE

**El sistema de retiros automáticos YA ESTÁ ACTIVADO**, pero NO funcionará hasta que:
1. ✅ Deploys las 2 Edge Functions
2. ✅ Configures el Secret de MercadoPago
3. ✅ Configures el Webhook en MercadoPago

**Una vez completes estos 3 pasos:**
- Los usuarios podrán solicitar retiros desde el frontend
- Los retiros se procesarán **automáticamente** (sin aprobación de admin)
- El dinero se transferirá a la cuenta bancaria del usuario
- Todo en menos de 1 minuto

---

## 📝 CHECKLIST DE DEPLOYMENT

- [ ] Deploy Edge Function: mercadopago-money-out
- [ ] Deploy Edge Function: withdrawal-webhook
- [ ] Configurar Secret: MERCADOPAGO_ACCESS_TOKEN
- [ ] Configurar Webhook en MercadoPago
- [ ] Probar retiro de prueba (pequeño monto)
- [ ] Verificar logs en Dashboard
- [ ] Confirmar que el dinero llegó a la cuenta

---

## 🆘 AYUDA

Si algo falla:
1. Ver logs: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions
2. Revisar la guía completa: `/home/edu/autorenta/DEPLOYMENT_GUIDE.md`
3. Verificar datos de prueba en la DB

**Última actualización**: 2025-10-18
