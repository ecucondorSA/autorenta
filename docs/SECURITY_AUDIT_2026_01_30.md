# Security Audit Report - 2026-01-30

## Summary

Full codebase review performed via PR #635 (CodeRabbit + DeepSource + Sentry).

## Critical Issues Found & Fixed

### 1. Row Level Security (RLS) Gaps

**Severity:** 🔴 Critical

**Issue:** 27 tables in public schema had no RLS enabled, exposing sensitive data to anyone with the anon key.

**Tables Affected:**
- `driver_risk_scores` - User risk assessments
- `vehicle_telemetry` - Real-time vehicle locations
- `iot_devices`, `iot_device_heartbeats` - IoT infrastructure
- `outreach_contacts`, `outreach_messages` - Marketing data
- `whatsapp_registration` - Phone numbers
- `support_ticket_messages` - Private conversations
- And 19 more...

**Fix:** Enabled RLS on all 26 tables with:
- `service_role` full access (for Edge Functions)
- Public read where appropriate (pricing, catalogs)
- Blocked anon access to sensitive data

**Commit:** `5b6a4d474`

---

### 2. Cron Jobs Authentication Failure

**Severity:** 🔴 Critical

**Issue:** 3 cron jobs had broken authentication and couldn't call Edge Functions.

**Jobs Affected:**
- `process-push-notifications` - Used literal "SERVICE_ROLE_KEY" string
- `renew-preauthorizations` - Used literal "SERVICE_ROLE_KEY" string
- `monitor-pending-payouts-hourly` - Used unconfigured `current_setting()`

**Fix:** Updated all jobs to use `vault.decrypted_secrets` for secure token retrieval.

**Commit:** `3929e09ea`

---

### 3. Video Inspection Bitrate Bug

**Severity:** 🟡 High

**Issue:** `video-inspection-ai.component.ts` used 2.5 Mbps bitrate while `video-inspection-recorder.component.ts` was already fixed to 750 kbps. Caused upload failures for large videos (Sentry #610).

**Fix:** Reduced bitrate from 2,500,000 to 750,000 bps.

**Commit:** `5b6a4d474`

---

### 4. Duplicate RLS Policies

**Severity:** 🟡 Medium

**Issue:** ~15 duplicate permissive RLS policies causing unnecessary query evaluation overhead.

**Examples:**
- `feature_flags`: "All can read" + "feature_flags_select_all" (identical)
- `wallet_transactions`: Two identical "user can view own" policies
- `marketing_content_queue`: Admin policies redundant with "Authenticated users can X"

**Fix:** Removed redundant policies, kept one per scenario.

**Commit:** `3783a48b2`

---

## Remaining Items (Low Priority)

| Item | Count | Impact | Risk |
|------|-------|--------|------|
| Unused indexes | 498 | ~7MB storage | High (removing may break hidden dependencies) |
| Unindexed FKs | 70 | Slower JOINs | Low |
| DeepSource warnings | 8,131 | Code style | None |

---

## Verification

```sql
-- Check tables without RLS
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Expected: only spatial_ref_sys (PostGIS system table)

-- Check cron jobs auth
SELECT jobname,
       CASE WHEN command LIKE '%vault.decrypted_secrets%' THEN '✅' ELSE '❌' END
FROM cron.job WHERE command LIKE '%net.http%';
-- Expected: all ✅
```

---

*Generated from PR #635 review session*
