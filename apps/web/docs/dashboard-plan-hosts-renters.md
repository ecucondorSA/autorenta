## Plan del Dashboard — Locadores / Locatarios (NO administradores)

Fecha: 15 de noviembre de 2025

Propósito
- Entregar un plan técnico y de producto para el dashboard exclusivo de locadores y locatarios. No incluye funcionalidades ni vistas de administradores. El documento cubre: contrato (inputs/outputs), lista de widgets/componentes, fuentes de datos y endpoints, consideraciones RLS/seguridad, pruebas (unit/E2E), prioridad MVP y métricas a medir.

Contrato mínimo (inputs / outputs / errores)
- Inputs: userId autenticado (rol owner/tenant), permisos via Supabase JWT; parámetros de filtro (fecha inicio/fin, propiedadId).
- Outputs: JSON con widgets (estadísticas, calendario, transacciones, reviews, notificaciones, documentos, estado del seguro), y estado HTTP 200/4xx/5xx.
- Errores: 401 si no autenticado, 403 si recurso no pertenece al userId, 422 para parámetros inválidos.

Roles relevantes
- owner (locador): puede ver y gestionar sus vehículos, reservas, calendario, pagos y documentos.
- renter (locatario): puede ver sus reservas, documentos y pagos relacionados.

Componentes / Widgets (lista y contrato breve)
1) Estadísticas (Resumen)
   - Qué muestra: reservas activas, próximas, canceladas (periodo), ingresos netos (periodo), ocupación % por vehículo.
   - Datos: tablas `bookings`, `payments`/`wallet_transactions`, `cars`.
   - Endpoint sugerido: RPC/Edge function `dashboard.owner_stats(user_id, start_date, end_date)` → agrega aggregation y currency conversion.
   - RLS: SELECTs permitidos solo cuando `cars.owner_id = auth.uid` o `bookings.owner_id = auth.uid`.

2) Calendario (Booking timeline)
   - Qué muestra: calendario con reservas por vehículo, bloqueo de fechas, check-ins/outs.
   - Datos: `bookings(start,end,status,car_id,user_id)`, `cars` meta.
   - Endpoint: `GET /api/owner/calendar?start=&end=&carId=` (puede mapear a RPC `calendar_owner_events`).
   - UX: vista por mes/semana; color por estado (confirmed/blocked/pending).

3) Ganancias / Payouts
   - Qué muestra: saldo disponible, pending payouts, últimas transacciones, net split (85%/15%), export CSV.
   - Datos: `wallet_transactions`, `payouts`, `bookings` (fee split calculations).
   - Endpoint: `dashboard.owner_payouts(user_id, start, end)` + `POST /api/owner/request_payout`.
   - Consideraciones: never expose platform service-role key on frontend. Use Edge Function + service-role server to create transfers.

4) Reseñas y Feedback
   - Qué muestra: rating medio, últimas reseñas, flagged items.
   - Datos: `reviews` table (booking_id, rating, comment, created_at).
   - Endpoint: `GET /api/owner/reviews?carId=&limit=`.

5) Favoritos / Interacciones
   - Qué muestra: usuarios que marcaron un vehículo favorito y actividad reciente.

6) Notificaciones
   - Qué muestra: pagos pendientes, nuevas reservas, mensajes de renters.
   - Datos: `notifications` table and realtime channel (Supabase Realtime or websockets).
   - UX: toast + bell + panel de actividad.

7) Documentos y Verificaciones
   - Qué muestra: documentos vinculados (ID, foto del vehículo, pólizas de seguro), estado KYC.
   - Datos: `documents`, Supabase Storage file paths.
   - Endpoint: `GET /api/owner/documents` (pre-signed URLs desde Edge function si es necesario).

8) Seguros
   - Qué muestra: pólizas activas, fechas de expiración, reclamaciones en curso.
   - Datos: `insurance_policies`, `insurance_claims`.

9) Pagos y Wallet
   - Qué muestra: historial de pagos, estados (pending/paid/failed), devolución de fondos.
   - Integración: MercadoPago via edge functions mencionadas (`mercadopago-create-preference`, `wallet_confirm_deposit`, `wallet_lock_funds`).

10) Soporte y Ayuda
   - Qué muestra: shortcuts para contactar soporte, tickets abiertos, FAQs.

11) Referidos
   - Qué muestra: métricas de referidos, enlaces y comisiones.

Fuentes de datos y endpoints recomendados
- Supabase tablas clave: `users`, `cars`, `bookings`, `wallet_transactions`, `payouts`, `reviews`, `notifications`, `documents`, `insurance_policies`.
- RPC / Edge functions sugeridos (seguir convención actual del repo):
  - `dashboard.owner_stats(user_id, start, end)` (RPC agregada en Postgres)
  - `calendar_owner_events(user_id, start, end)`
  - Edge function `owner_request_payout` — usa service-role en servidor para crear transferencias.
  - Realtime: canales `notifications:owner:{owner_id}` para push de nuevas reservas/mensajes.

Consideraciones RLS / Seguridad
- Principio: nunca devolver datos que no pertenezcan a `auth.uid`. Usar `auth.uid = owner_id` checks en RLS.
- Ejemplo RLS snippet (pseudocode):
  - ON `bookings` FOR SELECT: RETURN true IF bookings.owner_id = auth.uid OR bookings.renter_id = auth.uid.
  - ON `wallet_transactions`: RETURN true IF transactions.account_owner = auth.uid.
- Minimizar datos sensibles en frontend (p.ej., no service-role keys). Pre-signed URLs por Edge Functions para descargas de documentos.

Pruebas (Unitarias / E2E)
- Unit: cada widget (service + component) con tests de boundary cases (sin datos, datos parciales, errores 500).
- E2E Owner (Playwright):
  - Escenarios clave: (1) Ver resumen de estadísticas, (2) Ver calendario y confirmar una reserva, (3) Solicitar payout, (4) Ver reseñas y responder, (5) Descargar documento.
  - Setup: seeds SQL para crear owner con 2 vehículos, 3 bookings (confirmed,pending,cancelled) y wallet balance. Seed file sugerido en `database/seed/owner-dashboard.sql`.
  - Tests: usar `tests/owner/*.spec.ts` con helpers `tests/helpers/seed.ts` y `tests/helpers/auth.ts`.

Métricas y KPIs a monitorear
- Time-to-first-paint (móvil) del dashboard < 2s.
- Interactions per session (owner engagement).
- Conversiones: % de reservas confirmadas vs intentadas.
- Latencia API para `dashboard.owner_stats` < 200ms p95.

Prioridad MVP (orden recomendado)
1. Estadísticas (Resumen) — imprescindible
2. Calendario — imprescindible para evitar doble-bookings
3. Ganancias / Payouts — alto impacto
4. Notificaciones + Mensajería — alto impacto (realtime)
5. Reseñas — medio
6. Documentos y Seguros — medio (legal)
7. Favoritos / Referidos / Soporte — bajo (pueden esperar)

Wireframes y UX notes (breves)
- Layout: dos columnas en desktop (left: calendario/vehicle list, right: stats + payouts). Mobile: stack vertical con quick actions (nuevo bloqueo, ver reservas).
- Actions primarias: "Marcar como bloqueado", "Confirmar reserva", "Solicitar pago". CTA visibles y consistentes.
- Accessibility: contrast ratio >= 4.5, keyboard focus order, aria-label en botones críticos.

Implementación incremental sugerida (sprints)
- Sprint 1 (2 semanas): endpoints RPC básicos + Statistics widget + calendario básico (lectura).
- Sprint 2 (2 semanas): Payouts UI + wallet transactions + tests E2E básicos.
- Sprint 3 (2 semanas): Notificaciones realtime + Documents + Reviews.

Archivos y artefactos a crear (sugerido)
- `apps/web/src/app/features/dashboard/` — carpeta con componentes standalone: `dashboard.page.ts`, `widgets/statistics.component.ts`, `widgets/calendar.component.ts`, `widgets/payouts.component.ts`.
- `database/seed/owner-dashboard.sql` — seed para tests.
- `tests/owner/*.spec.ts` — Playwright E2E owner tests.
- `supabase/migrations/` — RPCs `dashboard.owner_stats.sql`, `calendar_owner_events.sql`.

Validación y QA
- Integración en CI: añadir job Playwright `test:owner` que corra los tests en un entorno con seeds.
- Smoke test: validar con un owner real en staging que vea sólo sus datos.

Siguientes pasos recomendados (acciones que puedo ejecutar ahora)
1. (Automático) Scaffold de componentes Angular minimal en `apps/web/src/app/features/dashboard/` con mocks.
2. (Opcional) Crear seed SQL y tests E2E owner skeletons en `tests/owner/`.
3. Documentar RLS snippets en `supabase/migrations/` y proponer PR con migra.

---
Fin del documento. Si querés que esqueleto de componentes o seeds se creen ahora, decime y lo genero (opciones B/C previas).
