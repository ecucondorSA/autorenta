# Roadmap de Bugs y Deuda Técnica — AutoRenta

> Generado: 2026-02-15 | Fuente: Auditoría completa del frontend

---

## P0 — Crítico (engaña al usuario o rompe funcionalidad)

### ✅ DONE — Rating fake 4.9 en tarjetas del marketplace
- **Archivo:** `shared/components/car-mini-card/car-mini-card.component.ts`
- **Fix:** Reemplazado "★ 4.9" hardcodeado por badge "Nuevo" (commit `49722da90`)

### ✅ DONE — Dashboard con datos mock ($42,350 ingresos, 72% ocupación)
- **Archivo:** `features/dashboard/widgets/statistics.component.ts`
- **Fix:** Datos reseteados a 0, porcentajes fake reemplazados por "—" (commit `6dddab67a`)

### ✅ DONE — About page con "4.8/5 rating" fake y fallbacks inflados
- **Archivo:** `features/static/about/about.page.ts`
- **Fix:** Rating eliminado, fallbacks a 0 (commit `6dddab67a`)

### 🔴 WhatsApp con número placeholder
- **Archivo:** `features/verification/blocked/verification-blocked.page.ts:287`
- **Problema:** Link `wa.me/5491123456789` — número falso de ejemplo
- **Impacto:** Usuario bloqueado en KYC hace click → va a un desconocido
- **Fix:** Reemplazar con número real de soporte o eliminar el botón

### 🔴 Inconsistencia de dominio email: `autorenta.com` vs `autorentar.com`
- **Archivos:**
  - `verification-blocked.page.ts:295` → `soporte@autorenta.com` ❌
  - `booking-pending.page.ts:210` → `soporte@autorenta.com` ❌
  - `booking-actions-card.component.ts:184` → `soporte@autorentar.com` ✅
  - `help-button.component.ts:134` → `soporte@autorentar.com` ✅
- **Impacto:** Emails de soporte van a dominio incorrecto, nunca llegan
- **Fix:** Unificar a `soporte@autorentar.com` en todos los archivos

### 🔴 UUID fake de test en componente de booking
- **Archivo:** `features/cars/car-booking.page.ts:35`
- **Problema:** `carId = '11111111-1111-1111-1111-111111111111'` hardcodeado
- **Fix:** Investigar si este componente está muerto o se usa en producción

### 🔴 Banco hardcodeado en wallet-balance-card
- **Archivo:** `shared/components/wallet-balance-card/wallet-balance-card.component.ts:182-186`
- **Problema:** CBU fake `0170018740000000123456`, nombre "AutoRentA SRL", "Banco Galicia"
- **Impacto:** Si se muestra al usuario, es información falsa de cuenta bancaria
- **Fix:** Obtener datos reales de la cuenta o eliminar sección

---

## P1 — Importante (deuda técnica, UX mala)

### 🟠 88 llamadas a `alert()` en vez de ToastService
- **41 en features user-facing**, 47 en admin
- **Peores ofensores:**
  - `booking-extensions-manager.component.ts` — 10 alerts
  - `admin-withdrawals.page.ts` — 6 alerts
  - `admin-fgo/fgo-overview.page.ts` — 7 alerts
  - `publish-car-v2.page.ts` — 4 alerts
- **Fix:** Migrar a `ToastService` o `NotificationManagerService`
- **Estimación:** ~2-3 sesiones (por lotes de archivos)

### 🟠 45 `console.warn()` sin LoggerService
- **Peores ofensores:**
  - `booking-dates-step.component.ts` — 5 instancias
  - `booking-success.page.ts` — 5 instancias
  - `age-calculator.ts` — 4 instancias
  - `booking-location-form.component.ts` — 3 instancias
- **Fix:** Reemplazar por `this.logger.warn()`
- **Estimación:** ~1 sesión

### 🟠 14 TODOs sin formato requerido
Per CLAUDE.md, los TODOs deben ser `// TODO(blocked|risk|flag): [Context] Razón`.

| Archivo | TODO |
|---------|------|
| `owner-check-out.page.ts:272` | Pass evidence photos from inspection |
| `admin-claims.page.ts:289` | Create admin endpoint to get all claims |
| `car-detail.page.ts:1534` | Migrar inline calendar a blockedRanges |
| `inspection-photo-ai.component.ts:838` | Implement odometer OCR |
| `inspection-photo-ai.component.ts:844` | Implement fuel level detection |
| `about.page.ts:681` | Actualizar cuando tengamos cobertura real |
| `trust.service.ts:86` | Call verifyFinancialSolvency |
| `footer.component.ts:131` | Implement language selector |
| `footer.component.ts:136` | Implement currency selector |
| `admin.service.ts:884` | Send email notification |
| `organization.service.ts:108` | Implement bonus progress fetching |
| `profile.store.ts:262` | Send analytics event |
| `telemetry-bridge.service.ts:89` | Integrate with analytics service |

**Fix:** Clasificar cada uno como `blocked`, `risk`, o `flag` — o eliminar si ya no aplica.

### 🟠 Facebook App ID hardcodeado
- **Archivo:** `core/services/auth/facebook-auth.service.ts:35-38`
- **Problema:** `FB_APP_ID` y `FB_CONFIG_ID` hardcodeados en código
- **Fix:** Mover a `environment.ts`

---

## P2 — Bajo (cosméticos, mejoras menores)

### 🟡 "Próximamente" en features no implementadas
- `newsroom.page.ts:48` — "Kit de prensa y logos (próximamente)"
- `driver-profile.page.ts:1593` — "Sistema de protección disponible próximamente"
- `my-cars.page.ts:65` — penalidad de visibilidad "próximamente"
- **Fix:** Evaluar si se implementan o se quitan los elementos de UI

### 🟡 Placeholders de CBU en formularios bancarios
- `bank-account-form.component.ts:61,67` — placeholder `0000003100010000000001`
- **Impacto:** Bajo — son placeholders de input, no datos mostrados
- **Fix:** OK dejar como están (es convención de UX)

### 🟡 Email de prensa con dominio `.com.ar`
- `newsroom.page.ts:43` — `prensa@autorentar.com.ar`
- **Fix:** Verificar si el dominio `.com.ar` existe o unificar con `.com`

### 🟡 Verificación progress mock en mobile-menu
- **Archivo:** `mobile-menu-drawer.component.ts:89`
- **Status:** ✅ DONE — reseteado a 0 (commit `6dddab67a`)
- **Pendiente:** Conectar a datos reales de onboarding del usuario

---

## Resumen Cuantitativo

| Categoría | Cantidad | Status |
|-----------|----------|--------|
| P0 Datos fake visibles | 7 | 3 ✅ done, 4 🔴 pendientes |
| P1 alert() → toast | 88 | 🟠 pendiente |
| P1 console.warn → logger | 45 | 🟠 pendiente |
| P1 TODOs sin formato | 14 | 🟠 pendiente |
| P1 Credenciales hardcoded | 1 | 🟠 pendiente |
| P2 Cosméticos | 5 | 🟡 pendiente |
| **Total** | **160** | |

---

## Orden sugerido de ejecución

1. **Ahora:** P0 restantes (WhatsApp fake, emails inconsistentes, UUID test, banco fake)
2. **Sprint 1:** TODOs → clasificar o eliminar + Facebook App ID a environment
3. **Sprint 2:** alert() → ToastService (por lotes: bookings, admin, shared)
4. **Sprint 3:** console.warn → LoggerService
5. **Backlog:** P2 cosméticos
