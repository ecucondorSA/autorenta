# Applying Profile Schema Migrations

**Date**: 2025-11-11
**Purpose**: Fix critical gaps in profile system identified during audit
**Related Issue**: Profile Restructure & Persistence

---

## 📋 Summary

This document provides instructions for applying three database migrations to the `profiles` table:

1. **Critical**: Add `date_of_birth` column (required for insurance calculations)
2. **Medium Priority**: Add GPS location fields (for distance-based features)
3. **Optional**: Clean up legacy fields (after verification)

---

## ⚠️ Pre-Migration Checklist

Before applying these migrations, ensure:

- [ ] You have database backup access
- [ ] You're connected to the correct environment (dev/staging/production)
- [ ] You have admin permissions on Supabase project
- [ ] Dev server is stopped (to avoid cache issues)

---

## 🔧 Migration 1: Add date_of_birth (CRITICAL)

### Context
- **Gap**: Field exists in UI (`ProfileExpandedPage` Tab 1) but not in database
- **Impact**: Blocks insurance risk calculation and age verification
- **Priority**: HIGH - Must be applied immediately

### File
`supabase/migrations/20251111_add_date_of_birth_to_profiles.sql`

### What it does
- Adds `date_of_birth` column (type: DATE)
- Adds constraint: minimum age 18 years
- Creates index for performance

### Apply via Supabase CLI

```bash
# 1. Ensure you're linked to the correct project
supabase projects list
supabase link --project-ref <your-project-ref>

# 2. Apply the migration
supabase db push

# Or apply specific migration file:
supabase migration up --include 20251111_add_date_of_birth_to_profiles
```

### Apply via Supabase Dashboard

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy contents of `20251111_add_date_of_birth_to_profiles.sql`
3. Paste and click **Run**
4. Verify success message in output

### Verification

```sql
-- Check column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'date_of_birth';

-- Check constraint was created
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'check_minimum_age_18';

-- Test constraint works (should fail for users under 18)
UPDATE profiles
SET date_of_birth = CURRENT_DATE - INTERVAL '10 years'
WHERE id = '<test-user-id>';
-- Expected: ERROR - violates check constraint "check_minimum_age_18"

-- Test constraint works (should succeed for users 18+)
UPDATE profiles
SET date_of_birth = CURRENT_DATE - INTERVAL '25 years'
WHERE id = '<test-user-id>';
-- Expected: UPDATE 1
```

### Post-Migration Steps

```bash
# 1. Update TypeScript types
cd /home/edu/autorenta
npm run sync:types

# 2. Verify date_of_birth appears in database.types.ts
grep -A 5 "date_of_birth" apps/web/src/types/supabase.types.ts

# 3. Restart dev server
npm run dev

# 4. Test in UI:
#    - Go to /profile-expanded
#    - Tab 1 (General)
#    - Enter a date of birth (18+ years old)
#    - Save and verify it persists in database
```

---

## 🗺️ Migration 2: Add GPS Location Fields (MEDIUM PRIORITY)

### Context
- **Gap**: Fields exist in TypeScript types but not in database or UI
- **Impact**: Enables distance-based dynamic pricing and nearby car search
- **Priority**: MEDIUM - Nice to have, not blocking current functionality

### File
`supabase/migrations/20251111_add_gps_location_to_profiles.sql`

### What it does
- Adds `home_latitude` (DOUBLE PRECISION)
- Adds `home_longitude` (DOUBLE PRECISION)
- Adds `location_verified_at` (TIMESTAMPTZ)
- Adds `preferred_search_radius_km` (INTEGER, default 25)
- Adds constraints for valid GPS coordinates
- Creates spatial indexes for performance

### Apply via Supabase CLI

```bash
supabase migration up --include 20251111_add_gps_location_to_profiles
```

### Apply via Supabase Dashboard

1. Go to **SQL Editor**
2. Copy contents of `20251111_add_gps_location_to_profiles.sql`
3. Paste and click **Run**

### Verification

```sql
-- Check all columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'home_latitude',
    'home_longitude',
    'location_verified_at',
    'preferred_search_radius_km'
  );

-- Check constraints were created
SELECT constraint_name
FROM information_schema.check_constraints
WHERE constraint_name IN (
  'check_valid_latitude',
  'check_valid_longitude',
  'check_valid_search_radius',
  'check_complete_coordinates'
);

-- Test latitude constraint (should fail for invalid values)
UPDATE profiles
SET home_latitude = 100  -- Invalid: > 90
WHERE id = '<test-user-id>';
-- Expected: ERROR - violates check constraint "check_valid_latitude"

-- Test complete coordinates constraint (should fail if only lat provided)
UPDATE profiles
SET home_latitude = 40.7128, home_longitude = NULL
WHERE id = '<test-user-id>';
-- Expected: ERROR - violates check constraint "check_complete_coordinates"

-- Test valid coordinates (should succeed)
UPDATE profiles
SET home_latitude = -34.6037, home_longitude = -58.3816  -- Buenos Aires
WHERE id = '<test-user-id>';
-- Expected: UPDATE 1
```

### Post-Migration Steps

```bash
# 1. Update TypeScript types
npm run sync:types

# 2. Restart dev server
npm run dev

# 3. Optional: Implement UI for GPS location capture
#    - See section "Implementing GPS Location UI" below
```

---

## 🧹 Migration 3: Cleanup Legacy Fields (OPTIONAL)

### Context
- **Gap**: Database contains duplicate/obsolete columns from old system
- **Impact**: Reduces schema complexity, improves maintainability
- **Priority**: LOW - Only apply after verifying fields are unused

### File
`supabase/migrations/20251111_cleanup_legacy_profile_fields.sql`

### What it does
Removes legacy columns:
- `email_verified` → use `is_email_verified`
- `phone_verified` → use `is_phone_verified`
- `id_verified` → use `is_driver_verified`
- `dni` → use `gov_id_number`
- `stripe_customer_id` → AutoRenta uses MercadoPago

### ⚠️ DANGER ZONE - Apply with Caution

**Before applying this migration**:

1. **Backup the profiles table**:
```bash
# Via Supabase CLI
supabase db dump -f profiles_backup_$(date +%Y%m%d).sql --data-only -t profiles

# Or via pg_dump
pg_dump -h <host> -U postgres.<project-ref> -t profiles > profiles_backup.sql
```

2. **Verify fields are unused**:
```bash
# Search codebase for references to legacy fields
cd /home/edu/autorenta
grep -r "email_verified" apps/web/src --exclude-dir=node_modules
grep -r "phone_verified" apps/web/src --exclude-dir=node_modules
grep -r "id_verified" apps/web/src --exclude-dir=node_modules
grep -r "\.dni" apps/web/src --exclude-dir=node_modules
grep -r "stripe_customer_id" apps/web/src --exclude-dir=node_modules

# If grep returns matches, DO NOT proceed with this migration
```

3. **Test in staging first**:
```bash
# Apply to staging environment
supabase link --project-ref <staging-project-ref>
supabase migration up --include 20251111_cleanup_legacy_profile_fields

# Run full test suite
npm run test
npm run test:e2e

# Verify all profile features work
```

### Apply (only if verified safe)

```bash
# Production
supabase link --project-ref <production-project-ref>
supabase migration up --include 20251111_cleanup_legacy_profile_fields
```

### Post-Migration Steps

```bash
# 1. Update TypeScript types (removed fields will disappear)
npm run sync:types

# 2. Clean any remaining references in code
# (Should be none if verification step passed)

# 3. Restart dev server
npm run dev
```

---

## 🧪 Testing After Migrations

### Test Profile Update Flow

```typescript
// 1. Login to app
// 2. Go to /profile-expanded
// 3. Test each tab saves correctly:

// Tab 1: General
- Update full_name: "Test User"
- Update date_of_birth: "1990-01-01"  // Should save now
- Save → Verify success toast

// Tab 2: Contact
- Update phone: "+5491112345678"
- Update whatsapp: "+5491112345678"
- Save → Verify success toast

// Tab 3: Address
- Update address_line1: "Av. Corrientes 1234"
- Update city: "Buenos Aires"
- Save → Verify success toast

// Tab 7: Preferences
- Update preferred_search_radius_km: 30  // If GPS UI implemented
- Save → Verify success toast
```

### Verify Data in Database

```sql
-- Check user profile has all new fields
SELECT
  id,
  full_name,
  date_of_birth,                    -- Should have value if user entered it
  home_latitude,                    -- NULL until user sets location
  home_longitude,                   -- NULL until user sets location
  preferred_search_radius_km,       -- Default 25
  is_email_verified,                -- Should work (not email_verified)
  is_phone_verified                 -- Should work (not phone_verified)
FROM profiles
WHERE id = '<test-user-id>';
```

---

## 🔄 Rollback Instructions

If something goes wrong, you can rollback migrations:

### Rollback Migration 1 (date_of_birth)

```sql
-- Remove constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_minimum_age_18;

-- Drop index
DROP INDEX IF EXISTS idx_profiles_date_of_birth;

-- Remove column
ALTER TABLE profiles DROP COLUMN IF EXISTS date_of_birth;
```

### Rollback Migration 2 (GPS fields)

```sql
-- Remove constraints
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS check_valid_latitude,
  DROP CONSTRAINT IF EXISTS check_valid_longitude,
  DROP CONSTRAINT IF EXISTS check_valid_search_radius,
  DROP CONSTRAINT IF EXISTS check_complete_coordinates;

-- Drop indexes
DROP INDEX IF EXISTS idx_profiles_home_location;
DROP INDEX IF EXISTS idx_profiles_location_verified;

-- Remove columns
ALTER TABLE profiles
  DROP COLUMN IF EXISTS home_latitude,
  DROP COLUMN IF EXISTS home_longitude,
  DROP COLUMN IF EXISTS location_verified_at,
  DROP COLUMN IF EXISTS preferred_search_radius_km;
```

### Rollback Migration 3 (cleanup)

```sql
-- Restore legacy columns (if you have backup)
-- This is why backup is CRITICAL before running migration 3

-- Restore from backup file:
psql -h <host> -U postgres.<project-ref> < profiles_backup.sql
```

---

## 📚 Next Steps After Migrations

1. **Update UI to use GPS location** (if Migration 2 applied):
   - Create `LocationPickerComponent`
   - Add "Location" tab to ProfileExpandedPage
   - Implement Mapbox integration for selecting home location

2. **Add validation for date_of_birth** (if Migration 1 applied):
   - Already exists in UI, just needs to persist now
   - Consider adding visual feedback for age verification

3. **Monitor for issues**:
   - Check Supabase logs for constraint violations
   - Monitor error tracking (Sentry/similar) for profile update failures

4. **Documentation**:
   - Update API documentation with new fields
   - Update QA test cases to include new profile fields

---

## 🆘 Troubleshooting

### Error: "relation profiles does not exist"
**Solution**: Wrong database connected. Verify project ref:
```bash
supabase projects list
supabase link --project-ref <correct-ref>
```

### Error: "column already exists"
**Solution**: Migration already applied. Check:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'date_of_birth';
```

### Error: "permission denied"
**Solution**: Use service_role key or admin user:
```bash
# Set service role key in .env
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Or connect as postgres user
supabase db reset  # Resets and applies all migrations
```

### TypeScript types not updating
**Solution**: Force regenerate types:
```bash
# Clear cache
rm -rf apps/web/src/types/supabase.types.ts

# Regenerate
npm run sync:types

# If still not working, manual download:
supabase gen types typescript --project-id <project-ref> > apps/web/src/types/supabase.types.ts
```

---

## 📞 Support

If you encounter issues:
1. Check Supabase Dashboard → Logs for detailed error messages
2. Review migration SQL files for syntax errors
3. Test in dev environment first, never directly in production
4. Contact DevOps team if database access issues

---

**Last Updated**: 2025-11-11
**Maintained By**: Development Team
