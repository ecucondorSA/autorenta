# P0-017: Session Timeout Configuration

## Problem
Session timeout is currently set to 30 days, should be 24 hours for security.

## Solution
Session timeout is configured in Supabase Dashboard, not in code.

### Steps to Fix (Manual - Requires Supabase Dashboard Access):

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select the `autorenta` project
3. Navigate to: Authentication > Settings
4. Find "JWT Expiry" section
5. Change from `2592000` seconds (30 days) to `86400` seconds (24 hours)
6. Click "Save"

### Alternative (if you have CLI access):
```bash
supabase secrets set JWT_EXP=86400
```

## Verification
After changing, new login sessions will expire after 24 hours.
Existing sessions will remain valid until their original expiration.

## Status
⚠️ REQUIRES MANUAL DASHBOARD CONFIGURATION - Cannot be fixed via code deployment.
