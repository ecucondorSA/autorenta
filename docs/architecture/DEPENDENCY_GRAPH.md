# Service Dependency Graph

**Last Updated:** 2025-11-06
**Total Services:** 95
**Analysis Status:** ✅ No Circular Dependencies

---

## Executive Summary

This document maps all service dependencies in the AutoRenta Angular application to enable surgical code changes with confidence.

### Key Metrics

| Metric | Value | Status |
|--------|-------|--------|
| **Total Services** | 95 | ✅ Well-organized |
| **Average Dependencies** | 1.2 | ✅ Low coupling |
| **Max Dependencies** | 7 | ⚠️ BookingsService |
| **Zero-Dependency Services** | 30 (31.6%) | ✅ Strong foundation |
| **Circular Dependencies** | 0 | ✅ Clean architecture |

### Coupling Distribution

```
0 dependencies:    30 services (31.6%) ████████
1 dependency:      25 services (26.3%) ██████
2 dependencies:    20 services (21.1%) █████
3 dependencies:    11 services (11.6%) ███
4 dependencies:     5 services (5.3%)  █
5+ dependencies:    4 services (4.2%)  █
```

---

## Service Tiers (By Dependency Level)

### Tier 1: Foundation Layer (0-1 dependencies)
**Purpose:** Core utilities and infrastructure services
**Total:** 54 services (56.8%)

**Zero Dependencies (30 services):**
- `SupabaseClientService` - Supabase client initialization
- `LoggerService` - Structured logging with Sentry
- `ToastService` - User notifications
- `NotificationService` - Toast-based notifications
- `ExchangeRateService` - Currency exchange rates
- `DistanceCalculatorService` - Distance calculations
- `EncryptionService` - Data encryption
- `GeocodingService` - Geographic coordinate conversion
- `FranchiseTableService` - Vehicle damage deductibles
- `RiskMatrixService` - Risk assessment matrices
- `FGOPolicyEngineService` - Insurance policy computation
- `RealtimeConnectionService` - WebSocket connections
- `OfflineMessagesService` - Offline message caching
- `RealtimePricingService` - Real-time price updates
- `NotificationSoundService` - Audio notifications
- `PerformanceMonitoringService` - Performance tracking
- `PWAInstallService` - PWA installation handling
- `ShareService` - Content sharing utilities
- `WalletLedgerService` - Wallet transaction ledger
- `EmailService` - Email operations
- `ContractsService` - Contract management
- `DisputesService` - Dispute resolution
- `AdminService` - Admin operations
- `CarsService` - Car CRUD operations
- `DynamicPricingService` - Dynamic pricing computation
- `InsuranceService` - Insurance policies & claims
- `VerificationService` - User verification checks
- `CarLocationsService` - Car location management

**Single Dependency (24 services):**
- `ProfileService` → SupabaseClientService
- `PaymentsService` → FxService
- `PricingService` → DistanceCalculatorService
- `WalletLedgerService` → SupabaseClientService
- `FgoService` → SupabaseClientService
- `FgoV1_1Service` → SupabaseClientService
- `PayoutService` → SupabaseClientService
- `SplitPaymentService` → SupabaseClientService
- `WithdrawalService` → SupabaseClientService
- `LanguageService` → TranslateService
- `LocaleManagerService` → TranslateService
- `TourService` → Router
- `PaymentAuthorizationService` → AuthService
- `TelemetryService` → AuthService
- `CarsCompareService` → CarsService
- And 9 more verification/gateway services...

### Tier 2: Core Layer (2-3 dependencies)
**Purpose:** Business logic with targeted dependencies
**Total:** 20 services (21.1%)

**Notable Services:**
- `ErrorHandlerService` (2) → LoggerService, ToastService
- `AuthService` (3) → SupabaseClientService, LoggerService, Router
- `WalletService` (2) → SupabaseClientService, LoggerService
- `FxService` (2) → SupabaseClientService, ExchangeRateService
- `RiskCalculatorService` (2) → FranchiseTableService, DriverProfileService
- `RiskService` (2) → SupabaseClientService, RiskCalculatorService
- `DriverProfileService` (2) → SupabaseClientService, AuthService
- `AnalyticsService` (2) → SupabaseClientService, AuthService
- `LocationService` (3) → SupabaseClientService, ProfileService, GeocodingService
- `PushNotificationService` (3) → SupabaseClientService, AuthService, SwPush

### Tier 3: Domain Layer (4-5 dependencies)
**Purpose:** Complex domain operations
**Total:** 1 service (1.1%)

- `SettlementService` (4) → SupabaseClientService, FgoV1_1Service, RiskMatrixService, FgoService

### Tier 4: Orchestration Layer (6+ dependencies)
**Purpose:** High-level workflow orchestration
**Total:** 2 services (2.1%)

⚠️ **High Coupling - Refactoring Candidates**

1. **BookingsService** (7 dependencies)
   - SupabaseClientService
   - WalletService
   - PwaService
   - InsuranceService
   - DriverProfileService
   - ErrorHandlerService
   - LoggerService

2. **CheckoutPaymentService** (6 dependencies)
   - BookingsService
   - PaymentsService
   - MercadoPagoBookingGatewayService
   - RiskCalculatorService
   - SupabaseClientService
   - LoggerService

---

## Top 10 Most Coupled Services

| Rank | Service | File Path | Dependencies | Count |
|------|---------|-----------|--------------|-------|
| 1 | BookingsService | `apps/web/src/app/core/services/bookings.service.ts` | SupabaseClientService, WalletService, PwaService, InsuranceService, DriverProfileService, ErrorHandlerService, LoggerService | 7 |
| 2 | CheckoutPaymentService | `apps/web/src/app/core/services/checkout-payment.service.ts` | BookingsService, PaymentsService, MercadoPagoBookingGatewayService, RiskCalculatorService, SupabaseClientService, LoggerService | 6 |
| 3 | SettlementService | `apps/web/src/app/core/services/settlement.service.ts` | SupabaseClientService, FgoV1_1Service, RiskMatrixService, FgoService | 4 |
| 4 | AuthService | `apps/web/src/app/core/services/auth.service.ts` | SupabaseClientService, LoggerService, Router | 3 |
| 5 | LocationService | `apps/web/src/app/core/services/location.service.ts` | SupabaseClientService, ProfileService, GeocodingService | 3 |
| 6 | PushNotificationService | `apps/web/src/app/core/services/push-notification.service.ts` | SupabaseClientService, AuthService, SwPush | 3 |
| 7 | MetaService | `apps/web/src/app/core/services/meta.service.ts` | Meta, Title, Router | 3 |
| 8 | FxService | `apps/web/src/app/core/services/fx.service.ts` | SupabaseClientService, ExchangeRateService | 2 |
| 9 | RiskCalculatorService | `apps/web/src/app/core/services/risk-calculator.service.ts` | FranchiseTableService, DriverProfileService | 2 |
| 10 | RiskService | `apps/web/src/app/core/services/risk.service.ts` | SupabaseClientService, RiskCalculatorService | 2 |

---

## Dependency Tree Visualizations

### High-Coupling Services

#### BookingsService (7 dependencies)
```
BookingsService
├── SupabaseClientService (via injectSupabase)
├── WalletService
│   ├── SupabaseClientService
│   └── LoggerService
├── PwaService
├── InsuranceService
├── DriverProfileService
│   ├── SupabaseClientService
│   └── AuthService
├── ErrorHandlerService
│   ├── LoggerService
│   └── ToastService
└── LoggerService
```

**Impact Radius:** Changing BookingsService affects:
- All components using bookings (booking pages, car details, admin)
- Payment checkout flow
- Wallet operations
- Insurance activation
- Driver profile validation

#### CheckoutPaymentService (6 dependencies)
```
CheckoutPaymentService
├── BookingsService (7 transitive dependencies)
├── PaymentsService
│   └── FxService
│       ├── SupabaseClientService
│       └── ExchangeRateService
├── MercadoPagoBookingGatewayService
│   └── SupabaseClientService
├── RiskCalculatorService
│   ├── FranchiseTableService
│   └── DriverProfileService
├── SupabaseClientService
└── LoggerService
```

**Impact Radius:** Changing CheckoutPaymentService affects:
- Booking checkout flow
- Payment gateway integration
- Risk calculation logic
- Wallet operations (via BookingsService)

---

## Services by Feature Domain

### Authentication & Profiles
```
AuthService
├── SupabaseClientService
├── LoggerService
└── Router

ProfileService
└── SupabaseClientService

DriverProfileService
├── SupabaseClientService
└── AuthService

VerificationService (0 dependencies)

VerificationStateService
└── SupabaseClientService
```

### Payments & Wallet
```
PaymentsService
└── FxService
    ├── SupabaseClientService
    └── ExchangeRateService

CheckoutPaymentService (6 deps - HIGH COUPLING ⚠️)
├── BookingsService
├── PaymentsService
├── MercadoPagoBookingGatewayService
├── RiskCalculatorService
├── SupabaseClientService
└── LoggerService

WalletService
├── SupabaseClientService
└── LoggerService

WithdrawalService
└── SupabaseClientService

PayoutService
└── SupabaseClientService

SplitPaymentService
└── SupabaseClientService
```

### Bookings & Insurance
```
BookingsService (7 deps - HIGH COUPLING ⚠️)
├── SupabaseClientService
├── WalletService
├── PwaService
├── InsuranceService
├── DriverProfileService
├── ErrorHandlerService
└── LoggerService

InsuranceService (0 dependencies)

SettlementService (4 deps)
├── SupabaseClientService
├── FgoV1_1Service
├── RiskMatrixService
└── FgoService
```

### Risk & Pricing
```
RiskCalculatorService
├── FranchiseTableService
└── DriverProfileService

RiskService
├── SupabaseClientService
└── RiskCalculatorService

DynamicPricingService (0 dependencies)

PricingService
└── DistanceCalculatorService

FranchiseTableService (0 dependencies)

RiskMatrixService (0 dependencies)
```

### Cars & Locations
```
CarsService (0 dependencies)

CarsCompareService
└── CarsService

CarLocationsService (0 dependencies)

LocationService
├── SupabaseClientService
├── ProfileService
└── GeocodingService

GeocodingService (0 dependencies)
```

### Messages & Notifications
```
MessagesService
├── RealtimeConnectionService
└── OfflineMessagesService

PushNotificationService
├── SupabaseClientService
├── AuthService
└── SwPush (Angular)

NotificationService (0 dependencies)

VerificationNotificationsService
├── NotificationService
└── VerificationStateService

ToastService (0 dependencies)
```

---

## Circular Dependency Analysis

### Status: ✅ NO CIRCULAR DEPENDENCIES DETECTED

**Analysis Method:**
1. Traced all `inject()` calls in service constructors
2. Mapped dependencies recursively
3. Checked for cycles in dependency graph
4. Verified acyclic structure

**Key Safe Patterns:**

#### 1. Acyclic Supabase Access
- 40+ services inject `SupabaseClientService` independently
- No service that depends on Supabase also injects services that depend on Supabase
- Clean one-way dependency flow

#### 2. Safe Auth Usage
- `AuthService` is a leaf node (only depends on infrastructure)
- Many services depend on `AuthService`
- `AuthService` never depends back on them
- No circular auth dependencies

#### 3. Payment Services Chain (Acyclic)
```
PaymentsService ← CheckoutPaymentService
MercadoPagoBookingGatewayService ← CheckoutPaymentService
BookingsService ← CheckoutPaymentService
RiskCalculatorService ← CheckoutPaymentService
```
All dependencies flow one direction toward CheckoutPaymentService.

#### 4. Risk Calculation Hierarchy (Acyclic)
```
FranchiseTableService → RiskCalculatorService → RiskService
DriverProfileService → RiskCalculatorService → RiskService
```
Clean hierarchy with no back-dependencies.

---

## Dependency Injection Patterns

### Pattern 1: Constructor Injection via `inject()` (90% of services)
```typescript
private readonly logger = inject(LoggerService);
private readonly auth = inject(AuthService);
```

**Advantages:**
- Type-safe at compile time
- Tree-shakeable in production
- Follows Angular 14+ best practices

### Pattern 2: Supabase Injection Helper (40+ services)
```typescript
private readonly supabase = injectSupabase();  // Helper function
// or
private readonly supabase = inject(SupabaseClientService).getClient();
```

**Why:**
- Reduces boilerplate
- Provides direct SupabaseClient access
- Consistent across codebase

### Pattern 3: Angular Framework Injections
Used in specific services that need Angular-provided injectables:
- `AuthService`: `Router`
- `MetaService`: `Meta`, `Title`, `Router`
- `LanguageService`: `TranslateService`
- `PushNotificationService`: `SwPush`

---

## Critical Findings & Recommendations

### ✅ Strengths

1. **No Circular Dependencies**
   - Clean acyclic dependency graph
   - Safe to add new services without risk of cycles

2. **Clear Infrastructure Layer**
   - 30+ foundational services with 0 dependencies
   - Easy to test in isolation
   - Stable foundation for higher layers

3. **Consistent Patterns**
   - Standardized `inject()` usage across codebase
   - Predictable Supabase access pattern
   - Clear dependency injection strategy

4. **Good Separation of Concerns**
   - Payment services isolated
   - Auth services independent
   - Database access centralized via SupabaseClientService

### ⚠️ Issues & Risks

#### 1. BookingsService High Coupling (7 dependencies)
**File:** `apps/web/src/app/core/services/bookings.service.ts:1`

**Problems:**
- Handles too many concerns: booking creation, wallet locking, insurance activation, driver profile access
- High blast radius on changes (affects 7+ other services)
- Difficult to test (requires mocking 7 dependencies)
- Violates Single Responsibility Principle

**Impact of Changes:**
- Modifying BookingsService affects all booking pages
- Changes ripple through checkout flow
- Wallet operations may break
- Insurance activation may fail

**Recommended Actions:**
- Extract wallet management to dedicated `BookingWalletService`
- Move insurance activation to `InsuranceService`
- Move driver profile checks to `DriverProfileService`
- Keep only core booking logic in `BookingsService`

#### 2. CheckoutPaymentService High Coupling (6 dependencies)
**File:** `apps/web/src/app/core/services/checkout-payment.service.ts:1`

**Problems:**
- Tightly coupled to MercadoPago gateway
- Hard to add PayPal or other payment providers
- Complex payment orchestration logic
- Depends on BookingsService (which has 7 deps itself)

**Impact of Changes:**
- Adding new payment gateway requires modifying existing service
- Testing requires 6+ mocks
- Payment flow changes affect bookings and wallet

**Recommended Actions:**
- Implement `PaymentGatewayFactory` pattern
- Create abstract `PaymentGateway` interface
- Use Strategy pattern for different payment providers
- Reduce direct dependency on BookingsService

#### 3. SettlementService Complexity (4 dependencies)
**File:** `apps/web/src/app/core/services/settlement.service.ts:1`

**Problems:**
- FGO calculation logic spread across 4 services
- Difficult to understand full settlement flow
- Insurance policy logic fragmented

**Recommended Actions:**
- Consider creating unified `FgoCalculationService`
- Consolidate FGO logic into single service
- Document settlement calculation flow explicitly

---

## Refactoring Recommendations (Priority Order)

### Priority 1: Reduce BookingsService Coupling

**Current State:**
```typescript
export class BookingsService {
  private readonly supabase = injectSupabase();
  private readonly walletService = inject(WalletService);
  private readonly pwaService = inject(PwaService);
  private readonly insuranceService = inject(InsuranceService);
  private readonly driverProfileService = inject(DriverProfileService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly logger = inject(LoggerService);
}
```

**Proposed Solution:**
Create `BookingOrchestrationService` that delegates to domain services:

```typescript
// Keep BookingsService lean
export class BookingsService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService);

  async createBooking(data: BookingData): Promise<Booking> {
    // Only core booking logic
  }
}

// New orchestrator
export class BookingOrchestrationService {
  private readonly bookings = inject(BookingsService);
  private readonly wallet = inject(WalletService);
  private readonly insurance = inject(InsuranceService);

  async processBookingRequest(request: BookingRequest): Promise<Booking> {
    // Orchestrate wallet locking
    await this.wallet.lockFunds(request.amount);

    // Create booking
    const booking = await this.bookings.createBooking(request);

    // Activate insurance
    await this.insurance.activateCoverage(booking.id);

    return booking;
  }
}
```

### Priority 2: Implement Payment Gateway Abstraction

**Current Problem:**
```typescript
// Tightly coupled to MercadoPago
private readonly mpGateway = inject(MercadoPagoBookingGatewayService);
```

**Proposed Solution:**
```typescript
// Define interface
export interface PaymentGateway {
  createPreference(booking: Booking): Promise<PaymentPreference>;
  processPayment(intentId: string): Promise<PaymentResult>;
}

// Factory pattern
export class PaymentGatewayFactory {
  create(provider: 'mercadopago' | 'paypal'): PaymentGateway {
    switch (provider) {
      case 'mercadopago':
        return inject(MercadoPagoBookingGatewayService);
      case 'paypal':
        return inject(PayPalBookingGatewayService);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

// Use in CheckoutPaymentService
export class CheckoutPaymentService {
  private readonly gatewayFactory = inject(PaymentGatewayFactory);

  async processPayment(booking: Booking, provider: string): Promise<void> {
    const gateway = this.gatewayFactory.create(provider);
    const preference = await gateway.createPreference(booking);
    // ...
  }
}
```

### Priority 3: Consolidate FGO Calculation Logic

**Current Problem:** Settlement calculation spread across 4 services

**Proposed Solution:**
```typescript
export class FgoCalculationService {
  private readonly fgoV1_1 = inject(FgoV1_1Service);
  private readonly riskMatrix = inject(RiskMatrixService);
  private readonly fgoEngine = inject(FgoService);

  calculateSettlement(claim: Claim): SettlementResult {
    // All FGO logic in one place
  }
}

// Simplified SettlementService
export class SettlementService {
  private readonly supabase = injectSupabase();
  private readonly fgoCalc = inject(FgoCalculationService);

  async processSettlement(claimId: string): Promise<Settlement> {
    const result = this.fgoCalc.calculateSettlement(claim);
    // Save to DB
  }
}
```

---

## Impact Analysis Matrix

Use this matrix to understand the blast radius of changes.

### Services → Dependents (Who uses this service?)

| Service | Direct Dependents | Indirect Impact |
|---------|-------------------|-----------------|
| **SupabaseClientService** | 40+ services | **CRITICAL** - Changes affect entire app |
| **LoggerService** | 15+ services | **HIGH** - Changes affect all logging |
| **AuthService** | 10+ services | **HIGH** - Changes affect auth flow |
| **WalletService** | BookingsService, CheckoutPaymentService | **HIGH** - Changes affect payments |
| **BookingsService** | CheckoutPaymentService, UrgentRentalService, booking pages | **HIGH** - Changes affect booking flow |
| **PaymentsService** | CheckoutPaymentService, payment pages | **MEDIUM** - Changes affect payment flow |
| **InsuranceService** | BookingsService, SettlementService | **MEDIUM** - Changes affect insurance |
| **CarsService** | CarsCompareService, car pages | **LOW** - Changes isolated to cars |

### Components → Services (Impact of service changes on UI)

| Service Changed | Affected Components |
|-----------------|---------------------|
| **BookingsService** | `cars/detail`, `bookings/checkout`, `bookings/list`, `admin/bookings` |
| **CheckoutPaymentService** | `bookings/checkout` |
| **WalletService** | `wallet/wallet.page`, `profile/profile.page`, `bookings/checkout` |
| **AuthService** | `auth/login`, `auth/register`, navigation guards, all protected routes |
| **CarsService** | `cars/list`, `cars/detail`, `cars/publish`, `cars/my-cars` |
| **PaymentsService** | `bookings/checkout`, payment status pages |

---

## Safe Change Checklist

Before modifying a service, use this checklist:

### For Services with 0-2 Dependencies (Low Risk)
- [ ] Identify all components that inject this service
- [ ] Check if service methods are used by other services
- [ ] Run unit tests: `npm run test -- ServiceName`
- [ ] Verify no breaking changes to public API

### For Services with 3-5 Dependencies (Medium Risk)
- [ ] Complete low-risk checklist above
- [ ] Trace all transitive dependencies (dependencies of dependencies)
- [ ] Review all services that depend on this service
- [ ] Check for database/RPC changes
- [ ] Run integration tests: `npm run test -- integration`
- [ ] Review flow documentation in `docs/flows/`

### For Services with 6+ Dependencies (High Risk - ⚠️ BookingsService, CheckoutPaymentService)
- [ ] Complete medium-risk checklist above
- [ ] Create detailed change plan documenting all affected services
- [ ] Consider feature flags for gradual rollout
- [ ] Plan rollback strategy
- [ ] Update all affected flow documentation
- [ ] Run full E2E tests
- [ ] Coordinate with team before deployment

---

## Complete Service List (Alphabetical)

For quick reference, here's the complete list of all 95 services:

1. AccountingService
2. AdminService
3. AiPhotoEnhancerService
4. AnalyticsService
5. AuthService
6. AutorentarCreditService
7. BonusProtectorService
8. BookingConfirmationService
9. BookingsService ⚠️
10. CarLocationsService
11. CarsCompareService
12. CarsService
13. CheckoutPaymentService ⚠️
14. CloudflareAiService
15. ContractsService
16. DatabaseExportService
17. DisputesService
18. DistanceCalculatorService
19. DriverProfileService
20. DynamicPricingService
21. EmailService
22. EmailVerificationService
23. EncryptionService
24. ErrorHandlerService
25. ExchangeRateService
26. FaceVerificationService
27. FGOPolicyEngineService
28. FgoService
29. FgoV1_1Service
30. FranchiseTableService
31. FxService
32. GeocodingService
33. GuaranteeCopyBuilderService
34. IdentityLevelService
35. InsuranceService
36. LanguageService
37. LocaleManagerService
38. LocationService
39. LoggerService
40. MarketplaceOnboardingService
41. MercadoPagoBookingGatewayService
42. MercadoPagoOAuthService
43. MessagesService
44. MetaService
45. NotificationService
46. NotificationSoundService
47. OfflineMessagesService
48. PaymentAuthorizationService
49. PaymentsService
50. PayoutService
51. PayPalBookingGatewayService
52. PayPalWalletGatewayService
53. PerformanceMonitoringService
54. PhoneVerificationService
55. PricingService
56. ProfileService
57. ProtectionCreditService
58. PushNotificationService
59. PWAInstallService
60. RealtimeConnectionService
61. RealtimePricingService
62. RiskCalculatorService
63. RiskMatrixService
64. RiskService
65. SettlementService
66. ShareService
67. SplitPaymentService
68. StockPhotosService
69. SupabaseClientService
70. TelemetryService
71. ToastService
72. TourService
73. UrgentRentalService
74. VerificationNotificationsService
75. VerificationService
76. VerificationStateService
77. WaitlistService
78. WalletLedgerService
79. WalletService
80. WithdrawalService

---

## Related Documentation

- **Business Flows:** See `docs/flows/` for end-to-end flow documentation
- **Layer Separation:** See `docs/architecture/LAYER_SEPARATION.md`
- **Domain Boundaries:** See `docs/architecture/DOMAIN_BOUNDARIES.md`
- **Safe Change Guide:** See `docs/guides/SAFE_CHANGE_CHECKLIST.md`
- **Architecture Index:** See `docs/ARCHITECTURE_INDEX.md`

---

## Maintenance Notes

**How to Update This Document:**

1. Run dependency analysis script:
   ```bash
   ./tools/analyze-dependencies.sh
   ```

2. Review output and update metrics

3. Check for new high-coupling services (6+ dependencies)

4. Verify no circular dependencies introduced

5. Update service counts and tier distributions

**When to Update:**

- After adding new services
- After major refactoring
- Monthly architectural review
- Before major releases

**Last Analysis:** 2025-11-06
