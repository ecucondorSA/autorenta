# Auditoría de Errores Sentry - AutoRenta
**Fecha:** 2026-01-26
**Período analizado:** Últimos 14 días
**Proyecto:** autorenta (ecu-iu)

---

## Resumen Ejecutivo

| Prioridad | Cantidad | Usuarios Afectados |
|-----------|----------|-------------------|
| 🔴 P0 - Crítico | 3 | ~3 |
| 🟠 P1 - Alto | 5 | ~5 |
| 🟡 P2 - Medio | 7 | ~4 |
| 🟢 P3 - Bajo | 5 | ~2 |

**Total de Issues Únicos:** 20
**Ambiente Principal de Errores:** development (Android WebView)

---

## 🔴 P0 - Errores Críticos (Bloquean funcionalidad core)

### 1. RPC `request_booking` falla - Campo `owner_id` no existe
**ID:** 7216214509 | **Ocurrencias:** 4 | **Usuarios:** 1

```
Error: request_booking RPC failed: {"error":{"code":"42703","message":"record \"new\" has no field \"owner_id\""}}
```

**Causa raíz:** Un trigger en la base de datos referencia `NEW.owner_id` pero la tabla `bookings` no tiene ese campo. El trigger fue creado asumiendo una estructura de tabla diferente.

**URL afectada:** `/cars/e03e5823-8716-4f81-bf56-fe09e1595061`

**Fix requerido:**
```sql
-- Revisar y corregir triggers en tabla bookings
SELECT tgname, tgrelid::regclass, pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgrelid = 'bookings'::regclass;

-- El trigger probablemente necesita usar cars.owner_id en lugar de NEW.owner_id
```

**Archivos a revisar:**
- `supabase/migrations/` - buscar triggers con `owner_id`
- `apps/web/src/app/core/services/bookings/bookings.service.ts`

---

### 2. Violación de RLS en `owner_usage_limits`
**ID:** 7216214508 | **Ocurrencias:** 4 | **Usuarios:** 1

```
Error: new row violates row-level security policy for table "owner_usage_limits"
```

**Causa raíz:** El fallback de inserción directa de booking intenta crear un registro en `owner_usage_limits` pero la política RLS no permite la operación.

**Archivo afectado:**
- `supabase/migrations/20260110080001_update_usage_limits_comodato.sql`

**Fix requerido:**
```sql
-- Verificar policies en owner_usage_limits
SELECT * FROM pg_policies WHERE tablename = 'owner_usage_limits';

-- Agregar policy para permitir insert durante booking
CREATE POLICY "Allow system insert on booking" ON owner_usage_limits
  FOR INSERT WITH CHECK (true);  -- O condición más específica
```

---

### 3. Edge Function `tiktok-events` FATAL
**ID:** 7216189503 | **Ocurrencias:** 2 | **Usuarios:** 1 | **Level:** FATAL

```
Error: Error in HTTP POST https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/tiktok-events
```

**Causa raíz:** La Edge Function de TikTok Events está fallando. Puede ser problema de configuración o credenciales.

**Fix requerido:**
```bash
# Verificar logs de la función
supabase functions logs tiktok-events --project-ref pisqjmoklivzpwufhscx

# Verificar que los secrets estén configurados
supabase secrets list
```

---

## 🟠 P1 - Errores Altos (Afectan experiencia de usuario)

### 4. TypeError: Cannot read properties of null (reading 'detail')
**ID:** 7216286777 | **Ocurrencias:** 3 | **Usuarios:** 1

**Ubicación:** `apps/web/src/app/features/cars/browse/browse-cars.page.ts:100`

```typescript
// Código actual (línea 100):
const id = typeof carId === 'string' ? carId : (carId as any).detail?.carId || ...

// El problema: si carId es un objeto sin .detail, .detail es undefined
// pero si .detail es null (no undefined), .carId falla
```

**Fix requerido:**
```typescript
// Línea 100 - cambiar a:
const id = typeof carId === 'string'
  ? carId
  : (carId as any)?.detail?.carId || (carId as any)?.carId || String(carId);
```

---

### 5. OCR Verification Failed After Retries
**ID:** 7215236830 | **Ocurrencias:** 8 | **Usuarios:** 1

```
Error: verifyDocumentOcr failed after retries
```

**URL afectada:** `/profile/verification`

**Causa probable:** La Edge Function de verificación OCR está fallando o tardando demasiado.

**Archivos a revisar:**
- `supabase/functions/verify-user-docs/index.ts`
- `apps/web/src/app/core/services/verification/verification.service.ts`

---

### 6. Edge Function Non-2xx Status
**ID:** 7216480658 + 7216572923 | **Ocurrencias:** 2 | **Usuarios:** 2

```
Error: Edge Function returned a non-2xx status code
Recognition error: Edge Function returned a non-2xx status code
```

**Fix requerido:** Revisar logs de Edge Functions para identificar cuáles están fallando.

---

### 7. Usuario No Autenticado
**ID:** 7216189432 + 7216015210 + 7216013110 | **Ocurrencias:** 3 | **Usuarios:** 3

```
Error: Usuario no autenticado
Error: Usuario no autenticado - getUser() retornó null
```

**Causa:** Sesión expirada o no iniciada cuando se intenta una operación que requiere auth.

**Fix requerido:** Mejorar el manejo de sesión y redirección a login cuando la sesión expira.

---

### 8. Rage Click Detectado
**ID:** 7216290870 | **Ocurrencias:** 3 | **Usuarios:** 1

**URL afectada:** `https://localhost/cars/list`

**Causa:** Usuario haciendo clicks repetidos por frustración (UI no responde o está lenta).

**Fix requerido:** Investigar performance en `/cars/list` y agregar feedback visual en botones.

---

## 🟡 P2 - Errores Medios

### 9. NG0203 - inject() fuera de contexto
**ID:** 7216486619 + 7216027482 | **Ocurrencias:** 3 | **Usuarios:** 2

```
Error: NG0203
```

**Causa:** Uso de `inject()` fuera de un contexto de inyección válido (constructor o factory).

**Fix requerido:** Revisar servicios que usan `inject()` en lugares incorrectos.

---

### 10. NotAllowedError: Permission denied (Cámara)
**ID:** 7216190374 | **Ocurrencias:** 10 | **Usuarios:** 1

```
Error: NotAllowedError: Permission denied
```

**Causa:** Usuario denegó permisos de cámara.

**Fix requerido:** Mejorar UX mostrando mensaje explicativo antes de pedir permisos.

---

### 11. Formato de Video No Válido
**ID:** 7216545145 | **Ocurrencias:** 6 | **Usuarios:** 1

```
Error: Formato de video no válido. Por favor usa MP4, WebM o MOV (máx 10MB, 3-10 segundos)
```

**Causa:** Usuario subiendo videos con formato incorrecto.

**Fix:** Este es un error de validación esperado, pero considerar mejor UX antes de grabar.

---

### 12. Environment Camera Failed
**ID:** 7216486629 | **Ocurrencias:** 3 | **Usuarios:** 1 | **Level:** WARNING

```
Environment camera failed, trying any camera...
```

**Causa:** La cámara trasera no está disponible, se usa fallback a cualquier cámara.

**Acción:** Esto es un warning informativo, no requiere fix urgente.

---

## 🟢 P3 - Errores Bajos

### 13. Falling back to direct booking insert (schema mismatch)
**ID:** 7215234477 | **Ocurrencias:** 5 | **Usuarios:** 2 | **Level:** WARNING

**Causa:** El RPC de booking tiene un schema diferente al esperado, se usa fallback.

**Acción:** Sincronizar schema entre RPC y frontend.

---

### 14. Failed to send request to Edge Function
**ID:** 7216027432 + 7208656506 | **Ocurrencias:** 3 | **Usuarios:** 3 | **Level:** WARNING/ERROR

**Causa:** Problema de red o timeout al llamar Edge Functions.

**Acción:** Agregar retry con backoff exponencial.

---

## Información del Dispositivo de Pruebas

| Campo | Valor |
|-------|-------|
| **Dispositivo** | Infinix X6826C |
| **OS** | Android 12 |
| **Browser** | Chrome Mobile WebView 143.0.7499 |
| **Ambiente** | development |
| **Release** | autorenta-web@production |

---

## Acciones Recomendadas

### Inmediatas (Hoy)
1. [ ] **P0-1:** Corregir trigger de `owner_id` en bookings
2. [ ] **P0-2:** Agregar policy RLS faltante en `owner_usage_limits`
3. [ ] **P1-4:** Fix null check en `onMarkerClick`

### Esta Semana
4. [ ] **P0-3:** Revisar Edge Function `tiktok-events`
5. [ ] **P1-5:** Investigar fallos de OCR verification
6. [ ] **P1-8:** Optimizar performance en `/cars/list`

### Backlog
7. [ ] **P2-9:** Auditar uso de `inject()` en servicios
8. [ ] **P2-10:** Mejorar UX de permisos de cámara
9. [ ] **P3-13:** Sincronizar schema de booking RPC

---

## Métricas de Monitoreo

Para prevenir regresiones, configurar alertas en Sentry para:

```yaml
alerts:
  - name: "Booking RPC Failures"
    query: "error.message:*request_booking*"
    threshold: 3
    window: 1h

  - name: "RLS Violations"
    query: "error.message:*row-level security*"
    threshold: 1
    window: 1h

  - name: "Fatal Errors"
    query: "level:fatal"
    threshold: 1
    window: 15m
```

---

**Generado por:** Claude Code Audit
**Organización Sentry:** ecu-iu
**Proyecto:** autorenta
