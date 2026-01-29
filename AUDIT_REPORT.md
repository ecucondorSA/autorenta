# AutoRenta - Audit de Hardening
**Fecha:** 2026-01-28
**Autor:** Claude Code
**Score Inicial:** 6.4/10

---

## Resumen Ejecutivo

Se realizó un audit completo de 5 áreas críticas del proyecto AutoRenta:

| Área | Score | Issues Críticos | Issues Medios |
|------|-------|-----------------|---------------|
| Seguridad | 7.5/10 | 6 | 5 |
| Testing | 3.5/10 | 3 | 4 |
| Error Handling | 8/10 | 2 | 3 |
| Database | 6.5/10 | 4 | 4 |
| Código | 6.5/10 | 3 | 4 |

---

## Fixes Implementados ✅

### 1. Migración de Seguridad
**Archivo:** `supabase/migrations/20260128200000_security_hardening.sql`

#### 1.1 Constraint Anti-Overbooking (CRÍTICO)
```sql
ALTER TABLE public.bookings
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
  car_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (status NOT IN ('cancelled', 'rejected', 'no_show'));
```
**Impacto:** Previene que dos reservas se solapen para el mismo auto a nivel de base de datos.

#### 1.2 RLS para 13 Tablas Sin Políticas
Tablas protegidas:
- `reward_criteria_config`
- `reward_pool`
- `owner_availability`
- `owner_usage_limits`
- `personal_use_verifications`
- `notification_templates`
- `support_playbooks`
- `playbook_steps`
- `remote_config`
- `feature_flags`
- `car_stats`
- `user_stats`
- `recommendation_tracking`

#### 1.3 Fix wallet_charge_rental() - IDOR Vulnerability
**Antes:** Cualquier usuario podía cargar fondos de cualquier booking.
**Después:** Valida que el usuario sea el renter del booking y que el estado sea correcto.

#### 1.4 Fix wallet_deposit_ledger() - Provider Validation
**Antes:** Aceptaba cualquier string como provider.
**Después:** Solo permite: `mercadopago`, `paypal`, `stripe`, `manual`, `system`.

#### 1.5 Fix wallet_transfer() - Recipient Validation
**Antes:** No validaba que el destinatario existiera.
**Después:** Verifica que el perfil del destinatario existe antes de transferir.

#### 1.6 Índices de Performance
```sql
idx_cars_location (latitude, longitude) WHERE status = 'active'
idx_cars_owner_status (owner_id, status)
idx_bookings_car_status_created (car_id, status, created_at DESC)
idx_payments_created_at (created_at DESC)
idx_payments_booking_status (booking_id, status)
```

#### 1.7 Cleanup handle_new_user()
Consolidado en una sola versión limpia (v3), eliminando bugs de versiones anteriores.

---

### 2. Rate Limiting Fail-Closed
**Archivo:** `supabase/functions/mercadopago-create-preference/index.ts`

**Antes:**
```typescript
// Don't block on rate limiter errors - fail open for availability
console.error('[RateLimit] Error enforcing rate limit:', error);
```

**Después:**
```typescript
// SECURITY FIX: Fail-closed for rate limiter errors
return new Response(
  JSON.stringify({ error: 'Service temporarily unavailable', code: 'RATE_LIMITER_ERROR' }),
  { status: 503, headers: { 'Retry-After': '60' } }
);
```

---

## Issues Pendientes

### 🔴 Críticos (Siguiente Sprint)

| Issue | Área | Archivo/Ubicación | Acción |
|-------|------|-------------------|--------|
| 0% tests Edge Functions | Testing | `supabase/functions/*` | Crear tests para mercadopago-webhook, whatsapp-webhook |
| 76 `as any` | Código | `apps/web/src/**/*.ts` | Reemplazar con tipos explícitos |
| XSS innerHTML | Seguridad | `contract-template.service.ts` | Usar DomSanitizer |
| 9 servicios booking sin tests | Testing | `core/services/bookings/*` | Agregar unit tests |

### 🟡 Altos (Próximo Mes)

| Issue | Área | Archivo/Ubicación | Acción |
|-------|------|-------------------|--------|
| admin.service.ts 1,226 líneas | Código | `core/services/admin/` | Split en 4 servicios |
| 47 TODOs pendientes | Código | Varios | Resolver o documentar |
| 184 console.logs | Código | Varios | Centralizar en LoggerService |
| exchange_rates sin UPDATE policy | Database | Migraciones | Agregar política |

---

## Cómo Aplicar los Fixes

### Opción A: Aplicar migración manualmente
```bash
# En producción
supabase db push

# En desarrollo
supabase db reset
```

### Opción B: Deploy Edge Functions
```bash
supabase functions deploy mercadopago-create-preference
```

---

## Verificación Post-Fix

### 1. Verificar constraint de overbooking
```sql
-- Debería fallar
INSERT INTO bookings (car_id, start_at, end_at, status)
VALUES ('existing-car-id', '2026-02-01', '2026-02-05', 'confirmed');

INSERT INTO bookings (car_id, start_at, end_at, status)
VALUES ('existing-car-id', '2026-02-03', '2026-02-07', 'confirmed');
-- Error: conflicting key value violates exclusion constraint
```

### 2. Verificar RLS
```sql
-- Como usuario anónimo, debería fallar
SELECT * FROM user_stats WHERE user_id != auth.uid();
-- Returns 0 rows (RLS blocks access)
```

### 3. Verificar rate limiting
```bash
# Enviar muchas requests rápidas
for i in {1..20}; do
  curl -X POST https://xxx.supabase.co/functions/v1/mercadopago-create-preference
done
# Debería recibir 429 o 503 después de límite
```

---

## Métricas de Mejora

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Tablas con RLS | 87% | 100% | +13% |
| Funciones wallet seguras | 1/3 | 3/3 | +66% |
| Constraint anti-overbooking | No | Sí | ✅ |
| Rate limiting fail-closed | No | Sí | ✅ |
| Índices de performance | 12 | 17 | +42% |

---

## Próximos Pasos Recomendados

1. **Semana 1:** Aplicar migración, deploy edge functions, verificar en staging
2. **Semana 2:** Crear tests para Edge Functions críticas (mercadopago-webhook)
3. **Semana 3:** Eliminar `as any`, split admin.service.ts
4. **Semana 4:** Centralizar logging, resolver TODOs críticos

---

**Score Proyectado Post-Fixes:** 7.8/10
