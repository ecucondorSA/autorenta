-- Script para verificar el estado de los calendarios de Google
-- Ejecuta esto en Supabase SQL Editor para ver qué calendarios están configurados

-- 1. Ver todos los tokens de Google Calendar conectados
SELECT 
  user_id,
  primary_calendar_id,
  expires_at,
  connected_at,
  sync_enabled,
  CASE 
    WHEN expires_at > NOW() THEN '✅ Activo'
    ELSE '❌ Expirado'
  END as token_status
FROM google_calendar_tokens
ORDER BY connected_at DESC;

-- 2. Ver todos los calendarios de autos creados
SELECT 
  cgc.car_id,
  c.brand,
  c.model,
  c.year,
  cgc.google_calendar_id,
  cgc.calendar_name,
  cgc.sync_enabled,
  cgc.last_synced_at,
  cgc.created_at,
  u.email as owner_email
FROM car_google_calendars cgc
LEFT JOIN cars c ON c.id = cgc.car_id
LEFT JOIN auth.users u ON u.id = cgc.owner_id
ORDER BY cgc.created_at DESC;

-- 3. Autos sin calendario configurado
SELECT 
  c.id,
  c.brand,
  c.model,
  c.year,
  c.owner_id,
  u.email as owner_email,
  CASE 
    WHEN gct.user_id IS NOT NULL THEN '✅ Tiene Google Calendar'
    ELSE '❌ Sin Google Calendar'
  END as calendar_status
FROM cars c
LEFT JOIN car_google_calendars cgc ON cgc.car_id = c.id
LEFT JOIN google_calendar_tokens gct ON gct.user_id = c.owner_id
LEFT JOIN auth.users u ON u.id = c.owner_id
WHERE cgc.car_id IS NULL
ORDER BY c.created_at DESC;

-- 4. Verificar bookings con eventos de calendario
SELECT 
  b.id,
  b.car_id,
  b.status,
  b.google_calendar_event_id,
  b.start_date,
  b.end_date,
  c.brand,
  c.model
FROM bookings b
LEFT JOIN cars c ON c.id = b.car_id
WHERE b.google_calendar_event_id IS NOT NULL
ORDER BY b.created_at DESC
LIMIT 20;
