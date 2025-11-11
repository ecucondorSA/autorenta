# Quick Reference: Remaining Prettier Fixes

## Files to Fix (11 total)

Run this command to see current errors:
```bash
npm run lint:fix 2>&1 | grep "^\[error\] src"
```

## Pattern Recognition

### Find Element with Errors
Look for elements with these patterns on consecutive lines:
```
[class.something/number]="condition"
[class.xxx dark:yyy]="condition"
[class.hover\:something]="condition"
```

### Fix Template
```html
<!-- Step 1: Find all [class.xxx] on the element -->
<!-- Step 2: Combine into [ngClass] -->

<element
  [ngClass]="{
    'all-class-names': condition1,
    'including/opacity': condition2,
    'and dark:variants': condition3
  }"
  class="keep-static-classes-here">
```

## Quick Fix for Each File

### 1. profile.page.html (Complex - 14 bindings)
Lines: 294-297, 381-384, 665, 677, 689
Search for: `[class.text-text-muted dark:text-text-secondary/70]`
Pattern: SVG icons with conditional colors + role selection radio buttons

### 2. bonus-protector-purchase.component.html (2 bindings)
Search for: `[class.bg-` + opacity
Pattern: Status indicators and purchase buttons

### 3. booking-benefits.component.html (7 bindings)
Search for: `[class.bg-` + opacity + dark mode
Pattern: Benefit cards with hover states

### 4. car-card.component.html (4 bindings)
Search for: `[class.bg-` + opacity
Pattern: Card status overlays

### 5. deposit-modal.component.html (4 bindings)
Search for: `[class.bg-` + opacity
Pattern: Modal background states

### 6. owner-confirmation.component.html (3 bindings)
Search for: `[class.bg-` + opacity
Pattern: Confirmation state indicators

### 7. payment-method-buttons.component.html (5 bindings)
Search for: `[class.bg-` + opacity
Pattern: Payment button states

### 8. payment-method-selector.component.html (2 bindings)
Search for: `[class.bg-` + opacity
Pattern: Selection state backgrounds

### 9. payment-provider-selector.component.html (1 binding)
Search for: `[class.bg-` + opacity
Pattern: Provider selection background

### 10. renter-confirmation.component.html (3 bindings)
Search for: `[class.bg-` + opacity
Pattern: Confirmation state indicators

### 11. settlement-simulator.component.html (1 binding)
Search for: `[class.bg-` + opacity
Pattern: Simulation result background

## One-Liner to Find Each Error Location

```bash
# For each file, find line numbers with errors
for file in profile.page.html bonus-protector-purchase.component.html booking-benefits.component.html car-card.component.html deposit-modal.component.html owner-confirmation.component.html payment-method-buttons.component.html payment-method-selector.component.html payment-provider-selector.component.html renter-confirmation.component.html settlement-simulator.component.html; do
  echo "=== $file ==="
  grep -n "\[class\.[^]]*/" "apps/web/src/app/**/$file" 2>/dev/null || find apps/web/src -name "$file" -exec grep -n "\[class\.[^]]*/" {} \;
done
```

## Testing After Each Fix

```bash
# 1. Fix one file
# 2. Check if error is gone
npm run lint:fix 2>&1 | grep "filename.html"

# 3. If no output, file is fixed!
# 4. Move to next file
```

## Estimated Time per File
- 1 binding: 2 min
- 2-3 bindings: 3 min
- 4-5 bindings: 5 min
- 6+ bindings: 7 min

Total: ~35-45 minutes for all 11 files

## Final Verification

```bash
# Should show 0 errors
npm run lint:fix 2>&1 | grep -c "^\[error\] src"

# Run full lint
npm run lint

# If clean, commit!
git add .
git commit -m "fix: convert class bindings to ngClass for Prettier compatibility"
```

## Remember

- ✅ DO: Combine ALL [class.xxx] bindings on an element into ONE [ngClass]
- ✅ DO: Keep static classes in class="..." attribute
- ✅ DO: Test the component after fixing
- ❌ DON'T: Remove bindings to "fix" errors
- ❌ DON'T: Leave some [class.xxx] and convert only problematic ones
- ❌ DON'T: Forget to use single quotes in ngClass object keys
