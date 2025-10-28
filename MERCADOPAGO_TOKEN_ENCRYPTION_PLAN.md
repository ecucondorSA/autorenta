# AES-256 Encryption Implementation Plan for MercadoPago Tokens
## AutoRenta Application - Security Enhancement

---

## EXECUTIVE SUMMARY

**Critical Security Issue**: MercadoPago OAuth tokens (access_token, refresh_token) are currently stored in **plaintext** in the `profiles` table, violating PCI DSS compliance requirements.

**Deliverable**: Implement field-level AES-256-GCM encryption for MercadoPago tokens with client-side encryption service, Supabase RPC functions, and secure migration strategy.

**Timeline**: 2-3 hours
**Risk Level**: High (production-blocking security issue)

---

## CURRENT STATE ANALYSIS

### 1. Token Storage Location
- **Table**: `profiles` (Supabase)
- **Columns** (plaintext):
  - `mercadopago_access_token` - OAuth access token (temporary, expires in hours/days)
  - `mercadopago_refresh_token` - OAuth refresh token (long-lived, used to get new access tokens)
- **Migration**: `supabase/migrations/20251028_add_mercadopago_oauth_to_profiles.sql` (lines 16-17)

### 2. Token Lifecycle

```
User triggers OAuth flow
    ↓
MarketplaceOnboardingService.startOnboarding()
    ↓
User authorizes on MercadoPago
    ↓
MarketplaceOnboardingService.handleCallback()
    ↓
exchangeCodeForToken() → HTTP POST to MP API
    ↓
saveMarketplaceCredentials() [LINE 354]
    ↓
❌ PLAINTEXT STORAGE (SECURITY ISSUE)
    ↓
supabase.from('users').update({
  mp_access_token_encrypted: tokenResponse.access_token,  // ⚠️ NOT ACTUALLY ENCRYPTED
  mp_refresh_token_encrypted: tokenResponse.refresh_token
})
```

**Note**: Column names suggest encryption (`_encrypted` suffix) but implementation is plaintext!

### 3. Services Involved
- **Frontend**: `MarketplaceOnboardingService` (`marketplace-onboarding.service.ts` - 427 lines)
- **Frontend**: `MercadopagoOAuthService` (`mercadopago-oauth.service.ts`)
- **Database**: `profiles` table with RLS policies
- **Existing Encryption**: Message encryption using pgcrypto (`20251028_fix_encryption_functions.sql`)

---

## SECURITY REQUIREMENTS

### PCI DSS Compliance
- OAuth tokens must not be stored in plaintext
- Encryption must use strong algorithms (AES-256 minimum)
- Encryption keys must be managed securely
- IV/nonce must be random for each encryption

### Data Protection Level
- **Access Token**: Expires in hours/days → MEDIUM sensitivity
- **Refresh Token**: Long-lived, gets new access tokens → HIGH sensitivity
- **Collector ID**: Public identifier → LOW sensitivity (can remain plaintext)

### Encryption Strategy
- **Location**: Client-side encryption in Angular service
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Management**: Environment variable (ENCRYPTION_KEY)
- **IV**: Random per encryption (included in ciphertext)
- **Format**: Base64-encoded string with salt+IV+authTag+ciphertext

---

## IMPLEMENTATION PLAN

### Phase 1: Create EncryptionService

**File**: `apps/web/src/app/core/services/encryption.service.ts`

**Functionality**:
```typescript
// Encrypt token with random IV
encrypt(plaintext: string, key: string): Promise<string>
  - Generates random salt (16 bytes)
  - Generates random IV (12 bytes)
  - Derives key using PBKDF2 (iterations=100000)
  - Encrypts using AES-256-GCM
  - Returns: base64(salt + IV + authTag + ciphertext)

// Decrypt token
decrypt(encryptedData: string, key: string): Promise<string>
  - Decodes base64
  - Extracts salt, IV, authTag, ciphertext
  - Derives key using PBKDF2 with same salt
  - Decrypts using AES-256-GCM
  - Returns plaintext token
```

**Key Considerations**:
- Use Web Crypto API (native, no external dependencies)
- PBKDF2 for key derivation from environment string
- AES-256-GCM for authenticated encryption
- Random salt per encryption
- Fully asynchronous (Promise-based)

### Phase 2: Create Supabase Migration

**File**: `supabase/migrations/20251028_add_token_encryption.sql`

**Changes**:
```sql
-- Add encrypted columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mercadopago_access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_refresh_token_encrypted TEXT;

-- Keep old columns during transition (backwards compatibility)
-- Will be dropped in future release after migration complete
```

### Phase 3: Update MarketplaceOnboardingService

**File**: `apps/web/src/app/core/services/marketplace-onboarding.service.ts`

**Changes** (in `saveMarketplaceCredentials()` method, line 354):

```typescript
// NEW - encrypted storage with EncryptionService
const encryptionKey = environment.encryptionKey;
const encryptedAccessToken = await this.encryptionService.encrypt(
  tokenResponse.access_token,
  encryptionKey
);
const encryptedRefreshToken = await this.encryptionService.encrypt(
  tokenResponse.refresh_token,
  encryptionKey
);

const { error } = await this.supabase
  .from('profiles')
  .update({
    mercadopago_collector_id: tokenResponse.user_id,
    marketplace_approved: true,
    mp_onboarding_completed_at: new Date().toISOString(),
    mercadopago_access_token_encrypted: encryptedAccessToken,
    mercadopago_refresh_token_encrypted: encryptedRefreshToken,
    mercadopago_access_token_expires_at: expiresAt,
  })
  .eq('id', userId);
```

**Additional Updates**:
- `unlinkAccount()` - clear encrypted columns
- `refreshAccessToken()` - encrypt new token before saving
- Add dependency: `EncryptionService` via `inject()`

### Phase 4: Environment Variables

**File**: `apps/web/.env.example`

```bash
# Encryption key for MercadoPago tokens (AES-256)
# Generate with: openssl rand -hex 32
NG_APP_ENCRYPTION_KEY=your_32_byte_hex_key_here
```

**Environment Integration**:
```typescript
// environment.base.ts
encryptionKey?: string;

// Build function
encryptionKey: resolve('NG_APP_ENCRYPTION_KEY', defaults.encryptionKey),
```

### Phase 5: Migration Strategy

**Approach**: Two-Column Transition
1. Deploy migration with new encrypted columns
2. New tokens are encrypted immediately
3. On next user session: old plaintext → encrypt → save to new column
4. After 1-2 releases: delete old plaintext columns

**No external dependencies** - all encryption happens client-side using Web Crypto API.

---

## FILES TO CREATE/MODIFY

| File | Action | Status |
|------|--------|--------|
| `encryption.service.ts` | CREATE | Ready to implement |
| `marketplace-onboarding.service.ts` | MODIFY | Lines 354-380 |
| `20251028_add_token_encryption.sql` | CREATE | Simple schema migration |
| `environment.base.ts` | MODIFY | Add encryptionKey field |
| `.env.example` | MODIFY | Document new variable |
| `database.types.ts` | MODIFY | Update Profile interface |
| `mercadopago-oauth.service.ts` | MODIFY | Decrypt tokens on read |

---

## DETAILED TECHNICAL SPECIFICATIONS

### EncryptionService Implementation

**Web Crypto API (SubtleCrypto)**:

```typescript
class EncryptionService {
  async encrypt(plaintext: string, keyString: string): Promise<string> {
    // 1. Generate random salt (16 bytes)
    // 2. Derive key using PBKDF2 (100k iterations, SHA-256)
    // 3. Generate random IV (12 bytes)
    // 4. Encrypt using AES-256-GCM
    // 5. Return base64(salt || IV || authTag || ciphertext)
  }

  async decrypt(encrypted: string, keyString: string): Promise<string> {
    // 1. Decode base64
    // 2. Extract salt (0-16), IV (16-28), authTag (28-44), ciphertext (44+)
    // 3. Derive key using PBKDF2 with same salt
    // 4. Decrypt and verify authTag
    // 5. Return plaintext
  }
}
```

**No External Dependencies**: Uses native Web Crypto API available in all modern browsers.

---

## SECURITY CONSIDERATIONS

### Encryption Key Management
- **Storage**: Environment variable only
- **Rotation**: Document procedure (decrypt old → encrypt new)
- **Exposure**: Treat like auth secrets (never commit)
- **Backup**: Store in Cloudflare Pages vault

### IV/Salt Randomization
- **Salt**: Generated once per encryption (stored in ciphertext)
- **IV**: Generated per encryption operation (12 bytes for GCM)
- **Purpose**: Prevent patterns and rainbow table attacks

### Authentication Tag
- **GCM Mode**: Provides encryption + authentication
- **Tag Size**: 16 bytes (standard)
- **Verified**: Automatically checked on decryption (fails if tampered)

### Key Derivation
- **PBKDF2**: Industry standard for deriving cryptographic keys
- **Iterations**: 100,000 (balances security and performance)
- **Hash**: SHA-256
- **Purpose**: Prevent simple key extraction from environment variable

---

## TESTING STRATEGY

### Unit Tests
- Encrypt/decrypt roundtrip
- Different token lengths
- Special characters handling
- Wrong key fails gracefully
- Empty/null handling
- IV/salt randomization

### Integration Tests
- OAuth flow with encryption
- Token refresh with encryption
- RLS policy verification
- Database persistence

### Security Tests
- Key rotation scenarios
- Encrypted data integrity
- Decryption with wrong key (must fail)
- No plaintext leakage

---

## MIGRATION PATH

```
Current State (Day 1):
├── mercadopago_access_token (plaintext) ❌
├── mercadopago_refresh_token (plaintext) ❌
└── saveMarketplaceCredentials() stores plaintext

After Deployment:
├── mercadopago_access_token (plaintext) ← keep for compatibility
├── mercadopago_refresh_token (plaintext) ← keep for compatibility
├── mercadopago_access_token_encrypted (new, encrypted) ✓
├── mercadopago_refresh_token_encrypted (new, encrypted) ✓
└── saveMarketplaceCredentials() stores encrypted

After User Session:
├── User logs in → EncryptionService reads old plaintext
├── Encrypts and saves to new columns
├── Clears old plaintext columns (or marks as migrated)
└── Next session uses encrypted columns only

Production (Week 2):
├── All new tokens encrypted
├── Old tokens migrated on user login
└── Old plaintext columns can be dropped
```

---

## ROLLBACK PLAN

If issues occur:

1. **Keep old plaintext columns** - no schema rollback needed
2. **Revert code changes** - restore original saveMarketplaceCredentials()
3. **Check encryption key** - verify NG_APP_ENCRYPTION_KEY is set
4. **Test migration** - validate encrypt/decrypt roundtrip

---

## SUCCESS CRITERIA

1. ✓ MercadoPago tokens encrypted before storage
2. ✓ AES-256-GCM with authenticated encryption
3. ✓ Zero plaintext tokens in new installations
4. ✓ Existing tokens migrated on user login
5. ✓ RLS policies protect encrypted data
6. ✓ Encryption key managed via environment
7. ✓ Full backwards compatibility during transition
8. ✓ PCI DSS compliance achieved
9. ✓ No external dependencies (Web Crypto API only)
10. ✓ Unit tests with >80% coverage

---

## NEXT STEPS

1. Review this implementation plan
2. Create EncryptionService (provided in next step)
3. Implement Supabase migration
4. Update MarketplaceOnboardingService
5. Configure environment variables
6. Write unit tests
7. Manual testing of OAuth flow
8. Deploy to production

