# Egress Optimization Tracking

## Status: P0 Completado (2026-02-02)

### P0 - Cambios Aplicados

#### 1. Migración SQL (`20260202200000_egress_optimization_p0.sql`)
- [x] Desactivar cron jobs no esenciales (marketing, social media)
- [x] Crear función de limpieza automática de logs
- [x] Programar cleanup diario a las 3 AM
- [x] Crear índices optimizados para queries frecuentes
- [x] Crear vistas livianas (`bookings_list_view`, `cars_list_view`)

#### 2. Servicios Optimizados (SELECT * → campos específicos)
- [x] `chat.service.ts` - loadMessages()
- [x] `cars.service.ts` - getCarPhotos()
- [x] `booking-data-loader.service.ts` - loadInsuranceCoverage()
- [x] `messages.service.ts` - listByBooking(), listByCar(), send()

---

## P1 - Pendiente (Próxima semana)

### Servicios con SELECT * restantes
Archivos que aún necesitan optimización:

```
bookings/contracts.service.ts:176, 203
bookings/booking-ops.service.ts:74
bookings/booking-approval.service.ts:18
bookings/booking-extension.service.ts:71, 104, 179, 225
bookings/instant-booking.service.ts:242, 314
bookings/booking-dispute.service.ts:292, 414
bookings/insurance.service.ts:45, 71, 101, 299, 410, 426, 494, 516, 767
admin/disputes.service.ts:74, 84, 186, 364
admin/admin.service.ts:339
notifications/smart-notification.service.ts:161, 316, 446
infrastructure/feature-flag.service.ts:82, 108, 358, 467
infrastructure/traffic-infractions.service.ts:32, 54, 86
infrastructure/contextual-personalization.service.ts:404
infrastructure/user-notifications.service.ts:166, 569
infrastructure/sdui.service.ts:111
geo/vehicle-tracking.service.ts:334, 427
ev-incident-protocol.service.ts:122, 470
```

### Optimizaciones de Realtime
- [ ] Revisar suscripciones activas en RealtimeConnectionService
- [ ] Limitar canales simultáneos por usuario
- [ ] Agregar filtros por campos específicos en cambios de Postgres

### Retención de Logs (verificar en producción)
- [ ] vehicle_recognition_logs → 7 días
- [ ] mp_webhook_logs → 30 días
- [ ] pending_webhook_events → 7 días (solo done/failed)
- [ ] notification_logs → 14 días
- [ ] cars_fipe_history → 90 días
- [ ] email_sequence_logs → 30 días

---

## P2 - Mediano plazo (1 mes)

### CDN para Storage
- [ ] Configurar Cloudflare R2 o similar
- [ ] Migrar URLs públicas de imágenes a CDN
- [ ] Mantener Supabase Storage solo para uploads

### Vistas Materializadas
- [ ] Crear `mv_car_search` para búsquedas de marketplace
- [ ] Crear `mv_user_stats` para dashboards
- [ ] Programar refresh cada hora

### Caché en Cliente
- [ ] Implementar IndexedDB para datos frecuentes
- [ ] Cachear lista de autos por 5 minutos
- [ ] Cachear perfil de usuario por sesión

### Archiving de Datos Fríos
- [ ] Mover bookings > 1 año a tabla `bookings_archive`
- [ ] Mover mensajes > 6 meses a tabla `messages_archive`

---

## Métricas de Seguimiento

### Antes de Optimizaciones (2026-02-02)
- Egress usado: ~25GB (503% del límite de 5GB)
- Causa principal: SELECT *, Realtime, Storage downloads

### Después de P0 (Pendiente verificación)
- [ ] Medir egress después de 24h
- [ ] Comparar con baseline

### Objetivo
- Reducir egress a <5GB/mes (dentro del límite del plan Free)
- O justificar upgrade a plan Pro ($25/mes, 50GB egress)

---

## Comandos Útiles

```sql
-- Ver cron jobs activos
SELECT * FROM cron.job;

-- Ver tamaño de tablas
SELECT
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Ejecutar limpieza manual
SELECT public.cleanup_old_logs();
```
