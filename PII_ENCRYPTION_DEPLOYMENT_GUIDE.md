# PII Encryption - Deployment Guide

**Status**: Ready for Staging Deployment
**Priority**: P0 CRITICAL (GDPR Compliance)
**Estimated Time**: 2-3 hours

---

## 📋 Pre-Deployment Checklist

### Prerequisites

- [ ] Database backup created
- [ ] Encryption key generated (32-byte base64)
- [ ] Supabase Vault access configured
- [ ] Low-traffic maintenance window scheduled
- [ ] Team notified of deployment

---

## 🔑 Step 1: Generate Encryption Key

```bash
# Generate a secure 256-bit key
openssl rand -base64 32

# Example output:
# Qs7FZkM+k2x/VwL8j3YzN9pT4aB6cH5dE1fG2hI3jK4=

# IMPORTANT: Store this key securely!
# You will need it in the next step
```

**Save this key in**:
1. 1Password/LastPass (for backup)
2. Supabase Vault (for production)
3. `.env.local` (for local development)

---

## 🏗️ Step 2: Store Key in Supabase

### Option A: Via Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard → Project Settings → Vault
2. Click "New Secret"
3. Name: `pii-encryption-key`
4. Value: `<your-generated-key>`
5. Click "Save"

### Option B: Via SQL

```sql
-- Store in Supabase secrets (if vault extension enabled)
SELECT vault.create_secret(
  'pii-encryption-key',
  'Qs7FZkM+k2x/VwL8j3YzN9pT4aB6cH5dE1fG2hI3jK4='
);

-- Verify
SELECT vault.decrypted_secret FROM vault.decrypted_secrets
WHERE name = 'pii-encryption-key';
```

### Option C: Via PostgreSQL Setting (Alternative)

```sql
-- Set as database setting
ALTER DATABASE postgres
SET app.pii_encryption_key = 'Qs7FZkM+k2x/VwL8j3YzN9pT4aB6cH5dE1fG2hI3jK4=';

-- Verify
SHOW app.pii_encryption_key;
```

---

## 🚀 Step 3: Run Migrations (Staging First!)

### 3.1 Migration 1: Enable pgcrypto

```bash
# Deploy first migration
supabase db push

# OR manually:
psql $DATABASE_URL < supabase/migrations/20251109_enable_pgcrypto_and_pii_encryption_functions.sql
```

**Verify**:
```sql
-- Check pgcrypto extension
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- Test encryption
SELECT encrypt_pii('test data');
SELECT decrypt_pii(encrypt_pii('test data'));
```

---

### 3.2 Migration 2: Add Encrypted Columns

```bash
# Deploy second migration
supabase db push

# OR manually:
psql $DATABASE_URL < supabase/migrations/20251109_add_encrypted_pii_columns.sql
```

**Verify**:
```sql
-- Check columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE '%_encrypted';

-- Should return:
-- phone_encrypted
-- whatsapp_encrypted
-- address_line1_encrypted
-- address_line2_encrypted
-- postal_code_encrypted
-- dni_encrypted
-- gov_id_number_encrypted
-- driver_license_number_encrypted
```

---

### 3.3 Migration 3: Encrypt Existing Data ⚠️ CRITICAL

**WARNING**: This migration can take 5-10 minutes for large databases.

**Schedule**: Run during LOW TRAFFIC hours (e.g., 3 AM local time)

```bash
# Set encryption key as environment variable
export PII_ENCRYPTION_KEY="Qs7FZkM+k2x/VwL8j3YzN9pT4aB6cH5dE1fG2hI3jK4="

# Run migration
psql $DATABASE_URL < supabase/migrations/20251109_encrypt_existing_pii_data.sql
```

**Monitor Progress**:
- Watch for `NOTICE` messages in output
- Verify no `ERROR` or `EXCEPTION` messages
- Check final summary

**Expected Output**:
```
NOTICE:  ✅ Pre-flight checks passed. Starting data encryption...
NOTICE:  Total profiles: 1234
NOTICE:  Profiles with phone: 890
NOTICE:  ✅ Phone numbers encrypted
NOTICE:  ✅ WhatsApp numbers encrypted
NOTICE:  ✅ Addresses encrypted
NOTICE:  ✅ Identity documents encrypted
NOTICE:  ✅ Encryption round-trip test PASSED
NOTICE:  ✅ Profiles encryption verification complete
NOTICE:  ✅ Bank accounts encrypted
NOTICE:  ✅ Bank account encryption round-trip test PASSED
NOTICE:  ══════════════════════════════════════════════════════
NOTICE:  ✅ PII ENCRYPTION MIGRATION COMPLETED SUCCESSFULLY
NOTICE:  ══════════════════════════════════════════════════════
```

**Verify**:
```sql
-- Check encryption coverage
SELECT
  COUNT(*) as total_profiles,
  COUNT(phone_encrypted) as phones_encrypted,
  COUNT(dni_encrypted) as dni_encrypted
FROM profiles;

-- Test decryption (sample)
SELECT
  phone,
  decrypt_pii(phone_encrypted) as decrypted,
  phone = decrypt_pii(phone_encrypted) as matches
FROM profiles
WHERE phone_encrypted IS NOT NULL
LIMIT 5;
```

---

### 3.4 Migration 4: Create Views and RPC Functions

```bash
# Deploy fourth migration
psql $DATABASE_URL < supabase/migrations/20251109_create_decrypted_views_and_rpc_functions.sql
```

**Verify**:
```sql
-- Test decrypted view
SELECT id, phone, dni
FROM profiles_decrypted
LIMIT 5;

-- Test RPC function
SELECT get_my_profile_decrypted();
```

---

## 🧪 Step 4: Testing

### 4.1 Unit Tests

```sql
-- Test encryption
SELECT encrypt_pii('test phone +54 11 1234-5678');
-- Should return base64 encrypted string

-- Test decryption
SELECT decrypt_pii(encrypt_pii('test phone +54 11 1234-5678'));
-- Should return: 'test phone +54 11 1234-5678'

-- Test NULL handling
SELECT encrypt_pii(NULL);
-- Should return: NULL

SELECT decrypt_pii(NULL);
-- Should return: NULL
```

### 4.2 Integration Tests

```sql
-- Test update function
SELECT update_profile_with_encryption(
  auth.uid(),
  '{"phone": "+54 11 9999-8888", "city": "Buenos Aires"}'::jsonb
);

-- Verify update worked
SELECT phone, city FROM profiles_decrypted WHERE id = auth.uid();
```

### 4.3 Performance Tests

```sql
-- Measure decryption performance
EXPLAIN ANALYZE
SELECT phone, dni FROM profiles_decrypted
WHERE id = '<some-user-id>';

-- Should complete in < 10ms
```

---

## 📱 Step 5: Update Application Code (Angular)

See separate guide: `PII_ENCRYPTION_SERVICE_UPDATES.md`

**Summary**:
- Update `ProfileService` to use `profiles_decrypted` view
- Update `BankAccountService` to use RPC functions
- No changes needed in components (service abstraction)

---

## 🔍 Step 6: Post-Deployment Verification

### 6.1 Verify Encryption Coverage

```sql
-- Check that all PII is encrypted
SELECT
  COUNT(*) FILTER (WHERE phone IS NOT NULL) as phones_plaintext,
  COUNT(*) FILTER (WHERE phone_encrypted IS NOT NULL) as phones_encrypted,
  COUNT(*) FILTER (WHERE dni IS NOT NULL) as dni_plaintext,
  COUNT(*) FILTER (WHERE dni_encrypted IS NOT NULL) as dni_encrypted
FROM profiles;

-- Both counts should match!
```

### 6.2 Verify Decryption Works

```sql
-- Sample 10 profiles
SELECT
  id,
  LEFT(phone, 5) || '...' as phone_masked,
  LEFT(decrypt_pii(phone_encrypted), 5) || '...' as decrypted_masked,
  phone = decrypt_pii(phone_encrypted) as matches
FROM profiles
WHERE phone_encrypted IS NOT NULL
LIMIT 10;

-- All 'matches' should be TRUE
```

### 6.3 Verify Application Still Works

Manual testing:
- [ ] Login as user
- [ ] View profile → phone number displays correctly
- [ ] Edit profile → update phone number
- [ ] Verify phone number saved correctly
- [ ] View bank accounts → account numbers display correctly
- [ ] Add new bank account → verify encryption works

---

## ⚠️ Rollback Procedure

If issues arise during deployment:

### Before Migration 3 (No Data Encrypted Yet)

```sql
-- Just drop the migrations
DROP VIEW IF EXISTS profiles_decrypted CASCADE;
DROP VIEW IF EXISTS bank_accounts_decrypted CASCADE;
DROP FUNCTION IF EXISTS update_profile_with_encryption CASCADE;
DROP FUNCTION IF EXISTS add_bank_account_with_encryption CASCADE;
DROP FUNCTION IF EXISTS get_my_profile_decrypted CASCADE;
DROP TRIGGER IF EXISTS encrypt_profile_pii_on_write ON profiles;
DROP TRIGGER IF EXISTS encrypt_bank_account_pii_on_write ON bank_accounts;
ALTER TABLE profiles DROP COLUMN IF EXISTS phone_encrypted CASCADE;
-- (repeat for all encrypted columns)
```

### After Migration 3 (Data Encrypted)

**DO NOT DROP ENCRYPTED COLUMNS!** Data is encrypted.

```sql
-- Option 1: Keep both encrypted and plaintext (safest)
-- No action needed, both columns exist

-- Option 2: Clear encrypted columns (if needed)
UPDATE profiles SET
  phone_encrypted = NULL,
  whatsapp_encrypted = NULL,
  address_line1_encrypted = NULL,
  address_line2_encrypted = NULL,
  postal_code_encrypted = NULL,
  dni_encrypted = NULL,
  gov_id_number_encrypted = NULL,
  driver_license_number_encrypted = NULL;

-- Plaintext columns still intact
```

---

## 📊 Monitoring

### Metrics to Watch

1. **Query Performance**:
   - Monitor `SELECT` query times on `profiles_decrypted`
   - Target: < 10ms for single profile

2. **Error Rates**:
   - Watch for decryption errors in logs
   - Should be 0%

3. **Encryption Coverage**:
   ```sql
   -- Daily check
   SELECT
     COUNT(*) as total,
     COUNT(phone_encrypted) * 100.0 / COUNT(*) as phone_coverage_pct,
     COUNT(dni_encrypted) * 100.0 / COUNT(*) as dni_coverage_pct
   FROM profiles
   WHERE phone IS NOT NULL OR dni IS NOT NULL;
   ```

4. **Application Logs**:
   - Monitor Sentry for encryption-related errors
   - Watch for "PII decryption failed" warnings

---

## ✅ Success Criteria

- [ ] pgcrypto extension enabled
- [ ] Encryption functions working
- [ ] All PII fields encrypted
- [ ] Decryption working correctly
- [ ] Views returning decrypted data
- [ ] RPC functions working
- [ ] Application still functional
- [ ] Performance acceptable (< 10ms overhead)
- [ ] No errors in logs
- [ ] 100% encryption coverage

---

## 🔐 Security Checklist

- [ ] Encryption key stored securely (Vault)
- [ ] Encryption key backed up (1Password)
- [ ] Encryption key NOT in git repository
- [ ] Encryption key NOT in application logs
- [ ] Database backup contains encrypted data
- [ ] RLS policies still enforced
- [ ] Only authorized users can decrypt PII
- [ ] Audit logging in place

---

## 📅 Deployment Timeline

### Staging (Week 1)
- **Day 1**: Generate key, run migrations 1-2
- **Day 2**: Run migration 3 (encrypt data)
- **Day 3**: Run migration 4 (views/RPC), test
- **Day 4-5**: Update application code, test thoroughly

### Production (Week 2)
- **Day 1**: Schedule maintenance window
- **Day 2**: Run migrations 1-2 (during business hours, low risk)
- **Day 3**: Run migration 3 (during OFF hours, 3 AM)
- **Day 4**: Run migration 4, deploy application updates
- **Day 5**: Monitor, verify, celebrate! 🎉

**Total Time**: 2 weeks from start to production

---

## 🆘 Support

If issues arise:

1. **Check Logs**:
   ```sql
   SELECT * FROM pg_stat_activity
   WHERE query LIKE '%encrypt%' OR query LIKE '%decrypt%';
   ```

2. **Verify Key**:
   ```sql
   SELECT decrypt_pii(encrypt_pii('test'));
   -- Should return 'test'
   ```

3. **Check Permissions**:
   ```sql
   SELECT has_function_privilege('encrypt_pii(text)', 'execute');
   ```

4. **Contact**:
   - Create GitHub issue
   - Check Slack #engineering
   - Review `PII_ENCRYPTION_IMPLEMENTATION_PLAN.md`

---

## 📝 Post-Deployment Tasks

### Week 1 After Launch
- [ ] Monitor performance metrics daily
- [ ] Check error rates
- [ ] Verify encryption coverage
- [ ] Review audit logs

### Week 2 After Launch
- [ ] Performance optimization if needed
- [ ] Consider dropping plaintext columns (OPTIONAL)
- [ ] Update documentation
- [ ] Train support team

### Month 1 After Launch
- [ ] GDPR compliance audit
- [ ] Security penetration test
- [ ] Performance review
- [ ] Key rotation plan

---

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Status**: Ready for Deployment
**Next Review**: After staging deployment
