# Flow: Car Publication

**Last Updated:** 2025-11-06  
**Complexity:** MEDIUM (Geocoding integration, storage operations)  
**Critical Path:** YES (Owner onboarding)

---

## Overview

This document traces the complete car publication flow from the owner filling out the form through geocoding, database insertion, photo uploads to Supabase Storage, and final redirect. This is a critical onboarding flow for car owners.

---

## Entry Point

**Route:** `/cars/publish`  
**Component:** PublishCarPage  
**File:** `apps/web/src/app/features/cars/publish/publish-car.page.ts` (Lines 33-40)

**Form Sections (7 sections, 60+ fields):**
1. Basic Info: title, description
2. Brand & Model: brand_id, brand, model_id, model, year
3. Specifications: seats, doors, transmission, fuel_type, mileage
4. Pricing: price_per_day, value_usd, deposit_required, deposit_amount
5. Location: street, number, city, neighborhood, state, country, postal_code
6. Rental Terms: payment_methods[], delivery_options[], min/max rental days
7. Photos: Multiple file upload

**Status:** Default 'draft' (requires admin approval or auto-approval to become 'active')

---

## UI Layer Flow

### Lifecycle Methods

**ngOnInit() (Line 123)**
```typescript
1. Load car brands via CarsService.getCarBrands() (line 172)
2. Setup reactive form value listeners
3. Initialize value USD suggestion logic (line 162)
```

**Brand Selection Watcher (Lines 127-138)**
```typescript
this.form.get('brand_id')?.valueChanges.subscribe(brandId => {
  // Triggers on brand selection
  CarsService.getCarModels(brandId) → populate models dropdown
  // Updates form brand field with selected brand name
});
```

**Model Selection Watcher (Lines 141-148)**
```typescript
this.form.get('model_id')?.valueChanges.subscribe(modelId => {
  // Updates form model field with selected model name
});
```

**Deposit Validator Watcher (Lines 151-160)**
```typescript
this.form.get('deposit_required')?.valueChanges.subscribe(required => {
  if (required) {
    // Add validators: required, min $50
    this.form.get('deposit_amount')?.setValidators([...]);
  } else {
    // Clear validators, reset to $0
    this.form.get('deposit_amount')?.clearValidators();
    this.form.get('deposit_amount')?.setValue(0);
  }
});
```

**Value USD Auto-Suggestion (Lines 323-368)**
```typescript
this.form.get('price_per_day')?.valueChanges.subscribe(pricePerDay => {
  // Formula: price_per_day × 300 days (default rental days)
  suggestedValueUsd = pricePerDay × 300;
  
  // User can override via "Usar sugerido" button
});
```

### File Selection (Lines 191-193)
```typescript
onFilesSelected(fileList: FileList): void {
  this.selectedFilesSignal.set(Array.from(fileList));
}
```

---

## Form Submission Flow

### submit() Method (Lines 225-262)

```typescript
async submit(): Promise<void> {
  // ✅ STEP 1: Validation
  if (this.form.invalid || this.submitting()) {
    this.form.markAllAsTouched();
    return;
  }

  // ✅ STEP 2: Get authenticated session
  const session = this.authService.session$();
  if (!session?.user) return;

  // ✅ STEP 3: Enable loading state
  this.uploadingSignal.set(true);

  try {
    // ✅ STEP 4: GEOCODE ADDRESS
    await this.geocodeCurrentAddress();

    // ✅ STEP 5: CREATE CAR
    const formValue = this.form.getRawValue();
    const car = await this.carsService.createCar(payload);

    // ✅ STEP 6: UPLOAD PHOTOS (sequential)
    const files = this.selectedFilesSignal();
    for (let i = 0; i < files.length; i++) {
      try {
        await this.carsService.uploadPhoto(files[i], car.id, i);
      } catch (error) {
        // Silently skip failed photos
      }
    }

    // ✅ STEP 7: REDIRECT
    await this.router.navigate(['/cars/mine'], {
      queryParams: { published: 'true' }
    });
  } catch (error) {
    // Error handling
  } finally {
    this.uploadingSignal.set(false);
  }
}
```

---

## Geocoding Integration

### geocodeCurrentAddress() Method (Lines 264-310)

**File:** `apps/web/src/app/features/cars/publish/publish-car.page.ts`

```typescript
private async geocodeCurrentAddress(): Promise<void> {
  const street = this.form.get('location_street')?.value;
  const streetNumber = this.form.get('location_street_number')?.value;
  const city = this.form.get('location_city')?.value;
  const state = this.form.get('location_state')?.value;
  const country = this.form.get('location_country')?.value || 'Uruguay';

  if (!street || !city) return;

  try {
    // ✅ PRIMARY: Full address geocoding
    const result = await this.geocodingService.geocodeStructuredAddress(
      street, streetNumber || '', city, state || '', country
    );
    
    this.form.patchValue({
      location_lat: result.latitude,
      location_lng: result.longitude,
      location_formatted_address: result.fullAddress
    });
  } catch (error) {
    try {
      // ✅ FALLBACK 1: City-only geocoding
      const cityResult = await this.geocodingService.getCityCoordinates(city, country);
      this.form.patchValue({
        location_lat: cityResult.latitude,
        location_lng: cityResult.longitude,
        location_formatted_address: cityResult.fullAddress
      });
    } catch (cityError) {
      // ✅ FALLBACK 2: Default Montevideo coordinates
      this.form.patchValue({
        location_lat: -34.9011,
        location_lng: -56.1645,
        location_formatted_address: `${street} ${streetNumber}, ${city}, ${country}`
      });
    }
  }
}
```

### GeocodingService

**File:** `apps/web/src/app/core/services/geocoding.service.ts`

**Method 1: geocodeStructuredAddress() (Lines 101-128)**
```typescript
// Constructs address from parts
// Passes country as separate parameter (Mapbox best practice)
geocodeStructuredAddress(street, streetNumber, city, state, country) {
  const address = `${streetNumber} ${street}, ${city}`;
  return this.geocodeAddress(address, country);
}
```

**Method 2: geocodeAddress() (Lines 42-89)**
```typescript
// Calls Mapbox Geocoding v5 API
const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded_address}.json`;
const params = {
  access_token: environment.mapboxAccessToken,
  country: countryCode, // ISO 3166-1 alpha-2
  language: 'es',
  limit: 1
};

const response = await fetch(url);
const data = await response.json();

return {
  latitude: center[1],
  longitude: center[0],
  fullAddress: place_name,
  placeName: text
};
```

**Method 3: getCityCoordinates() (Lines 137-140)**
```typescript
// Wrapper for city-only lookup
getCityCoordinates(city, country) {
  return this.geocodeAddress(city, country);
}
```

---

## Service Layer - CarsService

**File:** `apps/web/src/app/core/services/cars.service.ts`

### createCar() Method (Lines 28-44)

```typescript
async createCar(input: Partial<Car>): Promise<Car> {
  // ✅ Get authenticated user
  const userId = (await this.supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Usuario no autenticado');

  // ✅ Insert car record
  const { data, error } = await this.supabase
    .from('cars')
    .insert({ ...input, owner_id: userId })
    .select('*, car_photos(*)')
    .single();

  if (error) throw error;

  // ✅ Transform to frontend model
  return {
    ...data,
    photos: data.car_photos || []
  } as Car;
}
```

**Database Operation:**
- Table: `cars`
- Operation: INSERT
- Fields: All 60+ form fields + owner_id
- Auto-generated: id (UUID), created_at, updated_at
- Status: 'draft' (from form default)

**RLS Policy:** "Users can create own cars"
- Validation: `WITH CHECK (auth.uid() = owner_id)`

**Trigger:** `set_cars_updated_at`
- Executes BEFORE UPDATE (not on INSERT)

### uploadPhoto() Method (Lines 46-84)

**Image Optimization (Lines 50-55):**
```typescript
const optimizedFile = await this.optimizeImage(file, {
  maxWidth: 1200,
  maxHeight: 900,
  quality: 0.85,
  format: 'webp'
});
```

**optimizeImage() Implementation (Lines 102-144):**
```typescript
1. Create canvas element
2. Load image via blob URL
3. Maintain aspect ratio within bounds
4. Draw to canvas at target dimensions
5. Convert to WebP format with 85% quality
6. Return new File object with .webp extension
```

**Storage Upload (Lines 58-65):**
```typescript
const extension = 'webp';
const filePath = `${userId}/${carId}/${uuidv4()}.${extension}`;

const { error } = await this.supabase.storage
  .from('car-images')  // ← car-images bucket
  .upload(filePath, optimizedFile, {
    cacheControl: '3600',  // 1 hour cache
    upsert: false          // Prevent overwrites
  });
```

**Storage Path Structure:**
- Format: `{userId}/{carId}/{uuid}.webp`
- Example: `550e8400-.../123e4567-.../987f6543-...webp`
- **CRITICAL:** No bucket prefix! RLS expects first folder = userId

**RLS Policy Validation:**
- Policy: `(storage.foldername(name))[1] = auth.uid()::text`
- Path `userId/carId/file.webp` passes ✅
- Path `car-images/userId/carId/file.webp` fails ❌

**Get Public URL (Lines 66-67):**
```typescript
const { data } = this.supabase.storage
  .from('car-images')
  .getPublicUrl(filePath);

// Returns CDN URL: https://[project].supabase.co/storage/v1/object/public/car-images/...
```

**Database Record (Lines 69-82):**
```typescript
const { data: photoData, error: photoError } = await this.supabase
  .from('car_photos')
  .insert({
    id: uuidv4(),
    car_id: carId,
    stored_path: filePath,    // ← Path in storage
    url: data.publicUrl,      // ← Public CDN URL
    position: position,        // ← Order (0, 1, 2, ...)
    sort_order: position
  })
  .select()
  .single();
```

---

## Database Schema

### cars Table

**File:** `supabase/migrations/20251016_create_core_tables.sql` (Lines 53-102)

**Key Fields:**
- id: UUID PRIMARY KEY (gen_random_uuid())
- owner_id: UUID REFERENCES auth.users(id) ON DELETE CASCADE
- title, description, brand, model, year
- price_per_day: NUMERIC CHECK (>= 0)
- currency: TEXT DEFAULT 'ARS'
- location_*: city, state, lat, lng, street, street_number, etc.
- status: car_status DEFAULT 'draft'
- created_at, updated_at: TIMESTAMPTZ

**Indexes:**
- idx_cars_owner_id
- idx_cars_status
- idx_cars_city
- idx_cars_created_at DESC

**Trigger:** `set_cars_updated_at`
- BEFORE UPDATE
- Sets updated_at = now()

### car_photos Table

**File:** `supabase/migrations/20251016_create_core_tables.sql` (Lines 105-127)

**Fields:**
- id: UUID PRIMARY KEY
- car_id: UUID REFERENCES cars(id) ON DELETE CASCADE
- stored_path: TEXT (path in storage bucket)
- url: TEXT (public CDN URL)
- position: INTEGER (display order, 0-indexed)
- sort_order: INTEGER (redundant with position)
- is_cover: BOOLEAN DEFAULT false
- created_at: TIMESTAMPTZ

**Indexes:**
- idx_car_photos_car_id
- idx_car_photos_sort_order (car_id, sort_order)

**Cascading:** When car deleted, all photos deleted from DB (but NOT from storage!)

### RLS Policies

**Cars Table (Lines 297-315):**
```sql
-- PUBLIC READ
CREATE POLICY "Anyone can view active cars"
ON cars FOR SELECT
USING (status = 'active' OR auth.uid() = owner_id);

-- OWNER CREATE
CREATE POLICY "Users can create own cars"
ON cars FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- OWNER UPDATE
CREATE POLICY "Owners can update own cars"
ON cars FOR UPDATE
USING (auth.uid() = owner_id);

-- OWNER DELETE
CREATE POLICY "Owners can delete own cars"
ON cars FOR DELETE
USING (auth.uid() = owner_id);
```

**Car Photos Table (Lines 321-352):**
```sql
-- PUBLIC READ (if car active)
CREATE POLICY "Anyone can view car photos"
ON car_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cars
    WHERE cars.id = car_photos.car_id
    AND (cars.status = 'active' OR cars.owner_id = auth.uid())
  )
);

-- OWNER INSERT
CREATE POLICY "Car owners can insert photos"
ON car_photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cars
    WHERE cars.id = car_photos.car_id
    AND cars.owner_id = auth.uid()
  )
);

-- OWNER DELETE
CREATE POLICY "Car owners can delete photos"
ON car_photos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM cars
    WHERE cars.id = car_photos.car_id
    AND cars.owner_id = auth.uid()
  )
);
```

### Storage Bucket: car-images

**Configuration:**
- Bucket ID: `car-images`
- Public: YES (anyone can view, upload restricted)
- Max File Size: Enforced in component (5MB)
- Allowed Types: Enforced in component (image/jpeg, image/png)

**RLS Policies (inferred):**
```sql
-- Users can upload to their own cars
CREATE POLICY "Users can upload car photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'car-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Public viewing
CREATE POLICY "Public car photo viewing"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-images');
```

---

## Success Path

```
✅ Form Validation Passes
  ↓
✅ Session Verified (user authenticated)
  ↓
✅ Geocoding Successful (or fallbacks work)
  ↓
✅ Car Inserted to DB (status='draft')
  ↓
✅ All Photos Uploaded (sequential, individual errors ignored)
  ↓
✅ Redirect to /cars/mine?published=true
  ↓
USER SEES: Car in "My Cars" list with draft badge
NEXT STEP: Owner must activate car (admin review or auto-approve)
```

---

## Error Paths

### Error: Form Invalid
```
User clicks submit
  ↓
Form validation fails
  ↓
Mark all fields as touched
  ↓
Show inline validation errors
```

### Error: Not Authenticated
```
User not logged in
  ↓
AuthGuard blocks route (redirects to login before reaching page)
```

### Error: Geocoding Failure
```
PRIMARY: structured address → fails
  ↓
FALLBACK 1: city-only → fails
  ↓
FALLBACK 2: default Montevideo coords + manual address string
  ↓
Car created with default location (user can verify/edit later)
```

### Error: Car Creation Fails
```
Supabase error (RLS, constraint, etc.)
  ↓
Caught in try-catch
  ↓
Form remains with user data
  ↓
Error message shown
  ↓
User can retry or edit
```

### Error: Photo Upload Fails
```
Individual photo errors caught and silently skipped
  ↓
Car created with fewer photos than selected
  ↓
⚠️ Current: No error notification to user
  ↓
Recommendation: Should collect errors and notify which photos failed
```

### Error: Storage RLS Violation
```
Path doesn't start with userId
  ↓
Error: "new row violates row-level security policy"
  ↓
Fix: Ensure filePath = `${userId}/${carId}/${uuid}.webp`
```

---

## Validation Rules

### Form Level (Reactive Forms)
- title: required, minLength(10)
- description: required, minLength(30)
- brand_id, model_id, year: required
- price_per_day: required, min(10)
- value_usd: required, min(1000), max(1000000)
- deposit_amount: if deposit_required: required, min(50)
- location_street, location_city, location_state: required
- seats: required, min(2), max(9)
- doors: min(2), max(6)
- transmission, fuel_type, mileage, min_rental_days: required

### File Level (UploadImageComponent)
- maxSizeMB: 5 MB per file
- acceptedTypes: ['image/jpeg', 'image/jpg', 'image/png']
- multiple: true

### Database Level (RLS)
- Cars: auth.uid() = owner_id for INSERT/UPDATE/DELETE
- Car Photos: EXISTS car WHERE cars.owner_id = auth.uid() for INSERT/DELETE
- Storage: (storage.foldername(path))[1] = auth.uid()::text for INSERT

---

## File References

| Component | File Path | Lines | Purpose |
|-----------|-----------|-------|---------|
| **UI Entry** | `apps/web/src/app/features/cars/publish/publish-car.page.ts` | 33-368 | Publication form |
| **CarsService** | `apps/web/src/app/core/services/cars.service.ts` | 28-144 | Car creation & photo upload |
| **GeocodingService** | `apps/web/src/app/core/services/geocoding.service.ts` | 42-140 | Address geocoding |
| **Schema: cars** | `supabase/migrations/20251016_create_core_tables.sql` | 53-102 | Cars table |
| **Schema: car_photos** | `supabase/migrations/20251016_create_core_tables.sql` | 105-127 | Photos table |
| **Models** | `apps/web/src/app/core/models/index.ts` | 235-317 | Car, CarPhoto interfaces |

---

## Related Documentation

- **Booking Creation:** See `docs/flows/FLOW_BOOKING_CREATION.md`
- **Service Dependencies:** See `docs/architecture/DEPENDENCY_GRAPH.md`
- **Storage Architecture:** See `CLAUDE.md` section "Supabase Storage Architecture"

---

**Last Verified:** 2025-11-06
