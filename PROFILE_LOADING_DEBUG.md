# Profile Loading Error - Debugging Guide

**Date**: 2025-10-20
**Branch**: `debug/profile-loading-issue`
**Issue**: "No pudimos cargar tu perfil" error message when accessing profile page

## Problem Statement

When user tries to access their profile page (`/profile`), they see:
```
❌ "No pudimos cargar tu perfil."
```

This is a generic error message that masks the real underlying issue.

## Root Cause Analysis

### Code Flow

1. **ProfilePage Component** (`profile.page.ts:128-160`)
   - Calls `profileService.getCurrentProfile()` on init
   - Catches error and displays it (previously only showed generic message)
   - Now shows detailed error message with logging

2. **ProfileService** (`profile.service.ts:41-91`)
   - Calls `supabase.auth.getUser()` to get authenticated user
   - Queries `profiles` table with user ID
   - If profile doesn't exist (PGRST116), auto-creates profile
   - Throws error if any other issue occurs

### Possible Causes

| Issue | Error Code | Status | Symptoms |
|-------|-----------|--------|----------|
| **Session expired** | N/A | 401 | `getUser()` returns null |
| **No profile in DB** | PGRST116 | 404 | Profile auto-created, should work |
| **RLS Policy violation** | 42501 | 403 | User can't read their own profile |
| **Database connection error** | Various | 500+ | Network/Supabase issues |
| **Invalid JWT token** | N/A | 401 | Session token is invalid/expired |

## Debugging Steps

### 1. Check Browser Console

Open DevTools (F12) and look for logs with `[ProfileService]` or `[ProfilePage]` prefix:

```
[ProfileService] Fetching profile for user: 64d3d7f5-9722-48a6-a294-fa1724002e1b
[ProfileService] Query error: {
  code: "42501",
  message: "new row violates row-level security policy",
  status: 403,
  details: "...",
  hint: "..."
}
```

### 2. Check Authentication Status

```javascript
// In browser console:
const { data } = await supabaseClient.auth.getUser();
console.log('Current user:', data.user);
```

Expected output: User object with email, id, etc.
If `data.user` is `null`, session has expired.

### 3. Check Supabase Dashboard

**Path**: SQL Editor → Test query:

```sql
-- Check if user has a profile
SELECT * FROM profiles WHERE id = '64d3d7f5-9722-48a6-a294-fa1724002e1b';

-- Check RLS policies on profiles table
SELECT * FROM auth.users WHERE id = '64d3d7f5-9722-48a6-a294-fa1724002e1b';
```

### 4. Test Profile Query Directly

```javascript
// In browser console:
const userId = (await supabaseClient.auth.getUser()).data.user?.id;
const { data, error } = await supabaseClient
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

console.log('Data:', data);
console.log('Error:', error);
```

## Improvements Made

### 1. Enhanced Error Logging in ProfileService

**File**: `profile.service.ts:41-91`

Added detailed logging at each step:
```typescript
// Before
if (error) {
  throw error;  // ❌ Loses error context
}

// After
if (error) {
  console.error('[ProfileService] Query error:', {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    status: error.status,
  });

  if (error.status === 403) {
    // Identify RLS violations
    const rrlsError = `RLS Policy violation: Usuario ${user.id} no tiene acceso...`;
    throw new Error(rrlsError);
  }

  throw new Error(`Error cargando perfil (${error.code}): ${error.message}`);
}
```

### 2. Enhanced Error Display in ProfilePage

**File**: `profile.page.ts:128-178`

Now shows detailed error instead of generic message:
```typescript
// Before
const errorMessage = err instanceof Error ? err.message : 'No pudimos cargar tu perfil.';

// After
let errorMessage = 'No pudimos cargar tu perfil.';
if (err instanceof Error) {
  errorMessage = err.message;
}

// Add context
if (errorMessage.includes('Usuario no autenticado')) {
  errorMessage = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
} else if (errorMessage.includes('RLS Policy')) {
  errorMessage = 'Error de permisos: ' + errorMessage;
}
```

### 3. Auto-Profile Creation Error Handling

**File**: `profile.service.ts:212-237`

Enhanced `createProfile()` with better error messages:
```typescript
private async createProfile(userId: string, email: string) {
  console.log('[ProfileService] Creating new profile:', { userId, email, profile: newProfile });

  const { data, error } = await this.supabase.from('profiles').insert(newProfile).select().single();

  if (error) {
    const detailedError = `Error creando perfil (${error.code}): ${error.message}...`;
    throw new Error(detailedError);
  }

  console.log('[ProfileService] Profile created successfully...');
  return data as UserProfile;
}
```

## Testing Checklist

- [ ] **Session Valid**: Verify user is logged in (check console: `supabaseClient.auth.getSession()`)
- [ ] **Profile Exists**: Check Supabase SQL Editor for profile row
- [ ] **RLS Policies**: Verify policies allow user to read own profile
- [ ] **JWT Token**: Verify token is not expired
- [ ] **Network**: Check for 503/504 errors (Supabase down)
- [ ] **Browser Console**: Review all `[ProfileService]` and `[ProfilePage]` logs

## Common Solutions

### Issue: Session Expired

**Error message**: `Usuario no autenticado - getUser() retornó null`

**Fix**:
1. Sign out: `/profile` → Click "Cerrar sesión"
2. Sign in again: `/auth/login`
3. Try accessing profile again

### Issue: RLS Policy Violation

**Error message**: `RLS Policy violation: Usuario X no tiene acceso a su propio perfil`

**Debug**:
```sql
-- Check RLS policies
SELECT * FROM auth.policies() WHERE table_name = 'profiles';

-- Test policy (run as user in SQL editor):
SELECT * FROM profiles WHERE id = auth.uid();
```

**Fix**: May need to recreate RLS policies (see `supabase/migrations/`)

### Issue: No Profile in Database

**Error message**: `PGRST116` (not found, should auto-create)

**Check**:
- Profile auto-creation is working (look for "Profile created successfully" in logs)
- If creation fails, check permissions on `profiles` table
- If profile still doesn't exist, manually create in Supabase SQL Editor:

```sql
INSERT INTO profiles (id, full_name, role, country)
VALUES (
  '64d3d7f5-9722-48a6-a294-fa1724002e1b',
  'John Doe',
  'renter',
  'AR'
);
```

## Next Steps

1. **Deploy changes to debug branch**:
   ```bash
   git add -A
   git commit -m "debug: Add enhanced error logging to profile loading"
   git push origin debug/profile-loading-issue
   ```

2. **Test on deployment**:
   - Visit: `https://lab-wallet-debug-aggressive.autorenta-web.pages.dev/profile`
   - Open DevTools (F12)
   - Look for error logs
   - Report back with exact error message

3. **Once root cause identified**:
   - Create fix in separate branch
   - Merge to `main` after verification
   - Deploy to production

## Files Modified

- ✅ `apps/web/src/app/core/services/profile.service.ts`
  - Enhanced error logging in `getCurrentProfile()`
  - Enhanced error handling in `createProfile()`

- ✅ `apps/web/src/app/features/profile/profile.page.ts`
  - Enhanced error display in `loadProfile()`
  - Added error context detection

- 📝 `PROFILE_LOADING_DEBUG.md` (this file)
  - Comprehensive debugging guide

## Resources

- **Supabase RLS Docs**: https://supabase.com/docs/guides/auth/row-level-security
- **Error Codes**: https://supabase.com/docs/reference/javascript/error-handling
- **CLAUDE.md**: See "Common Pitfalls" section for storage path issues
- **PHOTO_UPLOAD_AUDIT.md**: Similar RLS debugging process for avatars

