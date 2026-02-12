# 🛡️ AutoRenta Security Audit Report
**Date:** January 24, 2026
**Auditor:** Gemini Agent
**Target:** AutoRenta Mobile & Web Application
**Status:** 🚨 CRITICAL VULNERABILITIES FOUND

---

## 1. Executive Summary
A comprehensive white-box and black-box security audit was performed on the AutoRenta application. While the general architecture follows modern security practices (RLS, Edge Functions), **two critical vulnerabilities** were identified that completely compromise user identity and financial assets.

| Vulnerability | Severity | Status | Impact |
| :--- | :---: | :---: | :--- |
| **Insecure Token Storage** | **High** | 🔓 Open | Full Account Takeover via physical access/malware. |
| **Wallet Logic Flaw** | **Critical** | 🔓 Open | Arbitrary transfer of funds between ANY users. |
| **Verification Logic** | Low | ✅ Secure | Proper auth checks implemented. |
| **Storage RLS** | Low | ✅ Secure | Proper folder-based isolation. |
| **API Exposure** | Medium | ⚠️ Warning | Public data leakage in Marketplace (sanitized). |

---

## 2. Critical Vulnerabilities

### 2.1. 🚨 Logic Flaw in `wallet_transfer` RPC (The "Robin Hood" Attack)
**Location:** `sql/migrations/003-wallet-ledger-system.sql`
**Function:** `wallet_transfer(p_from_user, p_to_user, ...)`

**Description:**
The PostgreSQL function `wallet_transfer` is defined as `SECURITY DEFINER` (runs with root privileges) but fails to validate that the caller (`auth.uid()`) matches the `p_from_user` argument.

**Impact:**
Any authenticated user can transfer funds from **ANY** other user's wallet to their own account by simply knowing the victim's User ID.

**Vulnerable Code:**
```sql
CREATE OR REPLACE FUNCTION wallet_transfer(...) SECURITY DEFINER ...
BEGIN
  -- MISSING CHECK: IF p_from_user != auth.uid() THEN ERROR
  
  SELECT available_balance INTO v_from_balance 
  FROM user_wallets 
  WHERE user_id = p_from_user ... -- Locks victim's wallet without checking permission
```

**Proof of Concept (PoC):**
```bash
curl -X POST 'https://[SUPABASE_URL]/rest/v1/rpc/wallet_transfer' \
  -H "Authorization: Bearer [ATTACKER_TOKEN]" \
  -H "apikey: [ANON_KEY]" \
  -d '{
    "p_from_user": "[VICTIM_UUID]",
    "p_to_user": "[ATTACKER_UUID]",
    "p_amount_cents": 10000000, 
    "p_ref": "exploit_ref_001"
  }'
```

**Remediation:**
Add the following check immediately at the start of the function:
```sql
IF p_from_user != auth.uid() THEN
  RAISE EXCEPTION 'Unauthorized: You can only transfer from your own wallet';
END IF;
```

---

### 2.2. 🔓 Insecure Storage of Auth Tokens
**Location:** Android Data Directory (`/data/data/app.autorentar/app_webview/.../Local Storage`)
**Component:** Ionic/Capacitor Auth

**Description:**
JWT Access Tokens and Refresh Tokens are stored in plaintext within the WebView's LocalStorage (LevelDB). This storage is accessible to any process with root access or via ADB backups.

**Evidence:**
Extracted `dump_analysis` contained valid JWTs belonging to user `eduardomarques`.

**Impact:**
An attacker with brief physical access to the unlocked phone (or malware on the device) can exfiltrate the session and impersonate the user indefinitely using the Refresh Token.

**Remediation:**
Migrate token storage to the device's hardware-backed Secure Storage using:
- `@ionic-enterprise/identity-vault` (Enterprise)
- `capacitor-secure-storage-plugin` (Community)

---

## 3. Security Hardening Review

### 3.1. Row Level Security (RLS)
- **Profiles:** ✅ Correctly secured. Anonymous users receive empty arrays.
- **Cars:** ⚠️ Publicly readable (by design for marketplace). Sensitive fields like `vin` and `plate` are correctly returning `null` for public queries.
- **Storage:** ✅ Correctly secured using `(storage.foldername(name))[1] = auth.uid()::text`.

### 3.2. Verification System
- **Functions:** `send_phone_otp`, `resend_verification_email` correctly implement `v_user_id := auth.uid();` checks. No IDOR vulnerabilities found here.

---

## 4. Recommendations Roadmap

1.  **IMMEDIATE:** Apply hotfix migration for `wallet_transfer` function.
2.  **HIGH PRIORITY:** Refactor Frontend Auth Service to use Secure Storage.
3.  **MEDIUM:** Implement Rate Limiting on public endpoints (e.g. `cars` listing) to prevent scraping.
4.  **LOW:** Rotate `supabaseAnonKey` as a precaution (though it is public by definition, rotation is good hygiene).

---
*End of Report*
