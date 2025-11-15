# Borradores de Issues para flujo `auto-task`

Copia cada bloque tal cual en GitHub cuando crees un nuevo issue utilizando la plantilla ⚙️ Auto Task. Ajusta datos (por ejemplo, owner) si aplica.

---

## Issue 1 — Wallet renter: feedback de depósito

**Título:**
```
auto: endurecer feedback de depósitos en wallet renter
```

**Body (plantilla):**
```
### 🎯 Contexto
## 🎯 Contexto
Completa todos los campos para que el bot pueda ejecutar la tarea end-to-end.

### Alcance
Actualizar `features/wallet/deposit` en `apps/web`, sincronizar servicios en `core/services/wallet.service.ts` y ajustar el mock en `functions/workers/payments_webhook` para reflejar estados `processing`.

### Criterios de aceptación
- Botón "Depositar" muestra spinner mientras `wallet_initiate_deposit` responde.
- Se bloquea doble submit usando estado derivado de `WalletStore`.
- Mensaje toast resume monto acreditado cuando webhook confirma (dev = worker; prod = Supabase).
- Telemetría: se registra evento `wallet_deposit_completed` en `core/services/analytics.service.ts`.

### Pruebas obligatorias
```
pnpm run test:quick
pnpm run test:e2e:wallet -- --project=renter
```

### Guardas previos al automerge
- [x] No se tocan secrets ni claves productivas
- [x] No hay migraciones o cambios de infraestructura sensibles
- [ ] Se cuenta con rollback descrito en el issue (usar revert de commits en caso de error)

### Dueño responsable
@ecucondorSA

### Notas adicionales
---

```
auto: automatizar release de fondos bloqueados en bookings renter
```

**Body:**
```
### 🎯 Contexto
## 🎯 Contexto
Completa todos los campos para que el bot pueda ejecutar la tarea end-to-end.
- `core/services/booking-payments.service.ts`
- `core/stores/booking.store.ts`
- Supabase RPC `wallet_release_funds` (solo cliente, sin migraciones)
- Tests e2e para renters (`tests/renter/booking-release.spec.ts`)

### Criterios de aceptación
- Cuando anfitrión marca viaje como completo, se llama a `wallet_release_funds` con ID de booking.
---
- Estado "Fondos liberados" aparece en `features/bookings/detail` (badge verde).
## Issue 8 — Admin: monitor de retiros y compensaciones

**Título:**
```
auto: mejorar dashboard admin para retiros y conciliaciones
```

**Body (plantilla):**
```
### 🎯 Contexto
Mejorar visibilidad y controles desde panel admin para `withdrawals` y `settlements`.

### Alcance
- `features/admin/withdrawals` pages
- `supabase/functions` para auditoría
- `supabase/migrations` si se requiere columna extra para `batch_id`

### Criterios de aceptación
- Admin puede ver y filtrar retiros por estado, fecha y usuario.
- Función de reintento en retiros fallidos.
- Logs y alertas cuando retiro supera X USD.

### Pruebas obligatorias
```
pnpm run lint
pnpm run test:quick
pnpm run test:e2e:admin -- --project=admin
```

### Guardas previos al automerge
- [x] No se tocan secrets ni claves productivas
- [x] Documentar migraciones y rollback

### Dueño responsable
@ecucondorSA

### Notas adicionales
Agregar métricas en `performance-monitor.yml` para sumar transparencia.
```

---

## Issue 9 — Mensajería: marcar conversaciones de booking como leídas

**Título:**
```
auto: asegurar marcación como leídas en conversaciones de booking
```

**Body (plantilla):**
```
### 🎯 Contexto
Mejorar UX: mensajes de booking deben marcarse como leídos al abrir conversación desde la página de booking.

### Alcance
- `features/messages/inbox.page.ts`
- `core/services/unread-messages.service.ts`
- E2E test `tests/renter/booking-messages.spec.ts`

### Criterios de aceptación
- Al abrir `/messages?bookingId=xxx` desde booking detail, la conversación se marca como leída.
- Badge y contador de unread se actualizan correctamente.

### Pruebas obligatorias
```
pnpm run lint
pnpm run test:quick
pnpm run test:e2e:messages -- --project=renter
```

### Guardas previos al automerge
- [x] No se tocan secrets ni claves productivas
- [x] No hay migraciones

### Dueño responsable
@ecucondorSA

### Notas adicionales
Validar con `unread_messages` y `messages` indexes.
```

---

## Issue 10 — Tests críticos: completar cobertura del Critical Path

**Título:**
```
auto: agregar tests E2E faltantes para Camino Crítico (Wallet, Booking, Payments)
```

**Body (plantilla):**
```
### 🎯 Contexto
Completar tests faltantes listados en `tests/RENTER_COMPLETE_E2E_PLAN.md` para subir cobertura mínima a 80% en módulos críticos.

### Alcance
- Crear/actualizar tests E2E en `tests/renter/journey/*`
- Ajustes en `prompts` y `local-mcp-playwright` para usar stubs y configuraciones reproducibles

### Criterios de aceptación
- Los tests P0 corren en CI en menos de 12 minutos.
- Los tests son idempotentes y restablecen DB/state entre runs.

### Pruebas obligatorias
```
pnpm run test:e2e -- --project=renter
pnpm run test:quick
```

### Guardas previos al automerge
- [x] No se tocan secrets ni claves productivas
- [x] Requiere aprobación humana para agregar tests que cambien flujos

### Dueño responsable
@ecucondorSA

### Notas adicionales
Agregar pasos de `teardown` para eliminar datos de prueba.
```
- Release automático también se ejecuta tras 24h vía worker `functions/workers/payments_webhook` (usar cron simulado en dev).
- Logs claros en consola (nivel debug) indicando transición.

### Pruebas obligatorias
```
pnpm run lint
pnpm run test:quick
pnpm run test:e2e:booking -- --project=renter
```

### Guardas previos al automerge
- [x] No se tocan secrets ni claves productivas
- [x] No hay migraciones o cambios de infraestructura sensibles
- [x] Se cuenta con rollback descrito en el issue (revertir feature flag)

### Dueño responsable
@ecucondorSA

### Notas adicionales
Activar feature flag `renter_booking_release` en Supabase antes de probar en dev.
```

---

## Issue 3 — Marketplace: recálculo diario de precios FIPE

**Título:**
```
auto: sincronizar precios de marketplace con FIPE diariamente
```

**Body:**
```
### 🎯 Contexto
## 🎯 Contexto
Completa todos los campos para que el bot pueda ejecutar la tarea end-to-end.

### Alcance
- Script `tools/fipe-sync.ts`
- Cronjob `functions/workers/update-exchange-rate` (duplicar patrón)
- Repositorio `core/repositories/cars.repository.ts`
- UI en `features/marketplace/list` para mostrar timestamp de última actualización

### Criterios de aceptación
- Nuevo worker `functions/workers/fipe_sync` ejecuta fetch diario a las 03:00 UTC.
- Se actualiza tabla `cars` con precio recomendado sin bloquear overrides manuales.
- UI lista fecha/hora del último sync en card de cada vehículo.
- Se escribe log en `supabase.functions_logs` con resumen de autos actualizados.

### Pruebas obligatorias
```
pnpm run lint
pnpm run test:quick
pnpm run test:e2e:marketplace -- --project=renter
pnpm run update-exchange-rates -- --dry-run
```

### Guardas previos al automerge
- [x] No se tocan secrets ni claves productivas
- [ ] No hay migraciones o cambios de infraestructura sensibles (crear nota si se necesita tabla extra)
- [x] Se cuenta con rollback descrito en el issue (deshabilitar cron en Cloudflare + revert worker)

### Dueño responsable
@ecucondorSA

### Notas adicionales
Revisar `CLAUDE_STORAGE.md` para respetar buckets y rutas; adjuntar screenshot del badge en UI.
```

---

## Issue 4 — Instant Booking para Hosts Verificados

**Título:**
```
auto: habilitar Instant Booking para hosts verificados
```

**Body (plantilla):**
```
### 🎯 Contexto
Permitir que hosts verificados reciban reservas sin aprobación manual (instant booking) para aumentar conversiones.

### Alcance
- `booking-flow-v2/booking-wizard.page.ts`
- `core/services/booking.service.ts`
- Feature flag `instant_booking_enabled` en Supabase
- Tests E2E: `tests/owner/instant-booking.spec.ts`

### Criterios de aceptación
- Si host es `verified` y `instant_booking` está activo, la reserva pasa a `confirmed` automáticamente.
- Vistas del owner y renter reflejan el estado correcto, con badge `AUTO_CONFIRMED`.
- Se registra evento de analytics `booking_instant_confirmed`.

### Pruebas obligatorias
```
pnpm run lint
pnpm run test:quick
pnpm run test:e2e:bookings -- --project=owner
```

### Guardas previos al automerge
- [x] No se tocan secrets ni claves productivas
- [x] No hay migraciones (solo flags/config)
- [x] Se cuenta con rollback: desactivar feature flag

### Dueño responsable
@ecucondorSA

### Notas adicionales
Hacer rollout gradual (canary) y medir conversión.
```

---

## Issue 5 — Perfil v2: verificación y gamificación

**Título:**
```
auto: mejorar flujo de verificación y gamificación del perfil v2
```

**Body (plantilla):**
```
### 🎯 Contexto
Mejorar la tasa de verificación y añadir elementos de gamificación en `profile-v2` para fomentar confianza.

### Alcance
- `features/profile/profile-v2.page.ts`
- `core/services/profile.service.ts`
- `profile-verified` badge UI y `profile-completion` indicator
- Tests E2E: `tests/renter/07-complete-profile.spec.ts`

### Criterios de aceptación
- Subida de documento muestra status `verifying` y luego `verified` tras review.
- UI muestra `profile_score` con pasos para completar.
- Notificaciones al usuario cuando su perfil cambia de estado.

### Pruebas obligatorias
```
pnpm run lint
pnpm run test:quick
pnpm run test:e2e:profile -- --project=renter
```

### Guardas previos al automerge
- [x] No se tocan secrets ni claves productivas
- [x] Si hay cambios de DB (nuevas columnas) avisar y documentar rollback

### Dueño responsable
@ecucondorSA

### Notas adicionales
Ver `docs/verification-checklist.md` para pasos de revisión manual.
```

---

## Issue 6 — Wallet v2: soporte Crypto (USDT/USDC)

**Título:**
```
auto: añadir soporte crypto (USDT/USDC) en wallet-v2
```

**Body (plantilla):**
```
### 🎯 Contexto
Soporte para depósitos/transferencias con stablecoins en Wallet v2.

### Alcance
- `apps/web-v2` wallet components
- `core/services/wallet.service.ts` + supabase edge functions
- `scripts` para integraciones de testnet
- Tests E2E: `tests/renter/wallet-crypto.spec.ts`

### Criterios de aceptación
- Usuario puede seleccionar USDT/USDC y ver balance en moneda token.
- Depositar desde wallet con transacción simulada (dev) y confirmación por webhook.
- Conversión y display correcto en UI; pruebas de rounding/precision.

### Pruebas obligatorias
```
pnpm run lint
pnpm run test:quick
pnpm run test:e2e:v2:wallet -- --project=renter
```

### Guardas previos al automerge
- [x] No se tocan secrets ni claves productivas
- [x] Si se requiere API-key extra, documentar manejo de secrets
- [x] Rollback: deshabilitar feature flag `wallet_crypto` y revertir commits

### Dueño responsable
@ecucondorSA

### Notas adicionales
Utilizar redeploy de worker con testnet y ejecutar `pnpm run update-exchange-rates -- --dry-run` como smoke test.
```

---

## Issue 7 — Service Worker: sincronización offline de bookings

**Título:**
```
auto: implementar sync offline bookings en service worker
```

**Body (plantilla):**
```
### 🎯 Contexto
El SW actual tiene `TODO` en `syncBookings`; implementar sincronización periódica para mejorar UX offline.

### Alcance
- `apps/web-v2/src/service-worker.js`
- Tests: unit dev y una prueba de integración PWA con Workbox
- Documentación en `docs/offline.md`

### Criterios de aceptación
- `syncBookings` implementa reconciling de cambios locales con Supabase.
- Logs y metrics medibles sobre fallbacks/offline.
- Tests para diferentes casos (no network, conflict resolution).

### Pruebas obligatorias
```
pnpm run lint
pnpm run test:quick
pnpm run e2e:offline -- --project=booking
```

### Guardas previos al automerge
- [x] No se tocan secrets ni claves productivas
- [x] Se cuenta con rollback: revertir cambios en SW

### Dueño responsable
@ecucondorSA

### Notas adicionales
Revisar compatibilidad con Safari y limitaciones de background sync.
```
