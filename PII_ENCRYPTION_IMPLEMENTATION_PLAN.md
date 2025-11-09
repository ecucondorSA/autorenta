# PII Encryption Implementation Plan

**Priority**: 🔴 P0 CRITICAL BLOCKER
**Reason**: GDPR Compliance
**Effort**: 5-7 days
**Risk**: HIGH (Data breach exposure without this)
**Status**: Design Phase

---

## 🎯 Executive Summary

**Problem**: Personally Identifiable Information (PII) is currently stored in PLAINTEXT in the database, violating GDPR Article 32 (Security of Processing) requirements.

**Solution**: Implement AES-256 encryption using PostgreSQL pgcrypto extension for all PII fields.

**Impact**:
- ✅ GDPR compliance achieved
- ✅ Data breach risk mitigated
- ✅ Customer trust increased
- ⚠️ Slight performance overhead (minimal)

---

## 📊 PII Fields Analysis

### Table: `profiles` (11 fields)

| Field | Type | Sensitivity | Priority |
|-------|------|-------------|----------|
| `phone` | text | HIGH | P0 |
| `whatsapp` | text | HIGH | P0 |
| `address_line1` | text | HIGH | P0 |
| `address_line2` | text | MEDIUM | P0 |
| `city` | text | LOW | P1 |
| `state` | text | LOW | P1 |
| `postal_code` | text | MEDIUM | P0 |
| `dni` | text | **CRITICAL** | P0 |
| `gov_id_number` | text | **CRITICAL** | P0 |
| `driver_license_number` | text | HIGH | P0 |
| `full_name` | text | MEDIUM | P1 |

**Total PII Fields in Profiles**: 11

---

### Table: `bank_accounts` (3 fields)

| Field | Type | Sensitivity | Priority |
|-------|------|-------------|----------|
| `account_number` | text | **CRITICAL** | P0 |
| `account_holder_document` | text | **CRITICAL** | P0 |
| `account_holder_name` | text | HIGH | P0 |

**Total PII Fields in Bank Accounts**: 3

---

### Already Encrypted ✅

| Field | Table | Status |
|-------|-------|--------|
| `mercadopago_access_token` | profiles | ✅ Encrypted (has `_encrypted` suffix logic) |
| `mercadopago_refresh_token` | profiles | ✅ Encrypted |
| Messages | messages | ✅ Encrypted (migration `20251028_encrypt_messages_server_side.sql`) |

**Good News**: Payment tokens and messages are already encrypted!

---

## 🔐 Encryption Strategy

### Architecture: Symmetric Encryption with pgcrypto

**Why pgcrypto?**
- ✅ Native PostgreSQL extension (no external dependencies)
- ✅ AES-256-CBC encryption (industry standard)
- ✅ Transparent to application layer (encryption/decryption in DB)
- ✅ Performance optimized for PostgreSQL
- ✅ GDPR compliant

### Encryption Key Management

**Option A**: Environment Variable (RECOMMENDED)
```sql
-- Key stored in environment variable, accessed via Supabase Vault
SELECT pgp_sym_encrypt('sensitive data', current_setting('app.encryption_key'));
```

**Option B**: Supabase Vault (BEST)
```sql
-- Key stored in Supabase secrets vault
SELECT vault.encrypt('sensitive data', 'pii-encryption-key');
```

**Recommendation**: Use **Supabase Vault** for production (more secure)

---

## 🏗️ Implementation Plan

### Phase 1: Setup (Day 1)

#### 1.1 Enable pgcrypto Extension
```sql
-- Migration: 20251109_enable_pgcrypto.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

#### 1.2 Create Encryption/Decryption Helper Functions
```sql
-- Encryption function
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT)
RETURNS TEXT AS $$
BEGIN
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;

  -- Use pgcrypto AES-256
  RETURN encode(
    pgp_sym_encrypt(
      plaintext,
      current_setting('app.pii_encryption_key', TRUE),
      'cipher-algo=aes256'
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decryption function
CREATE OR REPLACE FUNCTION decrypt_pii(encrypted TEXT)
RETURNS TEXT AS $$
BEGIN
  IF encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN pgp_sym_decrypt(
    decode(encrypted, 'base64'),
    current_setting('app.pii_encryption_key', TRUE)
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails, return NULL (data may already be encrypted or corrupted)
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Security**:
- ✅ `SECURITY DEFINER`: Executes with creator's privileges
- ✅ `current_setting()`: Reads key from Supabase Vault
- ✅ Error handling: Prevents crashes on corrupted data

---

### Phase 2: Add Encrypted Columns (Day 2)

#### 2.1 Profiles Table
```sql
-- Migration: 20251109_add_encrypted_pii_columns_profiles.sql

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS address_line1_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS address_line2_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS postal_code_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS dni_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS gov_id_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS driver_license_number_encrypted TEXT;

-- Indexes for encrypted fields (needed for WHERE clauses)
CREATE INDEX IF NOT EXISTS idx_profiles_phone_encrypted
  ON profiles(phone_encrypted) WHERE phone_encrypted IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_dni_encrypted
  ON profiles(dni_encrypted) WHERE dni_encrypted IS NOT NULL;
```

#### 2.2 Bank Accounts Table
```sql
-- Migration: 20251109_add_encrypted_pii_columns_bank_accounts.sql

ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS account_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS account_holder_document_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS account_holder_name_encrypted TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_number_encrypted
  ON bank_accounts(account_number_encrypted) WHERE account_number_encrypted IS NOT NULL;
```

---

### Phase 3: Encrypt Existing Data (Day 3)

**CRITICAL**: This migration must be run during LOW TRAFFIC hours

```sql
-- Migration: 20251109_encrypt_existing_pii_data.sql

BEGIN;

-- Set encryption key (will be provided via environment variable)
-- SET app.pii_encryption_key = '<key-from-vault>';

-- PROFILES: Encrypt existing data
UPDATE profiles
SET
  phone_encrypted = encrypt_pii(phone),
  whatsapp_encrypted = encrypt_pii(whatsapp),
  address_line1_encrypted = encrypt_pii(address_line1),
  address_line2_encrypted = encrypt_pii(address_line2),
  postal_code_encrypted = encrypt_pii(postal_code),
  dni_encrypted = encrypt_pii(dni),
  gov_id_number_encrypted = encrypt_pii(gov_id_number),
  driver_license_number_encrypted = encrypt_pii(driver_license_number)
WHERE id IS NOT NULL; -- Encrypt all profiles

-- Verify encryption worked
DO $$
DECLARE
  total_profiles INT;
  encrypted_profiles INT;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM profiles WHERE phone IS NOT NULL;
  SELECT COUNT(*) INTO encrypted_profiles FROM profiles WHERE phone_encrypted IS NOT NULL;

  IF total_profiles != encrypted_profiles THEN
    RAISE EXCEPTION 'Encryption verification failed: % profiles with phone, but only % encrypted',
      total_profiles, encrypted_profiles;
  END IF;

  RAISE NOTICE 'Successfully encrypted % profiles', encrypted_profiles;
END $$;

-- BANK_ACCOUNTS: Encrypt existing data
UPDATE bank_accounts
SET
  account_number_encrypted = encrypt_pii(account_number),
  account_holder_document_encrypted = encrypt_pii(account_holder_document),
  account_holder_name_encrypted = encrypt_pii(account_holder_name)
WHERE id IS NOT NULL;

-- Verify
DO $$
DECLARE
  total_accounts INT;
  encrypted_accounts INT;
BEGIN
  SELECT COUNT(*) INTO total_accounts FROM bank_accounts;
  SELECT COUNT(*) INTO encrypted_accounts FROM bank_accounts WHERE account_number_encrypted IS NOT NULL;

  IF total_accounts != encrypted_accounts THEN
    RAISE EXCEPTION 'Bank account encryption verification failed: % accounts, but only % encrypted',
      total_accounts, encrypted_accounts;
  END IF;

  RAISE NOTICE 'Successfully encrypted % bank accounts', encrypted_accounts;
END $$;

COMMIT;
```

**Safety**:
- ✅ Transaction wrapping (ROLLBACK on error)
- ✅ Verification checks
- ✅ Error handling
- ✅ Progress logging

---

### Phase 4: Create Decryption Views (Day 4)

To maintain backward compatibility and avoid breaking existing queries:

```sql
-- Migration: 20251109_create_decrypted_pii_views.sql

-- View: profiles_decrypted (for authenticated users only)
CREATE OR REPLACE VIEW profiles_decrypted AS
SELECT
  id,
  -- Decrypted PII fields
  decrypt_pii(phone_encrypted) AS phone,
  decrypt_pii(whatsapp_encrypted) AS whatsapp,
  decrypt_pii(address_line1_encrypted) AS address_line1,
  decrypt_pii(address_line2_encrypted) AS address_line2,
  decrypt_pii(postal_code_encrypted) AS postal_code,
  decrypt_pii(dni_encrypted) AS dni,
  decrypt_pii(gov_id_number_encrypted) AS gov_id_number,
  decrypt_pii(driver_license_number_encrypted) AS driver_license_number,

  -- Non-PII fields (pass-through)
  avatar_url,
  full_name,
  city,
  state,
  country,
  email_verified,
  phone_verified,
  created_at,
  updated_at,
  is_admin,
  role,
  kyc,
  onboarding,
  -- ... (all other non-PII fields)

FROM profiles;

-- RLS Policy: Users can only see their own decrypted data
ALTER VIEW profiles_decrypted SET (security_invoker = on);
```

**Benefits**:
- ✅ Transparent decryption
- ✅ Existing queries continue working
- ✅ RLS policies enforced
- ✅ No application code changes needed

---

### Phase 5: Update Application Code (Day 5-6)

#### 5.1 Update Services to Use Encrypted Fields

**Before** (Insecure):
```typescript
// profiles.service.ts
async updateProfile(userId: string, data: ProfileUpdate) {
  const { data: profile, error } = await this.supabase
    .from('profiles')
    .update({
      phone: data.phone,  // ❌ PLAINTEXT
      address_line1: data.address,  // ❌ PLAINTEXT
    })
    .eq('id', userId);
}
```

**After** (Secure):
```typescript
// profiles.service.ts
async updateProfile(userId: string, data: ProfileUpdate) {
  const { data: profile, error } = await this.supabase
    .rpc('update_profile_encrypted', {
      p_user_id: userId,
      p_phone: data.phone,  // Will be encrypted by RPC function
      p_address_line1: data.address,
    });
}
```

#### 5.2 Create RPC Functions for Insert/Update

```sql
-- RPC: update_profile_encrypted
CREATE OR REPLACE FUNCTION update_profile_encrypted(
  p_user_id UUID,
  p_phone TEXT DEFAULT NULL,
  p_whatsapp TEXT DEFAULT NULL,
  p_address_line1 TEXT DEFAULT NULL,
  p_address_line2 TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_dni TEXT DEFAULT NULL,
  p_gov_id_number TEXT DEFAULT NULL,
  p_driver_license_number TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    phone_encrypted = COALESCE(encrypt_pii(p_phone), phone_encrypted),
    whatsapp_encrypted = COALESCE(encrypt_pii(p_whatsapp), whatsapp_encrypted),
    address_line1_encrypted = COALESCE(encrypt_pii(p_address_line1), address_line1_encrypted),
    address_line2_encrypted = COALESCE(encrypt_pii(p_address_line2), address_line2_encrypted),
    postal_code_encrypted = COALESCE(encrypt_pii(p_postal_code), postal_code_encrypted),
    dni_encrypted = COALESCE(encrypt_pii(p_dni), dni_encrypted),
    gov_id_number_encrypted = COALESCE(encrypt_pii(p_gov_id_number), gov_id_number_encrypted),
    driver_license_number_encrypted = COALESCE(encrypt_pii(p_driver_license_number), driver_license_number_encrypted),
    updated_at = NOW()
  WHERE id = p_user_id AND id = auth.uid(); -- RLS enforcement
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### Phase 6: Drop Plaintext Columns (Day 7) ⚠️ FINAL STEP

**CRITICAL**: Only do this after ALL services are updated and tested!

```sql
-- Migration: 20251109_drop_plaintext_pii_columns.sql
-- ⚠️ WARNING: This is IRREVERSIBLE. Ensure backups exist!

BEGIN;

-- Drop plaintext columns from profiles
ALTER TABLE profiles
  DROP COLUMN IF EXISTS phone CASCADE,
  DROP COLUMN IF EXISTS whatsapp CASCADE,
  DROP COLUMN IF EXISTS address_line1 CASCADE,
  DROP COLUMN IF EXISTS address_line2 CASCADE,
  DROP COLUMN IF EXISTS postal_code CASCADE,
  DROP COLUMN IF EXISTS dni CASCADE,
  DROP COLUMN IF EXISTS gov_id_number CASCADE,
  DROP COLUMN IF EXISTS driver_license_number CASCADE;

-- Drop plaintext columns from bank_accounts
ALTER TABLE bank_accounts
  DROP COLUMN IF EXISTS account_number CASCADE,
  DROP COLUMN IF EXISTS account_holder_document CASCADE,
  DROP COLUMN IF EXISTS account_holder_name CASCADE;

-- Rename encrypted columns to original names
ALTER TABLE profiles
  RENAME COLUMN phone_encrypted TO phone;
ALTER TABLE profiles
  RENAME COLUMN whatsapp_encrypted TO whatsapp;
-- ... (repeat for all fields)

ALTER TABLE bank_accounts
  RENAME COLUMN account_number_encrypted TO account_number;
-- ... (repeat for all fields)

COMMIT;
```

**Safety Checklist**:
- [ ] Database backup taken
- [ ] All services updated and tested
- [ ] Views working correctly
- [ ] RPC functions tested
- [ ] No critical queries using old columns
- [ ] Rollback plan documented

---

## 🔑 Encryption Key Management

### Key Generation

```bash
# Generate a secure 256-bit key
openssl rand -base64 32
# Example output: Qs7FZkM+k2x/VwL8j3YzN9pT4aB6cH5dE1fG2hI3jK4=
```

### Key Storage

**Development**:
```bash
# .env.local
PII_ENCRYPTION_KEY=Qs7FZkM+k2x/VwL8j3YzN9pT4aB6cH5dE1fG2hI3jK4=
```

**Production** (Supabase Vault):
```sql
-- Store in Supabase secrets vault
SELECT vault.create_secret('pii-encryption-key', 'Qs7FZkM+k2x/VwL8j3YzN9pT4aB6cH5dE1fG2hI3jK4=');

-- Access in functions
SELECT current_setting('app.pii_encryption_key', TRUE);
```

**GitHub Actions** (CI/CD):
```yaml
# .github/workflows/deploy.yml
env:
  PII_ENCRYPTION_KEY: ${{ secrets.PII_ENCRYPTION_KEY }}
```

---

## 📊 Performance Impact

### Estimated Overhead

| Operation | Before (ms) | After (ms) | Overhead |
|-----------|-------------|------------|----------|
| SELECT single profile | 5ms | 7ms | +40% |
| UPDATE profile | 10ms | 15ms | +50% |
| INSERT profile | 8ms | 12ms | +50% |
| Bulk SELECT (100) | 50ms | 80ms | +60% |

**Mitigation**:
- ✅ Use views for caching decrypted data
- ✅ Index encrypted columns
- ✅ Selective decryption (only needed fields)

**Trade-off**: Acceptable performance hit for GDPR compliance

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
describe('PII Encryption', () => {
  it('should encrypt phone number', async () => {
    const plaintext = '+54 11 1234-5678';
    const encrypted = await db.rpc('encrypt_pii', { plaintext });

    expect(encrypted).not.toEqual(plaintext);
    expect(encrypted.length).toBeGreaterThan(plaintext.length);
  });

  it('should decrypt to original value', async () => {
    const plaintext = '+54 11 1234-5678';
    const encrypted = await db.rpc('encrypt_pii', { plaintext });
    const decrypted = await db.rpc('decrypt_pii', { encrypted });

    expect(decrypted).toEqual(plaintext);
  });

  it('should handle NULL values', async () => {
    const encrypted = await db.rpc('encrypt_pii', { plaintext: null });
    expect(encrypted).toBeNull();
  });
});
```

### Integration Tests

- [ ] Update profile with encrypted fields
- [ ] Retrieve profile and verify decryption
- [ ] Search by encrypted field (using RPC)
- [ ] Verify RLS policies still enforce access control

### Manual Testing Checklist

- [ ] User can update phone number
- [ ] User can see their own phone number
- [ ] User CANNOT see other users' phone numbers
- [ ] Admin can see decrypted data (if authorized)
- [ ] Existing data migrated successfully
- [ ] No plaintext PII in database dumps

---

## 🔄 Rollback Plan

### If Issues Arise During Migration

**Step 1**: Stop the migration
```sql
ROLLBACK;  -- If still in transaction
```

**Step 2**: Restore from backup
```bash
supabase db restore <timestamp>
```

**Step 3**: Revert migration
```sql
-- Drop encrypted columns
ALTER TABLE profiles
  DROP COLUMN phone_encrypted,
  DROP COLUMN whatsapp_encrypted,
  -- ... (all encrypted columns)
```

**Step 4**: Document the issue and retry after fix

---

## 📋 Implementation Checklist

### Pre-Implementation

- [ ] Generate encryption key
- [ ] Store key in Supabase Vault
- [ ] Create database backup
- [ ] Test encryption functions in staging
- [ ] Review all queries using PII fields

### Implementation (7 days)

**Day 1: Setup**
- [ ] Enable pgcrypto extension
- [ ] Create encrypt_pii() function
- [ ] Create decrypt_pii() function
- [ ] Test functions in staging

**Day 2: Schema Changes**
- [ ] Add encrypted columns to profiles
- [ ] Add encrypted columns to bank_accounts
- [ ] Create indexes
- [ ] Deploy to staging

**Day 3: Data Migration**
- [ ] Schedule maintenance window (low traffic)
- [ ] Run encryption migration
- [ ] Verify all data encrypted
- [ ] Monitor for errors

**Day 4: Views & RPC**
- [ ] Create decrypted views
- [ ] Create RPC functions for insert/update
- [ ] Test views and RPCs
- [ ] Deploy to staging

**Day 5-6: Application Updates**
- [ ] Update profiles service
- [ ] Update bank accounts service
- [ ] Update all queries using PII
- [ ] Update tests
- [ ] Deploy to staging
- [ ] Run full test suite

**Day 7: Cleanup (OPTIONAL - can defer)**
- [ ] (OPTIONAL) Drop plaintext columns
- [ ] (OPTIONAL) Rename encrypted columns
- [ ] Final verification
- [ ] Deploy to production

### Post-Implementation

- [ ] Monitor performance metrics
- [ ] Monitor error rates
- [ ] Verify GDPR compliance
- [ ] Update documentation
- [ ] Train support team

---

## 🚨 Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Key Loss** | LOW | CRITICAL | Store key in multiple secure locations (Vault + 1Password) |
| **Migration Failure** | MEDIUM | HIGH | Transaction wrapping + verification + rollback plan |
| **Performance Degradation** | HIGH | MEDIUM | Optimize queries, use views, selective decryption |
| **Data Corruption** | LOW | CRITICAL | Comprehensive testing + backups + verification |
| **Application Breaking** | MEDIUM | HIGH | Phased rollout + backward-compatible views |

---

## 📚 References

- [PostgreSQL pgcrypto Documentation](https://www.postgresql.org/docs/current/pgcrypto.html)
- [GDPR Article 32](https://gdpr-info.eu/art-32-gdpr/)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
- [NIST Encryption Standards](https://csrc.nist.gov/publications/detail/sp/800-175b/rev-1/final)

---

## ✅ Success Criteria

**GDPR Compliance**: ✅ All PII fields encrypted at rest
**Zero Data Loss**: ✅ All existing data migrated successfully
**Performance**: ✅ <100ms overhead for profile operations
**Backward Compatibility**: ✅ Existing queries work via views
**Security**: ✅ Encryption key secured in Vault

---

## 🎯 Next Steps

1. **Review this plan** with team
2. **Generate encryption key** and store in Vault
3. **Create staging environment** backup
4. **Start Day 1 implementation** (enable pgcrypto)
5. **Progressive rollout**: staging → production

---

**Document Created**: 2025-11-09
**Owner**: Claude Code
**Effort**: 5-7 days
**Priority**: 🔴 P0 CRITICAL
**Status**: Ready for Implementation
