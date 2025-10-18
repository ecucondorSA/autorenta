# 🚀 Guía de Deployment - Edge Functions para Retiros

## 📍 Dashboard de Supabase
URL del proyecto: https://supabase.com/dashboard/project/obxvffplochgeiclibng

---

## 🔧 Paso 1: Configurar Secret de MercadoPago

### 1.1 Obtener Access Token
1. Ir a https://www.mercadopago.com.ar/developers/panel
2. Seleccionar/crear aplicación
3. Ir a "Credenciales"
4. Copiar **Access Token de Producción**

### 1.2 Configurar Secret en Supabase
1. En el Dashboard: https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/vault
2. Click en **"New secret"**
3. Nombre: `MERCADOPAGO_ACCESS_TOKEN`
4. Valor: Pegar tu Access Token
5. Click **"Add new secret"**

---

## 📦 Paso 2: Deploy Edge Function - mercadopago-money-out

### 2.1 Ir a Edge Functions
1. En el Dashboard: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions
2. Click en **"Create a new function"**

### 2.2 Configuración
- **Name**: `mercadopago-money-out`
- **Description**: Procesa retiros usando MercadoPago Money Out API

### 2.3 Código
Copiar el contenido del archivo:
```
/home/edu/autorenta/supabase/functions/mercadopago-money-out/index.ts
```

Ver el código completo al final de este documento en la sección "CÓDIGO: mercadopago-money-out"

### 2.4 Deploy
Click en **"Deploy function"**

---

## 📦 Paso 3: Deploy Edge Function - withdrawal-webhook

### 3.1 Crear Nueva Función
1. En Edge Functions, click **"Create a new function"**

### 3.2 Configuración
- **Name**: `withdrawal-webhook`
- **Description**: Recibe notificaciones IPN de MercadoPago

### 3.3 Código
Copiar el contenido del archivo:
```
/home/edu/autorenta/supabase/functions/withdrawal-webhook/index.ts
```

Ver el código completo al final de este documento en la sección "CÓDIGO: withdrawal-webhook"

### 3.4 Deploy
Click en **"Deploy function"**

---

## 🔗 Paso 4: Configurar Webhook en MercadoPago

### 4.1 URL del Webhook
```
https://obxvffplochgeiclibng.supabase.co/functions/v1/withdrawal-webhook
```

### 4.2 Configuración en MercadoPago
1. Ir a https://www.mercadopago.com.ar/developers/panel
2. Seleccionar tu aplicación
3. Ir a **"Webhooks"**
4. Click **"Agregar nueva URL"**
5. Pegar la URL del webhook
6. Seleccionar eventos:
   - ✅ `money_requests` (transferencias)
7. Click **"Guardar"**

---

## ✅ Paso 5: Verificar URLs de las Funciones

Después del deploy, las funciones estarán disponibles en:

```
Process Withdrawal:
https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-money-out

Webhook:
https://obxvffplochgeiclibng.supabase.co/functions/v1/withdrawal-webhook
```

---

## 🧪 Paso 6: Testing

### Test con CURL (opcional)
```bash
# Test de process withdrawal (necesita withdrawal_request_id aprobado)
curl -X POST \
  https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-money-out \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"withdrawal_request_id": "UUID_DE_RETIRO_APROBADO"}'
```

### Ver Logs
1. En el Dashboard: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions
2. Click en la función
3. Ver tab **"Logs"**

---

## 📋 Checklist de Deployment

- [ ] Obtener Access Token de MercadoPago
- [ ] Configurar secret `MERCADOPAGO_ACCESS_TOKEN` en Supabase
- [ ] Deploy función `mercadopago-money-out`
- [ ] Deploy función `withdrawal-webhook`
- [ ] Configurar webhook URL en MercadoPago panel
- [ ] Verificar funciones están activas
- [ ] Probar con retiro de prueba
- [ ] Verificar logs

---

## 🔍 Troubleshooting

### Error: "MERCADOPAGO_ACCESS_TOKEN is not defined"
**Solución**: Verificar que el secret esté configurado en https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/vault

### Error: "Withdrawal request not found"
**Causa**: El retiro no está en estado `approved`
**Solución**: Aprobar el retiro primero usando `wallet_approve_withdrawal()`

### Webhook no se ejecuta
**Verificar**:
1. URL configurada correctamente en MercadoPago
2. Evento `money_requests` seleccionado
3. Función deployada y activa

---

# 📄 CÓDIGO COMPLETO

## CÓDIGO: mercadopago-money-out

Archivo: `/home/edu/autorenta/supabase/functions/mercadopago-money-out/index.ts`

```typescript
// VER ARCHIVO: supabase/functions/mercadopago-money-out/index.ts
// Ejecutar: cat /home/edu/autorenta/supabase/functions/mercadopago-money-out/index.ts
```

## CÓDIGO: withdrawal-webhook

Archivo: `/home/edu/autorenta/supabase/functions/withdrawal-webhook/index.ts`

```typescript
// VER ARCHIVO: supabase/functions/withdrawal-webhook/index.ts
// Ejecutar: cat /home/edu/autorenta/supabase/functions/withdrawal-webhook/index.ts
```

---

## 📚 Documentación Adicional

- [MercadoPago Money Out](https://www.mercadopago.com.ar/developers/es/docs/money-out)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Webhook IPN MercadoPago](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)

---

**Última actualización**: 2025-10-18
