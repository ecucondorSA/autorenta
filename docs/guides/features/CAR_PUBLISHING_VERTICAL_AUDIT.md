# 🔍 VERTICAL STACK AUDIT - Car Publishing Flow
**Date**: 2025-10-17
**Feature**: Publish Car Wizard
**Purpose**: Ensure end-to-end integration from UI → Service → SDK → Database → RLS

---

## 🎯 Audit Scope

Verify the complete vertical stack for publishing a car with the new wizard:
1. UI Component (Wizard)
2. Service Layer (CarsService)
3. Supabase SDK
4. Database Schema (cars table)
5. RLS Policies
6. Foreign Keys & Constraints

---

## 📋 Layer-by-Layer Analysis

### ┌─────────────────────────────────────────┐
### │  LAYER 1: UI (Wizard Component)        │
### │  File: publish-car-wizard.component.ts │
### └─────────────────────────────────────────┘

**Status**: ⚠️ INCOMPLETE

**Current State**:
- ✅ Wizard structure created
- ✅ Step 1 (Vehicle): brand_id, model_id, year
- ✅ Step 2 (Specs): transmission, fuel, color, mileage
- ❌ Step 3-7: NOT IMPLEMENTED
- ❌ Form submission: NOT IMPLEMENTED
- ❌ Brands/Models loading: NOT IMPLEMENTED

**Required Fields from Database**:
```typescript
// REQUIRED by cars table:
- brand_id: uuid (FK) ✅ In wizard
- model_id: uuid (FK) ✅ In wizard
- title: text ✅ Auto-generated
- transmission: enum ✅ In wizard
- fuel: enum ✅ In wizard
- price_per_day: numeric ❌ Missing (Step 3)
- currency: char(3) ❌ Missing (Step 3)
- location_city: text ❌ Missing (Step 4)
- location_country: text ❌ Missing (Step 4)

// OPTIONAL but important:
- color: text ✅ In wizard
- mileage: integer ✅ In wizard
- year: integer ✅ In wizard
- description: text ❌ Missing (could be optional)
- seats: integer ❌ Missing (should get from model)
- doors: integer ❌ Missing (should get from model)
```

**Issues Found**:
1. ⚠️ Missing required fields for car creation (price, location, etc.)
2. ⚠️ No service integration yet
3. ⚠️ Seats/doors removed from form but still required by DB
4. ⚠️ No validation for FK existence

---

### ┌─────────────────────────────────────────┐
### │  LAYER 2: Service Layer                │
### │  File: cars.service.ts                 │
### └─────────────────────────────────────────┘

**Status**: ❓ NEEDS VERIFICATION

**Need to check**:
- Does CarsService have a `createCar()` method?
- Does it accept brand_id and model_id (not brand/model strings)?
- Does it handle the new schema?
- Does it have methods to load brands and models?

**Action Required**: READ cars.service.ts

---

### ┌─────────────────────────────────────────┐
### │  LAYER 3: Supabase SDK                 │
### └─────────────────────────────────────────┘

**Status**: ✅ STANDARD

Supabase SDK handles:
- `.from('cars').insert()` - Should work
- `.from('car_brands').select()` - Should work
- `.from('car_models').select()` - Should work

**Assumption**: SDK is correctly configured (needs verification)

---

### ┌─────────────────────────────────────────┐
### │  LAYER 4: Database Schema              │
### │  Table: cars                           │
### └─────────────────────────────────────────┘

**Status**: ⚠️ MIGRATION COMPLETED BUT NEEDS VERIFICATION

**Schema Changes Made**:
- ✅ Added brand_id (uuid, FK to car_brands)
- ✅ Added model_id (uuid, FK to car_models)
- ✅ Renamed brand → brand_text_backup
- ✅ Renamed model → model_text_backup
- ✅ Created indexes on brand_id, model_id

**Required NOT NULL Fields**:
```sql
- owner_id: uuid NOT NULL
- title: text NOT NULL
- brand_id: uuid NOT NULL (NEW)
- model_id: uuid NOT NULL (NEW)
- transmission: transmission NOT NULL
- fuel: fuel_type NOT NULL
- price_per_day: numeric(10,2) NOT NULL
- currency: char(3) NOT NULL
- location_city: text (nullable but typically required)
```

**Issues Found**:
1. ⚠️ Seats and doors still exist in schema and have CHECK constraints
2. ⚠️ Need to decide: Make them nullable? Or populate from model data?
3. ⚠️ Views (my_cars, etc.) might still reference old brand/model columns

**Action Required**:
- Check if views need updating for brand_id/model_id
- Decide on seats/doors strategy

---

### ┌─────────────────────────────────────────┐
### │  LAYER 5: RLS Policies                │
### └─────────────────────────────────────────┘

**Status**: ⚠️ NEEDS VERIFICATION

**Existing Policies** (from audit):
```sql
- insert_cars: Checks owner_id = auth.uid()
- update_cars: Checks owner_id = auth.uid()
- delete_cars: Checks owner_id = auth.uid()
- select_cars: Public read (all authenticated users)
```

**Potential Issues**:
1. ⚠️ Do policies reference old brand/model columns?
2. ⚠️ Do policies validate brand_id/model_id FK existence?

**Action Required**: Review RLS policies

---

### ┌─────────────────────────────────────────┐
### │  LAYER 6: Foreign Keys & Constraints   │
### └─────────────────────────────────────────┘

**Status**: ✅ CREATED

**Foreign Keys Added**:
```sql
- cars.brand_id → car_brands(id) ON DELETE RESTRICT
- cars.model_id → car_models(id) ON DELETE RESTRICT
```

**Constraints Existing**:
```sql
- seats: CHECK (seats BETWEEN 1 AND 9)
- doors: CHECK (doors BETWEEN 2 AND 6)
- year: CHECK (year >= 1980 AND year <= CURRENT_YEAR + 1)
- price_per_day: CHECK (price_per_day > 0)
```

**Issue**: Seats/doors constraints still active but fields not in wizard

---

## 🚨 CRITICAL ISSUES FOUND

### 1. **Seats/Doors Mismatch** ⚠️⚠️⚠️
- **Problem**: Removed from wizard but still required by DB
- **Impact**: Car creation will fail
- **Solutions**:
  a) Make seats/doors nullable in DB
  b) Auto-populate from car_models table
  c) Add back to wizard (not preferred)

### 2. **Incomplete Wizard** ⚠️⚠️
- **Problem**: Steps 3-7 not implemented
- **Impact**: Cannot submit form
- **Required**: Complete all steps before testing

### 3. **Service Layer Unknown** ⚠️
- **Problem**: Haven't verified CarsService integration
- **Impact**: May need refactoring for new schema
- **Action**: Audit CarsService next

### 4. **Views May Be Broken** ⚠️
- **Problem**: Views might reference brand/model (old columns)
- **Impact**: Car listings may not show brand/model names
- **Action**: Check my_cars, owner_cars views

---

## ✅ RECOMMENDED ACTIONS

### Immediate (Before continuing wizard):
1. ✅ **Audit CarsService** - Verify it handles new schema
2. ✅ **Fix seats/doors** - Add to car_models or make nullable
3. ✅ **Update views** - Ensure they JOIN with car_brands/models
4. ✅ **Test FK constraints** - Verify brand_id/model_id validation works

### Medium Priority:
5. ⏳ **Complete wizard steps 3-7**
6. ⏳ **Implement form submission**
7. ⏳ **Add loading states**
8. ⏳ **Error handling**

### Before Production:
9. 🔄 **End-to-end test** - Full car creation flow
10. 🔄 **RLS testing** - Ensure policies work correctly
11. 🔄 **Data integrity test** - Verify FK constraints prevent bad data

---

## 📝 NEXT STEPS

1. READ `cars.service.ts` to understand current implementation
2. READ database views to check brand/model references
3. DECIDE on seats/doors strategy
4. UPDATE schema/views if needed
5. CONTINUE wizard implementation with confidence

---

**Audit Status**: ⚠️ BLOCKED - Need to resolve critical issues before proceeding
