# AutoRenta - Política de Retención de Datos

**Última actualización:** 2025-12-28
**Versión:** 1.0

---

## Resumen Ejecutivo

Este documento define los períodos de retención para los diferentes tipos de datos en la plataforma AutoRenta, así como los procedimientos para limpieza y archivo.

---

## 1. Períodos de Retención por Tipo de Dato

### 1.1 Datos de Usuario (profiles)

| Campo | Retención | Justificación |
|-------|-----------|---------------|
| Información básica (nombre, email) | Cuenta activa + 5 años | Requisito legal/fiscal |
| Documentos de verificación | Cuenta activa + 3 años | Compliance KYC |
| Fotos de perfil | Cuenta activa | Solo mientras necesario |
| Historial de login | 1 año | Seguridad/auditoría |

**Nota:** Los usuarios pueden solicitar eliminación bajo GDPR/LGPD. Se conservan datos mínimos requeridos por ley.

### 1.2 Reservas (bookings)

| Estado | Retención | Justificación |
|--------|-----------|---------------|
| Completadas | 7 años | Requisitos fiscales Argentina/Brasil |
| Canceladas | 2 años | Análisis de patrones |
| Con disputa | 10 años | Posibles reclamos legales |
| Pending (sin pago) | 30 días | Limpieza automática |

### 1.3 Transacciones Financieras

| Tipo | Retención | Justificación |
|------|-----------|---------------|
| wallet_transactions | 7 años | Requisitos fiscales |
| wallet_ledger | 7 años | Auditoría contable |
| booking_payment_events | 7 años | Trazabilidad de pagos |
| mp_webhook_logs | 2 años | Debugging/reconciliación |

### 1.4 Vehículos (cars)

| Estado | Retención | Justificación |
|--------|-----------|---------------|
| Activos | Indefinido | Mientras el owner use la plataforma |
| Eliminados (soft delete) | 1 año | Recuperación accidental |
| Fotos huérfanas | 30 días | Limpieza de storage |

### 1.5 Comunicaciones

| Tipo | Retención | Justificación |
|------|-----------|---------------|
| Mensajes (chat) | 2 años | Resolución de disputas |
| Notificaciones | 6 meses | UX (historial reciente) |
| Emails transaccionales | No almacenados | Solo logs de envío |

### 1.6 Analytics y Logs

| Tipo | Retención | Justificación |
|------|-----------|---------------|
| conversion_events | 2 años | Análisis de negocio |
| Error logs (Sentry) | 90 días | Debugging |
| Edge Function logs | 7 días | Supabase default |
| Rate limit counters | 24 horas | Ventana deslizante |

### 1.7 Datos Sensibles (PII)

| Tipo | Almacenamiento | Retención |
|------|----------------|-----------|
| DNI/Cédula/CPF | Hash verificado + últimos 4 dígitos | Cuenta activa + 3 años |
| Licencia de conducir | Referencia externa (Veriff) | 1 año desde verificación |
| Datos bancarios owner | Solo ID de MercadoPago | Mientras esté conectado |
| Tarjetas de pago | NO almacenadas (tokenizadas en MP) | N/A |

---

## 2. Procedimientos de Limpieza

### 2.1 Limpieza Automática (Cron Jobs)

```sql
-- Ejecutar diariamente a las 03:00 UTC
SELECT cron.schedule(
  'cleanup-old-data',
  '0 3 * * *',
  $$
    -- Notificaciones > 6 meses
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '6 months';

    -- Eventos de conversión > 2 años
    DELETE FROM conversion_events
    WHERE created_at < NOW() - INTERVAL '2 years';

    -- Rate limit counters > 24 horas
    DELETE FROM rate_limit_counters
    WHERE window_start < NOW() - INTERVAL '24 hours';
  $$
);
```

### 2.2 Limpieza Manual (Funciones RPC)

```sql
-- Ejecutar mensualmente con dry_run=true primero
SELECT maintenance_cleanup_old_notifications(dry_run := false);
SELECT maintenance_cleanup_old_conversion_events(dry_run := false);
SELECT maintenance_cleanup_orphaned_car_photos(dry_run := false);
```

### 2.3 Archivo de Datos Históricos

Para datos que deben conservarse pero no necesitan acceso frecuente:

1. Exportar a formato Parquet
2. Almacenar en Supabase Storage (bucket `archives`)
3. Eliminar de tabla principal
4. Mantener índice de archivos

---

## 3. Solicitudes de Eliminación (GDPR/LGPD)

### 3.1 Proceso de Solicitud

1. Usuario solicita eliminación via Support Ticket
2. Verificación de identidad (email + documento)
3. Período de gracia de 14 días
4. Ejecución de eliminación
5. Confirmación al usuario

### 3.2 Datos que NO se eliminan

- Transacciones fiscales completadas (obligación legal)
- Datos en disputas activas
- Logs anonimizados de seguridad

### 3.3 Datos que SE eliminan

- Información de perfil (nombre, foto, bio)
- Historial de búsquedas
- Preferencias de usuario
- Mensajes (reemplazados por "[Usuario eliminado]")

---

## 4. Backups y Recuperación

| Tipo | Frecuencia | Retención |
|------|------------|-----------|
| Full backup | Diario | 30 días |
| Point-in-time recovery | Continuo | 7 días |
| Archivos de datos históricos | Mensual | 7 años |

---

## 5. Auditoría y Compliance

### 5.1 Logs de Acceso a PII

```sql
-- Ver accesos recientes a datos sensibles
SELECT * FROM audit_log
WHERE table_name IN ('profiles', 'verification_documents')
  AND created_at > NOW() - INTERVAL '30 days';
```

### 5.2 Reportes Periódicos

- **Mensual:** Volumen de datos por categoría
- **Trimestral:** Solicitudes de eliminación procesadas
- **Anual:** Revisión de política de retención

---

## 6. Contacto

Para consultas sobre esta política:
- **Email:** privacy@autorenta.app
- **DPO:** [Designar cuando sea requerido]

---

## Historial de Cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-12-28 | Versión inicial |

---

*Documento generado por equipo de desarrollo AutoRenta*
