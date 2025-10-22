# 🏦 Sistema Completo de Depósitos MercadoPago

## 📊 Estado Actual: ✅ TOTALMENTE FUNCIONAL

### Componentes Desplegados

| Componente | Tipo | URL | Estado |
|------------|------|-----|--------|
| **Webhook Handler** | Edge Function | `/functions/v1/mercadopago-webhook` | ✅ Activo |
| **Polling Automático** | Edge Function + Cron | `/functions/v1/mercadopago-poll-pending-payments` | ✅ Activo (cada 3 min) |
| **Confirmación Admin** | SQL Function | `wallet_confirm_deposit_admin()` | ✅ Desplegado |
| **Retry Manual** | Edge Function | `/functions/v1/mercadopago-retry-failed-deposits` | ✅ Disponible |

---

## 🔄 Flujo de Procesamiento de Pagos

### Flujo Normal (Webhook)

```mermaid
Usuario → [Crea Depósito] → DB (pending)
  ↓
Usuario → [Completa Pago en MP] → MercadoPago API
  ↓
MercadoPago → [Envía Webhook] → Edge Function
  ↓
Edge Function → [Busca por external_reference] → DB
  ↓
Edge Function → [Llama wallet_confirm_deposit_admin()] → DB (completed)
  ↓
Usuario → [Ve fondos acreditados] ✅
```

### Flujo de Respaldo (Polling)

```mermaid
Cron Job (cada 3 min) → [Trigger] → Polling Function
  ↓
Polling → [Busca transacciones pending >2 min] → DB
  ↓
Polling → [Consulta MP API por external_reference] → MercadoPago
  ↓
MercadoPago → [Retorna status del pago] → Polling
  ↓
Si approved → [Llama wallet_confirm_deposit_admin()] → DB (completed)
Si rejected → [Marca como failed] → DB (failed)
Si pending → [Deja para próximo ciclo] → DB (pending)
```

---

## 🛠️ Comandos de Administración

### Verificar Estado del Sistema

```bash
# Ver cron jobs activos
PGPASSWORD="ECUCONDOR08122023" psql "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "
SELECT * FROM cron.job;
"

# Ver historial de ejecuciones del cron
PGPASSWORD="ECUCONDOR08122023" psql "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "
SELECT
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = 2
ORDER BY start_time DESC
LIMIT 10;
"

# Ver transacciones pendientes
PGPASSWORD="ECUCONDOR08122023" psql "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -c "
SELECT
  id,
  user_id,
  amount,
  status,
  created_at,
  provider_metadata->'preference_id' as preference_id
FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'pending'
ORDER BY created_at DESC;
"
```

### Ejecutar Polling Manualmente

```bash
# Opción 1: Script bash
bash /home/edu/autorenta/test-poll-function.sh

# Opción 2: Curl directo
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc"

curl -X POST \
  "https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-poll-pending-payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -d '{}'
```

### Confirmar Depósito Manualmente

Si conoces el payment_id y external_reference:

```bash
PGPASSWORD="ECUCONDOR08122023" psql "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres" << 'EOF'
SELECT * FROM wallet_confirm_deposit_admin(
  'USER_ID_AQUI'::UUID,
  'TRANSACTION_ID_AQUI'::UUID,
  'PAYMENT_ID_AQUI',
  '{
    "status": "approved",
    "status_detail": "accredited",
    "payment_type_id": "account_money",
    "transaction_amount": 250.00,
    "date_approved": "2025-10-20T11:33:00.000Z",
    "manual_confirmation": true
  }'::JSONB
);
EOF
```

---

## 📈 Métricas y Monitoreo

### Tasa de Confirmación Automática

```sql
-- Ver cuántos depósitos se confirmaron automáticamente vs manual
SELECT
  CASE
    WHEN provider_metadata->>'polled_at' IS NOT NULL THEN 'Polling Automático'
    WHEN provider_metadata->>'confirmed_at' IS NOT NULL THEN 'Webhook'
    WHEN provider_metadata->>'manual_confirmation' IS NOT NULL THEN 'Manual'
    ELSE 'Desconocido'
  END as confirmation_method,
  COUNT(*) as total,
  SUM(amount) as total_amount
FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'completed'
  AND completed_at > NOW() - INTERVAL '7 days'
GROUP BY confirmation_method;
```

### Tiempo Promedio de Confirmación

```sql
SELECT
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) / 60 as avg_minutes,
  MIN(EXTRACT(EPOCH FROM (completed_at - created_at))) / 60 as min_minutes,
  MAX(EXTRACT(EPOCH FROM (completed_at - created_at))) / 60 as max_minutes
FROM wallet_transactions
WHERE type = 'deposit'
  AND status = 'completed'
  AND completed_at > NOW() - INTERVAL '7 days';
```

---

## 🚨 Troubleshooting

### Problema: Depósito no se confirma automáticamente

#### Diagnóstico:

1. **Verificar si la transacción existe:**
   ```sql
   SELECT * FROM wallet_transactions WHERE id = 'TRANSACTION_ID';
   ```

2. **Verificar si el pago existe en MercadoPago:**
   ```bash
   curl -X GET \
     "https://api.mercadopago.com/v1/payments/search?external_reference=TRANSACTION_ID" \
     -H "Authorization: Bearer APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571"
   ```

3. **Verificar logs del webhook:**
   - Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions
   - Click en "mercadopago-webhook"
   - Ver logs

4. **Verificar logs del polling:**
   - Ir a: https://supabase.com/dashboard/project/obxvffplochgeiclibng/functions
   - Click en "mercadopago-poll-pending-payments"
   - Ver logs

#### Solución:

```bash
# Ejecutar polling manualmente para forzar confirmación
bash /home/edu/autorenta/test-poll-function.sh
```

### Problema: Demasiadas transacciones pendientes sin pago

**Causa**: Usuarios que abren el link de pago pero no completan el pago.

**Solución**: Implementar limpieza automática de transacciones >24h sin pago:

```sql
-- Marcar como expiradas transacciones >24h sin pago en MercadoPago
UPDATE wallet_transactions
SET
  status = 'failed',
  provider_metadata = provider_metadata || '{"failure_reason": "expired_no_payment"}'::jsonb,
  updated_at = NOW()
WHERE type = 'deposit'
  AND status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours'
  AND NOT EXISTS (
    SELECT 1 FROM wallet_transactions wt2
    WHERE wt2.id = wallet_transactions.id
      AND wt2.provider_metadata->>'payment_id' IS NOT NULL
  );
```

---

## 🔒 Seguridad

### Variables de Entorno Requeridas

```bash
# En Supabase Edge Functions
MERCADOPAGO_ACCESS_TOKEN=APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571
SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Permisos de Base de Datos

- `wallet_confirm_deposit_admin()` solo puede ser ejecutada por `service_role`
- `trigger_poll_pending_payments()` tiene `SECURITY DEFINER`
- Cron job se ejecuta con usuario `postgres`

---

## 📝 Logs y Auditoría

Toda confirmación de depósito deja registro en `provider_metadata`:

```json
{
  "id": "130624829514",
  "status": "approved",
  "status_detail": "accredited",
  "payment_type_id": "account_money",
  "transaction_amount": 250.00,
  "date_approved": "2025-10-20T11:33:00.000Z",
  "polled_at": "2025-10-20T16:45:00.000Z",  // Si fue por polling
  "confirmed_at": "2025-10-20T11:33:05.000Z" // Si fue por webhook
}
```

---

## 🎯 Próximos Pasos Opcionales

### 1. Configurar Webhook en MercadoPago

Para habilitar confirmación inmediata:

1. Ir a: https://www.mercadopago.com.ar/developers/panel/ipn/configuration
2. Ingresar URL: `https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook`
3. Activar notificaciones para: `payment`

### 2. Dashboard de Monitoreo

Crear página en el admin panel para ver:
- Depósitos pendientes en tiempo real
- Tasa de éxito de webhooks vs polling
- Tiempo promedio de confirmación
- Alertas de pagos >10 minutos sin confirmar

### 3. Notificaciones Push

Enviar notificación al usuario cuando:
- Depósito confirmado exitosamente
- Pago rechazado por MercadoPago
- Pago pendiente >10 minutos

---

## 📞 Soporte

Para problemas con el sistema de pagos:

1. **Verificar estado del sistema**: `bash test-poll-function.sh`
2. **Revisar logs de Supabase**: Dashboard → Functions → Logs
3. **Consultar panel de MercadoPago**: https://www.mercadopago.com.ar/movements
4. **Contactar soporte técnico**: Con el `transaction_id` y `payment_id`

---

## ✅ Checklist de Verificación

- [x] Webhook desplegado y respondiendo
- [x] Polling automático configurado (cada 3 min)
- [x] Cron job activo en base de datos
- [x] Función de confirmación admin creada
- [x] Sistema probado con transacciones reales
- [ ] Webhook configurado en panel MercadoPago (opcional pero recomendado)
- [ ] Dashboard de monitoreo implementado (opcional)
- [ ] Limpieza automática de transacciones expiradas (opcional)

---

**Última actualización**: 2025-10-20
**Versión**: 2.0 - Sistema de Polling Activo
**Estado**: ✅ Producción
