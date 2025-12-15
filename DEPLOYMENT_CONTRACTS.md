# Contract System - Deployment Guide

> Complete deployment, testing, and rollback procedures for AutoRenta's legal contract system

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Steps](#deployment-steps)
4. [Testing Procedures](#testing-procedures)
5. [Rollback Instructions](#rollback-instructions)
6. [Monitoring](#monitoring)
7. [Legal Compliance Verification](#legal-compliance-verification)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This deployment includes:

- **Database Migration**: Extends `booking_contracts` table with audit trail fields
- **Edge Function**: PDF generation using Puppeteer (Deno)
- **Frontend**: Contract acceptance UI with 4 priority clauses
- **Backend Validation**: Payment blocked without contract acceptance

### Legal Compliance

- **Ley 25.506** (Digital Signature): Checkbox + timestamp + IP + User-Agent
- **Ley 20.091** (SSN): "Dispensa contractual" wording (NOT "seguro")
- **Art. 173 CP**: Illegal retention clause
- **Art. 886 CCyC**: Automatic default clause

---

## Pre-Deployment Checklist

### 1. Environment Verification

```bash
# Verify Supabase connection
supabase status

# Verify production database connection
PGPASSWORD='Ab.12345' psql \
  -h aws-1-sa-east-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.pisqjmoklivzpwufhscx \
  -d postgres \
  -c "SELECT version();"
```

### 2. Backup Current State

```bash
# Backup booking_contracts table
PGPASSWORD='Ab.12345' pg_dump \
  -h aws-1-sa-east-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.pisqjmoklivzpwufhscx \
  -d postgres \
  -t booking_contracts \
  --data-only \
  > backups/booking_contracts_$(date +%Y%m%d_%H%M%S).sql

# Backup current Edge Function
supabase functions download mercadopago-process-booking-payment \
  --output backups/mercadopago-process-booking-payment_$(date +%Y%m%d_%H%M%S)
```

### 3. Code Review

- [ ] All 4 priority clauses present in template (`v1.0.0-es-AR.html`)
- [ ] Audit trail fields in migration (`renter_ip_address`, `renter_user_agent`, etc.)
- [ ] Backend validation in `mercadopago-process-booking-payment/index.ts`
- [ ] Frontend UI respects CLAUDE.md constraints (NO modals, NO wizards)

---

## Deployment Steps

### Option A: Automated Deployment (Recommended)

```bash
# Production deployment
./scripts/deploy-contracts-system.sh production

# Local testing
./scripts/deploy-contracts-system.sh local
```

### Option B: Manual Deployment

#### 1. Apply Database Migration

```bash
# Production
PGPASSWORD='Ab.12345' psql \
  -h aws-1-sa-east-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.pisqjmoklivzpwufhscx \
  -d postgres \
  -f supabase/migrations/20251214000000_enhance_booking_contracts.sql

# Verify migration applied
PGPASSWORD='Ab.12345' psql ... -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'booking_contracts'
  ORDER BY ordinal_position;
"
```

#### 2. Deploy Edge Function

```bash
# Deploy PDF generation function
supabase functions deploy generate-booking-contract-pdf --no-verify-jwt

# Verify deployment
supabase functions list
```

#### 3. Verify Edge Function Secrets

```bash
# List secrets
supabase secrets list

# Set missing secrets (if any)
supabase secrets set SUPABASE_URL="https://pisqjmoklivzpwufhscx.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="eyJhbGc..."
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
```

#### 4. Build and Deploy Frontend

```bash
# Build production
cd apps/web
pnpm build

# Deploy to Cloudflare Pages
CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 \
  npx wrangler pages deploy dist/web/browser \
  --project-name=autorentar \
  --commit-dirty=true
```

---

## Testing Procedures

### 1. Database Tests

```sql
-- Verify migration applied
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'booking_contracts'
  AND column_name IN (
    'contract_version',
    'renter_ip_address',
    'renter_user_agent',
    'renter_device_fingerprint',
    'pdf_generated_at',
    'pdf_storage_path',
    'pdf_generation_status',
    'clauses_accepted'
  );

-- Verify storage bucket
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'booking-contracts';

-- Verify RLS policy
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname = 'contracts_download_participants';
```

### 2. Edge Function Tests

```bash
# Test PDF generation (replace with real booking_id)
curl -X POST \
  https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/generate-booking-contract-pdf \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "123e4567-e89b-12d3-a456-426614174000",
    "merged_html": "<html><body>Test Contract</body></html>"
  }'

# Expected response:
# {
#   "success": true,
#   "pdf_url": "https://...signed-url...",
#   "file_name": "contracts/123e4567-e89b-12d3-a456-426614174000-1702512345678.pdf",
#   "booking_id": "123e4567-e89b-12d3-a456-426614174000"
# }

# View logs
supabase functions logs generate-booking-contract-pdf --follow
```

### 3. E2E Tests

```bash
cd apps/web

# Run contract-specific tests
npm run test:e2e -- booking-contract.spec.ts

# Run full E2E suite
npm run test:e2e
```

### 4. Manual UI Test

1. **Login** as test renter
2. **Navigate** to marketplace
3. **Select** a car and dates
4. **Click** "Reservar"
5. **Verify** contract PDF loads in iframe
6. **Verify** payment form is hidden
7. **Accept** all 4 clauses individually
8. **Verify** final checkbox enables
9. **Click** "Aceptar Contrato"
10. **Verify** payment form appears
11. **Attempt** payment
12. **Verify** backend validation passes

### 5. Backend Validation Tests

```bash
# Test 1: Payment without contract acceptance
curl -X POST \
  https://pisqjmoklivzpwufhscx.supabase.co/functions/v1/mercadopago-process-booking-payment \
  -H "Authorization: Bearer ..." \
  -d '{
    "booking_id": "...",
    "card_token": "test-token"
  }'

# Expected: 400 Bad Request
# { "error": "CONTRACT_NOT_ACCEPTED", ... }

# Test 2: Payment with incomplete clauses
# (Manually update DB to set mora=false)
# Expected: 400 Bad Request
# { "error": "INCOMPLETE_CLAUSE_ACCEPTANCE", "missing_clauses": ["mora"] }

# Test 3: Payment with expired acceptance (>24h)
# Expected: 400 Bad Request
# { "error": "CONTRACT_ACCEPTANCE_EXPIRED", ... }
```

---

## Rollback Instructions

### Emergency Rollback (If critical issues found)

```bash
# 1. Revert Edge Function
supabase functions deploy mercadopago-process-booking-payment \
  --from-backup backups/mercadopago-process-booking-payment_YYYYMMDD_HHMMSS

# 2. Revert Frontend
# (Deploy previous version from Git)
git checkout <previous-commit>
pnpm build
npx wrangler pages deploy dist/web/browser --project-name=autorentar

# 3. Disable contract requirement (temporary)
# Option A: Feature flag (if implemented)
UPDATE feature_flags SET enabled = false WHERE flag_name = 'require_contract_acceptance';

# Option B: Comment out validation in edge function and redeploy
```

### Database Rollback (Migration)

```sql
-- WARNING: This will delete audit trail data!
-- Only use if migration causes critical issues

BEGIN;

-- Drop new columns
ALTER TABLE booking_contracts
  DROP COLUMN IF EXISTS contract_version,
  DROP COLUMN IF EXISTS locale,
  DROP COLUMN IF EXISTS renter_ip_address,
  DROP COLUMN IF EXISTS renter_user_agent,
  DROP COLUMN IF EXISTS renter_device_fingerprint,
  DROP COLUMN IF EXISTS pdf_generated_at,
  DROP COLUMN IF EXISTS pdf_storage_path,
  DROP COLUMN IF EXISTS pdf_generation_status,
  DROP COLUMN IF EXISTS pdf_error,
  DROP COLUMN IF EXISTS contract_data,
  DROP COLUMN IF EXISTS clauses_accepted;

-- Drop indices
DROP INDEX IF EXISTS idx_booking_contracts_booking_id;
DROP INDEX IF EXISTS idx_booking_contracts_pdf_status;

-- Drop storage bucket (WARNING: Deletes all PDFs!)
DELETE FROM storage.buckets WHERE id = 'booking-contracts';

COMMIT;
```

---

## Monitoring

### Key Metrics to Monitor

1. **PDF Generation Success Rate**
   ```sql
   SELECT
     pdf_generation_status,
     COUNT(*) as count,
     ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM booking_contracts
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY pdf_generation_status;
   ```

2. **Contract Acceptance Rate**
   ```sql
   SELECT
     COUNT(*) FILTER (WHERE accepted_by_renter = true) as accepted,
     COUNT(*) FILTER (WHERE accepted_by_renter = false) as pending,
     ROUND(
       COUNT(*) FILTER (WHERE accepted_by_renter = true) * 100.0 / COUNT(*),
       2
     ) as acceptance_rate
   FROM booking_contracts
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

3. **Payment Rejection Reasons**
   ```bash
   # View Edge Function logs for contract validation errors
   supabase functions logs mercadopago-process-booking-payment --follow | \
     grep -E 'CONTRACT_|CLAUSE_'
   ```

4. **PDF Generation Performance**
   ```bash
   # Monitor Puppeteer execution time
   supabase functions logs generate-booking-contract-pdf --follow | \
     grep -E 'PDF generated in'
   ```

### Alerts to Configure

- **Sentry**: Contract acceptance errors
- **Supabase**: Edge Function timeouts (>15s)
- **Database**: RLS policy violations
- **Storage**: Bucket quota warnings (approaching 5MB limit per file)

---

## Legal Compliance Verification

### Post-Deployment Audit

```sql
-- 1. Verify all contracts have audit trail
SELECT
  booking_id,
  accepted_by_renter,
  accepted_at,
  renter_ip_address IS NOT NULL as has_ip,
  renter_user_agent IS NOT NULL as has_ua,
  renter_device_fingerprint IS NOT NULL as has_fingerprint,
  clauses_accepted IS NOT NULL as has_clauses
FROM booking_contracts
WHERE accepted_by_renter = true
  AND created_at > NOW() - INTERVAL '7 days';

-- 2. Verify all 4 clauses accepted
SELECT
  booking_id,
  clauses_accepted->>'culpaGrave' as culpa_grave,
  clauses_accepted->>'indemnidad' as indemnidad,
  clauses_accepted->>'retencion' as retencion,
  clauses_accepted->>'mora' as mora
FROM booking_contracts
WHERE accepted_by_renter = true
  AND created_at > NOW() - INTERVAL '7 days';

-- 3. Verify PDF storage
SELECT
  bc.booking_id,
  bc.pdf_url IS NOT NULL as has_pdf_url,
  bc.pdf_storage_path IS NOT NULL as has_storage_path,
  bc.pdf_generation_status,
  bc.pdf_generated_at
FROM booking_contracts bc
WHERE bc.created_at > NOW() - INTERVAL '7 days'
ORDER BY bc.created_at DESC;
```

### Legal Checklist

- [ ] All 4 priority clauses visible in PDF template
- [ ] IP address captured for all accepted contracts
- [ ] User-Agent captured for all accepted contracts
- [ ] Device fingerprint captured for all accepted contracts
- [ ] Timestamp captured (Ley 25.506 compliance)
- [ ] "Dispensa Contractual" wording used (Ley 20.091 compliance)
- [ ] Insurance policy number displayed
- [ ] PDFs stored securely with RLS policies
- [ ] Backend validation blocks unauthorized payments

---

## Troubleshooting

### Issue: PDF Generation Timeout

**Symptoms**: Edge Function returns 500 error, logs show Puppeteer timeout

**Solution**:
```typescript
// Increase timeout in generate-booking-contract-pdf/index.ts
await page.setContent(merged_html, {
  waitUntil: 'networkidle0',
  timeout: 30000, // Increase from 15s to 30s
});
```

### Issue: Storage Upload Fails

**Symptoms**: Error "File size exceeds limit"

**Solution**:
```sql
-- Increase bucket file size limit (currently 5MB)
UPDATE storage.buckets
SET file_size_limit = 10485760 -- 10MB
WHERE id = 'booking-contracts';
```

### Issue: RLS Policy Denies Access

**Symptoms**: User cannot download their own PDF

**Solution**:
```sql
-- Verify policy exists
SELECT * FROM pg_policies
WHERE tablename = 'objects'
  AND policyname = 'contracts_download_participants';

-- Recreate policy if missing
CREATE POLICY "contracts_download_participants"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'booking-contracts' AND
  EXISTS (
    SELECT 1 FROM booking_contracts bc
    JOIN bookings b ON b.id = bc.booking_id
    JOIN cars c ON c.id = b.car_id
    WHERE bc.pdf_storage_path = name
      AND (b.renter_id = auth.uid() OR c.owner_id = auth.uid())
  )
);
```

### Issue: Frontend Checkbox Not Working

**Symptoms**: Clauses don't check/uncheck, button stays disabled

**Solution**: Verify signal syntax (NOT NgModel):
```html
<!-- Correct -->
<input
  type="checkbox"
  [checked]="clausesAccepted().culpaGrave"
  (change)="clausesAccepted.update(c => ({...c, culpaGrave: !c.culpaGrave}))"
/>

<!-- Incorrect (won't work with signals) -->
<input type="checkbox" [(ngModel)]="clausesAccepted().culpaGrave" />
```

### Issue: Backend Validation Passing Without Contract

**Symptoms**: Payment succeeds even without contract acceptance

**Solution**: Verify validation code is deployed:
```bash
# Check edge function source
supabase functions download mercadopago-process-booking-payment

# Search for CONTRACT_VALIDATION
grep -n "CONTRACT_VALIDATION" index.ts

# Should show validation block around line 137-273
```

---

## Contact & Support

- **Technical Issues**: Create GitHub issue
- **Legal Questions**: Consult legal team before modifying clauses
- **Production Incidents**: Check Sentry alerts + Supabase logs

---

**Last Updated**: 2025-12-14
**Version**: 1.0.0
**Owner**: AutoRenta Development Team
