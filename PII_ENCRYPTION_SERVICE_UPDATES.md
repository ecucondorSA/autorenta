# PII Encryption - Service Updates Guide

**Status**: Ready for Implementation
**Priority**: P0 CRITICAL (Part of PII Encryption System)
**Estimated Time**: 2-3 hours

---

## 📋 Overview

This guide covers the Angular service updates needed to integrate with the PII encryption system deployed in the database.

**Dependencies**:
- ✅ `20251109_enable_pgcrypto_and_pii_encryption_functions.sql` deployed
- ✅ `20251109_add_encrypted_pii_columns.sql` deployed
- ✅ `20251109_encrypt_existing_pii_data.sql` deployed
- ✅ `20251109_create_decrypted_views_and_rpc_functions.sql` deployed

---

## 🎯 Changes Required

### 1. ProfileService Updates

**File**: `apps/web/src/app/core/services/profile.service.ts`

#### Change 1.1: Use `profiles_decrypted` view for reads

**Lines 54-58** - `getCurrentProfile()`:
```typescript
// ❌ BEFORE (insecure - reads plaintext)
const { data, error } = await this.supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

// ✅ AFTER (secure - reads decrypted PII)
const { data, error } = await this.supabase
  .from('profiles_decrypted')
  .select('*')
  .eq('id', user.id)
  .single();
```

**Lines 78-82** - `getProfileById()`:
```typescript
// ❌ BEFORE
const { data, error } = await this.supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// ✅ AFTER
const { data, error } = await this.supabase
  .from('profiles_decrypted')
  .select('*')
  .eq('id', userId)
  .single();
```

#### Change 1.2: Use RPC function for updates with PII

**Lines 92-121** - `updateProfile()`:
```typescript
// ❌ BEFORE (insecure - stores plaintext)
async updateProfile(updates: UpdateProfileData): Promise<UserProfile> {
  const { data: { user } } = await this.supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const payload: Record<string, unknown> = { ...updates };
  if (updates.tos_accepted_at === true) {
    payload.tos_accepted_at = new Date().toISOString();
  } else {
    delete payload.tos_accepted_at;
  }

  const { data, error } = await this.supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data as UserProfile;
}

// ✅ AFTER (secure - encrypts PII automatically)
async updateProfile(updates: UpdateProfileData): Promise<UserProfile> {
  const { data: { user } } = await this.supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  // Prepare payload
  const payload: Record<string, unknown> = { ...updates };
  if (updates.tos_accepted_at === true) {
    payload.tos_accepted_at = new Date().toISOString();
  } else {
    delete payload.tos_accepted_at;
  }

  // Use RPC function for encrypted updates
  const { data, error } = await this.supabase
    .rpc('update_profile_with_encryption', {
      p_user_id: user.id,
      p_updates: payload as unknown as Record<string, unknown>
    });

  if (error) throw error;

  // Verify success
  if (!data || !data.success) {
    throw new Error(data?.error || 'Failed to update profile');
  }

  // Fetch and return updated profile
  return await this.getCurrentProfile() as UserProfile;
}
```

**IMPORTANT**: Keep `createProfile()`, `completeOnboarding()`, and `acceptTOS()` unchanged:
- `createProfile()` - Triggers handle encryption automatically
- `completeOnboarding()` - Updates non-PII field (`onboarding`)
- `acceptTOS()` - Updates non-PII field (`tos_accepted_at`)

---

### 2. WithdrawalService Updates

**File**: `apps/web/src/app/core/services/withdrawal.service.ts`

#### Change 2.1: Use `bank_accounts_decrypted` view for reads

**Lines 108-113** - `getBankAccounts()`:
```typescript
// ❌ BEFORE (insecure - reads plaintext)
const { data, error } = await this.supabase
  .getClient()
  .from('bank_accounts')
  .select('*')
  .order('is_default', { ascending: false })
  .order('created_at', { ascending: false });

// ✅ AFTER (secure - reads decrypted PII)
const { data, error } = await this.supabase
  .getClient()
  .from('bank_accounts_decrypted')
  .select('*')
  .order('is_default', { ascending: false })
  .order('created_at', { ascending: false });
```

#### Change 2.2: Use RPC function for creating bank accounts

**Lines 148-162** - `addBankAccount()`:
```typescript
// ❌ BEFORE (insecure - stores plaintext)
const { data, error } = await this.supabase
  .getClient()
  .from('bank_accounts')
  .insert({
    account_type: params.account_type,
    account_number: params.account_number,
    account_holder_name: params.account_holder_name,
    account_holder_document: params.account_holder_document,
    bank_name: params.bank_name,
    is_active: true,
    is_default: this.bankAccounts().length === 0,
  })
  .select()
  .single();

// ✅ AFTER (secure - encrypts PII automatically)
const { data: accountId, error } = await this.supabase
  .getClient()
  .rpc('add_bank_account_with_encryption', {
    p_account_number: params.account_number,
    p_account_holder_document: params.account_holder_document,
    p_account_holder_name: params.account_holder_name,
    p_account_type: params.account_type,
    p_bank_name: params.bank_name
  });

if (error) {
  throw this.createError('ADD_BANK_ACCOUNT_ERROR', error.message, error);
}

// Fetch the created account
const { data: accounts, error: fetchError } = await this.supabase
  .getClient()
  .from('bank_accounts_decrypted')
  .select('*')
  .eq('id', accountId)
  .single();

if (fetchError) {
  throw this.createError('FETCH_BANK_ACCOUNT_ERROR', fetchError.message, fetchError);
}

const account = accounts as BankAccount;

// Set as default if first account
if (this.bankAccounts().length === 0) {
  await this.setDefaultBankAccount(accountId);
}
```

**IMPORTANT**: Keep `deleteBankAccount()` unchanged - it only deletes by ID (no PII manipulation).

---

## 🧪 Testing Checklist

### Unit Tests (ProfileService)

```typescript
// Test 1: getCurrentProfile() uses decrypted view
it('should fetch current profile with decrypted PII', async () => {
  const profile = await profileService.getCurrentProfile();
  expect(profile.phone).toBe('+54 11 1234-5678'); // Decrypted
  expect(profile.dni).toBe('12345678'); // Decrypted
});

// Test 2: updateProfile() encrypts PII
it('should update profile with PII encryption', async () => {
  const updated = await profileService.updateProfile({
    phone: '+54 11 9999-8888',
    city: 'Buenos Aires'
  });

  // Verify update succeeded
  expect(updated.phone).toBe('+54 11 9999-8888');

  // Verify data was encrypted in DB (manual check)
  // SELECT phone_encrypted FROM profiles WHERE id = <user-id>
});

// Test 3: NULL handling
it('should handle NULL PII fields correctly', async () => {
  const updated = await profileService.updateProfile({
    phone: null,
    whatsapp: '+54 11 5555-5555'
  });

  expect(updated.phone).toBeNull();
  expect(updated.whatsapp).toBe('+54 11 5555-5555');
});
```

### Unit Tests (WithdrawalService)

```typescript
// Test 1: getBankAccounts() uses decrypted view
it('should fetch bank accounts with decrypted PII', async () => {
  const accounts = await withdrawalService.getBankAccounts();
  expect(accounts[0].account_number).toMatch(/^\d{22}$/); // Decrypted CBU
  expect(accounts[0].account_holder_name).toBeTruthy(); // Decrypted
});

// Test 2: addBankAccount() encrypts PII
it('should add bank account with PII encryption', async () => {
  const account = await withdrawalService.addBankAccount({
    account_type: 'cbu',
    account_number: '1234567890123456789012',
    account_holder_name: 'Juan Pérez',
    account_holder_document: '12345678',
    bank_name: 'Banco Test'
  });

  expect(account.id).toBeTruthy();
  expect(account.account_number).toBe('1234567890123456789012');

  // Verify encryption in DB (manual check)
  // SELECT account_number_encrypted FROM bank_accounts WHERE id = <account-id>
});
```

### Integration Tests

```typescript
// Test 1: Full profile update flow
it('should update profile and fetch decrypted data', async () => {
  // Update
  await profileService.updateProfile({
    phone: '+54 11 1111-2222',
    dni: '87654321',
    city: 'Córdoba'
  });

  // Fetch
  const profile = await profileService.getCurrentProfile();

  // Verify
  expect(profile.phone).toBe('+54 11 1111-2222');
  expect(profile.dni).toBe('87654321');
  expect(profile.city).toBe('Córdoba');
});

// Test 2: Full bank account flow
it('should add bank account and fetch decrypted data', async () => {
  // Add
  const account = await withdrawalService.addBankAccount({
    account_type: 'cvu',
    account_number: '0000003100012345678901',
    account_holder_name: 'María González',
    account_holder_document: '23456789',
    bank_name: 'Mercado Pago'
  });

  // Fetch
  const accounts = await withdrawalService.getBankAccounts();
  const found = accounts.find(a => a.id === account.id);

  // Verify
  expect(found).toBeTruthy();
  expect(found?.account_number).toBe('0000003100012345678901');
  expect(found?.account_holder_name).toBe('María González');
});
```

### Manual Testing (Web App)

**Profile Updates**:
1. Login as test user
2. Navigate to Profile → Edit Profile
3. Update phone number: `+54 11 9876-5432`
4. Save changes
5. Refresh page
6. ✅ Verify phone displays correctly
7. Check DB: `SELECT phone_encrypted FROM profiles WHERE id = '<user-id>'`
8. ✅ Verify it's base64-encoded (encrypted)

**Bank Accounts**:
1. Login as test user
2. Navigate to Wallet → Bank Accounts
3. Add new account (CBU: `1234567890123456789012`)
4. Save
5. Refresh page
6. ✅ Verify account number displays correctly
7. Check DB: `SELECT account_number_encrypted FROM bank_accounts WHERE id = '<account-id>'`
8. ✅ Verify it's base64-encoded (encrypted)

---

## 🚨 Common Issues & Solutions

### Issue 1: RPC function not found

**Error**: `function update_profile_with_encryption() does not exist`

**Solution**:
```sql
-- Verify RPC function exists
SELECT proname FROM pg_proc WHERE proname = 'update_profile_with_encryption';

-- If missing, re-run migration:
psql $DATABASE_URL < supabase/migrations/20251109_create_decrypted_views_and_rpc_functions.sql
```

### Issue 2: View returns NULL for PII fields

**Error**: Phone/DNI fields are NULL after update

**Possible Causes**:
1. Encryption key not configured
2. Data not encrypted yet

**Solution**:
```sql
-- Check encryption key
SHOW app.pii_encryption_key;

-- Test encryption/decryption
SELECT encrypt_pii('test data');
SELECT decrypt_pii(encrypt_pii('test data'));

-- Check if data is encrypted
SELECT phone, phone_encrypted FROM profiles WHERE id = '<user-id>';
```

### Issue 3: TypeScript type errors

**Error**: Type mismatch on RPC function parameters

**Solution**:
```bash
# Regenerate Supabase types
npm run sync:types

# Verify types include new views and RPC functions
# Check: apps/web/src/types/supabase.types.ts
```

### Issue 4: Performance degradation

**Symptom**: Slow profile/bank account queries

**Solution**:
```sql
-- Check if indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename IN ('profiles', 'bank_accounts')
  AND indexname LIKE '%encrypted%';

-- Verify query performance
EXPLAIN ANALYZE
SELECT * FROM profiles_decrypted WHERE id = '<user-id>';

-- Should complete in < 10ms
```

---

## 📊 Rollback Procedure

If issues arise after deployment:

### Option 1: Revert to Direct Table Access (Fast)

```typescript
// ProfileService - revert to direct table access
this.supabase.from('profiles').select('*')  // Instead of profiles_decrypted

// WithdrawalService - revert to direct table access
this.supabase.from('bank_accounts').select('*')  // Instead of bank_accounts_decrypted
```

**Note**: Data is still encrypted in DB, but this reads plaintext columns (which still exist during migration period).

### Option 2: Full Rollback (Database + Services)

1. Revert service changes (git revert)
2. Drop views and RPC functions:
```sql
DROP VIEW IF EXISTS profiles_decrypted CASCADE;
DROP VIEW IF EXISTS bank_accounts_decrypted CASCADE;
DROP FUNCTION IF EXISTS update_profile_with_encryption CASCADE;
DROP FUNCTION IF EXISTS add_bank_account_with_encryption CASCADE;
```

3. Encrypted columns remain (data is safe), plaintext columns still work

---

## ✅ Success Criteria

- [ ] ProfileService uses `profiles_decrypted` view for reads
- [ ] ProfileService uses `update_profile_with_encryption()` RPC for updates
- [ ] WithdrawalService uses `bank_accounts_decrypted` view for reads
- [ ] WithdrawalService uses `add_bank_account_with_encryption()` RPC for inserts
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual testing confirms data displays correctly
- [ ] Database audit confirms data is encrypted
- [ ] No performance degradation (< 10ms overhead)
- [ ] TypeScript compilation successful
- [ ] Linter passes
- [ ] CI/CD pipeline green

---

## 📝 Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor error logs for decryption failures
- [ ] Verify encryption coverage (100% of PII fields)
- [ ] Check query performance metrics
- [ ] Test profile updates with real users

### Week 1
- [ ] Performance optimization if needed
- [ ] Review error rates (should be 0%)
- [ ] User feedback collection
- [ ] Update API documentation

### Month 1
- [ ] Consider dropping plaintext columns (OPTIONAL)
- [ ] Full GDPR compliance audit
- [ ] Security penetration test
- [ ] Key rotation plan

---

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Status**: Ready for Implementation
**Estimated Implementation Time**: 2-3 hours
