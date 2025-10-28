# Token Encryption Architecture Diagram
## AutoRenta - MercadoPago OAuth Token Security

---

## Current Architecture (INSECURE)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT STATE (PLAINTEXT)                    │
└─────────────────────────────────────────────────────────────────┘

User clicks "Connect MercadoPago"
        ↓
┌─────────────────────────────────────┐
│ MarketplaceOnboardingService        │
│ startOnboarding()                   │
└─────────────────────────────────────┘
        ↓
User authorizes on MercadoPago OAuth
        ↓
┌─────────────────────────────────────┐
│ MarketplaceOnboardingService        │
│ handleCallback(code, state)         │
├─────────────────────────────────────┤
│ 1. validateState()                  │
│ 2. exchangeCodeForToken()           │
│ 3. saveMarketplaceCredentials() ❌  │ ← PLAINTEXT STORAGE
└─────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────┐
│ Supabase profiles Table                                      │
├──────────────────────────────────────────────────────────────┤
│ id                                  | uuid                   │
│ mercadopago_collector_id            | "123456789"            │
│ mercadopago_access_token            | "plaintext_token..." ❌│
│ mercadopago_refresh_token           | "plaintext_token..." ❌│
│ mercadopago_access_token_expires_at | 2025-10-29T10:30:00Z  │
└──────────────────────────────────────────────────────────────┘

SECURITY ISSUE:
- Database breach = Token compromise
- No authentication verification
- Violates PCI DSS compliance
```

---

## Proposed Architecture (SECURE)

```
┌─────────────────────────────────────────────────────────────────┐
│              PROPOSED STATE (AES-256-GCM ENCRYPTED)             │
└─────────────────────────────────────────────────────────────────┘

User clicks "Connect MercadoPago"
        ↓
┌─────────────────────────────────────┐
│ MarketplaceOnboardingService        │
│ startOnboarding()                   │
└─────────────────────────────────────┘
        ↓
User authorizes on MercadoPago OAuth
        ↓
┌──────────────────────────────────────────────────────────────┐
│ MarketplaceOnboardingService                                 │
│ handleCallback(code, state)                                  │
├──────────────────────────────────────────────────────────────┤
│ 1. validateState()                                           │
│ 2. exchangeCodeForToken()                                    │
│ 3. saveMarketplaceCredentials()                              │
│    ↓                                                          │
│    await encryptionService.encrypt(access_token, key) ✓      │
│    await encryptionService.encrypt(refresh_token, key) ✓     │
│    ↓                                                          │
│    Store encrypted data                                      │
└──────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────┐
│ Supabase profiles Table (SECURE)                             │
├──────────────────────────────────────────────────────────────┤
│ id                                  | uuid                    │
│ mercadopago_collector_id            | "123456789"             │
│ mercadopago_access_token (old)      | NULL or plaintext      │
│ mercadopago_refresh_token (old)     | NULL or plaintext      │
│ mercadopago_access_token_encrypted  | "base64(...)" ✓        │
│ mercadopago_refresh_token_encrypted | "base64(...)" ✓        │
│ mercadopago_access_token_expires_at | 2025-10-29T10:30:00Z   │
└──────────────────────────────────────────────────────────────┘

SECURITY BENEFITS:
- Database breach = Encrypted tokens (worthless without key)
- Authentication verification via GCM tag
- PCI DSS compliant encryption
- No external dependencies (Web Crypto API)
```

---

## EncryptionService Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION PROCESS                            │
└─────────────────────────────────────────────────────────────────┘

encrypt(plaintext, keyString)
    ↓
1. Generate Random Salt (16 bytes)
    [A1 B2 C3 D4 E5 F6 ...]
    ↓
2. PBKDF2 Key Derivation
    Input:  keyString (from environment variable)
    Salt:   [generated random salt]
    Rounds: 100,000 iterations
    Hash:   SHA-256
    Output: 256-bit derived key
    ↓
3. Generate Random IV (12 bytes)
    [X9 Y8 Z7 W6 V5 U4 ...]
    ↓
4. AES-256-GCM Encryption
    Key:       [derived key from step 2]
    IV:        [generated IV from step 3]
    Plaintext: access_token or refresh_token
    Mode:      Galois/Counter Mode (authenticated)
    Output:    Ciphertext + Authentication Tag (16 bytes)
    ↓
5. Concatenate Components
    [Salt (16)] || [IV (12)] || [AuthTag (16)] || [Ciphertext (var)]
    ↓
6. Base64 Encode
    Output: "aGVsbG8gd29ybGQgdGhpcyBpcyBhIGV...==" (safe for TEXT column)
    ↓
Result: Encrypted token ready for storage

┌─────────────────────────────────────────────────────────────────┐
│                    DECRYPTION PROCESS                            │
└─────────────────────────────────────────────────────────────────┘

decrypt(encryptedData, keyString)
    ↓
1. Base64 Decode
    Input:  "aGVsbG8gd29ybGQgdGhpcyBpcyBhIGV...=="
    Output: [bytes]
    ↓
2. Extract Components
    Salt:       [first 16 bytes]
    IV:         [next 12 bytes]
    AuthTag:    [next 16 bytes]
    Ciphertext: [remaining bytes]
    ↓
3. PBKDF2 Key Derivation
    Input:  keyString (from environment variable)
    Salt:   [extracted salt from step 2]
    Rounds: 100,000 iterations
    Hash:   SHA-256
    Output: 256-bit derived key (same as encryption!)
    ↓
4. AES-256-GCM Decryption
    Key:        [derived key from step 3]
    IV:         [extracted IV from step 2]
    Ciphertext: [extracted ciphertext]
    AuthTag:    [extracted auth tag]
    Mode:       Galois/Counter Mode
    Verify:     Check AuthTag (FAILS if tampered)
    Output:     Plaintext token
    ↓
Result: Original access_token or refresh_token
```

---

## Service Dependency Injection

```
┌────────────────────────────────────────────────────────────────┐
│         Angular Dependency Injection Architecture               │
└────────────────────────────────────────────────────────────────┘

MarketplaceOnboardingService
│
├── SupabaseClientService (existing)
│   └── getClient() → SupabaseClient
│
├── EncryptionService (NEW)
│   ├── encrypt(plaintext, key): Promise<string>
│   └── decrypt(encryptedData, key): Promise<string>
│
└── environment (existing)
    └── encryptionKey: string (from .env)

Usage in saveMarketplaceCredentials():
    const encryptionKey = this.environment.encryptionKey;
    const encrypted = await this.encryptionService.encrypt(token, encryptionKey);
    
    await this.supabase.from('profiles').update({
        mercadopago_access_token_encrypted: encrypted
    })
```

---

## Environment Configuration

```
┌────────────────────────────────────────────────────────────────┐
│           Environment Variable Resolution Chain                 │
└────────────────────────────────────────────────────────────────┘

BUILD TIME: .env.local
    ↓
    NG_APP_ENCRYPTION_KEY=abc123def456...
    
    ↓
    
BUILD: environment.base.ts::buildEnvironment()
    ↓
    resolve('NG_APP_ENCRYPTION_KEY')
    
    ↓
    
RUNTIME: environment object
    ↓
    environment.encryptionKey → "abc123def456..."
    
    ↓
    
APPLICATION: MarketplaceOnboardingService
    ↓
    this.encryptionService.encrypt(token, environment.encryptionKey)

KEY REQUIREMENT:
- Must be 32 bytes of hex-encoded data (64 hex characters)
- Generate with: openssl rand -hex 32
- Store in .env.local (git-ignored)
- Never commit to version control
```

---

## Data Format Specification

```
┌────────────────────────────────────────────────────────────────┐
│              Encrypted Token Format in Database                 │
└────────────────────────────────────────────────────────────────┘

Raw Bytes Structure:
┌─────────┬──────┬────────┬──────────────────┐
│  Salt   │  IV  │ AuthTag│   Ciphertext     │
│ 16 bytes│12 by│ 16 by │ token_length by │
└─────────┴──────┴────────┴──────────────────┘

Encoded:
base64([Salt || IV || AuthTag || Ciphertext])

Example (Actual):
- Token: "APP_USR-1234567890-ABCDEFGHIJK..." (40-50 chars)
- Encrypted: "aGVsbG8gd29ybGQgdGhpcyBpcyBhIGVuY3J5..." (60-90 chars)

Storage Location:
profiles.mercadopago_access_token_encrypted → TEXT column
profiles.mercadopago_refresh_token_encrypted → TEXT column

Size Calculation:
- Salt: 16 bytes
- IV: 12 bytes
- AuthTag: 16 bytes
- Ciphertext: ~40 bytes (for 30-50 char token)
- Total: ~84 bytes
- Base64 encoded: ~112 characters (safe for TEXT)
- Overhead: +84 bytes per encrypted token (acceptable)
```

---

## Database Schema Transition

```
┌────────────────────────────────────────────────────────────────┐
│        Migration Strategy: Two-Column Transition                │
└────────────────────────────────────────────────────────────────┘

PHASE 1: ADD NEW COLUMNS (Day 1)
┌─────────────────────────────────────────────────────────────┐
ALTER TABLE profiles
ADD COLUMN mercadopago_access_token_encrypted TEXT,
ADD COLUMN mercadopago_refresh_token_encrypted TEXT;
└─────────────────────────────────────────────────────────────┘

RESULT: Both columns exist, new ones are NULL
├── mercadopago_access_token (old, plaintext, populated)
├── mercadopago_refresh_token (old, plaintext, populated)
├── mercadopago_access_token_encrypted (new, encrypted, NULL)
└── mercadopago_refresh_token_encrypted (new, encrypted, NULL)

PHASE 2: USE NEW COLUMNS (Day 1+)
┌─────────────────────────────────────────────────────────────┐
saveMarketplaceCredentials() now:
1. Encrypts both tokens
2. Saves to new encrypted columns
3. Leaves old plaintext columns untouched
└─────────────────────────────────────────────────────────────┘

RESULT: All NEW tokens encrypted, OLD tokens remain plaintext
├── mercadopago_access_token (old plaintext, used by existing tokens)
├── mercadopago_refresh_token (old plaintext, used by existing tokens)
├── mercadopago_access_token_encrypted (new encrypted, populated)
└── mercadopago_refresh_token_encrypted (new encrypted, populated)

PHASE 3: MIGRATE EXISTING TOKENS (Days 2-7)
┌─────────────────────────────────────────────────────────────┐
On next user login:
1. Check if old plaintext token exists
2. Encrypt using EncryptionService
3. Save to new encrypted columns
4. Clear old plaintext columns
└─────────────────────────────────────────────────────────────┘

RESULT: All tokens encrypted (old migrated, new created encrypted)
├── mercadopago_access_token (deprecated, NULL after migration)
├── mercadopago_refresh_token (deprecated, NULL after migration)
├── mercadopago_access_token_encrypted (populated)
└── mercadopago_refresh_token_encrypted (populated)

PHASE 4: CLEANUP (Week 2+)
┌─────────────────────────────────────────────────────────────┐
After 1-2 releases (ensure all users migrated):
1. Drop old plaintext columns
2. Rename new encrypted columns to standard names (optional)
3. Full compliance achieved
└─────────────────────────────────────────────────────────────┘

RESULT: Clean schema, all encrypted, backward compatible removed
├── mercadopago_access_token_encrypted → mercadopago_access_token
└── mercadopago_refresh_token_encrypted → mercadopago_refresh_token
```

---

## RLS Policy Protection

```
┌────────────────────────────────────────────────────────────────┐
│        Row Level Security: Token Column Protection              │
└────────────────────────────────────────────────────────────────┘

EXISTING RLS POLICY (Already Protects Encrypted Columns):
┌─────────────────────────────────────────────────────────────┐
"Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id)

"Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
└─────────────────────────────────────────────────────────────┘

PROTECTION SCOPE:
✓ Only the authenticated user can view their own profile
✓ This includes the new encrypted token columns
✓ Other users cannot see tokens (encrypted or plaintext)
✓ No additional RLS policies needed (inherited from profiles table)

ENFORCEMENT LEVEL:
- SELECT: User can only read their own profile (auth.uid() = id)
- UPDATE: User can only update their own profile (auth.uid() = id)
- DELETE: User can only delete their own profile (auth.uid() = id)
- INSERT: Not applicable to UPDATE operations

EXAMPLE ENFORCEMENT:
User A tries to SELECT from profiles:
    SELECT * FROM profiles WHERE id = user_b_id
    
RLS CHECK: auth.uid() = profiles.id
    User A uid ≠ User B id → Query blocked ❌
    
Result: Even encrypted tokens invisible to other users ✓
```

---

## Security Properties Summary

```
┌────────────────────────────────────────────────────────────────┐
│           Encryption Security Properties                        │
└────────────────────────────────────────────────────────────────┘

CONFIDENTIALITY (Only encryption key can decrypt)
├── Algorithm: AES-256 (256-bit key)
├── Mode: Galois/Counter Mode (GCM)
├── Key derivation: PBKDF2 (100k iterations)
└── Result: No decryption without key ✓

INTEGRITY (Tampering detection via authentication tag)
├── Authentication tag: 16 bytes (GCM output)
├── Verification: Automatic on decryption
├── Detection: Fails if any bit modified
└── Result: Tampering impossible undetected ✓

RANDOMIZATION (Each encryption produces different ciphertext)
├── IV: 12 bytes (random per encryption)
├── Salt: 16 bytes (random per encryption)
├── Purpose: Prevents pattern analysis
└── Result: Same plaintext → different ciphertext ✓

KEY DERIVATION (Prevents direct key extraction)
├── PBKDF2: Industry standard
├── Rounds: 100,000 (expensive to brute-force)
├── Hash: SHA-256 (one-way function)
└── Result: Cannot extract key from environment variable ✓

FORWARD SECRECY (Not applicable, single key)
├── Note: OAuth tokens are short-lived
├── Impact: Key compromise only affects current tokens
├── Mitigation: Key rotation procedure documented
└── Result: Acceptable risk for temporary tokens ✓

BACKWARD COMPATIBILITY (Existing plaintext tokens still readable)
├── Old columns preserved
├── Fallback logic in read operations
├── Gradual migration on user login
└── Result: Zero downtime migration ✓
```

---

## Attack Scenarios & Mitigations

```
┌────────────────────────────────────────────────────────────────┐
│              Attack Scenarios & Defenses                        │
└────────────────────────────────────────────────────────────────┘

SCENARIO 1: Database Breach
─────────────────────────────
Attack:   Attacker obtains profiles table
          Including mercadopago_access_token_encrypted
Result:   Encrypted data useless without key ✓
Mitigation: Encryption prevents token usage

SCENARIO 2: Environment Variable Exposure
──────────────────────────────────────────
Attack:   Attacker obtains .env file or environment variables
Result:   Can decrypt all tokens
Mitigation: 
  - .env.local git-ignored (not in repository)
  - Cloudflare Pages vault for production key
  - Key rotation procedure
  - Access logs monitored

SCENARIO 3: Ciphertext Tampering
────────────────────────────────
Attack:   Attacker modifies encrypted value in database
          Even 1 bit changed
Result:   Authentication tag verification FAILS ✓
          Decryption throws error
Mitigation: GCM authentication tag detects all modifications

SCENARIO 4: Wrong Key Decryption
───────────────────────────────
Attack:   Attacker uses wrong key to decrypt
Result:   Decryption fails (PBKDF2 produces different derived key)
          Or decryption succeeds but ciphertext garbage
          GCM tag verification fails ✓
Mitigation: Error handling prevents token leakage

SCENARIO 5: Key Rotation
──────────────────────
Attack:   Old key compromised, need to rotate
Solution: 1. Keep old key available temporarily
          2. Deploy code that uses new key for encryption
          3. On user login: decrypt with old key, encrypt with new
          4. Store in new columns
          5. After all users migrated: remove old key
Mitigation: Zero-downtime rotation possible

SCENARIO 6: Brute Force on PBKDF2
────────────────────────────────
Attack:   Attacker tries to crack environment variable
Result:   100,000 iterations = expensive
          Modern GPU: ~1 million attempts/sec
          Brute force 256-bit key: 2^256 iterations
Mitigation: PBKDF2 makes brute force impractical

SCENARIO 7: Rainbow Tables
──────────────────────────
Attack:   Attacker creates pre-computed encryption table
Result:   Random salt + IV makes pre-computation impossible
          Each token uses different salt
Mitigation: Cryptographic randomization prevents

SCENARIO 8: Repeated Encryption Same Token
──────────────────────────────────────────
Attack:   Token ABC encrypted twice, produces same result?
Result:   NEVER - random IV generates different ciphertext
          Even identical plaintext produces different output
Mitigation: Random IV per encryption
```

