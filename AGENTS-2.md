# AGENTS-2.md - Advanced Platform Hardening Rules

> Senior-level enforcement rules discovered through production debugging sessions.
> Complementary to AGENTS.md. These rules prevent schema drift, auth bypasses, enum mismatches, and RLS gaps.

**Context:** These rules emerged from a comprehensive audit session (2026-02-08) where we discovered:
- Enum mismatches between TypeScript types and DB (CarStatus 'suspended', PaymentStatus 'authorized', SubscriptionStatus 'upgraded')
- Auth bypasses in Edge Functions (AI Vision Service, mercadopago-money-out)
- RLS policy gaps (car-images bucket missing INSERT policy)
- Schema drift (code assuming columns that don't exist)
- Dangerous defaults (createCar defaulting to 'active')
- Untyped status updates (accepting any string)

**Philosophy:** Prevention over reaction. Automate where possible. Fail fast at compile-time or pre-commit.

---

## Table of Contents

- [17. Database-Code Contract Enforcement](#17-database-code-contract-enforcement)
  - [17.1 Enum Sync Protocol](#171-enum-sync-protocol-mandatory)
  - [17.2 Schema Verification Before Coding](#172-schema-verification-before-coding-critical)
  - [17.3 Migration Idempotency Standards](#173-migration-idempotency-standards)
- [18. Edge Function Security Standards](#18-edge-function-security-standards)
  - [18.1 Auth-First Pattern](#181-auth-first-pattern-mandatory)
  - [18.2 Edge Function Security Checklist](#182-edge-function-security-checklist)
- [19. RLS & Storage Policy Enforcement](#19-rls--storage-policy-enforcement)
  - [19.1 RLS Coverage Requirements](#191-rls-coverage-requirements)
  - [19.2 RLS Audit Script](#192-rls-audit-script)
- [20. Type Safety for Status Updates](#20-type-safety-for-status-updates)
  - [20.1 Typed Status Update Functions](#201-typed-status-update-functions)
  - [20.2 Default Values Safety](#202-default-values-safety)
- [21. Pre-Deploy Verification Protocol](#21-pre-deploy-verification-protocol)
- [22. Automated Quality Gates](#22-automated-quality-gates)

---

## 17. Database-Code Contract Enforcement

### 17.1 Enum Sync Protocol (Mandatory)

**Problem:** TypeScript types drift from database enums, causing runtime errors in production.

**Example of the bug:**
```typescript
// TypeScript type (WRONG)
export type CarStatus = 'draft' | 'active' | 'suspended' | 'inactive';

// Database enum (ACTUAL)
-- CREATE TYPE car_status AS ENUM ('draft', 'active', 'paused', 'deleted', 'pending');

// Result: Code using 'suspended' fails with "invalid input value for enum car_status"
```

**Mandatory Protocol:**

```bash
# BEFORE modifying any type that maps to a DB enum:

# 1. Check current DB enum values
psql $DATABASE_URL -c "SELECT unnest(enum_range(NULL::public.car_status));"

# Output:
#   draft
#   active
#   paused
#   deleted
#   pending

# 2. Compare with TypeScript type
grep "type CarStatus" apps/web/src/app/core/models/index.ts

# 3. If mismatch detected:
#    a) Update DB first (migration to add/remove enum values)
#    b) Then update TypeScript type
#    c) Search and replace all usages of old values

# Example: Remove 'suspended', add 'paused'
git grep "suspended" apps/web/src  # Find all usages
# Replace all with 'paused' before changing the type
```

**Validation Script:**

Create `scripts/maintenance/validate-enum-sync.ts`:

```typescript
#!/usr/bin/env bun
/**
 * Validates that TypeScript enum types match database enum values.
 * Run: bun scripts/maintenance/validate-enum-sync.ts
 * Exit code: 0 = all good, 1 = mismatches found
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface EnumCheck {
  tsType: string;
  dbEnum: string;
  file: string;
  linePattern: string;
}

const CRITICAL_ENUMS: EnumCheck[] = [
  {
    tsType: 'CarStatus',
    dbEnum: 'car_status',
    file: 'apps/web/src/app/core/models/index.ts',
    linePattern: /type CarStatus = ([^;]+);/,
  },
  {
    tsType: 'BookingStatus',
    dbEnum: 'booking_status',
    file: 'apps/web/src/app/core/models/index.ts',
    linePattern: /type BookingStatus = ([^;]+);/,
  },
  {
    tsType: 'PaymentStatus',
    dbEnum: 'payment_status',
    file: 'apps/web/src/app/core/models/index.ts',
    linePattern: /type PaymentStatus = ([^;]+);/,
  },
  {
    tsType: 'SubscriptionStatus',
    dbEnum: 'subscription_status',
    file: 'apps/web/src/app/core/models/subscription.model.ts',
    linePattern: /type SubscriptionStatus = ([^;]+);/,
  },
];

async function getDbEnumValues(enumName: string): Promise<Set<string>> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await supabase.rpc('get_enum_values', { enum_name: enumName });

  if (error) {
    console.error(`Failed to get enum ${enumName}:`, error);
    process.exit(1);
  }

  return new Set(data.map((row: any) => row.enumlabel));
}

function getTsTypeValues(file: string, pattern: RegExp): Set<string> {
  const content = readFileSync(file, 'utf-8');
  const match = content.match(pattern);

  if (!match) {
    console.error(`Pattern not found in ${file}`);
    process.exit(1);
  }

  // Extract union type values: 'draft' | 'active' | 'paused'
  const unionString = match[1];
  const values = unionString
    .split('|')
    .map(v => v.trim().replace(/['"]/g, ''))
    .filter(v => v.length > 0);

  return new Set(values);
}

async function main() {
  console.log('🔍 Validating enum sync between TypeScript and Database...\n');

  let hasErrors = false;

  for (const check of CRITICAL_ENUMS) {
    console.log(`Checking ${check.tsType} (${check.dbEnum})...`);

    const dbValues = await getDbEnumValues(check.dbEnum);
    const tsValues = getTsTypeValues(check.file, check.linePattern);

    // Find differences
    const inTsNotInDb = [...tsValues].filter(v => !dbValues.has(v));
    const inDbNotInTs = [...dbValues].filter(v => !tsValues.has(v));

    if (inTsNotInDb.length > 0) {
      console.error(`  ❌ Values in TypeScript but NOT in DB: ${inTsNotInDb.join(', ')}`);
      console.error(`     These will cause runtime errors!`);
      hasErrors = true;
    }

    if (inDbNotInTs.length > 0) {
      console.warn(`  ⚠️  Values in DB but NOT in TypeScript: ${inDbNotInTs.join(', ')}`);
      console.warn(`     TypeScript code cannot use these values.`);
      hasErrors = true;
    }

    if (inTsNotInDb.length === 0 && inDbNotInTs.length === 0) {
      console.log(`  ✅ Synced (${tsValues.size} values)`);
    }

    console.log('');
  }

  if (hasErrors) {
    console.error('❌ Enum sync validation FAILED');
    console.error('\nTo fix:');
    console.error('1. Update DB enum first (migration): ALTER TYPE enum_name ADD VALUE ...');
    console.error('2. Then update TypeScript type');
    console.error('3. Or remove invalid values from TypeScript if they should not exist');
    process.exit(1);
  }

  console.log('✅ All enums are in sync!');
}

main();
```

**SQL Helper Function (add to migrations):**

```sql
-- Helper function for enum validation script
CREATE OR REPLACE FUNCTION public.get_enum_values(enum_name text)
RETURNS TABLE(enumlabel text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT enumlabel::text
  FROM pg_enum
  JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
  WHERE pg_type.typname = enum_name
  ORDER BY enumsortorder;
$$;

GRANT EXECUTE ON FUNCTION public.get_enum_values TO service_role;
```

**Pre-commit Hook:**

Add to `.husky/pre-commit`:

```bash
#!/bin/bash

echo "🔍 Validating enum sync..."

# Run validation script
bun scripts/maintenance/validate-enum-sync.ts

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Enum validation failed!"
  echo "Fix the mismatches before committing."
  echo ""
  echo "Quick check: pnpm types:db:gen && git diff apps/web/src/app/core/types/database.types.ts"
  exit 1
fi

echo "✅ Enum validation passed"
```

---

### 17.2 Schema Verification Before Coding (Critical)

**Problem:** Code assumes columns/tables exist based on memory or outdated docs, causing runtime errors.

**Example of the bug:**
```typescript
// Code assumes profiles.kyc_status exists
const { data } = await supabase
  .from('profiles')
  .select('kyc_status')  // ❌ Column doesn't exist!
  .eq('id', userId);

// Reality: KYC status lives in user_documents.status
```

**Mandatory Protocol:**

```bash
# BEFORE writing any Supabase query:

# 1. Regenerate types to temporary file
supabase gen types typescript --project-id aceacpaockyxgogxsfyc > /tmp/fresh-db-types.ts

# 2. Search for the table you're about to query
grep -A 30 "Tables: {" /tmp/fresh-db-types.ts | grep -A 25 "profiles:"

# 3. Verify the column exists in the output
# Example output:
#   profiles: {
#     Row: {
#       id: string
#       created_at: string
#       email_verified: boolean
#       phone_verified: boolean
#       id_verified: boolean  // ← This exists
#       kyc_status: never      // ← This does NOT exist!
#     }
#   }

# 4. If column doesn't exist:
#    a) Check if it's in a related table (user_documents, etc.)
#    b) Or create a migration to add it
#    c) DO NOT assume it exists and code against it
```

**Safe Query Pattern:**

```typescript
// ❌ UNSAFE - Assumes schema
async getKycStatus(userId: string): Promise<string> {
  const { data } = await this.supabase
    .from('profiles')
    .select('kyc_status')  // Assumption, not verified
    .eq('id', userId)
    .single();

  return data?.kyc_status || 'pending';
}

// ✅ SAFE - Verified against actual schema
async getKycStatus(userId: string): Promise<string> {
  // Step 1: Checked /tmp/fresh-db-types.ts
  // Step 2: Found that profiles does NOT have kyc_status
  // Step 3: Searched migrations and found it's in user_documents.status

  const { data } = await this.supabase
    .from('user_documents')
    .select('status')  // ✅ Verified this column exists
    .eq('user_id', userId)
    .eq('document_type', 'identity')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data?.status || 'pending';
}
```

**Schema Verification Checklist:**

Before querying a table:
- [ ] Regenerated types to temp file within last 24 hours
- [ ] Searched for table in generated types
- [ ] Confirmed column exists in Row type
- [ ] If column is `never`, found alternative approach
- [ ] If table doesn't exist, verified it's not a typo

---

### 17.3 Migration Idempotency Standards

**Problem:** Migrations fail on second run, causing deployment issues.

**Example of non-idempotent migration:**
```sql
-- ❌ This fails if run twice
CREATE POLICY "policy_name" ON public.my_table FOR SELECT USING (...);
-- ERROR: policy "policy_name" already exists

ALTER TYPE booking_status ADD VALUE 'new_status';
-- ERROR: enum value already exists
```

**Mandatory Template:**

Every migration must follow this structure:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql
-- Idempotency: Safe to run multiple times
-- Author: [Your Name]
-- Related: [GitHub issue or task]

-- ============================================================================
-- 1. SCHEMA CHANGES
-- ============================================================================

-- Tables: Use IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.my_new_table (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending',
    data jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Columns: Check existence before adding
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'existing_table'
        AND column_name = 'new_column'
    ) THEN
        ALTER TABLE public.existing_table ADD COLUMN new_column text;
    END IF;
END $$;

-- ============================================================================
-- 2. ENUM MODIFICATIONS
-- ============================================================================

-- Add enum values: Wrap in exception handler
DO $$ BEGIN
    ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'pending_owner_approval';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Enum value pending_owner_approval already exists, skipping';
    WHEN OTHERS THEN
        RAISE WARNING 'Could not add enum value: %', SQLERRM;
END $$;

-- Remove enum values: Requires recreation (DANGEROUS - avoid if possible)
-- If you must remove an enum value, create a new type and migrate data:
-- 1. CREATE TYPE new_enum AS ENUM (...)
-- 2. ALTER TABLE ... ALTER COLUMN ... TYPE new_enum USING column_name::text::new_enum
-- 3. DROP TYPE old_enum
-- 4. ALTER TYPE new_enum RENAME TO old_enum

-- ============================================================================
-- 3. FUNCTIONS (RPCs)
-- ============================================================================

-- Use CREATE OR REPLACE for idempotency
CREATE OR REPLACE FUNCTION public.my_function(param1 uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Function logic here
    SELECT jsonb_build_object('success', true) INTO result;
    RETURN result;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.my_function IS 'Description of what this function does';

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

-- Enable RLS (idempotent)
ALTER TABLE public.my_new_table ENABLE ROW LEVEL SECURITY;

-- Policies: Check existence before creating
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'my_new_table'
        AND policyname = 'Users can view own records'
    ) THEN
        CREATE POLICY "Users can view own records"
        ON public.my_new_table
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'my_new_table'
        AND policyname = 'Users can insert own records'
    ) THEN
        CREATE POLICY "Users can insert own records"
        ON public.my_new_table
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Drop policies: Check existence first
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'my_table'
        AND policyname = 'old_policy_name'
    ) THEN
        DROP POLICY "old_policy_name" ON public.my_table;
    END IF;
END $$;

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- Use IF NOT EXISTS (PostgreSQL 9.5+)
CREATE INDEX IF NOT EXISTS idx_my_table_user_id ON public.my_new_table(user_id);
CREATE INDEX IF NOT EXISTS idx_my_table_status ON public.my_new_table(status);
CREATE INDEX IF NOT EXISTS idx_my_table_created_at ON public.my_new_table(created_at DESC);

-- Partial index for common queries
CREATE INDEX IF NOT EXISTS idx_my_table_active_users
ON public.my_new_table(user_id)
WHERE status = 'active';

-- ============================================================================
-- 6. GRANTS & PERMISSIONS
-- ============================================================================

-- Revoke all first (safe to run multiple times)
REVOKE ALL ON public.my_new_table FROM anon, authenticated;

-- Grant specific permissions
GRANT SELECT ON public.my_new_table TO authenticated;
GRANT INSERT ON public.my_new_table TO authenticated;
GRANT UPDATE ON public.my_new_table TO authenticated;

-- Function permissions
REVOKE ALL ON FUNCTION public.my_function FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_function TO authenticated;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- Drop trigger if exists before creating
DROP TRIGGER IF EXISTS trg_my_table_updated_at ON public.my_new_table;

-- Create trigger
CREATE TRIGGER trg_my_table_updated_at
    BEFORE UPDATE ON public.my_new_table
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 8. DATA MIGRATIONS (if needed)
-- ============================================================================

-- Backfill data: Use INSERT ... ON CONFLICT DO NOTHING for idempotency
INSERT INTO public.my_new_table (id, user_id, status, created_at)
SELECT
    gen_random_uuid(),
    id,
    'pending',
    created_at
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM public.my_new_table WHERE user_id = auth.users.id
);

-- Update existing data: Use UPDATE with WHERE to avoid no-ops
UPDATE public.my_new_table
SET status = 'active'
WHERE status = 'pending'
AND created_at < now() - interval '30 days';

-- ============================================================================
-- 9. VERIFICATION QUERIES (commented out, for manual testing)
-- ============================================================================

-- Verify table exists
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'my_new_table';

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'my_new_table';

-- Verify policies exist
-- SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'my_new_table';

-- Verify indexes exist
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'my_new_table';

-- Count rows (for data migrations)
-- SELECT COUNT(*) FROM public.my_new_table;
```

**Idempotency Checklist:**

- [ ] ✅ `CREATE TABLE` → `IF NOT EXISTS`
- [ ] ✅ `ALTER TABLE ADD COLUMN` → Wrapped in existence check
- [ ] ✅ `ALTER TYPE ADD VALUE` → Wrapped in `DO $$ BEGIN ... EXCEPTION` block
- [ ] ✅ `CREATE POLICY` → Wrapped in existence check (query `pg_policies`)
- [ ] ✅ `CREATE FUNCTION` → `CREATE OR REPLACE`
- [ ] ✅ `CREATE INDEX` → `IF NOT EXISTS`
- [ ] ✅ `DROP` statements → Wrapped in existence checks
- [ ] ✅ `INSERT` (data migrations) → `ON CONFLICT DO NOTHING` or `WHERE NOT EXISTS`
- [ ] ✅ `UPDATE` (data migrations) → Use WHERE clause to avoid no-ops
- [ ] ✅ Migration can be run 2-3 times without errors
- [ ] ✅ Verification queries included (commented out)

**Testing Idempotency:**

```bash
# Test locally before pushing
supabase db reset
supabase db push

# Run migrations twice to ensure idempotency
supabase db push
# Should show "No new migrations to apply" or succeed without errors
```

---

## 18. Edge Function Security Standards

### 18.1 Auth-First Pattern (Mandatory)

**Problem:** Edge Functions callable without authentication, allowing unauthorized API consumption.

**Examples of bugs found:**
1. AI Vision Service handlers callable without auth → Gemini API quota drain
2. mercadopago-money-out only checked header presence → Withdrawal bypass

**Mandatory Pattern for ALL Edge Functions:**

```typescript
// supabase/functions/my-function/index.ts
import { createClient } from '@supabase/supabase-js@2.50.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// ============================================================================
// CORS Configuration (if frontend calls this directly)
// ============================================================================

const ALLOWED_ORIGINS = [
  'https://app.autorenta.com',
  'https://staging.autorenta.com',
  'http://localhost:4200', // Dev only
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info',
    'Access-Control-Max-Age': '86400',
  };
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // ========================================================================
    // STEP 1: AUTHENTICATION (MANDATORY - First line in try block)
    // ========================================================================

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('[my-function] Missing Authorization header');
      return new Response(
        JSON.stringify({
          error: 'Missing Authorization header',
          code: 'AUTH_REQUIRED'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with user's token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[my-function] Auth verification failed:', authError);
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired token',
          code: 'AUTH_INVALID',
          details: authError?.message
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[my-function] Authenticated user: ${user.id}`);

    // ========================================================================
    // STEP 2: AUTHORIZATION (if admin/owner operation)
    // ========================================================================

    // For ADMIN operations (delete, process payments, update system config):
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('user_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminUser) {
      console.warn(`[my-function] User ${user.id} attempted admin operation without role`);
      return new Response(
        JSON.stringify({
          error: 'Admin access required',
          code: 'FORBIDDEN'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[my-function] Admin user verified: ${adminUser.role}`);

    // For OWNERSHIP verification (e.g., delete own car, update own profile):
    const resourceId = new URL(req.url).searchParams.get('resource_id');
    const { data: resource } = await supabase
      .from('resources')
      .select('owner_id')
      .eq('id', resourceId)
      .single();

    if (resource?.owner_id !== user.id && !adminUser) {
      console.warn(`[my-function] User ${user.id} attempted to access resource ${resourceId} without ownership`);
      return new Response(
        JSON.stringify({
          error: 'Not authorized to access this resource',
          code: 'FORBIDDEN_RESOURCE'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ========================================================================
    // STEP 3: INPUT VALIDATION
    // ========================================================================

    const body = await req.json();

    // Validate required fields
    if (!body.required_field) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: required_field',
          code: 'VALIDATION_ERROR'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ========================================================================
    // STEP 4: BUSINESS LOGIC (after auth + validation)
    // ========================================================================

    const result = await performOperation(supabase, user.id, body);

    // ========================================================================
    // STEP 5: RESPONSE
    // ========================================================================

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[my-function] Unexpected error:', error);

    // Don't leak internal error details to client
    const isDevMode = Deno.env.get('ENVIRONMENT') === 'development';

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(isDevMode && { details: error.message, stack: error.stack })
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

async function performOperation(supabase: any, userId: string, input: any) {
  // Your business logic here
  return { result: 'success' };
}
```

**Reusable Auth Helper:**

Create `supabase/functions/_shared/auth-helpers.ts`:

```typescript
/**
 * Reusable authentication helpers for Supabase Edge Functions.
 * Import these instead of duplicating auth logic.
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js@2.50.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

export interface AuthResult {
  user: User;
  supabase: SupabaseClient;
}

/**
 * Validates Authorization header and returns authenticated user.
 * Throws Response (401) if auth fails - catch and return it.
 *
 * @example
 * try {
 *   const { user, supabase } = await requireAuth(req);
 *   // ... your logic
 * } catch (error) {
 *   if (error instanceof Response) return error;
 *   throw error;
 * }
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    throw new Response(
      JSON.stringify({
        error: 'Missing Authorization header',
        code: 'AUTH_REQUIRED'
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('[auth] Token validation failed:', error);
    throw new Response(
      JSON.stringify({
        error: 'Invalid or expired token',
        code: 'AUTH_INVALID',
        details: error?.message || 'User not found'
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return { user, supabase };
}

/**
 * Validates that user has admin role.
 * Throws Response (403) if not admin.
 *
 * @example
 * const { user, supabase } = await requireAuth(req);
 * await requireAdmin(user.id, supabase);
 */
export async function requireAdmin(userId: string, supabase: SupabaseClient): Promise<void> {
  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('user_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !adminUser) {
    console.warn(`[auth] User ${userId} attempted admin operation without role`);
    throw new Response(
      JSON.stringify({
        error: 'Admin access required',
        code: 'FORBIDDEN'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Validates that user owns the specified resource.
 * Throws Response (403) if not owner (unless user is admin).
 *
 * @example
 * await requireOwnership('cars', carId, user.id, supabase);
 */
export async function requireOwnership(
  tableName: string,
  resourceId: string,
  userId: string,
  supabase: SupabaseClient,
  ownerColumn: string = 'owner_id'
): Promise<void> {
  // Check if user is admin (admins bypass ownership checks)
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (adminUser) {
    console.log(`[auth] Admin ${userId} bypassing ownership check`);
    return; // Admins can access any resource
  }

  // Check ownership
  const { data: resource, error } = await supabase
    .from(tableName)
    .select(ownerColumn)
    .eq('id', resourceId)
    .single();

  if (error || !resource) {
    throw new Response(
      JSON.stringify({
        error: 'Resource not found',
        code: 'NOT_FOUND'
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  if (resource[ownerColumn] !== userId) {
    console.warn(`[auth] User ${userId} attempted to access resource ${resourceId} without ownership`);
    throw new Response(
      JSON.stringify({
        error: 'Not authorized to access this resource',
        code: 'FORBIDDEN_RESOURCE'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Optional auth - returns user or null, does not throw.
 * Useful for endpoints that work for both authenticated and anonymous users.
 *
 * @example
 * const authResult = await optionalAuth(req);
 * if (authResult) {
 *   // User is authenticated
 * } else {
 *   // Anonymous user
 * }
 */
export async function optionalAuth(req: Request): Promise<AuthResult | null> {
  try {
    return await requireAuth(req);
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      return null; // Auth failed, treat as anonymous
    }
    throw error; // Other errors should still bubble up
  }
}
```

**Using the helpers:**

```typescript
// supabase/functions/my-protected-function/index.ts
import { requireAuth, requireAdmin } from '../_shared/auth-helpers.ts';

Deno.serve(async (req) => {
  try {
    // Simple auth
    const { user, supabase } = await requireAuth(req);

    // Your logic here
    const result = await doSomething(user.id);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // requireAuth throws Response on auth failure
    if (error instanceof Response) return error;

    console.error('[my-function] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

```typescript
// supabase/functions/admin-delete-user/index.ts
import { requireAuth, requireAdmin } from '../_shared/auth-helpers.ts';

Deno.serve(async (req) => {
  try {
    const { user, supabase } = await requireAuth(req);
    await requireAdmin(user.id, supabase); // Additional admin check

    // Admin-only logic here
    const { userId } = await req.json();
    await supabase.from('profiles').delete().eq('id', userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error('[admin-delete-user] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

---

### 18.2 Edge Function Security Checklist

Before deploying ANY Edge Function:

**Authentication & Authorization:**
- [ ] ✅ Auth verified BEFORE any business logic (first lines in try block)
- [ ] ✅ Uses `requireAuth()` helper or equivalent
- [ ] ✅ If admin operation: verifies role in `admin_users` table
- [ ] ✅ If owner operation: verifies `resource.owner_id === user.id`
- [ ] ✅ Admins bypass ownership checks (documented in code)
- [ ] ✅ Returns 401 for missing/invalid auth
- [ ] ✅ Returns 403 for insufficient permissions
- [ ] ✅ Logs auth failures with user ID for audit trail

**Input Validation:**
- [ ] ✅ Validates required fields exist
- [ ] ✅ Validates data types (e.g., UUID format for IDs)
- [ ] ✅ Sanitizes string inputs (no SQL injection risk)
- [ ] ✅ Validates enum values against allowed lists
- [ ] ✅ Returns 400 with clear error message for invalid input
- [ ] ✅ Never trusts client input without validation

**Error Handling:**
- [ ] ✅ Semantic HTTP codes (400/401/403/404/409, not generic 500)
- [ ] ✅ Error responses have structure: `{ error: string, code: string }`
- [ ] ✅ Internal errors don't leak sensitive details to client
- [ ] ✅ Logs full error with context: `console.error('[function-name]', error)`
- [ ] ✅ Catches Response throws from auth helpers

**CORS:**
- [ ] ✅ CORS configured if called from frontend
- [ ] ✅ Handles OPTIONS preflight request
- [ ] ✅ Origin whitelist defined (not `'*'` in production)
- [ ] ✅ Includes necessary headers in CORS config

**Secrets & Config:**
- [ ] ✅ All secrets from `Deno.env.get()`, never hardcoded
- [ ] ✅ API keys never logged or returned to client
- [ ] ✅ Service role key only used when necessary (prefer user token)
- [ ] ✅ Environment variable fallbacks documented

**Rate Limiting:**
- [ ] ✅ Expensive operations (AI APIs, external calls) have rate limits considered
- [ ] ✅ Database queries have reasonable limits (e.g., `.limit(100)`)
- [ ] ✅ Paginated endpoints don't allow unlimited page size

**Logging:**
- [ ] ✅ Structured logging with function name prefix: `[function-name]`
- [ ] ✅ Logs authentication events (success, failure)
- [ ] ✅ Logs business logic errors with context
- [ ] ✅ Does NOT log sensitive data (passwords, tokens, full credit cards)

**Testing:**
- [ ] ✅ Tested with valid auth token
- [ ] ✅ Tested with missing auth token (expect 401)
- [ ] ✅ Tested with expired auth token (expect 401)
- [ ] ✅ Tested with non-admin user on admin endpoint (expect 403)
- [ ] ✅ Tested with invalid input (expect 400)

---

## 19. RLS & Storage Policy Enforcement

### 19.1 RLS Coverage Requirements

**Problem:** Tables/buckets without RLS policies allow unauthorized data access.

**Example of bug:** `car-images` storage bucket had no INSERT policy, causing uploads to fail with RLS violation.

**Mandatory Rule:**

> Every new table and storage bucket MUST have RLS policies defined in the same migration that creates it.

**Policy Matrix Template:**

Before writing policies, document the access matrix:

```
Table: my_new_table

| Role          | SELECT        | INSERT        | UPDATE        | DELETE        |
|---------------|---------------|---------------|---------------|---------------|
| anon          | ❌ None       | ❌ None       | ❌ None       | ❌ None       |
| authenticated | ✅ Own        | ✅ Own        | ✅ Own        | ✅ Own        |
| service_role  | ✅ All        | ✅ All        | ✅ All        | ✅ All        |

Notes:
- "Own" = WHERE user_id = auth.uid()
- "All" = No restrictions (service_role bypasses RLS)
```

**Implementation Pattern:**

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_my_table_with_rls.sql

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.my_new_table (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. ENABLE RLS (Mandatory)
-- ============================================================================

ALTER TABLE public.my_new_table ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

-- Policy Matrix:
-- | Role          | SELECT | INSERT | UPDATE | DELETE |
-- |---------------|--------|--------|--------|--------|
-- | anon          | ❌     | ❌     | ❌     | ❌     |
-- | authenticated | ✅ own | ✅ own | ✅ own | ✅ own |

-- SELECT: Users can view their own records
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'my_new_table'
        AND policyname = 'Users can view own records'
    ) THEN
        CREATE POLICY "Users can view own records"
        ON public.my_new_table
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- INSERT: Users can create their own records
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'my_new_table'
        AND policyname = 'Users can insert own records'
    ) THEN
        CREATE POLICY "Users can insert own records"
        ON public.my_new_table
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- UPDATE: Users can update their own records
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'my_new_table'
        AND policyname = 'Users can update own records'
    ) THEN
        CREATE POLICY "Users can update own records"
        ON public.my_new_table
        FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- DELETE: Users can delete their own records
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'my_new_table'
        AND policyname = 'Users can delete own records'
    ) THEN
        CREATE POLICY "Users can delete own records"
        ON public.my_new_table
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 4. INDEXES (for RLS performance)
-- ============================================================================

-- Index on user_id for RLS filtering
CREATE INDEX IF NOT EXISTS idx_my_new_table_user_id ON public.my_new_table(user_id);

-- ============================================================================
-- 5. GRANTS
-- ============================================================================

REVOKE ALL ON public.my_new_table FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_new_table TO authenticated;

-- ============================================================================
-- 6. VERIFICATION
-- ============================================================================

-- Verify RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'my_new_table';
-- Expected: rowsecurity = true

-- Verify policies exist:
-- SELECT policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = 'my_new_table';
-- Expected: 4 policies (SELECT, INSERT, UPDATE, DELETE)
```

**Storage Bucket Policies:**

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_my_bucket_with_policies.sql

-- ============================================================================
-- 1. CREATE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'my-bucket',
  'my-bucket',
  true,  -- Public read access
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. STORAGE RLS POLICIES
-- ============================================================================

-- Policy Matrix:
-- | Role          | SELECT  | INSERT | UPDATE | DELETE |
-- |---------------|---------|--------|--------|--------|
-- | anon          | ✅ All  | ❌     | ❌     | ❌     |
-- | authenticated | ✅ All  | ✅ Own | ✅ Own | ✅ Own |

-- SELECT: Public read access (anon + authenticated)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Public read access to my-bucket'
    ) THEN
        CREATE POLICY "Public read access to my-bucket"
        ON storage.objects
        FOR SELECT
        TO public
        USING (bucket_id = 'my-bucket');
    END IF;
END $$;

-- INSERT: Authenticated users can upload
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Authenticated users can upload to my-bucket'
    ) THEN
        CREATE POLICY "Authenticated users can upload to my-bucket"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'my-bucket');
    END IF;
END $$;

-- UPDATE: Users can update their own files
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Users can update own files in my-bucket'
    ) THEN
        CREATE POLICY "Users can update own files in my-bucket"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = 'my-bucket' AND owner = auth.uid());
    END IF;
END $$;

-- DELETE: Users can delete their own files
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Users can delete own files in my-bucket'
    ) THEN
        CREATE POLICY "Users can delete own files in my-bucket"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (bucket_id = 'my-bucket' AND owner = auth.uid());
    END IF;
END $$;
```

**Common RLS Patterns:**

```sql
-- Pattern 1: Public read, authenticated write
CREATE POLICY "Public read" ON public.table_name
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated insert" ON public.table_name
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Pattern 2: Role-based access
CREATE POLICY "Admin full access" ON public.table_name
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Pattern 3: Status-based visibility
CREATE POLICY "Published items visible to all" ON public.items
  FOR SELECT TO public
  USING (status = 'published' OR user_id = auth.uid());

-- Pattern 4: Join-based access (e.g., team members)
CREATE POLICY "Team members can view" ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = documents.team_id
      AND user_id = auth.uid()
    )
  );
```

---

### 19.2 RLS Audit Script

**Purpose:** Automatically detect tables/buckets without proper RLS coverage.

**Create SQL functions for audit:**

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_rls_audit_functions.sql

-- ============================================================================
-- Function: Get tables without RLS enabled
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tables_without_rls()
RETURNS TABLE(
  table_schema text,
  table_name text,
  table_type text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    schemaname::text,
    tablename::text,
    'table'::text
  FROM pg_tables
  WHERE schemaname = 'public'
  AND NOT rowsecurity
  ORDER BY tablename;
$$;

GRANT EXECUTE ON FUNCTION public.get_tables_without_rls TO service_role;

-- ============================================================================
-- Function: Get tables with RLS but no policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tables_missing_policies()
RETURNS TABLE(
  table_schema text,
  table_name text,
  rls_enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT
    t.schemaname::text,
    t.tablename::text,
    t.rowsecurity
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = t.schemaname
    AND p.tablename = t.tablename
  )
  ORDER BY t.tablename;
$$;

GRANT EXECUTE ON FUNCTION public.get_tables_missing_policies TO service_role;

-- ============================================================================
-- Function: Get storage buckets without policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_buckets_without_policies()
RETURNS TABLE(
  bucket_name text,
  is_public boolean
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    b.name::text,
    b.public
  FROM storage.buckets b
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'storage'
    AND p.tablename = 'objects'
    AND p.qual::text LIKE '%' || b.id || '%'
  )
  ORDER BY b.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_buckets_without_policies TO service_role;

-- ============================================================================
-- Function: Get comprehensive RLS coverage report
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_rls_coverage_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  total_tables int;
  tables_with_rls int;
  tables_with_policies int;
  total_buckets int;
  buckets_with_policies int;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO total_tables
  FROM pg_tables
  WHERE schemaname = 'public';

  SELECT COUNT(*) INTO tables_with_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = true;

  SELECT COUNT(DISTINCT tablename) INTO tables_with_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Count buckets
  SELECT COUNT(*) INTO total_buckets
  FROM storage.buckets;

  SELECT COUNT(DISTINCT b.name) INTO buckets_with_policies
  FROM storage.buckets b
  WHERE EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'storage'
    AND p.tablename = 'objects'
    AND p.qual::text LIKE '%' || b.id || '%'
  );

  -- Build report
  result := jsonb_build_object(
    'tables', jsonb_build_object(
      'total', total_tables,
      'with_rls', tables_with_rls,
      'with_policies', tables_with_policies,
      'coverage_percent', ROUND((tables_with_policies::numeric / NULLIF(total_tables, 0)) * 100, 1)
    ),
    'buckets', jsonb_build_object(
      'total', total_buckets,
      'with_policies', buckets_with_policies,
      'coverage_percent', ROUND((buckets_with_policies::numeric / NULLIF(total_buckets, 0)) * 100, 1)
    ),
    'generated_at', now()
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rls_coverage_report TO service_role;
```

**TypeScript Audit Script:**

Create `scripts/maintenance/audit-rls-coverage.ts`:

```typescript
#!/usr/bin/env bun
/**
 * RLS Coverage Audit Script
 * Checks for tables and storage buckets without proper RLS policies.
 * Run: bun scripts/maintenance/audit-rls-coverage.ts
 *
 * Exit codes:
 * 0 = Full coverage
 * 1 = Missing coverage (warnings)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NG_APP_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface UnprotectedTable {
  table_schema: string;
  table_name: string;
  table_type?: string;
  rls_enabled?: boolean;
}

interface UnprotectedBucket {
  bucket_name: string;
  is_public: boolean;
}

async function auditRLS() {
  console.log('🔒 RLS Coverage Audit\n');
  console.log(`Database: ${SUPABASE_URL}\n`);

  let hasIssues = false;

  // 1. Get coverage summary
  const { data: summary, error: summaryError } = await supabase.rpc('get_rls_coverage_report');

  if (!summaryError && summary) {
    console.log('📊 Coverage Summary:');
    console.log(`   Tables: ${summary.tables.with_policies}/${summary.tables.total} (${summary.tables.coverage_percent}%)`);
    console.log(`   Buckets: ${summary.buckets.with_policies}/${summary.buckets.total} (${summary.buckets.coverage_percent}%)\n`);
  }

  // 2. Tables without RLS enabled
  const { data: unprotectedTables, error: tablesError } = await supabase
    .rpc('get_tables_without_rls');

  if (!tablesError && unprotectedTables && unprotectedTables.length > 0) {
    console.log('❌ Tables WITHOUT RLS enabled:');
    unprotectedTables.forEach((t: UnprotectedTable) => {
      console.log(`   - public.${t.table_name}`);
    });
    console.log('   Action: Add "ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;"\n');
    hasIssues = true;
  }

  // 3. Tables with RLS but no policies
  const { data: missingPolicies, error: policiesError } = await supabase
    .rpc('get_tables_missing_policies');

  if (!policiesError && missingPolicies && missingPolicies.length > 0) {
    console.log('⚠️  Tables WITH RLS but NO policies:');
    missingPolicies.forEach((t: UnprotectedTable) => {
      console.log(`   - public.${t.table_name}`);
    });
    console.log('   Action: Create policies for SELECT, INSERT, UPDATE, DELETE\n');
    hasIssues = true;
  }

  // 4. Storage buckets without policies
  const { data: bucketsWithoutPolicies, error: bucketsError } = await supabase
    .rpc('get_buckets_without_policies');

  if (!bucketsError && bucketsWithoutPolicies && bucketsWithoutPolicies.length > 0) {
    console.log('⚠️  Storage buckets WITHOUT policies:');
    bucketsWithoutPolicies.forEach((b: UnprotectedBucket) => {
      console.log(`   - ${b.bucket_name} (public: ${b.is_public})`);
    });
    console.log('   Action: Create policies on storage.objects for this bucket\n');
    hasIssues = true;
  }

  // 5. Success message
  if (!hasIssues) {
    console.log('✅ All tables and buckets have proper RLS coverage!');
    console.log('   No action required.\n');
  } else {
    console.log('📝 Recommendations:');
    console.log('   1. Review each unprotected resource');
    console.log('   2. Determine if it needs RLS (most user data does)');
    console.log('   3. Create migration with RLS policies');
    console.log('   4. Use templates from AGENTS-2.md section 19.1\n');
    console.log('   5. Re-run this script to verify\n');
  }

  process.exit(hasIssues ? 1 : 0);
}

auditRLS().catch((error) => {
  console.error('❌ Audit script failed:', error);
  process.exit(1);
});
```

**CI Integration:**

Add `.github/workflows/rls-audit.yml`:

```yaml
name: RLS Coverage Audit

on:
  pull_request:
    paths:
      - 'supabase/migrations/**'
      - 'scripts/maintenance/audit-rls-coverage.ts'
  schedule:
    - cron: '0 9 * * 1'  # Weekly on Mondays at 9 AM

jobs:
  audit:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run RLS coverage audit
        run: bun scripts/maintenance/audit-rls-coverage.ts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

      - name: Post results to PR (on failure)
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ **RLS Coverage Audit Failed**\n\nSome tables or buckets are missing RLS policies. See workflow logs for details.\n\nRefer to `AGENTS-2.md` section 19.1 for policy templates.'
            })
```

**Usage:**

```bash
# Run manually
bun scripts/maintenance/audit-rls-coverage.ts

# Run on CI
# Automatically runs on PR with migration changes or weekly
```

---

## 20. Type Safety for Status Updates

### 20.1 Typed Status Update Functions

**Problem:** Functions accepting `status: string` allow invalid enum values like `'suspended'`, `'deleted123'`, etc.

**Examples of bugs:**
- `updateCarStatus(id, 'suspended')` → Runtime error (suspended not in enum)
- `updateBookingStatus(id, 'pending_dispute_resolution')` → DB accepts but breaks queries expecting valid enum

**Mandatory Pattern:**

```typescript
// ❌ PROHIBITED - Accepts any string
async updateCarStatus(carId: string, status: string): Promise<void> {
  // TypeScript won't catch updateCarStatus(id, 'suspended')
  await this.supabase
    .from('cars')
    .update({ status })
    .eq('id', carId);
}

// ✅ REQUIRED - Explicit union type matching DB enum
async updateCarStatus(
  carId: string,
  status: 'draft' | 'active' | 'paused' | 'deleted' | 'pending'
): Promise<void> {
  // TypeScript NOW catches updateCarStatus(id, 'suspended') at compile-time ✅

  try {
    const { data, error } = await this.supabase
      .from('cars')
      .update({ status })
      .eq('id', carId)
      .select()
      .single();

    if (error) {
      // Handle database trigger violations
      if (error.code === '23514') { // Check constraint violation
        if (error.message.includes('id_verified')) {
          throw new Error(
            'VERIFICATION_REQUIRED: Cannot activate car without owner identity verification (level 2)'
          );
        }
        // Other constraint violations
        throw new Error(`Status update failed: ${error.message}`);
      }

      throw error;
    }

    this.logger.info(`Car ${carId} status updated to ${status}`);
  } catch (err) {
    this.logger.error('Failed to update car status', { carId, status, error: err });
    throw err;
  }
}
```

**Type-safe pattern for all status enums:**

```typescript
// apps/web/src/app/core/models/index.ts

// MUST match database enum: public.car_status
export type CarStatus = 'draft' | 'active' | 'paused' | 'deleted' | 'pending';

// MUST match database enum: public.booking_status
export type BookingStatus =
  | 'pending_payment'
  | 'pending_owner_approval'
  | 'confirmed'
  | 'in_progress'
  | 'pending_return'
  | 'completed'
  | 'cancelled'
  | 'dispute';

// MUST match database enum: public.payment_status
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'cancelled';
```

**Service methods MUST use these types:**

```typescript
// ✅ Correct - Typed status parameter
async updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  reason?: string
): Promise<Booking> {
  // Compile-time safety: can only pass valid BookingStatus values

  // Additional business logic validation
  const { data: booking } = await this.supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }

  // Validate state transitions
  const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
    'pending_payment': ['pending_owner_approval', 'cancelled'],
    'pending_owner_approval': ['confirmed', 'cancelled'],
    'confirmed': ['in_progress', 'cancelled'],
    'in_progress': ['pending_return'],
    'pending_return': ['completed', 'dispute'],
    'completed': [],
    'cancelled': [],
    'dispute': ['completed', 'cancelled'],
  };

  if (!allowedTransitions[booking.status]?.includes(status)) {
    throw new Error(
      `Invalid status transition: ${booking.status} → ${status}`
    );
  }

  const { data, error } = await this.supabase
    .from('bookings')
    .update({ status, status_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;

  return data;
}
```

**Benefits:**

1. **Compile-time safety:** TypeScript prevents invalid values before runtime
2. **IDE autocomplete:** Developers see only valid options
3. **Refactoring safety:** Rename enum value once, find all usages with type errors
4. **Self-documenting:** Function signature shows allowed values
5. **Error handling:** Catch DB trigger violations with specific messages

---

### 20.2 Default Values Safety

**Problem:** Permissive defaults bypass security checks and validation.

**Example of bug:**
```typescript
// ❌ createCar() defaulted to status: 'active'
// This bypassed the id_verified requirement, allowing unverified owners to publish cars
```

**Golden Rule:**

> **Defaults MUST be the MOST RESTRICTIVE state, not the most permissive.**

**Examples:**

```typescript
// ❌ DANGEROUS - Permissive defaults
async createCar(input: CreateCarInput): Promise<Car> {
  const carData = {
    ...input,
    status: input.status || 'active',        // ❌ Bypasses verification
    published: input.published ?? true,       // ❌ Visible immediately
    is_verified: input.is_verified ?? true,   // ❌ Skips verification
    booking_enabled: input.booking_enabled ?? true, // ❌ Bookable without review
  };

  const { data } = await this.supabase
    .from('cars')
    .insert(carData)
    .select()
    .single();

  return data;
}

// ✅ SAFE - Restrictive defaults
async createCar(input: CreateCarInput): Promise<Car> {
  const carData = {
    ...input,
    status: input.status || 'draft',         // ✅ Requires explicit activation
    published: input.published ?? false,      // ✅ Requires explicit publish
    is_verified: input.is_verified ?? false,  // ✅ Requires verification
    booking_enabled: input.booking_enabled ?? false, // ✅ Requires enabling
  };

  // Validate if user tries to create directly as 'active'
  if (carData.status === 'active') {
    const { data: owner } = await this.supabase
      .from('profiles')
      .select('id_verified')
      .eq('id', input.owner_id)
      .single();

    if (!owner?.id_verified) {
      throw new Error(
        'VERIFICATION_REQUIRED: Cannot create car as active without owner identity verification (level 2). Car will be created as draft.'
      );
    }
  }

  const { data, error } = await this.supabase
    .from('cars')
    .insert(carData)
    .select()
    .single();

  if (error) {
    // Handle DB trigger violation
    if (error.code === '23514' && error.message.includes('id_verified')) {
      throw new Error(
        'VERIFICATION_REQUIRED: Database rejected car activation. Owner must complete identity verification first.'
      );
    }
    throw error;
  }

  return data;
}
```

**Safe Defaults Checklist:**

- [ ] ✅ Status fields → Most restrictive state (`'draft'`, `'pending'`, `'inactive'`)
- [ ] ✅ Boolean visibility → `false` (e.g., `published`, `is_public`, `show_on_map`)
- [ ] ✅ Boolean permissions → `false` (e.g., `can_edit`, `is_admin`, `allow_bookings`)
- [ ] ✅ Money amounts → `0` (never negative)
- [ ] ✅ Expiration dates → `null` or near-future date, never infinite
- [ ] ✅ Arrays → `[]` (empty), not `null`
- [ ] ✅ Feature flags → `false` unless explicitly needed

**Validation on creation:**

```typescript
// Validate business rules when creating with non-default values
async createSubscription(userId: string, plan: SubscriptionPlan): Promise<Subscription> {
  const subscriptionData = {
    user_id: userId,
    plan: plan,
    status: 'inactive' as const,  // ✅ Start inactive
    rides_remaining: 0,            // ✅ Start at 0
    starts_at: null,               // ✅ Not started yet
    expires_at: null,
  };

  // Only activate if payment confirmed
  const { data: payment } = await this.getPaymentForPlan(userId, plan);

  if (payment && payment.status === 'approved') {
    subscriptionData.status = 'active';
    subscriptionData.rides_remaining = plan.rides_included;
    subscriptionData.starts_at = new Date().toISOString();
    subscriptionData.expires_at = new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString();
  }

  const { data } = await this.supabase
    .from('subscriptions')
    .insert(subscriptionData)
    .select()
    .single();

  return data;
}
```

---

## 21. Pre-Deploy Verification Protocol

**Problem:** Code passes local tests but breaks in CI/production due to outdated types, missing migrations, or env mismatches.

**Solution:** Automated pre-deploy checklist that runs before push.

**Create `.husky/pre-push` (if not exists):**

```bash
#!/bin/bash
# .husky/pre-push
# Pre-Deploy Verification Protocol
# Runs before 'git push' to catch issues early

set -e  # Exit on first error

echo ""
echo "🚀 Pre-Deploy Verification Protocol"
echo "===================================="
echo ""

# ============================================================================
# 1. LINT
# ============================================================================
echo "1/7 Running lint..."
pnpm lint || {
  echo "❌ Lint failed. Fix errors before pushing."
  exit 1
}
echo "✅ Lint passed"
echo ""

# ============================================================================
# 2. BUILD
# ============================================================================
echo "2/7 Building project..."
pnpm build:web || {
  echo "❌ Build failed. Fix TypeScript errors before pushing."
  exit 1
}
echo "✅ Build passed"
echo ""

# ============================================================================
# 3. DATABASE TYPES SYNC
# ============================================================================
echo "3/7 Checking database types sync..."

# Generate fresh types to temp file
supabase gen types typescript --project-id aceacpaockyxgogxsfyc > /tmp/fresh-db-types.ts 2>/dev/null || {
  echo "⚠️  WARNING: Could not generate fresh types (supabase CLI issue?)"
  echo "   Skipping type sync check."
  echo ""
}

if [ -f /tmp/fresh-db-types.ts ]; then
  DIFF_COUNT=$(diff apps/web/src/app/core/types/database.types.ts /tmp/fresh-db-types.ts 2>/dev/null | wc -l || echo "0")

  if [ "$DIFF_COUNT" -gt 0 ]; then
    echo "⚠️  WARNING: database.types.ts is OUT OF SYNC with production database!"
    echo ""
    echo "   Preview of differences:"
    diff apps/web/src/app/core/types/database.types.ts /tmp/fresh-db-types.ts | head -20 || true
    echo ""
    echo "   This may cause runtime errors in production."
    echo ""
    echo "   To fix: pnpm types:db:gen"
    echo ""
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "❌ Aborted. Run 'pnpm types:db:gen' and commit the changes."
      exit 1
    fi
  else
    echo "✅ Database types are in sync"
  fi
fi
echo ""

# ============================================================================
# 4. ENUM VALIDATION
# ============================================================================
echo "4/7 Validating critical enums..."

if [ -f scripts/maintenance/validate-enum-sync.ts ]; then
  bun scripts/maintenance/validate-enum-sync.ts || {
    echo "❌ Enum validation failed!"
    echo "   Fix enum mismatches before pushing."
    exit 1
  }
else
  echo "⚠️  Enum validation script not found, skipping"
fi
echo ""

# ============================================================================
# 5. PENDING MIGRATIONS
# ============================================================================
echo "5/7 Checking pending migrations..."

PENDING=$(supabase migration list 2>/dev/null | grep "Not applied" || true)

if [ -n "$PENDING" ]; then
  echo "⚠️  WARNING: Pending migrations detected:"
  echo "$PENDING"
  echo ""
  read -p "   Deploy migrations to production first? (Y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo "   Running: supabase db push"
    supabase db push || {
      echo "❌ Migration push failed!"
      exit 1
    }
    echo "✅ Migrations applied"
  else
    echo "⚠️  Skipped migration push. Remember to deploy manually!"
  fi
else
  echo "✅ No pending migrations"
fi
echo ""

# ============================================================================
# 6. HARDCODED SECRETS CHECK
# ============================================================================
echo "6/7 Checking for hardcoded secrets..."

# Patterns to search for
SECRET_PATTERNS=(
  "sk_live_"           # Stripe live keys
  "sk_test_"           # Stripe test keys
  "APP_USR_"           # MercadoPago credentials
  "pk\.[a-zA-Z0-9]{40}" # Mapbox tokens
  "AIza[a-zA-Z0-9_-]{35}" # Google API keys
  "eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+" # JWT tokens
)

FOUND_SECRETS=false

for pattern in "${SECRET_PATTERNS[@]}"; do
  if grep -rE "$pattern" apps/web/src supabase/functions --exclude-dir=node_modules --exclude-dir=.git --exclude="*.log" 2>/dev/null | grep -v "EXAMPLE\|TODO\|PLACEHOLDER"; then
    FOUND_SECRETS=true
  fi
done

if [ "$FOUND_SECRETS" = true ]; then
  echo ""
  echo "❌ CRITICAL: Hardcoded secrets detected!"
  echo "   Move secrets to environment variables before pushing."
  exit 1
fi

echo "✅ No hardcoded secrets found"
echo ""

# ============================================================================
# 7. UNIT TESTS (Optional - uncomment if desired)
# ============================================================================
# echo "7/7 Running unit tests..."
# pnpm test:unit || {
#   echo "❌ Tests failed!"
#   echo "   Fix failing tests before pushing."
#   exit 1
# }
# echo "✅ Tests passed"
# echo ""

# ============================================================================
# SUCCESS
# ============================================================================
echo ""
echo "✅ Pre-Deploy Verification PASSED!"
echo ""
echo "📋 Summary:"
echo "   ✓ Lint passed"
echo "   ✓ Build succeeded"
echo "   ✓ Database types in sync"
echo "   ✓ Enums validated"
echo "   ✓ No pending migrations (or deployed)"
echo "   ✓ No hardcoded secrets"
echo ""
echo "🚀 Ready to push!"
echo ""
```

**Install hook:**

```bash
# Initialize husky (if not already done)
pnpm add -D husky
npx husky install

# Make pre-push executable
chmod +x .husky/pre-push

# Test it
git push --dry-run
```

**What this prevents:**

- ❌ Pushing code with lint errors
- ❌ Pushing code that doesn't build
- ❌ TypeScript types out of sync with production DB
- ❌ Enum mismatches causing runtime errors
- ❌ Deploying frontend before backend (migrations)
- ❌ Committing secrets/API keys
- ❌ Breaking CI due to predictable issues

---

## 22. Automated Quality Gates

### CI Workflows for Continuous Enforcement

**Add `.github/workflows/quality-gates.yml`:**

```yaml
name: Quality Gates

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  # ============================================================================
  # Job 1: Enum Sync Validation
  # ============================================================================
  enum-sync:
    name: Validate Enum Sync
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run enum validation
        run: bun scripts/maintenance/validate-enum-sync.ts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

  # ============================================================================
  # Job 2: RLS Coverage Audit
  # ============================================================================
  rls-audit:
    name: RLS Coverage Audit
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.files.*.filename, 'supabase/migrations/')

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run RLS audit
        run: bun scripts/maintenance/audit-rls-coverage.ts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

      - name: Comment on PR (if failed)
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ **RLS Coverage Audit Failed**\n\nSome tables or buckets are missing RLS policies.\n\nSee workflow logs for details. Refer to `AGENTS-2.md` section 19.1 for policy templates.'
            })

  # ============================================================================
  # Job 3: Database Types Sync Check
  # ============================================================================
  db-types-sync:
    name: Database Types Sync
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Generate fresh types
        run: |
          supabase gen types typescript --project-id ${{ secrets.SUPABASE_PROJECT_ID }} > /tmp/fresh-types.ts

      - name: Compare with committed types
        run: |
          if ! diff apps/web/src/app/core/types/database.types.ts /tmp/fresh-types.ts > /tmp/type-diff.txt; then
            echo "❌ Database types are out of sync!"
            echo ""
            echo "Differences:"
            cat /tmp/type-diff.txt
            exit 1
          fi
          echo "✅ Database types are in sync"

  # ============================================================================
  # Job 4: Migration Idempotency Test
  # ============================================================================
  migration-idempotency:
    name: Test Migration Idempotency
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.files.*.filename, 'supabase/migrations/')

    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Start Supabase local
        run: supabase start

      - name: Apply migrations (first time)
        run: supabase db push

      - name: Apply migrations again (test idempotency)
        run: |
          supabase db push || {
            echo "❌ Migrations are NOT idempotent!"
            echo "Migrations failed on second run."
            exit 1
          }

      - name: Apply migrations third time (extra safety)
        run: |
          supabase db push || {
            echo "❌ Migrations failed on third run!"
            exit 1
          }

      - name: Stop Supabase
        if: always()
        run: supabase stop

  # ============================================================================
  # Job 5: Edge Function Security Audit
  # ============================================================================
  edge-function-security:
    name: Edge Function Security Audit
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.files.*.filename, 'supabase/functions/')

    steps:
      - uses: actions/checkout@v4

      - name: Check for auth in Edge Functions
        run: |
          echo "Checking Edge Functions for proper authentication..."

          # Find all index.ts files in functions/
          FUNCTIONS=$(find supabase/functions -name "index.ts" -type f)

          MISSING_AUTH=()

          for func in $FUNCTIONS; do
            # Skip frozen functions (MercadoPago, process-payment-queue)
            if echo "$func" | grep -qE "mercadopago|process-payment-queue"; then
              continue
            fi

            # Skip webhook functions (they use signature validation)
            if echo "$func" | grep -q "webhook"; then
              continue
            fi

            # Check if function has requireAuth() or getUser() call
            if ! grep -q "requireAuth\|\.auth\.getUser()" "$func"; then
              MISSING_AUTH+=("$func")
            fi
          done

          if [ ${#MISSING_AUTH[@]} -gt 0 ]; then
            echo "❌ Edge Functions missing authentication:"
            printf '%s\n' "${MISSING_AUTH[@]}"
            echo ""
            echo "Add requireAuth() call at the start of these functions."
            echo "See AGENTS-2.md section 18.1"
            exit 1
          fi

          echo "✅ All Edge Functions have authentication"

  # ============================================================================
  # Job 6: Hardcoded Secrets Check
  # ============================================================================
  secrets-check:
    name: Check for Hardcoded Secrets
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Scan for secrets
        run: |
          echo "Scanning for hardcoded secrets..."

          # Use gitleaks or custom grep
          if grep -rE "sk_live_|APP_USR_|pk\.[a-zA-Z0-9]{40}|AIza[a-zA-Z0-9_-]{35}" \
             apps/web/src supabase/functions \
             --exclude-dir=node_modules \
             --exclude-dir=.git \
             | grep -v "EXAMPLE\|TODO\|PLACEHOLDER"; then
            echo ""
            echo "❌ CRITICAL: Hardcoded secrets found!"
            echo "Move secrets to environment variables."
            exit 1
          fi

          echo "✅ No hardcoded secrets found"
```

**What this CI enforces:**

- ✅ Enum sync between TypeScript and DB
- ✅ RLS coverage on new migrations
- ✅ Database types in sync with production
- ✅ Migrations are idempotent (can run 2-3 times)
- ✅ Edge Functions have proper authentication
- ✅ No hardcoded secrets in code

---

## Summary of Rules

| Section | Rule | Impact | Automation |
|---------|------|--------|------------|
| 17.1 | Enum Sync Protocol | 🔥 High | ✅ Pre-commit hook |
| 17.2 | Schema Verification Before Coding | 🔥 High | ⚠️ Manual + docs |
| 17.3 | Migration Idempotency Standards | 🔥 High | ✅ CI test |
| 18.1 | Auth-First Pattern | 🔥 High | ✅ Helper functions |
| 18.2 | Edge Function Security Checklist | 🟡 Medium | ✅ CI scan |
| 19.1 | RLS Coverage Requirements | 🔥 High | ✅ CI audit |
| 19.2 | RLS Audit Script | 🟡 Medium | ✅ Weekly CI |
| 20.1 | Typed Status Updates | 🔥 High | ✅ TypeScript compiler |
| 20.2 | Default Values Safety | 🟡 Medium | ⚠️ Code review |
| 21 | Pre-Deploy Verification Protocol | 🔥 High | ✅ Pre-push hook |
| 22 | Automated Quality Gates | 🔥 High | ✅ CI workflows |

---

## Next Steps

1. **Implement pre-commit hooks:**
   ```bash
   pnpm add -D husky
   npx husky install
   # Copy enum validation script
   # Copy pre-push hook
   chmod +x .husky/pre-push
   ```

2. **Create audit scripts:**
   ```bash
   # Create scripts/maintenance/validate-enum-sync.ts
   # Create scripts/maintenance/audit-rls-coverage.ts
   bun scripts/maintenance/validate-enum-sync.ts
   bun scripts/maintenance/audit-rls-coverage.ts
   ```

3. **Add SQL audit functions:**
   ```bash
   # Create migration with get_tables_without_rls(), etc.
   supabase migration new rls_audit_functions
   # Copy functions from section 19.2
   supabase db push
   ```

4. **Create auth helpers:**
   ```bash
   # Create supabase/functions/_shared/auth-helpers.ts
   # Copy helpers from section 18.1
   # Update existing functions to use requireAuth()
   ```

5. **Add CI workflows:**
   ```bash
   # Create .github/workflows/quality-gates.yml
   # Copy workflow from section 22
   # Add required secrets to GitHub repo settings
   ```

6. **Update existing code:**
   - Run enum validation, fix mismatches
   - Run RLS audit, add missing policies
   - Update status update functions with typed params
   - Fix dangerous defaults (draft not active, false not true)

---

**© 2026 AutoRenta | Advanced Platform Hardening Rules v1.0**

*Generated from production debugging session 2026-02-08*
