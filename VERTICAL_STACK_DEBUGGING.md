# 🔍 Vertical Stack Debugging Workflow

**Pattern discovered in**: Autorenta project (2025-10-16)
**Use case**: Avatar upload RLS policy violation
**Complete analysis**: See `PHOTO_UPLOAD_AUDIT.md`

---

## Overview

The **Vertical Stack Debugging Workflow** is a systematic approach to debugging issues that span multiple architectural layers of an application. Instead of debugging a single layer in isolation, this method traces the entire data flow from UI to database.

## When to Apply

Use this pattern when encountering:

- ✅ RLS (Row-Level Security) policy violations
- ✅ Storage upload/download failures
- ✅ Authentication/authorization issues
- ✅ Data flow problems across architectural boundaries
- ✅ Integration bugs between frontend and backend
- ✅ Permission errors that don't make obvious sense
- ✅ Issues that seem to "work locally but fail in production"

## Architecture Layers

A typical full-stack application has these layers:

```
┌─────────────────────────────────────────┐
│  LAYER 1: UI (Components/Templates)     │  ← User interaction
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 2: Service Layer (Business Logic)│  ← Data transformation
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 3: SDK/Client (API Wrapper)      │  ← API abstraction
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 4: Storage/Database API          │  ← Data persistence
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 5: Security Policies (RLS/IAM)   │  ← Access control
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 6: Database Schema                │  ← Data structure
└─────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────┐
│  LAYER 7: Type Definitions               │  ← Type safety
└─────────────────────────────────────────┘
```

## The Process

### Step 1: Create Audit Branch

```bash
git checkout -b audit/feature-name
```

**Why?**
- Isolates investigation work from main codebase
- Allows experimental changes without risk
- Creates a clean history of the debugging process

### Step 2: Map the Full Stack

Trace the feature through **all** layers:

1. **Identify the entry point** (usually a UI event)
2. **Follow the data flow** through each layer
3. **Document each layer's state** (✅ working / ❌ failing)
4. **Note assumptions** at each boundary

**Template**:
```
Feature: Upload Avatar
Entry Point: profile.page.ts:137 (onAvatarChange)

Layer 1 (UI):        ✅ Event fired correctly
Layer 2 (Service):   ✅ File validation passed
Layer 3 (SDK):       ✅ Supabase.storage.upload() called
Layer 4 (Storage):   ❌ Path structure incorrect
Layer 5 (RLS):       ❌ Policy validation failed ← ERROR HERE
Layer 6 (Schema):    ✅ Bucket exists
Layer 7 (Types):     ✅ Interfaces correct
```

### Step 3: Create Audit Document

Create a detailed markdown document (e.g., `FEATURE_NAME_AUDIT.md`) with:

#### Required Sections

1. **Problem Statement**
   - Error message
   - User context
   - Expected vs actual behavior

2. **Architecture Analysis**
   - Database schema review
   - Security policies documentation
   - Service layer code
   - Component integration

3. **Root Cause Analysis (RCA)**
   - What failed and why
   - Why existing code didn't catch it
   - Assumptions that were incorrect

4. **Solution**
   - Code changes required
   - Which layers need updates
   - Before/after examples

5. **Testing Plan**
   - How to reproduce the bug
   - How to verify the fix
   - Edge cases to test

6. **Prevention**
   - Lessons learned
   - Patterns to follow
   - Anti-patterns to avoid

### Step 4: Implement Fixes

Apply fixes **across all affected layers**:

```bash
# Example from Autorenta avatar upload fix
# Layer 2 (Service): Remove bucket prefix from path
# Layer 5 (RLS): No changes needed (policies were correct)
# Layer 7 (Types): Add storage path patterns to docs
```

**Important**: Don't just fix the symptom. Fix the root cause.

### Step 5: Merge with Documentation

```bash
git add -A
git commit -m "fix: detailed commit message with RCA"
git checkout main
git merge audit/feature-name --no-ff
git branch -d audit/feature-name
```

**Why `--no-ff`?**
- Preserves the audit branch history
- Makes it clear this was a complex investigation
- Easier to revert if needed

---

## Real-World Example: Autorenta Avatar Upload

### Problem

```
Error: new row violates row-level security policy
Context: User clicking "Cambiar foto" in profile page
```

### Investigation

**Layer 1: UI Component** (`profile.page.ts:137`)
```typescript
async onAvatarChange(event: Event): Promise<void> {
  const file = input.files?.[0];
  if (!file) return;

  const newAvatarUrl = await this.profileService.uploadAvatar(file); // ✅ Called
}
```
Status: ✅ Working

**Layer 2: Service** (`profile.service.ts:97`)
```typescript
async uploadAvatar(file: File): Promise<string> {
  const user = await this.supabase.auth.getUser(); // ✅ User authenticated

  // ❌ BUG HERE
  const filePath = `avatars/${user.id}/${uuidv4()}.${extension}`;

  await this.supabase.storage.from('avatars').upload(filePath, file);
}
```
Status: ❌ Incorrect path construction

**Layer 5: RLS Policy** (`setup-profiles.sql:76`)
```sql
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text  -- ❌ FAILS
);
```
Status: ❌ Policy validation failing

### Root Cause

The service was constructing paths as:
```
avatars/user-uuid-123/file.jpg
```

But the RLS policy expected:
```
user-uuid-123/file.jpg
```

When the policy extracts `foldername()[1]`:
- Path `avatars/user-id/file`: `foldername()[1]` = `'avatars'` ≠ `user-id` ❌
- Path `user-id/file`: `foldername()[1]` = `user-id` ✅

### Solution

```typescript
// Before (incorrect)
const filePath = `avatars/${user.id}/${uuidv4()}.${extension}`;

// After (correct)
const filePath = `${user.id}/${uuidv4()}.${extension}`;
```

The bucket name is specified in `.from('avatars')`, not in the path.

### Lessons Learned

1. **Storage path patterns are critical**
   - Bucket name goes in `.from()`, not the path
   - RLS policies validate path structure
   - First folder must be user identifier

2. **Compare with working examples**
   - `CarsService.uploadPhoto()` was already correct
   - Pattern inconsistency was the red flag

3. **Document patterns**
   - Add to `CLAUDE.md` for future reference
   - Create examples in code comments
   - Establish project conventions

---

## Benefits of This Approach

### 1. Complete Understanding

You don't just fix the bug—you understand the entire system:
- How data flows through the application
- Where security is enforced
- What assumptions each layer makes
- Which patterns are used elsewhere

### 2. Better Documentation

The audit document becomes:
- ✅ Onboarding material for new developers
- ✅ Reference for similar issues
- ✅ Architectural documentation
- ✅ Pattern catalog

### 3. Prevention

By documenting the root cause and patterns:
- Future developers avoid the same mistake
- Code reviews catch similar issues
- Conventions become explicit

### 4. Cross-Layer Validation

You verify that:
- Types match schema
- Services match policies
- UI reflects backend capabilities
- Security is enforced at the right layer

---

## Common Patterns Discovered

### Pattern 1: Storage Path Structure

**Rule**: Never include bucket name in file paths

```typescript
// ✅ CORRECT for all storage operations
const path = `${userId}/${filename}`;
await supabase.storage.from('bucket').upload(path, file);

// ❌ WRONG - bucket prefix breaks RLS
const path = `bucket/${userId}/${filename}`;
await supabase.storage.from('bucket').upload(path, file);
```

### Pattern 2: RLS Debugging

**Rule**: Test policies with actual user context

```sql
-- In Supabase SQL Editor
SET LOCAL "request.jwt.claims" = '{"sub": "actual-user-uuid"}';

-- Test your path structure
SELECT (storage.foldername('user-uuid/file.jpg'))[1] = 'user-uuid';
-- Should return true

SELECT (storage.foldername('bucket/user-uuid/file.jpg'))[1] = 'user-uuid';
-- Returns false (this is the bug pattern)
```

### Pattern 3: Service Layer Consistency

**Rule**: Establish and follow patterns across all services

```typescript
// If CarsService does it this way:
const path = `${userId}/${carId}/${filename}`;

// Then ProfileService should follow the same pattern:
const path = `${userId}/${filename}`;

// NOT a different pattern:
const path = `avatars/${userId}/${filename}`; // ❌ Inconsistent
```

---

## Applying to Other Stacks

This workflow works for any application with:

### Backend Stacks
- Supabase (Postgres + RLS)
- Firebase (Firestore Security Rules)
- AWS (S3 + IAM policies)
- Azure (Blob Storage + RBAC)

### Frontend Frameworks
- Angular (services + components)
- React (hooks + components)
- Vue (composables + components)
- Any framework with layered architecture

### Common Issues
- Permission errors
- Upload failures
- Authentication problems
- Authorization mismatches
- Policy violations
- Schema misalignments

---

## Checklist for Vertical Debugging

- [ ] Create audit branch
- [ ] Map all architectural layers
- [ ] Test each layer independently
- [ ] Identify the failing layer
- [ ] Understand why it fails
- [ ] Check adjacent layers for consistency
- [ ] Compare with working examples
- [ ] Document root cause
- [ ] Implement fix across all layers
- [ ] Verify end-to-end
- [ ] Update project documentation
- [ ] Add prevention strategies
- [ ] Merge with complete history

---

## Tools and Techniques

### For Supabase

```sql
-- Test RLS policies
SET LOCAL role = 'authenticated';
SET LOCAL "request.jwt.claims" = '{"sub": "user-uuid"}';

-- Test storage functions
SELECT storage.foldername('path/to/file.jpg');
SELECT (storage.foldername('path/to/file.jpg'))[1];

-- View policy definitions
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

### For Angular

```typescript
// Add detailed logging at each layer
console.log('Layer 1 (UI): Event fired', { file });
console.log('Layer 2 (Service): Calling upload', { path });
console.log('Layer 3 (SDK): Response', { result });

// Use Chrome DevTools Network tab
// - Check request payload
// - Verify auth headers
// - See actual error responses
```

### For TypeScript

```typescript
// Validate types at compile-time
type StoragePath = `${string}/${string}`; // Must have at least one folder

// Not: `${string}/${string}/${string}` if bucket prefix would add extra level

// Runtime validation
function validateStoragePath(path: string, userId: string): void {
  const firstFolder = path.split('/')[0];
  if (firstFolder !== userId) {
    throw new Error(`Path must start with userId. Got: ${firstFolder}`);
  }
}
```

---

## References

- **Autorenta Case Study**: `PHOTO_UPLOAD_AUDIT.md`
- **Project Docs**: `CLAUDE.md` (Supabase Storage Architecture)
- **Code Examples**:
  - `apps/web/src/app/core/services/profile.service.ts`
  - `apps/web/src/app/core/services/cars.service.ts`

---

## Contributing

When you discover a new pattern or anti-pattern:

1. Document it in this file
2. Add examples to `CLAUDE.md`
3. Update relevant service code comments
4. Create an audit document for complex issues

This helps the entire team learn from each debugging session.
