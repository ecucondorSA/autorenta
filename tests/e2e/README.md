# AutoRenta - E2E Tests Suite

This directory contains end-to-end tests for the AutoRenta car rental platform, focusing on car publication workflows and validation scenarios.

## 📋 Test Files

### Main Publication Flow Tests

1. **`complete-porsche-publication-flow.spec.ts`**
   - Tests complete Porsche 911 publication workflow
   - Validates luxury sports car category
   - Tests high-end pricing tier (25,000 ARS/day)
   - Validates automatic transmission and gasoline fuel
   - **Tests**: 4 tests (happy path + 3 validation tests)

2. **`complete-bmw-publication-flow.spec.ts`**
   - Tests BMW X5 SUV publication workflow
   - Validates SUV category with 7 seats
   - Tests mid-range luxury pricing (18,000 ARS/day)
   - **Tests**: 3 tests (happy path + 2 validation tests)

3. **`complete-mercedes-publication-flow.spec.ts`**
   - Tests Mercedes-Benz C-Class sedan publication
   - Validates diesel fuel option (common in European luxury)
   - Tests executive sedan segment
   - **Tests**: 3 tests (happy path + 2 validation tests)

4. **`complete-toyota-publication-flow.spec.ts`**
   - Tests Toyota Corolla compact sedan publication
   - Validates economy pricing tier (8,000 ARS/day)
   - Tests hybrid fuel option
   - Validates minimum price threshold (1,000 ARS)
   - **Tests**: 5 tests (happy path + 4 validation tests)

### Error Scenario Tests

5. **`car-publication-error-scenarios.spec.ts`**
   - Tests form validation for missing required fields
   - Tests invalid data rejection (negative prices, invalid years, etc.)
   - Tests XSS and SQL injection prevention
   - Tests field-specific validations
   - **Tests**: 14 comprehensive error scenario tests

### Photo Upload Tests

6. **`car-publication-photo-validation.spec.ts`**
   - Tests photo upload functionality
   - Validates minimum requirement (3 photos)
   - Validates maximum limit (10 photos)
   - Tests file format validation (JPG, PNG, WEBP only)
   - Tests photo preview and deletion
   - **Tests**: 11 photo-related tests

## 🎯 Test Coverage Summary

| Category | Test Files | Test Count | Focus Area |
|----------|-----------|------------|------------|
| Happy Path | 4 files | 4 tests | Complete publication flows |
| Validations | 4 files | 12 tests | Field and business rules |
| Error Scenarios | 1 file | 14 tests | Security and edge cases |
| Photo Upload | 1 file | 11 tests | File upload and validation |
| **TOTAL** | **6 files** | **41 tests** | **Comprehensive coverage** |

## 🚀 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Edit `.env.test` and fill in your credentials:

```env
# Required
NG_APP_SUPABASE_URL=https://obxvffplochgeiclibng.supabase.co
NG_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional (tests will skip features if not set)
NG_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
NG_APP_MERCADOPAGO_PUBLIC_KEY=your_mp_public_key_here
```

**Where to get credentials:**
- **Supabase Anon Key**: https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/api
- **Mapbox Token**: https://account.mapbox.com/access-tokens/
- **MercadoPago Public Key**: https://www.mercadopago.com.ar/developers/panel/app

### 3. Start Development Server

```bash
npm run dev
```

## 🧪 Running Tests

### Run All E2E Tests

```bash
npx playwright test tests/e2e/
```

### Run Specific Test File

```bash
npx playwright test tests/e2e/complete-porsche-publication-flow.spec.ts
```

### Run in Headed Mode

```bash
npx playwright test tests/e2e/complete-porsche-publication-flow.spec.ts --headed
```

---

**Last Updated**: 2025-11-13
**Test Count**: 41 tests across 6 files
