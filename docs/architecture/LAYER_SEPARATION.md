# Architectural Layer Separation

**Last Updated:** 2025-11-06
**Status:** Current Architecture Analysis

---

## Overview

This document defines the architectural layers in AutoRenta's Angular application and provides guidelines for maintaining clean separation of concerns. Understanding these layers is critical for making surgical code changes without unintended side effects.

---

## Layer Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 1: PRESENTATION (UI Components)                               │
│ - Angular standalone components                                     │
│ - Templates, styles, user interactions                              │
│ - Signal-based reactivity                                           │
│ - NO business logic                                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │ inject()
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 2: SERVICE / BUSINESS LOGIC                                   │
│ - Injectable services                                                │
│ - Business rules and orchestration                                  │
│ - State management via signals                                      │
│ - PROBLEM: Currently mixed with data access                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │ inject() / injectSupabase()
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 3: DATA ACCESS (Implicit - needs separation)                 │
│ - Direct Supabase client calls                                      │
│ - RPC function calls                                                │
│ - Table queries (SELECT, INSERT, UPDATE, DELETE)                   │
│ - PROBLEM: Mixed with Layer 2 in service files                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP / WebSocket
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│ LAYER 4: EXTERNAL INTEGRATION                                       │
│ - Supabase Edge Functions                                           │
│ - MercadoPago API                                                    │
│ - Mapbox API                                                         │
│ - Third-party services                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Presentation Layer

### Location
`apps/web/src/app/features/**/*.page.ts`
`apps/web/src/app/shared/components/**/*.component.ts`

### Responsibilities

✅ **ALLOWED:**
- Render UI elements (templates)
- Handle user interactions (click, input events)
- Manage local UI state (modals, dropdowns, loading states)
- Subscribe to service signals for reactive updates
- Call service methods
- Navigate between routes
- Track analytics events

❌ **NOT ALLOWED:**
- Direct database access
- Business logic calculations
- Data transformations
- API calls
- RPC function calls
- Complex validation logic

### Example: CarDetailPage

**File:** `apps/web/src/app/features/cars/detail/car-detail.page.ts`

**Good Patterns:**
```typescript
export class CarDetailPage {
  // ✅ Inject services
  private readonly carsService = inject(CarsService);
  private readonly bookingsService = inject(BookingsService);

  // ✅ UI state as signals
  bookingInProgress = signal(false);
  bookingError = signal<string | null>(null);

  // ✅ Computed signals for UI logic
  totalPrice = computed(() => {
    const days = this.calculateDays();
    return this.car().price_per_day * days;
  });

  // ✅ Event handler delegates to service
  async onBookClick() {
    this.bookingInProgress.set(true);
    try {
      await this.bookingsService.createBookingWithValidation(...);
      await this.router.navigate(['/bookings/detail-payment']);
    } catch (error) {
      this.bookingError.set(error.message);
    } finally {
      this.bookingInProgress.set(false);
    }
  }
}
```

**Bad Patterns:**
```typescript
export class CarDetailPage {
  // ❌ Direct Supabase access in component
  async onBookClick() {
    const { data, error } = await this.supabase
      .from('bookings')
      .insert({ ... });  // NO! Should be in service
  }

  // ❌ Business logic in component
  calculateDiscount(price: number): number {
    if (this.user.isVip) return price * 0.9;  // NO! Should be in service
    return price;
  }
}
```

---

## Layer 2: Service / Business Logic Layer

### Location
`apps/web/src/app/core/services/**/*.service.ts`

### Responsibilities

✅ **ALLOWED:**
- Business logic and rules
- Data transformations
- Service orchestration
- State management (signals)
- RPC function calls
- Table queries
- Error handling
- Validation logic
- Caching strategies

❌ **NOT ALLOWED:**
- UI-specific logic (DOM manipulation)
- Direct template access
- Router navigation (can inject Router if needed)
- Hard-coded UI strings (use i18n)

### Current State: Mixed Concerns

**PROBLEM:** Services currently mix business logic with data access

**Example: BookingsService (Current)**

```typescript
// ⚠️ MIXED: Business logic + data access in same file
export class BookingsService {
  private readonly supabase = injectSupabase();

  // Business logic
  async createBookingWithValidation(carId, start, end) {
    // ✅ Validation (business logic)
    if (start >= end) throw new Error('Invalid dates');

    // ⚠️ Data access (should be in repository)
    const { data, error } = await this.supabase.rpc('request_booking', {
      p_car_id: carId,
      p_start: start,
      p_end: end
    });

    // ✅ Post-processing (business logic)
    if (data) {
      await this.insuranceService.activateCoverage(data.booking_id);
    }

    return data;
  }
}
```

---

## Layer 3: Data Access Layer (Proposed Separation)

### Current State: Implicit

Data access is **currently embedded within services** (Layer 2). For surgical code changes, consider separating into dedicated Repository pattern.

### Proposed: Repository Pattern

**Location (future):** `apps/web/src/app/core/repositories/**/*.repository.ts`

**Responsibilities:**

✅ **ALLOWED:**
- Direct Supabase client calls
- Table queries (SELECT, INSERT, UPDATE, DELETE)
- RPC function calls
- Query building
- Result mapping
- Caching at data layer

❌ **NOT ALLOWED:**
- Business logic
- Validation rules
- Service orchestration
- Complex calculations

### Example: BookingsRepository (Proposed)

```typescript
@Injectable({ providedIn: 'root' })
export class BookingsRepository {
  private readonly supabase = injectSupabase();

  // Pure data access - no business logic
  async createBooking(payload: CreateBookingPayload): Promise<Booking> {
    const { data, error } = await this.supabase.rpc('request_booking', {
      p_car_id: payload.carId,
      p_start: payload.start,
      p_end: payload.end
    });

    if (error) throw error;
    return this.mapToBooking(data);
  }

  async getBookingById(id: string): Promise<Booking | null> {
    const { data, error } = await this.supabase
      .from('bookings')
      .select('*, car:cars(*), insurance:booking_insurance_coverage(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapToBooking(data);
  }

  // Helper: Map DB model to domain model
  private mapToBooking(dbData: any): Booking {
    return {
      id: dbData.id,
      carId: dbData.car_id,
      // ... mapping logic
    };
  }
}
```

### Refactored Service Using Repository

```typescript
export class BookingsService {
  private readonly bookingsRepo = inject(BookingsRepository);
  private readonly insuranceService = inject(InsuranceService);

  // Business logic only - delegates data access to repository
  async createBookingWithValidation(carId, start, end) {
    // ✅ Validation (business logic)
    if (start >= end) throw new Error('Invalid dates');
    if (start < new Date()) throw new Error('Cannot book in past');

    // ✅ Data access via repository
    const booking = await this.bookingsRepo.createBooking({ carId, start, end });

    // ✅ Orchestration (business logic)
    try {
      await this.insuranceService.activateCoverage(booking.id);
    } catch (error) {
      this.logger.error('Insurance activation failed', error);
      // Non-blocking
    }

    return booking;
  }
}
```

---

## Layer 4: External Integration Layer

### Location
- `supabase/functions/**/*.ts` (Edge Functions)
- `apps/web/src/app/core/services/*-gateway.service.ts` (Gateway services)

### Responsibilities

✅ **ALLOWED:**
- HTTP API calls to external services
- Webhook handling
- External authentication flows
- Third-party SDK integrations
- API request/response transformations
- Retry logic
- Circuit breakers

❌ **NOT ALLOWED:**
- Business logic (belongs in Layer 2)
- UI logic (belongs in Layer 1)
- Direct database access (use Layer 3)

### Example: MercadoPagoBookingGatewayService

**File:** `apps/web/src/app/core/services/mercadopago-booking-gateway.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class MercadoPagoBookingGatewayService {
  // ✅ External API integration only
  async createPreference(booking: Booking): Promise<PreferenceResponse> {
    // ✅ Transform domain model to external API format
    const preferenceData = {
      items: [{
        id: booking.id,
        title: `Reserva ${booking.car.brand} ${booking.car.model}`,
        unit_price: booking.total_amount,
        currency_id: 'ARS'
      }],
      external_reference: booking.id,
      notification_url: this.webhookUrl
    };

    // ✅ Call Edge Function (which calls MercadoPago API)
    const { data, error } = await this.supabase.functions.invoke(
      'mercadopago-create-booking-preference',
      { body: preferenceData }
    );

    if (error) throw error;
    return data;
  }
}
```

### Example: mercadopago-webhook Edge Function

**File:** `supabase/functions/mercadopago-webhook/index.ts`

```typescript
serve(async (req) => {
  // ✅ External integration: Receive webhook
  const payload = await req.json();

  // ✅ Security validation (integration layer concern)
  await validateHmacSignature(req);
  await validateIpAddress(req);
  await checkRateLimit(req);

  // ✅ Call external API to fetch payment details
  const payment = await fetchMercadoPagoPayment(payload.data.id);

  // ✅ Call data layer to update database
  await supabase.rpc('wallet_confirm_deposit_admin', {
    p_transaction_id: payment.external_reference,
    p_provider_metadata: payment
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## Cross-Cutting Concerns

### Logging (LoggerService)

**Tier:** Foundation (0 dependencies)
**Used By:** All layers

```typescript
@Injectable({ providedIn: 'root' })
export class LoggerService {
  error(message: string, error: any): void {
    console.error(message, error);
    // Send to Sentry
  }

  info(message: string, data?: any): void {
    console.log(message, data);
  }
}
```

**Usage:**
- Layer 1 (UI): Log user actions, errors
- Layer 2 (Services): Log business logic errors, warnings
- Layer 3 (Data Access): Log database errors, slow queries
- Layer 4 (External): Log API errors, webhook failures

### Error Handling (ErrorHandlerService)

**Tier:** Core (2 dependencies: LoggerService, ToastService)
**Used By:** Services, Components

```typescript
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private readonly logger = inject(LoggerService);
  private readonly toast = inject(ToastService);

  handle(error: any, context?: string): void {
    this.logger.error(context || 'Error occurred', error);

    const userMessage = this.getUserFriendlyMessage(error);
    this.toast.error(userMessage);
  }
}
```

---

## Service Tier Classification (From DEPENDENCY_GRAPH.md)

### Tier 1: Foundation Layer (0-1 dependencies)
**Total:** 54 services (56.8%)

**Characteristics:**
- Infrastructure utilities
- No dependencies or single utility dependency
- Stable, rarely change
- Easy to test in isolation

**Examples:**
- SupabaseClientService (0 deps)
- LoggerService (0 deps)
- GeocodingService (0 deps)
- ProfileService (1 dep: SupabaseClientService)

**Change Impact:** LOW

### Tier 2: Core Layer (2-3 dependencies)
**Total:** 20 services (21.1%)

**Characteristics:**
- Business logic with targeted dependencies
- Moderate complexity
- Domain-specific logic
- Manageable coupling

**Examples:**
- AuthService (3 deps: SupabaseClientService, LoggerService, Router)
- WalletService (2 deps: SupabaseClientService, LoggerService)
- RiskCalculatorService (2 deps: FranchiseTableService, DriverProfileService)

**Change Impact:** MEDIUM

### Tier 3: Domain Layer (4-5 dependencies)
**Total:** 1 service (1.1%)

**Characteristics:**
- Complex domain operations
- Multiple service coordination
- Domain-specific algorithms

**Examples:**
- SettlementService (4 deps: SupabaseClientService, FgoV1_1Service, RiskMatrixService, FgoService)

**Change Impact:** HIGH

### Tier 4: Orchestration Layer (6+ dependencies)
**Total:** 2 services (2.1%)

**Characteristics:**
- High-level workflow orchestration
- Coordinates multiple services
- Complex business flows
- **⚠️ REFACTORING CANDIDATES**

**Examples:**
- **BookingsService** (7 deps): SupabaseClientService, WalletService, PwaService, InsuranceService, DriverProfileService, ErrorHandlerService, LoggerService
- **CheckoutPaymentService** (6 deps): BookingsService, PaymentsService, MercadoPagoBookingGatewayService, RiskCalculatorService, SupabaseClientService, LoggerService

**Change Impact:** CRITICAL

---

## Dependency Injection Patterns

### Pattern 1: Constructor Injection via `inject()`

**Usage:** 90% of services

```typescript
export class MyService {
  private readonly logger = inject(LoggerService);
  private readonly auth = inject(AuthService);

  // Methods...
}
```

**Advantages:**
- Type-safe at compile time
- Tree-shakeable in production
- Follows Angular 14+ best practices

### Pattern 2: Supabase Injection Helper

**Usage:** 40+ services

```typescript
export class MyService {
  private readonly supabase = injectSupabase();

  // Direct SupabaseClient access
}
```

**Why:**
- Reduces boilerplate
- Provides direct client access
- Consistent across codebase

### Pattern 3: Angular Framework Injections

**Usage:** Specific services needing Angular-provided injectables

```typescript
export class AuthService {
  private readonly router = inject(Router);
  // Navigate after login
}

export class MetaService {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  // SEO metadata
}
```

---

## Layer Isolation Guidelines

### Rule 1: Unidirectional Dependencies

**Allowed:**
```
Layer 1 (UI) → Layer 2 (Services) → Layer 3 (Data Access) → Layer 4 (External)
```

**Not Allowed:**
```
Layer 3 → Layer 2  ❌
Layer 2 → Layer 1  ❌
```

**Exception:** Cross-cutting concerns (logging, error handling) can be used by all layers

### Rule 2: No Circular Dependencies

**Current State:** ✅ NO CIRCULAR DEPENDENCIES DETECTED

**Maintain By:**
- Services should not inject services that inject them back
- Use events or signals for upward communication
- Consider facade pattern for complex bidirectional needs

### Rule 3: Single Responsibility Per Layer

**Layer 1 (UI):** Render and interact
**Layer 2 (Services):** Business logic and orchestration
**Layer 3 (Data Access):** Database queries
**Layer 4 (External):** API calls

**Bad Example:**
```typescript
// ❌ UI component with business logic
export class CarDetailPage {
  calculateInsurancePremium(carValue: number): number {
    const baseRate = 0.05;
    const riskMultiplier = carValue > 20000 ? 1.2 : 1.0;
    return carValue * baseRate * riskMultiplier;  // NO! Should be in service
  }
}
```

**Good Example:**
```typescript
// ✅ Service handles business logic
export class InsuranceService {
  calculatePremium(car: Car): number {
    const baseRate = 0.05;
    const riskMultiplier = car.value_usd > 20000 ? 1.2 : 1.0;
    return car.value_usd * baseRate * riskMultiplier;
  }
}

// ✅ Component delegates to service
export class CarDetailPage {
  premium = computed(() => this.insuranceService.calculatePremium(this.car()));
}
```

---

## Testing Strategy by Layer

### Layer 1 (UI Components)
- Unit tests: Mock all service dependencies
- Integration tests: Test with real services in TestBed
- E2E tests: Full user flows with Cypress/Playwright

### Layer 2 (Services)
- Unit tests: Mock Supabase client, external services
- Integration tests: Test with real Supabase (test database)
- Focus: Business logic correctness

### Layer 3 (Data Access - if separated)
- Unit tests: Mock Supabase responses
- Integration tests: Test against real database
- Focus: Query correctness, result mapping

### Layer 4 (External Integrations)
- Unit tests: Mock external APIs
- Integration tests: Test against sandbox APIs (MercadoPago sandbox)
- Focus: Request/response transformations, error handling

---

## Refactoring Priorities (from DEPENDENCY_GRAPH.md)

### Priority 1: Reduce BookingsService Coupling (7 deps → 3-4 deps)

**Current Problems:**
- Handles booking creation, wallet locking, insurance activation, driver profile access
- High blast radius on changes
- Difficult to test (7 mocks required)

**Proposed Solution:**
Create `BookingOrchestrationService` that delegates to domain services:

```typescript
// Keep BookingsService lean (data access only)
export class BookingsService {
  private readonly bookingsRepo = inject(BookingsRepository);  // Proposed

  async createBooking(data: BookingData): Promise<Booking> {
    return this.bookingsRepo.createBooking(data);
  }
}

// New orchestrator (business logic)
export class BookingOrchestrationService {
  private readonly bookings = inject(BookingsService);
  private readonly wallet = inject(WalletService);
  private readonly insurance = inject(InsuranceService);

  async processBookingRequest(request: BookingRequest): Promise<Booking> {
    // Orchestrate all operations
    await this.wallet.lockFunds(request.amount);
    const booking = await this.bookings.createBooking(request);
    await this.insurance.activateCoverage(booking.id);
    return booking;
  }
}
```

### Priority 2: Implement Payment Gateway Abstraction

**Current Problem:** Tight coupling to MercadoPago

**Proposed Solution:** Use Strategy pattern with PaymentGateway interface

```typescript
export interface PaymentGateway {
  createPreference(booking: Booking): Promise<PaymentPreference>;
  processPayment(intentId: string): Promise<PaymentResult>;
}

export class PaymentGatewayFactory {
  create(provider: 'mercadopago' | 'paypal'): PaymentGateway {
    // Factory logic
  }
}
```

### Priority 3: Extract Repository Pattern

**Proposed Structure:**
```
apps/web/src/app/core/
├── services/         (Business logic only)
│   ├── bookings.service.ts
│   ├── payments.service.ts
│   └── ...
├── repositories/     (Data access only - NEW)
│   ├── bookings.repository.ts
│   ├── payments.repository.ts
│   └── ...
└── models/
    └── index.ts
```

---

## Related Documentation

- **Service Dependencies:** See `docs/architecture/DEPENDENCY_GRAPH.md`
- **Domain Boundaries:** See `docs/architecture/DOMAIN_BOUNDARIES.md`
- **Flow Documentation:** See `docs/flows/` for end-to-end flows
- **Safe Change Guide:** See `docs/guides/SAFE_CHANGE_CHECKLIST.md`

---

**Last Verified:** 2025-11-06
