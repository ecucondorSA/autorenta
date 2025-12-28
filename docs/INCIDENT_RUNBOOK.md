# AutoRenta - Runbook de Incidentes

**Última actualización:** 2025-12-28

---

## Clasificación de Incidentes

| Severidad | Descripción | SLA Respuesta | Ejemplos |
|-----------|-------------|---------------|----------|
| P0 - Crítico | Sistema caído, pérdida de datos | 15 min | Pagos no procesan, DB down |
| P1 - Alto | Funcionalidad core degradada | 1 hora | Búsqueda lenta, login falla intermitente |
| P2 - Medio | Feature secundario afectado | 4 horas | Notificaciones no llegan, PDF no genera |
| P3 - Bajo | Issue cosmético o menor | 24 horas | Typo en UI, log spam |

---

## Procedimientos por Tipo de Incidente

### 1. Pagos No Procesan (P0)

**Síntomas:**
- Usuarios reportan error al pagar
- Edge Function logs muestran errores 500
- Webhook no recibe confirmaciones

**Diagnóstico:**
```bash
# 1. Verificar logs de Edge Functions
supabase functions logs mercadopago-process-brick-payment --follow
supabase functions logs mercadopago-webhook --follow

# 2. Verificar estado de MercadoPago
curl -s https://api.mercadopago.com/v1/payments/search \
  -H "Authorization: Bearer $MP_ACCESS_TOKEN" \
  -d "external_reference=test" | jq .

# 3. Verificar rate limiting
PGPASSWORD='...' psql ... -c "
  SELECT * FROM rate_limit_log
  WHERE created_at > NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC LIMIT 20;
"
```

**Acciones:**
1. Si es rate limiting → Aumentar límites temporalmente
2. Si es MercadoPago down → Activar modo wallet-only
3. Si es error de código → Rollback Edge Function
4. Comunicar a usuarios afectados

**Rollback:**
```bash
# Revertir a versión anterior
git checkout HEAD~1 -- supabase/functions/mercadopago-process-brick-payment
supabase functions deploy mercadopago-process-brick-payment
```

---

### 2. Base de Datos Lenta (P1)

**Síntomas:**
- Timeouts en queries
- UI lenta o no carga
- Logs muestran "statement timeout"

**Diagnóstico:**
```bash
# 1. Ver queries activas
PGPASSWORD='...' psql ... -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
  FROM pg_stat_activity
  WHERE state != 'idle'
  ORDER BY duration DESC;
"

# 2. Ver estadísticas de tablas
PGPASSWORD='...' psql ... -c "
  SELECT schemaname, relname, n_live_tup, n_dead_tup,
         last_vacuum, last_autovacuum
  FROM pg_stat_user_tables
  ORDER BY n_dead_tup DESC
  LIMIT 10;
"

# 3. Ver queries lentas recientes
PGPASSWORD='...' psql ... -c "
  SELECT * FROM query_performance_log
  WHERE execution_time_ms > 500
  ORDER BY created_at DESC
  LIMIT 20;
"
```

**Acciones:**
1. Matar queries bloqueantes: `SELECT pg_terminate_backend(pid);`
2. Ejecutar VACUUM si hay muchos dead tuples
3. Agregar índices faltantes
4. Escalar instancia si necesario

---

### 3. Login/Auth Falla (P1)

**Síntomas:**
- Usuarios no pueden iniciar sesión
- Tokens expirados no se refrescan
- Redirect loops en OAuth

**Diagnóstico:**
```bash
# 1. Verificar Supabase Auth
curl -s https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/health

# 2. Verificar logs de auth
supabase functions logs mercadopago-oauth-callback --follow

# 3. Verificar cookies/sesión en browser
# DevTools > Application > Cookies > sb-* cookies
```

**Acciones:**
1. Verificar Supabase status: https://status.supabase.com/
2. Si OAuth MercadoPago falla → Verificar credentials
3. Limpiar cookies de sesión corruptas
4. Re-deploy Edge Function de OAuth

---

### 4. Búsqueda No Devuelve Resultados (P1)

**Síntomas:**
- Marketplace vacío
- Filtros no funcionan
- Timeout en búsqueda

**Diagnóstico:**
```bash
# 1. Probar RPC directamente
PGPASSWORD='...' psql ... -c "
  SELECT COUNT(*) FROM get_available_cars(
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '7 days',
    -34.6, -58.4, 50, 0
  );
"

# 2. Verificar autos publicados
PGPASSWORD='...' psql ... -c "
  SELECT status, COUNT(*) FROM cars GROUP BY status;
"

# 3. Verificar RLS policies
PGPASSWORD='...' psql ... -c "
  SELECT * FROM pg_policies WHERE tablename = 'cars';
"
```

**Acciones:**
1. Si no hay autos publicados → Verificar datos de prueba
2. Si timeout → Optimizar query, agregar índices
3. Si RLS bloquea → Revisar políticas

---

### 5. Notificaciones No Llegan (P2)

**Síntomas:**
- Emails no se envían
- Push notifications fallan
- In-app notifications no aparecen

**Diagnóstico:**
```bash
# 1. Verificar logs de email
supabase functions logs send-booking-confirmation-email --follow

# 2. Verificar Resend status
curl -s https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" | jq .

# 3. Verificar notificaciones en DB
PGPASSWORD='...' psql ... -c "
  SELECT * FROM notifications
  WHERE created_at > NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC LIMIT 20;
"
```

**Acciones:**
1. Verificar quota de Resend
2. Verificar templates de email
3. Retry notificaciones fallidas

---

### 6. Error 503/504 en Edge Functions (P1)

**Síntomas:**
- Funciones devuelven 503/504
- Timeouts frecuentes
- Cold starts excesivos

**Diagnóstico:**
```bash
# 1. Ver logs de función
supabase functions logs <function-name> --follow

# 2. Verificar límites de Supabase
# Dashboard > Project Settings > Resource usage

# 3. Probar función localmente
supabase functions serve <function-name> --env-file .env.local
```

**Acciones:**
1. Optimizar función (reducir cold start)
2. Implementar caching
3. Escalar plan de Supabase si necesario
4. Implementar retry con backoff en cliente

---

## Checklist de Respuesta a Incidentes

### Durante el Incidente

- [ ] Identificar severidad (P0-P3)
- [ ] Notificar a stakeholders
- [ ] Crear canal de comunicación
- [ ] Asignar roles (Incident Commander, Technical Lead)
- [ ] Documentar timeline
- [ ] Implementar fix o workaround
- [ ] Verificar resolución
- [ ] Comunicar resolución

### Post-Incidente

- [ ] Crear postmortem
- [ ] Identificar root cause
- [ ] Documentar acciones preventivas
- [ ] Implementar mejoras
- [ ] Actualizar runbook si necesario
- [ ] Compartir learnings con equipo

---

## Plantilla de Postmortem

```markdown
# Postmortem: [Título del Incidente]

**Fecha:** YYYY-MM-DD
**Severidad:** P0/P1/P2/P3
**Duración:** X horas Y minutos
**Impacto:** [Usuarios afectados, funcionalidad degradada]

## Timeline
- HH:MM - Detección del problema
- HH:MM - Primera respuesta
- HH:MM - Diagnóstico
- HH:MM - Fix aplicado
- HH:MM - Resolución confirmada

## Root Cause
[Descripción técnica de la causa raíz]

## Acciones Tomadas
1. [Acción 1]
2. [Acción 2]

## Lecciones Aprendidas
- [Qué funcionó bien]
- [Qué podemos mejorar]

## Acciones Preventivas
- [ ] [Tarea 1]
- [ ] [Tarea 2]
```

---

## Contactos de Emergencia

| Servicio | Contacto | Notas |
|----------|----------|-------|
| Supabase Support | support@supabase.io | Plan Pro requerido |
| Cloudflare Status | status.cloudflare.com | - |
| MercadoPago | developers.mercadopago.com | - |
| PayPal Developer | developer.paypal.com | - |
| Resend Support | support@resend.com | - |

---

## Herramientas de Monitoreo

| Herramienta | URL | Propósito |
|-------------|-----|-----------|
| Supabase Dashboard | supabase.com/dashboard | DB, Auth, Functions |
| Sentry | sentry.io | Error tracking |
| Cloudflare | dash.cloudflare.com | CDN, Analytics |
| MercadoPago | mercadopago.com.ar/developers | Payment logs |

---

*Runbook generado por Claude Code*
