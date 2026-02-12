# RPC Contract Check - Fix Required

## Problem
The RPC Contract Check workflow is failing because **168 RPC functions** called in the frontend don't exist in the production database.

**Evidence:**
- Workflow run: https://github.com/[repo]/actions/runs/21662939081
- All 168 RPC calls return "MISSING"

## Root Cause
Local migrations (203 files in `supabase/migrations/`) have NOT been applied to the production database.

## Solution

### Option 1: Apply migrations via Supabase CLI (Recommended)
```bash
# Re-authenticate with Supabase
supabase login

# Link project (use IPv4)
supabase link --project-ref pisqjmoklivzpwufhscx

# Apply all pending migrations
supabase db push
```

### Option 2: Apply via Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/pisqjmoklivzpwufhscx/sql
2. Copy-paste each migration file in order
3. Execute manually

### Option 3: Use Database Connection String
```bash
# Get connection string from Supabase Dashboard > Settings > Database
psql "postgresql://postgres:PASSWORD@db.pisqjmoklivzpwufhscx.supabase.co:5432/postgres" \
  -f supabase/migrations/FILENAME.sql
```

## Verification
After applying migrations, re-run the workflow:
```bash
gh workflow run rpc-contract-check.yml
```

## Affected Functions (168 total)
See full list in workflow logs or run:
```bash
grep -roh "\.rpc(['\"][a-z_]*['\"]" apps/web/src/ | sed "s/\.rpc(['\"]//g" | sed "s/['\"]//g" | sort -u
```

## Impact
Without these functions:
- **400/404 errors** on API calls
- **Features broken** in production
- **User experience severely degraded**

## Priority
**P0 - Critical** - Must be fixed immediately

---
Generated: 2026-02-04
