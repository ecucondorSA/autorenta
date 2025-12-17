# CRITICAL FIXES CHECKLIST - Execute Now

## 🔴 3 MEMORY LEAKS + 2 DESIGN VIOLATIONS

This document lists the exact fixes needed to reach **Production-Ready (100/100)** status.

---

## Memory Leak #1: AutorentarCreditService
**File:** `apps/web/src/app/core/services/autorentar-credit.service.ts`
**Line:** Constructor (~74)
**Status:** 🔴 CRITICAL - Constructor subscribe without cleanup

### Current Code:
```typescript
constructor() {
  // Auto-load credit info on service init
  this.getCreditInfo()
    .pipe(take(1), takeUntilDestroyed(this.destroyRef))  // ✓ This looks correct
    .subscribe();
}
```

### ❌ Problem:
The `DestroyRef` is not injected. Code references it but it doesn't exist.

### ✅ Fix:
```typescript
constructor(private destroyRef: DestroyRef) {  // ADD THIS LINE
  // Auto-load credit info on service init
  this.getCreditInfo()
    .pipe(take(1), takeUntilDestroyed(this.destroyRef))
    .subscribe();
}
```

**Time: 2 minutes**

---

## Memory Leak #2: AutoRefreshService
**File:** `apps/web/src/app/core/services/auto-refresh.service.ts`
**Status:** 🔴 CRITICAL - Multiple continuous subscriptions

### Problem:
Service maintains continuous subscriptions that may not cleanup properly.

### Detection:
```bash
grep -A 5 "constructor" apps/web/src/app/core/services/auto-refresh.service.ts | grep subscribe
```

### Fix Pattern:
```typescript
// BEFORE
export class AutoRefreshService {
  constructor() {
    this.interval$.subscribe(/* ... */);  // ❌ May leak
  }
}

// AFTER
export class AutoRefreshService implements OnDestroy {
  constructor(private destroyRef: DestroyRef) {
    this.interval$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(/* ... */);
  }

  ngOnDestroy(): void {
    // Additional cleanup if needed
  }
}
```

**Time: 30 minutes**

---

## Memory Leak #3: MessagesService - Realtime Channel
**File:** `apps/web/src/app/core/services/messages.service.ts`
**Status:** 🟡 HIGH - Supabase Realtime channel cleanup

### Problem:
Realtime channels may accumulate if not properly unsubscribed.

### Current Pattern:
```typescript
private channel = this.supabase
  .channel('messages')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
    // Handle changes
  })
  .subscribe();  // ❌ Needs explicit cleanup
```

### Fix:
```typescript
// Option 1: Implement ngOnDestroy
ngOnDestroy(): void {
  this.channel?.unsubscribe();
}

// Option 2: Use cleanup subject (preferred)
private destroy$ = new Subject<void>();

constructor() {
  this.channel$ = this.setupChannel()
    .pipe(takeUntil(this.destroy$))
    .subscribe();
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
  this.channel?.unsubscribe();
}
```

**Time: 30 minutes**

---

## Design Violation #1: WizardComponent
**File:** `apps/web/src/app/shared/components/wizard/wizard.component.ts`
**Lines:** 621
**Status:** 🔴 VIOLATES DESIGN RULES

### Why Delete:
CLAUDE.md explicitly states: **"NO WIZARDS: Step-by-step wizards are strictly prohibited"**

### Verification (before delete):
```bash
# Check if WizardComponent is imported anywhere
grep -r "WizardComponent\|import.*wizard" apps/web/src/app --include="*.ts" --include="*.html"
```

If no results → Safe to delete

### Action:
```bash
# Delete the component
rm -rf apps/web/src/app/shared/components/wizard/

# Verify deletion didn't break anything
npm run build

# If build fails, find and remove imports
grep -r "wizard" apps/web/src/app --include="*.ts" --include="*.html"
```

**Time: 15 minutes**

---

## Design Violation #2: WizardStepComponent
**File:** `apps/web/src/app/shared/components/wizard-step/wizard-step.component.ts`
**Lines:** 114
**Status:** 🔴 VIOLATES DESIGN RULES

### Same Process:
```bash
# Check if used
grep -r "WizardStepComponent\|import.*wizard-step" apps/web/src/app

# Delete if not used
rm -rf apps/web/src/app/shared/components/wizard-step/

# Verify
npm run build
```

**Time: 15 minutes**

---

## Verification Steps

### Step 1: Build Check
```bash
npm run build
```
✅ Should complete without errors

### Step 2: Type Check
```bash
npx tsc --noEmit
```
✅ Should show 0 errors

### Step 3: Test Suite
```bash
npm test
```
✅ All tests should pass

### Step 4: E2E Tests (Critical Flows)
```bash
npm run test:e2e:booking
npm run test:e2e:wallet
```
✅ Should show green checkmarks

### Step 5: Manual QA
- [ ] Open booking flow
- [ ] Complete payment
- [ ] Check dashboard
- [ ] Verify no console errors
- [ ] Check Network tab (no failed requests)

---

## Execution Order (Recommended)

```
1. Fix AutorentarCreditService (2 min)
   └─ Add DestroyRef injection

2. Fix AutoRefreshService (30 min)
   └─ Add takeUntilDestroyed pattern

3. Fix MessagesService (30 min)
   └─ Add unsubscribe in ngOnDestroy

4. Delete WizardComponent (15 min)
   └─ Remove files, verify no imports

5. Delete WizardStepComponent (15 min)
   └─ Remove files, verify no imports

6. Run Tests (15 min)
   └─ Build, type check, unit tests, e2e

TOTAL TIME: ~100 minutes (1.5-2 hours)
```

---

## Success Criteria

- [ ] AutorentarCreditService has DestroyRef injection
- [ ] AutoRefreshService uses takeUntilDestroyed on all subscriptions
- [ ] MessagesService has proper channel cleanup
- [ ] No WizardComponent references remain
- [ ] No WizardStepComponent references remain
- [ ] `npm run build` succeeds
- [ ] `npm test` shows all green
- [ ] `npm run test:e2e:booking` succeeds

Once all items checked ✅ → **Production Ready**

---

## Rollback (if needed)

```bash
git status                    # See what changed
git diff [file]              # Review changes
git checkout [file]          # Rollback single file
git checkout .               # Rollback all changes
git reset --hard origin/main # Nuclear option
```

---

## Commands Quick Reference

```bash
# Check specific files
grep -n "DestroyRef" apps/web/src/app/core/services/autorentar-credit.service.ts

# Find all WizardComponent usage
grep -r "WizardComponent" apps/web/src/app

# Run full test suite
npm test -- --watch=false

# Build for production
npm run build

# E2E test specific feature
npm run test:e2e:booking

# Check for memory leaks
node scripts/fix-memory-leaks.js
```

---

## Notes

- All 5 fixes are **low risk** (no API changes, internal only)
- Fixes can be done **independently** (no dependencies)
- Each fix takes **< 30 minutes** including testing
- **Total time: ~2 hours** for all 5 fixes
- After these fixes → **Production Ready 100/100**

---

**Ready to execute?** ✅
**Questions?** Check `CODE_QUALITY_ROADMAP.md`
**Status:** 🟡 Ready for implementation
