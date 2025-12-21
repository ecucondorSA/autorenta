# TS4111 Quick Reference Guide

## What is TS4111?

TypeScript error when accessing properties from index signatures without bracket notation.

## Quick Fix Examples

### ❌ Before (Error)
```typescript
const record: Record<string, unknown> = {...};
const id = record.id;              // TS4111 error
const status = record.status;      // TS4111 error
const price = obj?.price_per_day;  // TS4111 error
```

### ✅ After (Fixed)
```typescript
const record: Record<string, unknown> = {...};
const id = record['id'];           // ✅ Correct
const status = record['status'];   // ✅ Correct
const price = obj?.['price_per_day']; // ✅ Correct
```

## Common Patterns

### 1. Database Row Parsing
```typescript
const car = (record['car'] ?? record) as Record<string, unknown>;
const carId = car['id'];
const title = car['title'];
const price = car['price_per_day'];
```

### 2. Type Guards
```typescript
export function isUser(obj: unknown): obj is User {
  return isObject(obj) &&
         isString(obj['id']) &&
         isString(obj['email']);
}
```

### 3. Realtime Subscriptions
```typescript
const newRecord = payload.new as Record<string, unknown>;
const status = newRecord?.['status'];
```

### 4. Nested Access
```typescript
const meta = record['meta'] as Record<string, unknown>;
const description = meta['description'];
```

## When NOT to Use Brackets

### 1. Typed Interfaces
```typescript
interface User {
  id: string;
  email: string;
}
const user: User = {...};
const id = user.id;  // ✅ OK - typed interface
```

### 2. Class Properties
```typescript
class MyClass {
  public id: string;
}
const obj = new MyClass();
const id = obj.id;  // ✅ OK - class property
```

### 3. Built-in APIs
```typescript
console.log('test');     // ✅ OK
console.error('error');  // ✅ OK
error.message;           // ✅ OK when error instanceof Error
```

## Automated Fix Script

```bash
# Fix a single file
python3 /tmp/fix_ts4111.py path/to/file.ts

# Fix all files
python3 /tmp/fix_ts4111.py --all
```

## Files Fixed (30 total)

**Top 10:**
1. car-locations.service.ts (260 errors)
2. publish-car-v2.page.ts (184 errors)
3. admin.service.ts (120 errors)
4. notification-templates.service.ts (100 errors)
5. cars-list.page.ts (100 errors)
6. cars.service.ts (92 errors)
7. type-guards.ts (92 errors)
8. cars-map.component.ts (64 errors)
9. fgo-v1-1.service.ts (36 errors)
10. wallet.service.ts (37 errors)

**Total: 720+ replacements**

## Testing Checklist

After fixing TS4111 errors, test:

- [ ] Car search and listing
- [ ] Booking creation and payment
- [ ] Admin dashboard
- [ ] Profile updates
- [ ] Messages/notifications

## Rollback

```bash
# If something breaks, restore from git
git checkout HEAD -- apps/web/src/app/
```

## Prevention

```typescript
// GOOD: Use typed interfaces instead of Record
interface CarData {
  id: string;
  status: string;
  price_per_day: number;
}

// Then you can use dot notation safely
const car = data as CarData;
const id = car.id;  // ✅ Type-safe!
```

## Resources

- Python fix script: `/tmp/fix_ts4111.py`
- Full summary: `/home/edu/autorenta/TS4111_FIX_SUMMARY.md`
- Detailed report: `/home/edu/autorenta/TS4111_DETAILED_REPORT.md`

---
*Quick Reference | 2025-12-17*
