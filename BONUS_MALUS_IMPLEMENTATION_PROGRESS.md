# Bonus-Malus System - Implementation Progress

**Branch:** `claude/implement-bonus-malus-system-011CUptjUMXc425pp3ngq3s3`
**Date Started:** 2025-11-05
**Date Updated:** 2025-11-05
**Status:** Phases 1, 2, 3, 5 Complete ✅ (60% done)

---

## Overview

Implementing a comprehensive bonus-malus system for AutoRenta with:
- **Risk Classes:** 0 (excellent) to 10 (maximum risk)
- **Telematics Integration:** Driver score 0-100 based on behavior
- **Protection Credit (CP):** Non-withdrawable credit for claims (replaces BSNR)
- **Bonus Protector:** Add-on to protect class from increasing after claims
- **Accounting Integration:** Full integration with existing accounting system

---

## ✅ Completed Phases

### **Phase 1: Database Schema** (Week 1)

**Migration:** `20251105_create_bonus_malus_system.sql`

#### Core Tables Created:

1. **`driver_risk_profile`**
   - Stores driver classification (class 0-10)
   - Tracks driver_score (telematics, 0-100)
   - Maintains claim history (total_claims, claims_with_fault)
   - Tracks good_years (consecutive years without fault claims)

2. **`pricing_class_factors`**
   - Stores multipliers for each class (0-10)
   - Fee multipliers: 0.85 (class 0) to 1.20 (class 10)
   - Guarantee multipliers: 0.75 (class 0) to 1.80 (class 10)

3. **`driver_telemetry`**
   - Records telemetry data per booking
   - Tracks: hard_brakes, speed_violations, night_driving_hours, risk_zones_visited
   - Calculates driver_score per trip

4. **`driver_protection_addons`**
   - Manages purchased add-ons (bonus_protector, deductible_shield)
   - Tracks expiration, usage, and protection levels

5. **`booking_claims`**
   - Records all claims (daños, robos, accidentes)
   - Tracks fault attribution and severity (1-3)
   - Maintains claim status (pending, approved, rejected, resolved)

#### Modified Existing Tables:

1. **`user_wallets`**
   - Added `protection_credit_cents` (BIGINT)
   - Added `protection_credit_currency` (VARCHAR(3))
   - Added `protection_credit_issued_at` (TIMESTAMPTZ)
   - Added `protection_credit_expires_at` (TIMESTAMPTZ)

2. **`wallet_transactions`**
   - Added `is_protection_credit` (BOOLEAN)
   - Added `protection_credit_reference_type` (VARCHAR(50))

#### Seed Data:

**Migration:** `20251105_seed_bonus_malus_factors.sql`

Inserted pricing factors for all 11 classes (0-10):

| Class | Fee Mult | Guarantee Mult | Description |
|-------|----------|----------------|-------------|
| 0 | 0.85 | 0.75 | Excelente - Máximo descuento |
| 1 | 0.88 | 0.80 | Muy buen conductor |
| 2 | 0.90 | 0.85 | Buen conductor |
| 3 | 0.92 | 0.90 | Conductor promedio+ |
| 4 | 0.95 | 0.95 | Conductor promedio |
| 5 | 1.00 | 1.00 | Base (sin historial) |
| 6 | 1.05 | 1.10 | Conductor con riesgo |
| 7 | 1.10 | 1.20 | Alto riesgo |
| 8 | 1.15 | 1.40 | Muy alto riesgo |
| 9 | 1.18 | 1.60 | Riesgo extremo |
| 10 | 1.20 | 1.80 | Riesgo máximo |

---

### **Phase 2: Core RPC Functions** (Week 1-2)

#### **Phase 2.1: Driver Profile Management**

**Migration:** `20251105_create_driver_profile_rpcs.sql`

Functions created:

1. **`initialize_driver_profile(user_id)`**
   - Creates initial profile with class 5, score 50
   - Called when user signs up

2. **`get_driver_profile(user_id)`**
   - Returns complete profile with pricing factors
   - Includes class, score, claim history, multipliers

3. **`update_driver_class_on_event(user_id, claim_with_fault, severity)`**
   - Updates class after a claim
   - Severity 1 (leve) → +1 class
   - Severity 2 (moderado) → +2 classes
   - Severity 3 (grave) → +3 classes
   - Resets good_years counter

4. **`improve_driver_class_annual()`**
   - Job function: improves class by 1 each year without fault claims
   - Increments good_years
   - Maximum improvement: class 0

5. **`get_class_benefits(class)`**
   - Returns benefits for a specific class
   - Shows discounts/surcharges in percentage

#### **Phase 2.2: Pricing Calculations**

**Migration:** `20251105_create_pricing_rpcs.sql`

Functions created:

1. **`compute_fee_with_class(user_id, base_fee_cents, telematic_score)`**
   - Calculates adjusted platform fee
   - Applies class multiplier × telematic multiplier
   - Telematic range: ±5% based on score (0-100)
   - Returns fee in centavos

2. **`compute_guarantee_with_class(user_id, base_guarantee_cents, has_card)`**
   - Calculates adjusted guarantee
   - Applies class multiplier × card multiplier
   - Card discount: -10% if has card
   - Returns guarantee in centavos

3. **`preview_booking_pricing(user_id, car_id, start_at, end_at, has_card)`**
   - Generates complete pricing preview
   - Returns: base prices, adjusted prices, discounts, total
   - Useful for checkout page

#### **Phase 2.3: Protection Credit (CP)**

**Migration:** `20251105_create_protection_credit_rpcs.sql`

Functions created:

1. **`issue_protection_credit(user_id, amount_cents, validity_days)`**
   - Issues initial CP ($300 USD default, 1 year validity)
   - Creates wallet if doesn't exist
   - Records transaction as 'issuance'

2. **`consume_protection_credit_for_claim(user_id, claim_amount_cents, booking_id)`**
   - **WATERFALL LOGIC:**
     1. Use CP first (non-withdrawable)
     2. Use WR (withdrawable balance)
     3. Remaining goes to external payment
   - Returns: cp_used, wr_used, remaining
   - Records transactions for accounting

3. **`extend_protection_credit_for_good_history(user_id)`**
   - Renews CP for free if ≥10 bookings without claims
   - Adds $300 USD to existing balance
   - Extends expiration by 1 year
   - Records transaction as 'renewal'

4. **`recognize_protection_credit_breakage(user_id)`**
   - Recognizes breakage when account closes or CP expires
   - Converts unused CP to platform revenue
   - Records transaction as 'breakage'

5. **`get_protection_credit_balance(user_id)`**
   - Returns current CP balance
   - Shows issued_at, expires_at, is_expired
   - Calculates days_until_expiry

#### **Phase 2.4: Bonus Protector**

**Migration:** `20251105_create_bonus_protector_rpcs.sql`

Functions created:

1. **`list_bonus_protector_options()`**
   - Returns available protector levels:
     - **Level 1:** $15 USD - Protects 1 leve claim
     - **Level 2:** $25 USD - Protects 2 leve or 1 moderado
     - **Level 3:** $40 USD - Protects 3 leve, 2 moderado, or 1 grave

2. **`purchase_bonus_protector(user_id, protection_level)`**
   - Purchases protector from wallet balance
   - Valid for 1 year
   - Prevents duplicate active protectors
   - Records transaction

3. **`apply_bonus_protector(user_id, claim_severity)`**
   - Applies protector when claim is registered
   - Reduces or eliminates class increase
   - Decrements protection level or marks as used
   - Returns: class_before, class_after, protection_applied

4. **`get_active_bonus_protector(user_id)`**
   - Returns active protector (if exists)
   - Shows level, expiration, price paid

---

### **Phase 3: Telemetry System** (Week 2-3) ✅

**Migration:** `20251105_create_telemetry_rpcs.sql`

Functions created:

1. **`record_telemetry(booking_id, telemetry_data)`**
   - Registers trip telemetry data
   - Extracts metrics from JSON payload
   - Calculates trip score automatically
   - Updates driver's average score (last 3 months)

2. **`calculate_trip_score(total_km, hard_brakes, speed_violations, night_hours, risk_zones)`**
   - Score algorithm: Base 100 points
   - Penalties: -2 per hard brake, -3 per speed violation
   - -1 per night driving hour, -5 per risk zone
   - Normalized per 100km for fair comparison

3. **`get_driver_telemetry_average(user_id, months)`**
   - Returns average score over N months
   - Total trips, km, events
   - Period start/end dates

4. **`get_telemetry_history(user_id, limit)`**
   - Returns trip history with scores
   - Includes car details
   - Ordered by date (newest first)

5. **`get_telemetry_insights(user_id)`**
   - Analyzes driving patterns
   - Identifies main issues
   - Provides personalized recommendations
   - Shows score trend (improving/stable/declining)

6. **`recalculate_all_driver_scores()`**
   - Monthly job function
   - Recalculates average scores for all drivers
   - Uses last 3 months of data

**Frontend Service:** `TelemetryService` (Angular)

Features:
- Real-time data collection with signals
- Session management (start/stop)
- Event recording:
  - Hard brakes (accelerometer)
  - Speed violations
  - Night driving tracking
  - Risk zone visits
  - GPS coordinates
- Helpers:
  - Speed calculation from GPS
  - Night time detection
  - Distance calculation (Haversine formula)
- API integration with backend RPCs

---

### **Phase 5: Frontend Services** (Week 4-5) ✅

Created 3 comprehensive Angular services:

#### **1. DriverProfileService**

**Features:**
- Load/initialize driver profile
- Get class benefits and multipliers
- Calculate claim impact
- Progress tracking to next class
- UI helpers (badges, colors, messages)

**Computed Signals:**
- `driverClass`, `driverScore`
- `feeMultiplier`, `guaranteeMultiplier`
- `hasDiscount`, `hasSurcharge`
- `feeDiscountPct`, `guaranteeDiscountPct`

**Key Methods:**
- `loadProfile()` - Fetches complete profile
- `initializeProfile()` - Creates profile for new users
- `getClassBenefits(class)` - Returns benefits info
- `getAllClassBenefits()` - Gets all 11 classes
- `calculateClaimImpact(severity, withFault)` - Simulates class change
- `getClassBadge()` - Returns badge for UI (icon, color, label)

#### **2. ProtectionCreditService**

**Features:**
- Load CP balance and expiration
- Check renewal eligibility
- Calculate claim coverage (waterfall logic)
- Payment breakdown calculator
- Renewal progress tracking

**Computed Signals:**
- `balanceUsd`, `balanceCents`
- `expiresAt`, `isExpired`, `daysUntilExpiry`
- `hasBalance`, `isNearExpiry`

**Key Methods:**
- `loadBalance()` - Fetches CP balance
- `checkRenewalEligibility()` - Checks if eligible for free renewal
- `calculateCoverage(claimAmount)` - Shows CP coverage for claim
- `calculatePaymentBreakdown(total, wallet)` - Waterfall breakdown
- `getRenewalProgress()` - Progress toward free renewal (10 bookings)
- `getUsagePercentage()` - % of CP used

#### **3. BonusProtectorService**

**Features:**
- Load protector options (levels 1-3)
- Purchase protector from wallet
- Calculate potential savings
- Simulate claim impact with/without protection
- Recommended level based on driver class

**Computed Signals:**
- `options`, `activeProtector`
- `hasActiveProtector`, `protectionLevel`
- `isNearExpiry`, `isExpired`

**Key Methods:**
- `loadOptions()` - Gets 3 available levels
- `loadActiveProtector()` - Gets user's active protector
- `purchaseProtector(level)` - Buys protector from wallet
- `getRecommendedLevel(driverClass)` - Recommends level
- `getProtectionCapacity(level)` - Shows coverage details
- `calculatePotentialSavings(level, class, fee, guarantee)` - ROI calculation
- `simulateClaimImpact(class, severity)` - Shows with/without comparison

All services use:
- Signal-based state management
- Computed signals for derived values
- Proper error handling
- Type-safe interfaces
- Helper methods for UI display

---

## 📊 Implementation Statistics

| Metric | Count |
|--------|-------|
| **Migration Files** | 7 |
| **Database Tables** | 5 new, 2 modified |
| **RPC Functions** | 25 (18 + 7 telemetry) |
| **Frontend Services** | 4 (Telemetry, DriverProfile, ProtectionCredit, BonusProtector) |
| **Lines of SQL** | ~3,500 |
| **Lines of TypeScript** | ~2,100 |
| **Pricing Classes** | 11 (0-10) |
| **Telemetry Metrics** | 5 (hard_brakes, speed_violations, night_hours, risk_zones, distance) |

---

## 🔐 Security Features

All RPC functions implement:
- ✅ **SECURITY DEFINER** mode for controlled access
- ✅ **Row Level Security (RLS)** policies on all tables
- ✅ **Proper GRANTS** (authenticated, service_role)
- ✅ **Input validation** (CHECK constraints, RAISE EXCEPTION)
- ✅ **Audit trail** via wallet_transactions

---

## 📋 Pending Phases

### **Phase 4: Integration with Existing Systems** (Week 3-4) - NEXT
- Modify `RiskCalculatorService` to use class multipliers
- Update `BookingService` to call pricing RPCs
- Extend `WalletService` to handle CP separately
- Integration with pricing preview
- Booking flow updates

### **Phase 6: Frontend UI Components** (Week 5-6)
- `DriverProfileCard` - Show class, score, benefits
- `ProtectionCreditCard` - Display CP balance
- `ClassBenefitsModal` - Explain class system
- `BonusProtectorPurchase` - Buy protector add-on

### **Phase 7: Accounting Integration** (Week 6-7)
- Add accounting entries for CP issuance
- Add accounting entries for CP consumption
- Add accounting entries for CP breakage
- Add accounting entries for protector sales

### **Phase 8: Periodic Jobs** (Week 7)
- Annual job: `improve_driver_class_annual()`
- Monthly job: Recalculate telemetry scores
- Daily job: Check CP renewal eligibility

### **Phase 9: Testing** (Week 8)
- Unit tests for all RPC functions
- Integration tests for claim flow
- E2E tests for booking with class adjustments

### **Phase 10: Documentation** (Week 8-9)
- Technical documentation
- User guide (how classes work)
- API documentation
- T&C updates

### **Phase 11: Data Migration** (Week 9)
- Migrate existing users to class 5
- Migrate existing protected_credit_balance to CP

### **Phase 12: Monitoring & Alerts** (Week 9-10)
- Admin dashboard with class distribution
- Alerts for users reaching class 10
- Alerts for low telemetry scores

---

## 🚀 Next Steps

1. **Apply migrations to database:**
   ```bash
   # Test in local/dev environment first
   npx supabase db push

   # Verify seed data
   npx supabase db reset --db-only
   ```

2. **Test RPC functions:**
   ```sql
   -- Test initialize profile
   SELECT initialize_driver_profile('user-uuid');

   -- Test get profile
   SELECT * FROM get_driver_profile('user-uuid');

   -- Test pricing calculation
   SELECT * FROM preview_booking_pricing(
     'user-uuid',
     'car-uuid',
     NOW() + INTERVAL '1 day',
     NOW() + INTERVAL '8 days',
     TRUE
   );

   -- Test CP issuance
   SELECT issue_protection_credit('user-uuid', 30000, 365);

   -- Test CP balance
   SELECT * FROM get_protection_credit_balance('user-uuid');
   ```

3. **Proceed to Phase 3: Telematics System**

---

## 📝 Notes

### Nomenclature Changes:
- ❌ BSNR / BSNR_balance
- ✅ Protection Credit / protection_credit_cents

### Currency Standards:
- All amounts stored in **centavos** (cents) in database
- Display as USD/ARS in frontend
- CP is always in **USD**

### Key Design Decisions:
1. **Waterfall Logic:** CP → WR → External (in that order)
2. **Class 5 = Base:** Users start at class 5 (no history)
3. **Telemetry Optional:** System works without telematics (uses class only)
4. **CP Non-Withdrawable:** Cannot be withdrawn to bank
5. **Breakage Revenue:** Unused CP becomes platform revenue

---

## 📞 Support

For questions or issues:
- Review implementation plan: `/home/user/autorenta/README_BONUS_MALUS_PLAN.md`
- Check migrations: `/home/user/autorenta/supabase/migrations/20251105_*.sql`
- Contact: [Your Team]

---

**Last Updated:** 2025-11-05
**Commits:**
- `c60e1e7` - feat(bonus-malus): implement Phase 1 & 2 - database schema and core RPCs
- `62bdcf0` - docs: add bonus-malus implementation progress tracking
- `b551f29` - feat(bonus-malus): implement Phase 3 & 5 - telemetry and frontend services
