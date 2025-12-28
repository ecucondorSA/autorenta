# AutoRenta - Troubleshooting Guide

**Last Updated:** 2025-12-28

Quick reference for diagnosing and fixing common issues in the AutoRenta platform.

---

## Table of Contents

1. [Authentication Issues](#1-authentication-issues)
2. [Payment Issues](#2-payment-issues)
3. [Search & Marketplace Issues](#3-search--marketplace-issues)
4. [Booking Issues](#4-booking-issues)
5. [Wallet Issues](#5-wallet-issues)
6. [Performance Issues](#6-performance-issues)
7. [Mobile App Issues](#7-mobile-app-issues)
8. [Edge Function Issues](#8-edge-function-issues)
9. [Database Issues](#9-database-issues)

---

## 1. Authentication Issues

### User Cannot Log In

**Symptoms:** Login button does nothing, redirect loop, "Invalid credentials"

**Diagnosis:**
```bash
# Check Supabase Auth status
curl -s https://pisqjmoklivzpwufhscx.supabase.co/auth/v1/health

# Check browser console for errors
# DevTools > Console > Filter: error

# Check Edge Function logs (OAuth)
supabase functions logs mercadopago-oauth-callback --follow
```

**Common Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Expired session | Clear cookies, try again |
| OAuth misconfiguration | Verify `MERCADOPAGO_CLIENT_ID` in Supabase secrets |
| CORS issue | Check `_shared/cors.ts` allowed domains |
| Rate limited | Check `rate_limit_log` table |

**Quick Fix:**
```sql
-- Clear user sessions (force re-login)
DELETE FROM auth.sessions WHERE user_id = '<user_id>';
```

### OAuth Redirect Loop

**Diagnosis:**
```bash
# Check OAuth callback logs
supabase functions logs mercadopago-oauth-callback --follow

# Verify redirect URIs match
# MercadoPago Dashboard > Your App > Redirect URIs
```

**Fix:**
1. Verify redirect URI in MercadoPago matches: `https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/mercadopago-oauth-callback`
2. Check `MERCADOPAGO_CLIENT_SECRET` is correct

---

## 2. Payment Issues

### Payment Not Processing

**Symptoms:** "Processing..." forever, error after payment form

**Diagnosis:**
```bash
# Check Edge Function logs
supabase functions logs mercadopago-process-brick-payment --follow

# Check for rate limiting
PGPASSWORD='...' psql ... -c "
  SELECT * FROM rate_limit_log
  WHERE endpoint LIKE 'mercadopago%'
    AND created_at > NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC;
"

# Check MercadoPago API status
curl -s https://api.mercadopago.com/v1/payments/search \
  -H "Authorization: Bearer $MP_ACCESS_TOKEN" \
  -d "limit=1"
```

**Common Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Rate limited | Wait or increase limit |
| Invalid card token | User needs to re-enter card |
| Price lock expired | Refresh booking page |
| MercadoPago down | Show error, use wallet |

### Webhook Not Confirming Payment

**Diagnosis:**
```sql
-- Check webhook logs
SELECT event_id, processed, processing_error, received_at
FROM mp_webhook_logs
ORDER BY received_at DESC
LIMIT 20;

-- Find pending bookings
SELECT id, status, created_at, metadata->>'mercadopago_payment_id' as mp_id
FROM bookings
WHERE status = 'pending'
  AND created_at > NOW() - INTERVAL '24 hours';
```

**Manual Confirmation (Emergency):**
```sql
-- Verify payment in MercadoPago Dashboard first!
UPDATE bookings
SET status = 'confirmed',
    paid_at = NOW(),
    metadata = jsonb_set(metadata, '{manual_confirmation}', 'true')
WHERE id = '<booking_id>';
```

### Payment Shows Wrong Amount

**Diagnosis:**
```sql
-- Check booking pricing
SELECT
  id,
  total_amount,
  metadata->'fx_locked' as fx_rate,
  metadata->'pricing' as pricing
FROM bookings
WHERE id = '<booking_id>';
```

**Common Causes:**
- FX rate changed between quote and payment
- Price lock expired (15 min)
- Bonus/malus calculation issue

---

## 3. Search & Marketplace Issues

### No Cars Showing

**Diagnosis:**
```sql
-- Check published cars count
SELECT status, COUNT(*) FROM cars GROUP BY status;

-- Test RPC directly
SELECT COUNT(*) FROM get_available_cars(
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '7 days',
  -34.6037, -58.3816,
  50, 0
);

-- Check for blocking conditions
SELECT id, status, is_listed, daily_rate, photo_count
FROM cars
WHERE status = 'published'
  AND is_listed = true
LIMIT 10;
```

**Common Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| No published cars | Check car data |
| RPC has bug | Rollback migration |
| RLS blocking | Check RLS policies |
| Location filter too strict | Increase radius |

### Search Very Slow

**Diagnosis:**
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM get_available_cars(
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '7 days',
  -34.6037, -58.3816,
  50, 0
);

-- Check for missing indexes
SELECT
  schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'cars'
ORDER BY idx_scan ASC;
```

**Quick Fixes:**
```sql
-- Run VACUUM on cars table
VACUUM ANALYZE cars;

-- Check if spatial index exists
SELECT * FROM pg_indexes WHERE indexname LIKE '%location%';
```

---

## 4. Booking Issues

### Cannot Create Booking

**Diagnosis:**
```sql
-- Check car availability
SELECT * FROM check_car_availability(
  '<car_id>',
  '<start_date>',
  '<end_date>'
);

-- Check for conflicting bookings
SELECT * FROM bookings
WHERE car_id = '<car_id>'
  AND status IN ('confirmed', 'active')
  AND daterange(start_date::date, end_date::date, '[]')
      && daterange('<start_date>'::date, '<end_date>'::date, '[]');

-- Check blocked dates
SELECT * FROM blocked_dates
WHERE car_id = '<car_id>'
  AND daterange(start_date, end_date, '[]')
      && daterange('<start_date>'::date, '<end_date>'::date, '[]');
```

### Booking Stuck in Pending

**Diagnosis:**
```sql
-- Check booking state
SELECT
  id, status, created_at, paid_at,
  metadata->>'mercadopago_payment_id' as mp_id,
  metadata->>'payment_error' as error
FROM bookings
WHERE id = '<booking_id>';

-- Check webhook logs
SELECT * FROM mp_webhook_logs
WHERE payment_id = '<mp_payment_id>'
ORDER BY received_at DESC;
```

**Resolution:**
1. Verify payment in MercadoPago Dashboard
2. If paid but not confirmed, manually update status
3. If not paid, notify user to retry

---

## 5. Wallet Issues

### Balance Not Updating

**Diagnosis:**
```sql
-- Check wallet transactions
SELECT * FROM wallet_transactions
WHERE user_id = '<user_id>'
ORDER BY created_at DESC
LIMIT 20;

-- Calculate current balance
SELECT
  user_id,
  SUM(
    CASE
      WHEN type IN ('deposit', 'credit', 'refund') THEN amount
      WHEN type IN ('withdrawal', 'debit', 'lock') THEN -amount
      ELSE 0
    END
  ) / 100.0 as balance_ars
FROM wallet_transactions
WHERE user_id = '<user_id>' AND status = 'completed'
GROUP BY user_id;
```

### Wallet Health Check
```sql
SELECT admin_wallet_health_check();
```

**Interpretation:**
- `negative_balances > 0`: Critical - data integrity issue
- `stuck_pending > 10`: Warning - payments not confirming
- `orphaned_transactions > 0`: Warning - user data issue

---

## 6. Performance Issues

### Slow Page Load

**Diagnosis:**
```bash
# Check browser network tab for slow requests
# DevTools > Network > Sort by Time

# Check Supabase dashboard for slow queries
# Dashboard > Database > Query Performance
```

**Quick Checks:**
```sql
-- Active long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Table bloat
SELECT schemaname, relname, n_live_tup, n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;
```

**Quick Fixes:**
```sql
-- Run VACUUM on bloated tables
VACUUM ANALYZE <table_name>;

-- Kill long-running query
SELECT pg_terminate_backend(<pid>);
```

### High Error Rate

**Diagnosis:**
```bash
# Check Edge Function logs
supabase functions logs --all --follow

# Check Sentry dashboard
# https://sentry.io/organizations/autorenta/
```

---

## 7. Mobile App Issues

### App Crashes on Startup

**Diagnosis:**
```bash
# Check Android logs
adb logcat | grep -i autorenta

# Check Capacitor logs
npx cap doctor
```

**Common Causes:**
- Outdated Capacitor plugins
- Missing permissions in AndroidManifest.xml
- Invalid deep links

### Push Notifications Not Working

**Diagnosis:**
```bash
# Check FCM configuration
adb shell dumpsys package com.autorenta | grep firebase

# Check Edge Function logs
supabase functions logs send-push-notification --follow
```

**Common Causes:**
- FCM token not registered
- Invalid FCM server key
- User disabled notifications

---

## 8. Edge Function Issues

### Function Returns 500

**Diagnosis:**
```bash
# Get detailed logs
supabase functions logs <function-name> --follow

# Check for env var issues
supabase secrets list
```

**Common Causes & Fixes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing env var` | Secret not set | `supabase secrets set KEY=value` |
| `Rate limit error` | Too many requests | Increase limit or wait |
| `Timeout` | Function too slow | Optimize or increase timeout |
| `Import error` | Bad import path | Check Deno imports |

### Function Returns 503

**Common Causes:**
- Rate limiter unavailable (fail-closed)
- Supabase infrastructure issue
- Cold start timeout

**Quick Fix:**
```bash
# Redeploy to force new instance
supabase functions deploy <function-name>
```

---

## 9. Database Issues

### Connection Refused

**Diagnosis:**
```bash
# Check connection string
PGPASSWORD='...' psql \
  -h aws-1-sa-east-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.pisqjmoklivzpwufhscx \
  -d postgres \
  -c "SELECT 1;"
```

**Common Causes:**
- Wrong password
- IP not whitelisted (Supabase settings)
- Connection pool exhausted

### RLS Blocking Queries

**Diagnosis:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = '<table>';

-- Test query as specific user
SET request.jwt.claims = '{"sub": "<user_id>", "role": "authenticated"}';
SELECT * FROM <table> LIMIT 5;
RESET request.jwt.claims;
```

### Migration Failed

**Diagnosis:**
```sql
-- Check migration history
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;
```

**Fix:**
1. Identify the failing statement
2. Fix manually or rollback
3. Update migration history if needed

---

## Quick Reference Commands

```bash
# Check all Edge Function logs
supabase functions logs --all --follow

# Test database connection
PGPASSWORD='Ab.12345' psql \
  -h aws-1-sa-east-1.pooler.supabase.com -p 6543 \
  -U postgres.pisqjmoklivzpwufhscx -d postgres \
  -c "SELECT NOW();"

# Check Supabase status
curl -s https://pisqjmoklivzpwufhscx.supabase.co/rest/v1/ \
  -H "apikey: <anon-key>" | jq .

# Deploy single function
supabase functions deploy <function-name>

# Check secrets
supabase secrets list
```

---

## Related Documentation

- [Incident Runbook](./INCIDENT_RUNBOOK.md)
- [Rollback Guide](./ROLLBACK_GUIDE.md)
- [Webhooks Documentation](./WEBHOOKS.md)
- [CI/CD Workflow](./CI_CD_WORKFLOW.md)

---

*Documentation generated by Claude Code*
