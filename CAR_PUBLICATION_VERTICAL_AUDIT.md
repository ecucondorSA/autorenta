# 🔍 CAR PUBLICATION VERTICAL AUDIT

**Date**: 2025-10-17
**Issue**: Car publication form submits without errors but car doesn't save to database
**Symptom**: Form stays on publish page, no errors shown, no DB insertion

---

## 📊 VERTICAL STACK ANALYSIS

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: UI Component (Angular)                        │
│  File: publish-car-v2.page.ts                           │
│  Status: ✅ VERIFIED                                    │
│  Lines: 483-550                                         │
│  Notes:                                                 │
│  - canSubmit(): Form valid + 3 photos ✅                │
│  - onSubmit(): Calls carsService.createCar() ✅         │
│  - Error handling: try/catch with alerts ✅             │
│  - Navigation: Should redirect to /cars/my-cars ✅      │
│                                                         │
│  ✅ CONCLUSION: Component logic is correct              │
└─────────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: Service Layer                                 │
│  File: cars.service.ts                                  │
│  Status: ⚠️ TO VERIFY                                   │
│  Lines: 12-24                                           │
│  Method: createCar(input: Partial<Car>)                 │
│  Notes:                                                 │
│  - Gets user from auth.getUser() ✅                     │
│  - Inserts to 'cars' table with owner_id ✅             │
│  - Returns created car with SELECT ✅                   │
│                                                         │
│  ⚠️ NEEDS INVESTIGATION: Error handling                 │
└─────────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: Supabase Client                               │
│  Status: ⚠️ TO VERIFY                                   │
│  Notes:                                                 │
│  - Auth session active? Need to verify                  │
│  - JWT token valid? Need to verify                      │
│  - RLS policies may block insert                        │
│                                                         │
│  ⚠️ NEEDS INVESTIGATION: Auth state                     │
└─────────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────────┐
│  LAYER 4: Database INSERT                                │
│  Table: cars                                            │
│  Status: ❌ POTENTIAL ISSUE HERE                        │
│  Notes:                                                 │
│  - Required fields:                                     │
│    ✅ brand_id (set)                                    │
│    ✅ model_id (set)                                    │
│    ✅ brand_text_backup (set)                           │
│    ✅ model_text_backup (set)                           │
│    ✅ fuel (nafta - FIXED)                              │
│    ✅ transmission (manual/automatic)                   │
│    ❓ description - might be NULL constraint?           │
│    ❓ Other NOT NULL fields we're missing?              │
│                                                         │
│  ❌ SUSPECT: Missing required fields or constraint      │
└─────────────────────────────────────────────────────────┘
              ↓↑
┌─────────────────────────────────────────────────────────┐
│  LAYER 5: RLS Policies                                  │
│  Status: ❌ LIKELY ISSUE                                │
│  Policy: INSERT on cars table                           │
│  Notes:                                                 │
│  - Must check: auth.uid() = NEW.owner_id               │
│  - Auth session might be expired                        │
│  - User might not have role permission                  │
│                                                         │
│  ❌ HIGH PRIORITY: Check RLS policies                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔎 INVESTIGATION PLAN

### Step 1: Check Database Constraints
```sql
SELECT
  column_name,
  is_nullable,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'cars'
  AND is_nullable = 'NO'
  AND column_default IS NULL
ORDER BY ordinal_position;
```

### Step 2: Check RLS Policies
```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'cars';
```

### Step 3: Test Manual Insert (as authenticated user)
```sql
-- Set auth context
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "<user-uuid>"}';

-- Try insert with minimal fields
INSERT INTO cars (
  owner_id,
  brand_id,
  model_id,
  brand_text_backup,
  model_text_backup,
  title,
  description,
  year,
  fuel,
  transmission,
  price_per_day,
  currency,
  location_city,
  location_state,
  location_country
) VALUES (
  '<user-uuid>',
  '<brand-id>',
  '<model-id>',
  'Test Brand',
  'Test Model',
  'Test Car',
  'Test Description',
  2020,
  'nafta',
  'manual',
  2500,
  'USD',
  'Montevideo',
  'Montevideo',
  'Uruguay'
);
```

### Step 4: Add Console Logging
Add debug logging to `onSubmit()` method:
```typescript
console.log('📝 Form valid:', this.publishForm.valid);
console.log('📸 Photos count:', this.uploadedPhotos().length);
console.log('📦 Car data:', carData);

try {
  const createdCar = await this.carsService.createCar(carData);
  console.log('✅ Car created:', createdCar);
} catch (error) {
  console.error('❌ Error creating car:', error);
  // Log full error object
  console.error('Error details:', JSON.stringify(error, null, 2));
}
```

---

## 🐛 SUSPECTED ROOT CAUSES (Ranked by Probability)

1. **RLS Policy Blocking Insert** (80% probability)
   - User session expired during test
   - RLS policy `with_check` condition failing
   - Auth token not properly attached to request

2. **Missing Required Field** (15% probability)
   - `description` field might have NOT NULL constraint
   - Some other field we haven't identified

3. **Service Layer Silent Failure** (5% probability)
   - Error thrown but not properly caught
   - Promise rejection not handled

---

## 🔧 NEXT ACTIONS

1. ✅ Query database for NOT NULL constraints
2. ✅ Query RLS policies on cars table
3. ⏳ Add debug logging to onSubmit()
4. ⏳ Test manual insert with SQL
5. ⏳ Verify auth session in browser DevTools
