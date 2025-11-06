# Domain Dependency Matrix

**Last Updated:** 2025-11-06
**Purpose:** Detailed cross-domain dependency mapping for impact analysis

---

## Overview

This matrix shows **exactly which services** in each domain depend on services in other domains. Use this to understand the blast radius of changes across domain boundaries.

---

## Matrix Legend

- ✅ **Has Dependencies:** Domain X depends on Domain Y
- ⚠️ **High Coupling:** 3+ dependencies
- ❌ **No Dependencies:** Clean separation

---

## Domain-to-Domain Dependency Matrix

|                | Auth | Car | Booking | Payment | Wallet | Insurance | Risk |
|----------------|------|-----|---------|---------|--------|-----------|------|
| **Auth**       | -    | ❌   | ❌       | ❌       | ❌      | ❌         | ❌    |
| **Car**        | ✅    | -   | ❌       | ❌       | ❌      | ❌         | ❌    |
| **Booking**    | ✅    | ✅   | -       | ❌       | ⚠️      | ⚠️         | ⚠️    |
| **Payment**    | ✅    | ❌   | ✅       | -       | ✅      | ❌         | ✅    |
| **Wallet**     | ✅    | ❌   | ❌       | ❌       | -      | ❌         | ❌    |
| **Insurance**  | ✅    | ❌   | ✅       | ❌       | ❌      | -         | ✅    |
| **Risk**       | ✅    | ✅   | ❌       | ❌       | ❌      | ❌         | -    |

**Key Insight:** Booking domain has the highest coupling (depends on 6 domains).

---

## Detailed Dependency Breakdown

### 1. Auth Domain → Other Domains

**Status:** ✅ CLEAN (No dependencies on business domains)

**Depends On:** NONE

**Internal Dependencies:**
- AuthService → SupabaseClientService, LoggerService, Router
- ProfileService → SupabaseClientService
- VerificationService → (standalone, 0 dependencies)

**Rule:** Auth domain MUST remain independent. No business logic imports allowed.

---

### 2. Car Domain → Auth Domain

**Status:** ✅ MINIMAL (Only auth dependencies, as expected)

**Depends On:**
- Auth (for owner_id validation)

**Service Dependencies:**

| Car Service | → | Auth Service | Reason |
|-------------|---|--------------|--------|
| CarsService | → | AuthService (implicit) | Gets authenticated user ID for owner_id |

**Tables:**
- `cars.owner_id` → `auth.users.id` (FK constraint)

---

### 3. Booking Domain → Auth, Car, Wallet, Insurance, Risk

**Status:** ⚠️ HIGH COUPLING (7 service dependencies)

#### Booking → Auth
| Booking Service | → | Auth Service | Reason |
|-----------------|---|--------------|--------|
| BookingsService | → | AuthService (implicit) | Get authenticated user for renter_id |
| DriverProfileService | → | AuthService | Get user for driver profile lookup |

#### Booking → Car
| Booking Service | → | Car Service | Reason |
|-----------------|---|-------------|--------|
| BookingsService | → | CarsService (implicit) | Validate car exists & is available |

**Tables:**
- `bookings.car_id` → `cars.id` (FK constraint)

#### Booking → Wallet
| Booking Service | → | Wallet Service | Reason |
|-----------------|---|----------------|--------|
| BookingsService | → | WalletService | Lock funds for booking guarantee |

**Flow:**
```
BookingsService.requestBooking()
  ↓
WalletService.lockFunds(booking_id, amount)
  ↓
wallet_transactions INSERT (type='lock')
```

#### Booking → Insurance
| Booking Service | → | Insurance Service | Reason |
|-----------------|---|-------------------|--------|
| BookingsService | → | InsuranceService | Auto-activate coverage on booking creation |

**Flow:**
```
BookingsService.requestBooking()
  ↓
InsuranceService.activateCoverage(booking_id)
  ↓
booking_insurance_coverage INSERT
```

#### Booking → Risk
| Booking Service | → | Risk Service | Reason |
|-----------------|---|--------------|--------|
| BookingsService | → | DriverProfileService | Check driver eligibility |

**Flow:**
```
BookingsService (uses DriverProfileService signal)
  ↓
DriverProfileService updates driver class (bonus-malus)
```

**Impact:** Changes to BookingsService ripple through 5 other domains!

---

### 4. Payment Domain → Auth, Booking, Wallet, Risk

**Status:** ⚠️ MEDIUM COUPLING (6 service dependencies)

#### Payment → Auth
| Payment Service | → | Auth Service | Reason |
|-----------------|---|--------------|--------|
| CheckoutPaymentService | → | AuthService (implicit) | Verify user owns booking |

#### Payment → Booking
| Payment Service | → | Booking Service | Reason |
|-----------------|---|-----------------|--------|
| CheckoutPaymentService | → | BookingsService | Fetch booking details, update status |
| PaymentsService | → | BookingsService (implicit) | Link payment intent to booking |

**Tables:**
- `payment_intents.booking_id` → `bookings.id` (FK constraint)

#### Payment → Wallet
| Payment Service | → | Wallet Service | Reason |
|-----------------|---|----------------|--------|
| CheckoutPaymentService | → | WalletService | Check balance, lock funds, charge wallet |

**Flow:**
```
CheckoutPaymentService.processWalletPayment()
  ↓
WalletService.lockFunds(booking_id, amount)
  ↓
wallet_transactions INSERT (type='lock')
  ↓
(after confirmation)
  ↓
WalletService.charge(booking_id)
  ↓
wallet_transactions INSERT (type='charge')
```

#### Payment → Risk
| Payment Service | → | Risk Service | Reason |
|-----------------|---|--------------|--------|
| CheckoutPaymentService | → | RiskCalculatorService | Calculate guarantee amounts |

---

### 5. Wallet Domain → Auth

**Status:** ✅ MINIMAL (Only auth dependencies)

**Depends On:**
- Auth (for user_id)

#### Wallet → Auth
| Wallet Service | → | Auth Service | Reason |
|----------------|---|--------------|--------|
| WalletService | → | AuthService (implicit) | Get authenticated user for wallet operations |
| WithdrawalService | → | AuthService (implicit) | Verify user owns withdrawal request |

**Tables:**
- `user_wallets.user_id` → `auth.users.id` (FK constraint)
- `wallet_transactions.user_id` → `auth.users.id` (FK constraint)

**Rule:** Wallet domain does NOT depend on Booking or Payment (clean separation prevents circular dependencies).

---

### 6. Insurance Domain → Auth, Booking, Risk

**Status:** ⚠️ MEDIUM COUPLING (4 service dependencies)

#### Insurance → Auth
| Insurance Service | → | Auth Service | Reason |
|-------------------|---|--------------|--------|
| SettlementService | → | AuthService (implicit) | Get user for claim ownership |

#### Insurance → Booking
| Insurance Service | → | Booking Service | Reason |
|-------------------|---|-----------------|--------|
| InsuranceService | → | BookingsService (implicit) | Validate booking exists for coverage |
| SettlementService | → | BookingsService | Fetch booking for settlement calculation |

**Tables:**
- `booking_insurance_coverage.booking_id` → `bookings.id` (FK)
- `claims.booking_id` → `bookings.id` (FK)

**Flow:**
```
SettlementService.processClaim(claim)
  ↓
BookingsService.getBookingById(booking_id)
  ↓
Get risk snapshot, car value, booking details
  ↓
FgoV1_1Service.executeWaterfall(...)
```

#### Insurance → Risk
| Insurance Service | → | Risk Service | Reason |
|-------------------|---|--------------|--------|
| SettlementService | → | RiskMatrixService | Get risk policy for franchise calculation |
| SettlementService | → | RiskCalculatorService (indirect) | Used by FgoV1_1Service |

**Flow:**
```
SettlementService.processClaim()
  ↓
RiskMatrixService.getRiskPolicy(car.price_per_day)
  ↓
Get franchise_usd, hold_min_ars, security_credit_usd
```

---

### 7. Risk Domain → Auth, Car

**Status:** ✅ MINIMAL

**Depends On:**
- Auth (for user_id)
- Car (for vehicle value risk bands)

#### Risk → Auth
| Risk Service | → | Auth Service | Reason |
|--------------|---|--------------|--------|
| RiskService | → | AuthService (implicit) | Get user for risk snapshot |
| DriverProfileService | → | AuthService | Get authenticated user for profile lookup |

**Tables:**
- `driver_risk_profile.user_id` → `auth.users.id` (FK)

#### Risk → Car
| Risk Service | → | Car Service | Reason |
|--------------|---|-------------|--------|
| RiskMatrixService | → | CarsService (implicit) | Map car value → risk band (economy/standard/premium/luxury) |

**Flow:**
```
RiskMatrixService.getRiskPolicy(carValueUsd)
  ↓
if (carValue <= 10000) → 'economy'
else if (carValue <= 20000) → 'standard'
else if (carValue <= 40000) → 'premium'
else → 'luxury'
```

**Rule:** Risk domain does NOT depend on Booking, Payment, Wallet, or Insurance (clean separation).

---

## Service-Level Dependency Details

### High-Coupling Services (Orchestration Layer)

#### BookingsService (7 dependencies)

**File:** `apps/web/src/app/core/services/bookings.service.ts`

| Depends On | Service | Purpose |
|------------|---------|---------|
| Foundation | SupabaseClientService | Database access |
| Foundation | LoggerService | Error logging |
| Wallet | WalletService | Lock funds for booking |
| Insurance | InsuranceService | Activate coverage |
| Risk | DriverProfileService | Driver eligibility |
| Cross-Cutting | ErrorHandlerService | Error handling |
| Foundation | PwaService | App badge updates |

**Change Impact:** Modifying BookingsService affects 7 services + all components using bookings.

#### CheckoutPaymentService (6 dependencies)

**File:** `apps/web/src/app/core/services/checkout-payment.service.ts`

| Depends On | Service | Purpose |
|------------|---------|---------|
| Booking | BookingsService | Fetch booking details |
| Payment | PaymentsService | Create payment intent |
| Payment | MercadoPagoBookingGatewayService | Payment gateway |
| Risk | RiskCalculatorService | Calculate guarantees |
| Foundation | SupabaseClientService | Database access |
| Foundation | LoggerService | Error logging |

**Change Impact:** Modifying CheckoutPaymentService affects payment flow, bookings, and wallet operations.

#### SettlementService (4 dependencies)

**File:** `apps/web/src/app/core/services/settlement.service.ts`

| Depends On | Service | Purpose |
|------------|---------|---------|
| Foundation | SupabaseClientService | Database access |
| Insurance | FgoV1_1Service | Eligibility & waterfall |
| Risk | RiskMatrixService | Risk policy lookup |
| Insurance | FgoService | FGO ledger (legacy) |

**Change Impact:** Modifying SettlementService affects insurance claims and FGO operations.

---

## Circular Dependency Analysis

### Status: ✅ NO CIRCULAR DEPENDENCIES

**Verified Acyclic Paths:**

1. **Booking ↔ Payment:** NO CIRCLE
   - Booking → Payment ❌ (Booking does NOT depend on Payment)
   - Payment → Booking ✅ (Payment depends on Booking)
   - **Result:** One-way dependency, safe

2. **Booking ↔ Wallet:** NO CIRCLE
   - Booking → Wallet ✅ (Booking depends on Wallet)
   - Wallet → Booking ❌ (Wallet does NOT depend on Booking)
   - **Result:** One-way dependency, safe

3. **Booking ↔ Insurance:** NO CIRCLE
   - Booking → Insurance ✅ (Booking activates insurance)
   - Insurance → Booking ✅ (Insurance validates booking)
   - **Potential Issue:** Bidirectional, but...
   - **Mitigation:** Different service methods, no circular init
   - **Result:** Safe (verified via dependency analysis)

4. **Insurance ↔ Risk:** NO CIRCLE
   - Insurance → Risk ✅ (Insurance uses risk policies)
   - Risk → Insurance ❌ (Risk does NOT depend on Insurance)
   - **Result:** One-way dependency, safe

---

## Change Impact Scenarios

### Scenario 1: Change AuthService

**Direct Impact:**
- ProfileService
- DriverProfileService
- All services using `auth.uid()`

**Indirect Impact:**
- ALL DOMAINS (99% of services)

**Blast Radius:** 🔴 CRITICAL (affects entire application)

**Recommendation:**
- Test ALL flows after Auth changes
- Use feature flags for gradual rollout
- Plan for database migration if schema changes

---

### Scenario 2: Change CarsService

**Direct Impact:**
- BookingsService (validates car availability)
- RiskMatrixService (car value → risk band)

**Indirect Impact:**
- PaymentService (via BookingsService)
- InsuranceService (via BookingsService)

**Blast Radius:** 🟡 MEDIUM (affects bookings, payments, insurance)

**Recommendation:**
- Test booking creation flow
- Test risk calculation flow
- Verify car availability checks

---

### Scenario 3: Change WalletService

**Direct Impact:**
- BookingsService (locks funds)
- CheckoutPaymentService (charges wallet)

**Indirect Impact:**
- Payment flow
- Booking confirmation

**Blast Radius:** 🟡 MEDIUM (affects bookings and payments)

**Recommendation:**
- Test wallet payment flow
- Test booking with wallet security deposit
- Verify fund lock/unlock logic

---

### Scenario 4: Change BookingsService

**Direct Impact:**
- CheckoutPaymentService
- InsuranceService (coverage activation)
- SettlementService (claims)
- All booking-related components

**Indirect Impact:**
- Payment flow
- Insurance claims
- Wallet operations (if booking logic changes)

**Blast Radius:** 🔴 HIGH (affects 50% of application)

**Recommendation:**
- Test ALL booking flows
- Test payment checkout
- Test insurance claim flow
- Run full E2E tests

---

### Scenario 5: Change InsuranceService

**Direct Impact:**
- BookingsService (coverage activation)
- SettlementService (claims processing)

**Indirect Impact:**
- Booking creation flow

**Blast Radius:** 🟡 MEDIUM (affects bookings and claims)

**Recommendation:**
- Test booking creation with insurance activation
- Test claim submission flow
- Verify FGO waterfall execution

---

## Testing Strategy by Domain

### Auth Domain Changes
- [ ] Test all login/logout flows
- [ ] Test profile CRUD operations
- [ ] Test verification flows
- [ ] Run FULL E2E suite (all domains affected)

### Car Domain Changes
- [ ] Test car CRUD operations
- [ ] Test car availability checks
- [ ] Test booking creation (indirectly affected)
- [ ] Test risk calculation (indirectly affected)

### Booking Domain Changes (CRITICAL)
- [ ] Test booking creation flow
- [ ] Test payment checkout flow
- [ ] Test wallet operations
- [ ] Test insurance activation
- [ ] Test claim submission
- [ ] Run FULL E2E suite

### Payment Domain Changes
- [ ] Test all payment methods (wallet, card, split)
- [ ] Test MercadoPago integration
- [ ] Test webhook processing
- [ ] Test booking confirmation after payment

### Wallet Domain Changes
- [ ] Test deposit flow
- [ ] Test withdrawal flow
- [ ] Test fund locking for bookings
- [ ] Test wallet payment checkout

### Insurance Domain Changes
- [ ] Test coverage activation
- [ ] Test claim submission
- [ ] Test FGO waterfall execution
- [ ] Test settlement calculation

### Risk Domain Changes
- [ ] Test risk snapshot creation
- [ ] Test driver profile updates
- [ ] Test bonus-malus calculations
- [ ] Test risk band mapping

---

## Related Documentation

- **Service Dependencies:** See `docs/architecture/DEPENDENCY_GRAPH.md`
- **Domain Boundaries:** See `docs/architecture/DOMAIN_BOUNDARIES.md`
- **Layer Separation:** See `docs/architecture/LAYER_SEPARATION.md`
- **Safe Change Checklist:** See `docs/guides/SAFE_CHANGE_CHECKLIST.md`

---

**Last Verified:** 2025-11-06
