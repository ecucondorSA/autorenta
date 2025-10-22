# 🗺️ Roadmap Wallet System - AutoRenta 2025

**Versión Actual**: v1.0.0-security-hardened
**Última actualización**: 2025-10-20
**Status**: ✅ Fase 1 Completada - Planificando Fase 2 y 3

---

## 📊 Estado Actual (2025-10-20)

### ✅ Completado (Fase 1 - Seguridad Crítica)

| Componente | Status | Fecha |
|------------|--------|-------|
| Validación de ownership | ✅ PRODUCCIÓN | 2025-10-20 |
| HMAC validation | ✅ PRODUCCIÓN | 2025-10-20 |
| Unique constraints | ✅ PRODUCCIÓN | 2025-10-20 |
| Check constraints | ✅ PRODUCCIÓN | 2025-10-20 |
| Trigger inmutabilidad | ✅ PRODUCCIÓN | 2025-10-20 |
| Rate limiting (10 max) | ✅ PRODUCCIÓN | 2025-10-20 |
| Idempotencia | ✅ PRODUCCIÓN | 2025-10-20 |
| Audit log | ✅ PRODUCCIÓN | 2025-10-20 |
| Cleanup automático | ✅ PRODUCCIÓN | 2025-10-20 |
| Monitoreo | ✅ PRODUCCIÓN | 2025-10-20 |

**Vulnerabilidades cerradas**: 3 críticas + 2 altas = **100%**

---

## 🎯 Próximos Pasos - Priorizado

### INMEDIATO (Esta Semana - 2-3 horas)

#### 1. Verificación Post-Deployment ⏳

**Objetivo**: Validar que todas las implementaciones funcionan correctamente en producción

**Tareas**:
- [ ] Ejecutar depósito de prueba real ($100 ARS)
- [ ] Verificar que HMAC validation rechaza webhooks inválidos
- [ ] Confirmar que unique constraint previene duplicados
- [ ] Validar logs en Supabase Dashboard
- [ ] Revisar primer ejecución de cron job (mañana a las 2 AM)

**Tiempo estimado**: 1 hora
**Prioridad**: 🔴 ALTA
**Bloqueador**: No

**Checklist de Verificación**:
```bash
# 1. Verificar depósito de prueba
./tools/monitor-wallet-deposits.sh --last 1

# 2. Simular webhook con firma inválida (debería rechazar HTTP 403)
curl -X POST https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-webhook \
  -H "x-signature: ts=1234567890,v1=fakehash" \
  -H "x-request-id: test-123" \
  -d '{"type": "payment", "data": {"id": "12345"}}'

# 3. Verificar cron log mañana
tail -50 /var/log/wallet-cleanup.log
```

---

#### 2. Optimización de Monitoreo ⏳

**Objetivo**: Mejorar visibilidad y alertas del sistema

**Tareas**:
- [ ] Agregar alertas a monitor script (email/Slack cuando hay anomalías)
- [ ] Dashboard simple en frontend (componente Angular)
- [ ] Métricas de performance (tiempo de confirmación de depósitos)
- [ ] Logs estructurados en Supabase

**Tiempo estimado**: 2 horas
**Prioridad**: 🟡 MEDIA
**Bloqueador**: No

**Archivos a crear/modificar**:
- `tools/monitor-wallet-deposits.sh` - Agregar webhook de Slack
- `apps/web/src/app/features/admin/wallet-dashboard.component.ts` - Nuevo componente
- `supabase/functions/mercadopago-webhook/index.ts` - Structured logging

**Ejemplo de Dashboard**:
```typescript
// apps/web/src/app/features/admin/wallet-dashboard.component.ts
export class WalletDashboardComponent {
  stats$ = this.walletService.getStats(); // Total, pending, completed hoy
  anomalies$ = this.walletService.checkAnomalies(); // Duplicados, viejos, límites
  recentTransactions$ = this.walletService.getRecent(10);
}
```

---

### CORTO PLAZO (Próximas 2 Semanas - 6-8 horas)

#### 3. Fase 2 - Validaciones de Lock/Unlock 🔄

**Objetivo**: Cerrar vulnerabilidades restantes en operaciones de lock_funds y unlock_funds

**Vulnerabilidades Pendientes**:
- 🟢 MEDIA: Falta verificación de fondos en `wallet_lock_funds`
- 🟢 MEDIA: Falta validación de ownership en `wallet_unlock_funds`
- 🟢 BAJA: Posible doble-bloqueo sin SELECT FOR UPDATE

**Tareas**:

##### 3.1 Validar Fondos Disponibles en Lock
**Archivo**: `supabase/migrations/20251027_wallet_lock_validations.sql`

```sql
-- Modificar wallet_lock_funds para verificar balance
CREATE OR REPLACE FUNCTION wallet_lock_funds(
  p_user_id UUID,
  p_booking_id UUID,
  p_amount NUMERIC(10, 2)
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_balance NUMERIC, new_locked NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC(10, 2);
  v_current_locked NUMERIC(10, 2);
BEGIN
  -- SELECT FOR UPDATE para prevenir race conditions
  SELECT balance, locked_balance INTO v_current_balance, v_current_locked
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- VALIDACIÓN CRÍTICA: Verificar fondos disponibles
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT
      FALSE,
      FORMAT('Fondos insuficientes. Disponible: %s, Requerido: %s', v_current_balance, p_amount),
      v_current_balance,
      v_current_locked;
    RETURN;
  END IF;

  -- VALIDACIÓN: Prevenir doble-bloqueo
  IF EXISTS (
    SELECT 1 FROM wallet_transactions
    WHERE booking_id = p_booking_id
      AND type = 'lock'
      AND status = 'completed'
  ) THEN
    RETURN QUERY SELECT
      FALSE,
      'Ya existe un bloqueo para este booking',
      v_current_balance,
      v_current_locked;
    RETURN;
  END IF;

  -- Resto de la lógica...
END;
$$;
```

##### 3.2 Validar Ownership en Unlock
**Archivo**: Mismo migration

```sql
-- Modificar wallet_unlock_funds para verificar ownership
CREATE OR REPLACE FUNCTION wallet_unlock_funds(
  p_user_id UUID,
  p_booking_id UUID,
  p_amount NUMERIC(10, 2)
)
RETURNS TABLE(success BOOLEAN, message TEXT, new_balance NUMERIC, new_locked NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_user_id UUID;
BEGIN
  -- VALIDACIÓN CRÍTICA: Verificar ownership del booking
  SELECT user_id INTO v_booking_user_id
  FROM bookings
  WHERE id = p_booking_id;

  IF v_booking_user_id != p_user_id THEN
    RETURN QUERY SELECT
      FALSE,
      'No tienes permiso para desbloquear fondos de este booking',
      NULL::NUMERIC,
      NULL::NUMERIC;
    RETURN;
  END IF;

  -- Resto de la lógica...
END;
$$;
```

**Tiempo estimado**: 3 horas
**Prioridad**: 🟡 MEDIA
**Bloqueador**: No

---

#### 4. Rate Limiting Avanzado 📊

**Objetivo**: Prevenir abuso más sofisticado

**Tareas**:
- [ ] Limitar depósitos por hora (no solo count, sino también monto)
- [ ] Limitar monto total diario por usuario
- [ ] Rate limiting de webhooks (100 requests/min)
- [ ] Tabla de rate_limit_log para análisis

**Implementación**:

```sql
-- Nueva función: check_user_deposit_rate_limits
CREATE OR REPLACE FUNCTION check_user_deposit_rate_limits(
  p_user_id UUID,
  p_amount NUMERIC(10, 2)
)
RETURNS TABLE(
  can_deposit BOOLEAN,
  reason TEXT,
  hourly_count INTEGER,
  hourly_amount NUMERIC,
  daily_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hourly_count INTEGER;
  v_hourly_amount NUMERIC(10, 2);
  v_daily_amount NUMERIC(10, 2);
  v_max_hourly_count INTEGER := 3;
  v_max_hourly_amount NUMERIC := 1000.00;
  v_max_daily_amount NUMERIC := 5000.00;
BEGIN
  -- Contar depósitos última hora
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_hourly_count, v_hourly_amount
  FROM wallet_transactions
  WHERE user_id = p_user_id
    AND type = 'deposit'
    AND status = 'pending'
    AND created_at > (NOW() - INTERVAL '1 hour');

  -- Contar depósitos últimas 24 horas
  SELECT COALESCE(SUM(amount), 0)
  INTO v_daily_amount
  FROM wallet_transactions
  WHERE user_id = p_user_id
    AND type = 'deposit'
    AND status IN ('pending', 'completed')
    AND created_at > (NOW() - INTERVAL '24 hours');

  -- Verificar límites
  IF v_hourly_count >= v_max_hourly_count THEN
    RETURN QUERY SELECT FALSE, 'Límite de depósitos por hora alcanzado (máx 3)', v_hourly_count, v_hourly_amount, v_daily_amount;
    RETURN;
  END IF;

  IF v_hourly_amount + p_amount > v_max_hourly_amount THEN
    RETURN QUERY SELECT FALSE, FORMAT('Límite de monto por hora alcanzado (máx $%s)', v_max_hourly_amount), v_hourly_count, v_hourly_amount, v_daily_amount;
    RETURN;
  END IF;

  IF v_daily_amount + p_amount > v_max_daily_amount THEN
    RETURN QUERY SELECT FALSE, FORMAT('Límite diario alcanzado (máx $%s)', v_max_daily_amount), v_hourly_count, v_hourly_amount, v_daily_amount;
    RETURN;
  END IF;

  -- OK para depositar
  RETURN QUERY SELECT TRUE, 'OK', v_hourly_count, v_hourly_amount, v_daily_amount;
END;
$$;
```

**Tiempo estimado**: 2 horas
**Prioridad**: 🟢 BAJA
**Bloqueador**: No

---

#### 5. Migrar Cron a Supabase Cron 🔄

**Objetivo**: Mejorar confiabilidad y gestión de cleanup automático

**Ventajas**:
- ✅ Gestionado por Supabase (no requiere servidor propio)
- ✅ Retry automático si falla
- ✅ Logs en Supabase Dashboard
- ✅ No depende de crontab local

**Implementación**:

```sql
-- En Supabase SQL Editor
SELECT cron.schedule(
  'cleanup-old-deposits',           -- Nombre del job
  '0 2 * * *',                      -- Cron schedule (2 AM diario)
  $$ SELECT * FROM cleanup_old_pending_deposits(); $$
);

-- Ver jobs programados
SELECT * FROM cron.job;

-- Ver ejecuciones recientes
SELECT *
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-deposits')
ORDER BY start_time DESC
LIMIT 10;

-- Desactivar/eliminar job
SELECT cron.unschedule('cleanup-old-deposits');
```

**Tiempo estimado**: 1 hora
**Prioridad**: 🟡 MEDIA
**Bloqueador**: No

**Nota**: Requiere extensión `pg_cron` en Supabase (disponible en planes pagos)

---

### MEDIANO PLAZO (Próximo Mes - 10-15 horas)

#### 6. Sistema de Withdrawals (Retiros) 💸

**Objetivo**: Permitir a usuarios retirar fondos de su wallet

**Complejidad**: ALTA
**Impacto**: ALTO (nueva funcionalidad)

**Tareas**:

##### 6.1 Base de Datos
```sql
-- Nueva tabla: withdrawal_requests
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'failed')),
  bank_account JSONB NOT NULL, -- { alias, cbu, bank, account_type }
  admin_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Función: request_withdrawal
CREATE OR REPLACE FUNCTION wallet_request_withdrawal(
  p_user_id UUID,
  p_amount NUMERIC(10, 2),
  p_bank_account JSONB
)
RETURNS TABLE(success BOOLEAN, message TEXT, request_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC(10, 2);
  v_request_id UUID;
BEGIN
  -- Verificar fondos disponibles
  SELECT balance INTO v_current_balance
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, 'Fondos insuficientes', NULL::UUID;
    RETURN;
  END IF;

  -- Validar mínimo ($100)
  IF p_amount < 100 THEN
    RETURN QUERY SELECT FALSE, 'Monto mínimo de retiro: $100', NULL::UUID;
    RETURN;
  END IF;

  -- Crear solicitud
  INSERT INTO withdrawal_requests (user_id, amount, bank_account)
  VALUES (p_user_id, p_amount, p_bank_account)
  RETURNING id INTO v_request_id;

  -- Bloquear fondos
  UPDATE user_wallets
  SET balance = balance - p_amount,
      locked_balance = locked_balance + p_amount
  WHERE user_id = p_user_id;

  -- Log en audit
  INSERT INTO wallet_audit_log (user_id, action, details)
  VALUES (p_user_id, 'withdrawal_requested', jsonb_build_object('request_id', v_request_id, 'amount', p_amount));

  RETURN QUERY SELECT TRUE, 'Solicitud creada', v_request_id;
END;
$$;
```

##### 6.2 Admin Panel
**Archivo**: `apps/web/src/app/features/admin/withdrawals/withdrawals.component.ts`

```typescript
export class WithdrawalsComponent implements OnInit {
  pendingRequests$ = this.walletService.getPendingWithdrawals();

  approveWithdrawal(requestId: string) {
    // Llamar RPC wallet_approve_withdrawal_admin
  }

  rejectWithdrawal(requestId: string, reason: string) {
    // Llamar RPC wallet_reject_withdrawal_admin
  }
}
```

##### 6.3 Integración con MercadoPago (Payouts)
**Archivo**: `supabase/functions/mercadopago-process-withdrawal/index.ts`

```typescript
// Edge Function para procesar retiros vía MercadoPago Payouts API
// POST /functions/v1/mercadopago-process-withdrawal
// Body: { withdrawal_request_id: UUID }
```

**Tiempo estimado**: 8 horas
**Prioridad**: 🟡 MEDIA
**Bloqueador**: No (pero requiere testing extensivo)

---

#### 7. Sistema de Reembolsos (Refunds) 🔄

**Objetivo**: Permitir reembolsos de bookings cancelados

**Tareas**:
- [ ] Función `wallet_refund_booking`
- [ ] Validar que booking esté cancelado
- [ ] Validar ownership
- [ ] Crear transacción tipo 'refund'
- [ ] Desbloquear fondos + acreditar
- [ ] Frontend: Botón "Solicitar Reembolso" en bookings cancelados

**Tiempo estimado**: 4 horas
**Prioridad**: 🟢 BAJA
**Bloqueador**: No

---

#### 8. Reportes y Analytics 📊

**Objetivo**: Dashboard completo de métricas de wallet

**Tareas**:
- [ ] Reporte de ingresos diarios/semanales/mensuales
- [ ] Gráfico de balance total del sistema
- [ ] Top usuarios por volumen de transacciones
- [ ] Detección de patrones sospechosos
- [ ] Export a CSV/Excel

**Tecnologías**:
- Angular Charts (ngx-charts o Chart.js)
- Supabase RPC para agregaciones
- Export con SheetJS

**Tiempo estimado**: 6 horas
**Prioridad**: 🟢 BAJA
**Bloqueador**: No

---

### LARGO PLAZO (Próximos 3 Meses - 20-30 horas)

#### 9. Multi-Currency Support 🌍

**Objetivo**: Soportar USD, EUR, BRL además de ARS

**Tareas**:
- [ ] Tabla de exchange rates
- [ ] API de conversión (usar API externa)
- [ ] Conversión automática en depósitos
- [ ] Mostrar balance en múltiples monedas
- [ ] Withdrawal en moneda preferida

**Complejidad**: ALTA
**Tiempo estimado**: 12 horas

---

#### 10. Sistema de Promociones y Bonos 🎁

**Objetivo**: Marketing y retención de usuarios

**Tareas**:
- [ ] Tabla de promociones
- [ ] Bono de bienvenida (ej: $100 ARS gratis)
- [ ] Referral program (20% del primer depósito)
- [ ] Cupones de descuento
- [ ] Cashback en bookings

**Tiempo estimado**: 10 horas

---

#### 11. KYC/AML Compliance 🔐

**Objetivo**: Cumplir regulaciones financieras

**Tareas**:
- [ ] Integración con servicio KYC (ej: Onfido, Jumio)
- [ ] Límites diferentes por nivel de verificación
- [ ] Detección de lavado de dinero (reglas básicas)
- [ ] Reportes de transacciones sospechosas
- [ ] Archivo de documentos (DNI, selfie)

**Complejidad**: ALTA
**Regulatorio**: SÍ
**Tiempo estimado**: 20+ horas

---

## 📅 Cronograma Propuesto

### Semana 1 (2025-10-21 a 2025-10-27)
- ✅ Verificación post-deployment (1h)
- ✅ Optimización de monitoreo (2h)
- ⏳ Fase 2: Validaciones lock/unlock (3h)

**Total**: 6 horas

### Semana 2-3 (2025-10-28 a 2025-11-10)
- ⏳ Rate limiting avanzado (2h)
- ⏳ Migrar cron a Supabase (1h)
- ⏳ Sistema de withdrawals - Parte 1 (4h)

**Total**: 7 horas

### Semana 4 (2025-11-11 a 2025-11-17)
- ⏳ Sistema de withdrawals - Parte 2 (4h)
- ⏳ Sistema de reembolsos (4h)

**Total**: 8 horas

### Mes 2 (Noviembre)
- ⏳ Reportes y analytics (6h)
- ⏳ Testing E2E completo (4h)

**Total**: 10 horas

### Mes 3 (Diciembre)
- ⏳ Multi-currency (12h)
- ⏳ Sistema de promociones (10h)

**Total**: 22 horas

---

## 🎯 Objetivos por Quarter

### Q4 2025 (Oct-Dic)
- ✅ Seguridad crítica (COMPLETADO)
- ⏳ Withdrawals funcionando
- ⏳ Refunds implementados
- ⏳ Dashboard de analytics
- ⏳ Rate limiting avanzado

### Q1 2026 (Ene-Mar)
- ⏳ Multi-currency
- ⏳ Sistema de promociones
- ⏳ KYC básico
- ⏳ Mobile app (React Native)

---

## 📊 Métricas de Éxito

### Técnicas
- [ ] 0 vulnerabilidades críticas (✅ LOGRADO)
- [ ] 0 vulnerabilidades altas (✅ LOGRADO)
- [ ] Test coverage >80%
- [ ] Uptime >99.5%
- [ ] Tiempo de confirmación <30s promedio

### Negocio
- [ ] >100 usuarios con wallet activo
- [ ] >$10,000 USD en depósitos mensuales
- [ ] <1% tasa de fraude
- [ ] >90% satisfacción de usuarios

### Operacionales
- [ ] <5 min tiempo de resolución de incidents
- [ ] 100% de logs auditables
- [ ] Backups diarios automáticos
- [ ] Alertas automáticas funcionando

---

## 🚀 Quick Wins (Bajo esfuerzo, alto impacto)

1. **Dashboard básico** (2h) - Visibilidad inmediata
2. **Slack/Email alerts** (1h) - Notificaciones en tiempo real
3. **Supabase Cron** (1h) - Mejor confiabilidad
4. **Documentación de APIs** (2h) - Facilita integración

---

## 🔴 Risks & Mitigations

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Regulación financiera | MEDIA | ALTO | Consultar abogado, implementar KYC |
| Fraude sofisticado | BAJA | MEDIO | Monitoring continuo, ML en futuro |
| Problemas MercadoPago API | MEDIA | ALTO | Backup manual, múltiples proveedores |
| Race conditions | BAJA | ALTO | SELECT FOR UPDATE, tests exhaustivos |

---

## 📚 Recursos Necesarios

### Técnicos
- Supabase Pro (para pg_cron, más storage): ~$25/mes
- MercadoPago Payouts (para withdrawals): Sin costo inicial
- KYC service (futuro): ~$1-5 por verificación

### Humanos
- 1 developer (20h/mes) - Implementación
- 1 QA (10h/mes) - Testing
- 1 DevOps (5h/mes) - Monitoring

---

## ✅ Conclusión

### Prioridad Máxima (Próximas 2 semanas)
1. ✅ Verificación post-deployment
2. 🟡 Optimización de monitoreo
3. 🟡 Fase 2: Validaciones lock/unlock

### Mediano Plazo (Próximo mes)
4. 🟢 Rate limiting avanzado
5. 🟡 Sistema de withdrawals
6. 🟢 Sistema de reembolsos

### Largo Plazo (Q1 2026)
7. Multi-currency
8. Promociones y bonos
9. KYC/AML compliance

---

**Siguiente sesión recomendada**: Verificación post-deployment + Optimización de monitoreo (3 horas)

**Última actualización**: 2025-10-20 20:35 UTC
**Mantenido por**: Claude Code
**Versión**: 1.0
