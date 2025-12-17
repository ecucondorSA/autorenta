# Angular Signals Migration Guide

## Executive Summary

✅ **Automated Migration Completed**: 104 @Output, 4 @Input migrated in 63 files

📋 **Manual Work Remaining**:
- 5 Getter/Setter patterns (6 properties)
- 6 Two-way binding patterns
- Update templates to use signal() syntax

---

## 1. Automated Migration Status

**DONE:**
- ✅ 104 `@Output() prop = new EventEmitter<T>()` → `readonly prop = output<T>()`
- ✅ 4 `@Input() prop: Type` → `readonly prop = input<Type>()`
- ✅ Added `input`, `output` imports to 63 files

**Files modified**: See `git diff apps/web/src/app | grep "^diff"`

---

## 2. Manual Migration: Getter/Setter Patterns

### Case 1: Simple Getter/Setter (mobile-menu-drawer.component.ts:37)

**Current Code:**
```typescript
@Input() set open(value: boolean) {
  this._open = value;
  this.onOpenChange();
}
@Input() get open() {
  return this._open;
}
private _open = false;
```

**Migration to Signals:**
```typescript
readonly open = input<boolean>(false);

constructor(changeDetectionRef: ChangeDetectorRef) {
  effect(() => {
    if (this.open()) {
      this.onOpenChange();
    }
  });
}
```

**Key Changes:**
- Replace private `_open` with `input<boolean>()`
- Move setter logic into `effect()` that watches the signal
- Call `.onOpenChange()` when signal changes (via effect)

---

### Case 2: Multiple Setters (hdri-background.component.ts:63-71)

**Current Code:**
```typescript
@Input() set src(value: string) {
  this.material.map.url = value;
}
@Input() set srcLow(value: string) {
  this.material.map.lowUrl = value;
}
@Input() set srcHigh(value: string) {
  this.material.map.highUrl = value;
}
```

**Migration to Signals:**
```typescript
readonly src = input<string>('');
readonly srcLow = input<string>('');
readonly srcHigh = input<string>('');

constructor() {
  effect(() => {
    if (this.src()) {
      this.material.map.url = this.src();
    }
  });
  effect(() => {
    if (this.srcLow()) {
      this.material.map.lowUrl = this.srcLow();
    }
  });
  effect(() => {
    if (this.srcHigh()) {
      this.material.map.highUrl = this.srcHigh();
    }
  });
}
```

**Alternative (More concise):**
```typescript
readonly src = input<string>('');
readonly srcLow = input<string>('');
readonly srcHigh = input<string>('');

readonly #updateMapUrls = effect(() => {
  this.material.map.url = this.src();
  this.material.map.lowUrl = this.srcLow();
  this.material.map.highUrl = this.srcHigh();
});
```

---

### Case 3: Setter with Complex Logic (contract-pdf-viewer.component.ts:106)

**Current Code:**
```typescript
@Input() set pdfUrl(url: string) {
  if (!url) return;
  this.loadPDF(url);
  this.cdr.markForCheck();
}
private _pdfUrl: string;
```

**Migration to Signals:**
```typescript
readonly pdfUrl = input<string>('');

constructor(private cdr: ChangeDetectorRef) {
  effect(() => {
    const url = this.pdfUrl();
    if (url) {
      this.loadPDF(url);
      this.cdr.markForCheck();
    }
  });
}
```

---

## 3. Manual Migration: Two-Way Bindings

### Pattern: data ↔ dataChange

**Affected Files:**
1. booking-review-step.component.ts
2. booking-payment-step.component.ts
3. booking-insurance-step.component.ts
4. booking-extras-step.component.ts
5. booking-driver-step.component.ts
6. booking-dates-step.component.ts

**Current Code:**
```typescript
@Input() data: StepData;
@Output() dataChange = new EventEmitter<StepData>();

onPropertyChange(newValue) {
  this.dataChange.emit({ ...this.data, property: newValue });
}
```

**Migration Strategy A: Using `model()` (Recommended)**

Angular 17.1+ has `model()` for two-way bindings:

```typescript
import { model, ChangeDetectorRef } from '@angular/core';

readonly data = model<StepData>();

onPropertyChange(newValue: unknown) {
  this.data.set({ ...this.data(), property: newValue });
}
```

**Migration Strategy B: Separate Input + Output Signals**

For Angular 16:

```typescript
import { input, output } from '@angular/core';

readonly data = input<StepData>();
readonly dataChange = output<StepData>();

onPropertyChange(newValue: unknown) {
  const updated = { ...this.data(), property: newValue };
  this.dataChange.emit(updated);
}
```

**Template Usage (Before & After):**

```html
<!-- BEFORE (Two-way binding) -->
<app-booking-step [(data)]="formData"></app-booking-step>

<!-- AFTER (Using model()) -->
<app-booking-step [data]="formData()"></app-booking-step>
```

---

## 4. Template Changes Required

### Update All Component Usage

**Pattern 1: Input signals**
```html
<!-- BEFORE -->
{{ component.propertyName }}

<!-- AFTER -->
{{ component.propertyName() }}
```

**Pattern 2: Output signals**
```html
<!-- BEFORE -->
<component (eventName)="handler($event)"></component>

<!-- AFTER -->
<component (eventName)="handler($event)"></component>
<!-- No change here - @Output signals work automatically -->
```

**Pattern 3: Two-way binding**
```html
<!-- BEFORE -->
<component [(data)]="formData"></component>

<!-- AFTER (with model()) -->
<component [data]="formData()" (dataChange)="formData.set($event)"></component>
```

---

## 5. Step-by-Step Implementation

### Phase 1: Getter/Setter Refactoring (1 hour)
1. **mobile-menu-drawer.component.ts** (1 property)
2. **hdri-background.component.ts** (3 properties)
3. **contract-pdf-viewer.component.ts** (1 property)

### Phase 2: Two-Way Binding Refactoring (2 hours)
1. Review each booking-*-step.component.ts
2. Implement `model()` pattern
3. Update parent component to pass/receive signal

### Phase 3: Template Updates (1 hour)
1. Find all usages of input signals in templates
2. Add `()` function call syntax
3. Test reactivity

### Phase 4: Testing & Validation (1 hour)
1. Run `npm test`
2. Run `npm run build`
3. Manual QA: Check all booking flow

---

## 6. Important Reminders

### ✅ DO:
- ✅ Use `input()` for readonly inputs
- ✅ Use `effect()` for side effects (watching signals)
- ✅ Use `computed()` for derived state
- ✅ Call signal functions in templates: `{{ prop() }}`
- ✅ Use `signal.set()` to update state
- ✅ Test reactive changes thoroughly

### ❌ DON'T:
- ❌ Don't use `@Input()` decorator anymore
- ❌ Don't use `@Output()` with EventEmitter
- ❌ Don't forget `()` when accessing signal values
- ❌ Don't subscribe to signals manually (use computed/effect)
- ❌ Don't mix old decorators with new signals

---

## 7. Common Pitfalls

### Pitfall 1: Forgetting Signal Function Calls
```typescript
// ❌ WRONG
this.data.property  // Returns Signal object

// ✅ CORRECT
this.data().property  // Returns actual value
```

### Pitfall 2: Not Using Effect for Side Effects
```typescript
// ❌ WRONG
onPropertyChange(value: string) {
  this.data.set(value);  // No side effects run
}

// ✅ CORRECT
effect(() => {
  const value = this.data();
  this.saveToDatabase(value);  // Runs whenever data changes
});
```

### Pitfall 3: Manual Subscription
```typescript
// ❌ WRONG (Don't do this)
this.data.subscribe(...)

// ✅ CORRECT (Use effect or computed)
const derived = computed(() => this.data()?.length ?? 0);
```

---

## 8. Testing After Migration

```bash
# Build check (catches type errors)
npm run build

# Unit tests
npm test

# E2E tests (for critical flows like booking)
npm run test:e2e:booking

# Manual testing checklist
# [ ] Open/close mobile menu
# [ ] Switch background in 3D viewer
# [ ] Load PDF in viewer
# [ ] Complete booking flow with all steps
# [ ] Verify form data persistence
```

---

## 9. Rollback Plan

If issues arise:

```bash
# Revert all signal migrations
git checkout apps/web/src/app

# Return to old decorators
# Fix individual issues
# Re-apply migrations in phases
```

---

## 10. Resources

- [Angular Signals Docs](https://angular.io/guide/signals)
- [Input/Output Signals RFC](https://github.com/angular/angular/discussions/52092)
- [Migration from RxJS to Signals](https://angular.io/guide/signals-best-practices)

---

**Status**: 🟡 Ready for manual implementation
**Estimated Time**: 4-5 hours for complete migration
**Owner**: Development team
**Due**: Before Angular 20 LTS (expected Q3 2024)
