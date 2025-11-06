# PayPal + MercadoPago Multi-Provider Integration
## Status Report - Phase 4 Complete

**Date**: November 6, 2025
**Status**: **✅ Phase 1-4 COMPLETED** - Backend + Frontend Services Ready
**Progress**: **80% Complete** (Backend + Services done, UI components remaining)

---

## ✅ COMPLETED WORK

### Phase 1: Database Refactoring ✅ COMPLETED
- 7 SQL migrations created and ready for deployment
- Provider-agnostic schema (renamed `mp_*` columns to `provider_*`)
- PayPal enum added to `payment_provider`
- 15% platform fee standardized across all functions
- Configuration tables created (`platform_config`, `payment_provider_config`)

### Phase 2: RPC Functions ✅ COMPLETED
- 8 new/updated RPC functions
- Provider-agnostic split payment logic
- Centralized `prepare_booking_payment()` function
- All functions use 15% platform fee from config

### Phase 3: Supabase Edge Functions ✅ COMPLETED
- 4 PayPal Edge Functions created:
  - `paypal-create-order` - Booking payments with split support
  - `paypal-capture-order` - Order capture after approval
  - `paypal-webhook` - Event handler (PAYMENT.CAPTURE.COMPLETED, etc.)
  - `paypal-create-deposit-order` - Wallet deposits
- Shared `paypal-api.ts` utilities
- Rate limiting, signature verification, idempotency

### Phase 4: Frontend Services ✅ COMPLETED (NEW!)

#### 4.1. PaymentGateway Interface ✅
**File**: `apps/web/src/app/core/interfaces/payment-gateway.interface.ts`

**Interfaces Created**:
```typescript
// Main interfaces
export type PaymentProvider = 'mercadopago' | 'paypal' | 'mock';
export interface PaymentGateway { ... }
export interface WalletPaymentGateway { ... }
export interface PaymentPreferenceResponse { ... }
export interface WalletDepositResponse { ... }
```

**Purpose**: Unified interface for all payment providers

---

#### 4.2. PaymentGatewayFactory ✅
**File**: `apps/web/src/app/core/services/payment-gateway.factory.ts`

**Key Methods**:
```typescript
class PaymentGatewayFactory {
  createBookingGateway(provider: PaymentProvider): PaymentGateway
  createWalletGateway(provider: PaymentProvider): WalletPaymentGateway
  isBookingProviderAvailable(provider: PaymentProvider): boolean
  getAvailableBookingProviders(): PaymentProvider[]
}
```

**Usage Example**:
```typescript
// In components
const gateway = this.gatewayFactory.createBookingGateway('paypal');
gateway.createBookingPreference(bookingId).subscribe({
  next: (response) => gateway.redirectToCheckout(response.init_point)
});
```

**Benefits**:
- Centralizes gateway creation logic
- Easy to add new providers
- Supports dynamic provider switching
- Facilitates testing with mock providers

---

#### 4.3. PayPalBookingGatewayService ✅
**File**: `apps/web/src/app/core/services/paypal-booking-gateway.service.ts`

**Implements**: `PaymentGateway` interface

**Key Features**:
- Creates PayPal orders for bookings
- Captures orders after user approval
- Validates order status
- Handles split payments (85/15)
- Multi-currency support (ARS → USD conversion)

**Methods**:
```typescript
class PayPalBookingGatewayService implements PaymentGateway {
  readonly provider = 'paypal';

  createBookingPreference(bookingId: string, useSplitPayment?: boolean): Observable<PaymentPreferenceResponse>
  captureOrder(orderId: string): Observable<PayPalCaptureResponse>
  isPreferenceValid(orderId: string): Promise<boolean>
  redirectToCheckout(approvalUrl: string, openInNewTab?: boolean): void
}
```

**Integration Points**:
- Calls `/functions/v1/paypal-create-order` Edge Function
- Calls `/functions/v1/paypal-capture-order` Edge Function
- Queries `bookings` table for validation

---

#### 4.4. PayPalWalletGatewayService ✅
**File**: `apps/web/src/app/core/services/paypal-wallet-gateway.service.ts`

**Implements**: `WalletPaymentGateway` interface

**Key Features**:
- Creates PayPal orders for wallet deposits
- Verifies deposit completion
- USD-based deposits (no currency conversion)
- Tracks transaction status

**Methods**:
```typescript
class PayPalWalletGatewayService implements WalletPaymentGateway {
  readonly provider = 'paypal';

  createDepositOrder(amountUSD: number, transactionId: string): Observable<WalletDepositResponse>
  verifyDeposit(transactionId: string): Promise<boolean>
  getDepositStatus(transactionId: string): Promise<{ status, amount, currency }>
}
```

**Integration Points**:
- Calls `/functions/v1/paypal-create-deposit-order` Edge Function
- Queries `wallet_transactions` table

---

#### 4.5. MercadoPagoBookingGatewayService ✅ (Already Compatible!)
**File**: `apps/web/src/app/core/services/mercadopago-booking-gateway.service.ts`

**Current Status**: Already implements compatible interface structure

**Methods**:
```typescript
class MercadoPagoBookingGatewayService {
  createBookingPreference(bookingId: string): Observable<MercadoPagoPreferenceResponse>
  isPreferenceValid(preferenceId: string): Promise<boolean>
  redirectToCheckout(initPoint: string, openInNewTab?: boolean): void
}
```

**Minor Update Needed**: Add `readonly provider: PaymentProvider = 'mercadopago'` property to formally implement `PaymentGateway` interface (1-line change)

---

## 📊 Architecture Overview

### Service Layer Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Components (Checkout, Wallet, etc.)                     │
└───────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────┐
│  PaymentGatewayFactory                                   │
│  - createBookingGateway(provider)                        │
│  - createWalletGateway(provider)                         │
└───────────────────┬──────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌─────────────────┐   ┌─────────────────┐
│  MercadoPago    │   │  PayPal         │
│  Gateway        │   │  Gateway        │
│  - ARS currency │   │  - USD currency │
│  - Split 85/15  │   │  - Split 85/15  │
└────────┬────────┘   └────────┬────────┘
         │                     │
         ▼                     ▼
┌──────────────────────────────────────────┐
│  Supabase Edge Functions                 │
│  - mercadopago-create-booking-preference │
│  - paypal-create-order                   │
│  - paypal-capture-order                  │
└──────────────────────────────────────────┘
```

### Data Flow Example (PayPal Booking Payment)

```
1. User clicks "Pagar con PayPal"
   ↓
2. Component calls PaymentGatewayFactory.createBookingGateway('paypal')
   ↓
3. Factory returns PayPalBookingGatewayService instance
   ↓
4. Component calls gateway.createBookingPreference(bookingId, useSplit=true)
   ↓
5. Gateway calls Edge Function: POST /paypal-create-order
   ↓
6. Edge Function:
   - Validates booking ownership
   - Calls prepare_booking_payment() RPC
   - Converts ARS → USD using exchange_rates
   - Creates PayPal order with split payment (15% platform fee)
   - Returns approval_url
   ↓
7. Gateway returns PaymentPreferenceResponse to component
   ↓
8. Component calls gateway.redirectToCheckout(approval_url)
   ↓
9. User redirected to PayPal, approves payment
   ↓
10. PayPal sends webhook → Supabase Edge Function (paypal-webhook)
    ↓
11. Webhook:
    - Validates signature
    - Calls register_payment_split() RPC
    - Updates bookings.status = 'confirmed'
    - Creates payments record
    ↓
12. User redirected back to app
    ↓
13. Component shows success message
```

---

## 🎯 REMAINING WORK (Phase 5: UI Components)

### Phase 5.1: Create paypal-button Component
**Status**: ⏳ Pending

**Purpose**: Integrate PayPal JS SDK for embedded payment buttons

**Tasks**:
- [ ] Create component: `apps/web/src/app/shared/components/paypal-button/`
- [ ] Load PayPal JS SDK: `https://www.paypal.com/sdk/js?client-id=XXX&currency=USD`
- [ ] Render PayPal Smart Payment Buttons
- [ ] Handle approval flow (onApprove, onError, onCancel)
- [ ] Emit events to parent component

**Implementation Pattern**:
```typescript
@Component({
  selector: 'app-paypal-button',
  template: '<div id="paypal-button-container"></div>'
})
export class PayPalButtonComponent implements OnInit, AfterViewInit {
  @Input() bookingId!: string;
  @Input() useSplitPayment = false;
  @Output() onApprove = new EventEmitter<{ orderId: string }>();
  @Output() onError = new EventEmitter<Error>();

  private gatewayService = inject(PayPalBookingGatewayService);

  ngAfterViewInit() {
    this.loadPayPalSDK();
  }

  private renderPayPalButton() {
    paypal.Buttons({
      createOrder: (data, actions) => this.createOrder(),
      onApprove: (data, actions) => this.handleApproval(data.orderID)
    }).render('#paypal-button-container');
  }
}
```

---

### Phase 5.2: Update payment-method-selector Component
**Status**: ⏳ Pending

**File**: `apps/web/src/app/shared/components/payment-method-selector/`

**Tasks**:
- [ ] Add PayPal option to available methods
- [ ] Show currency indicator (USD for PayPal, ARS for MercadoPago)
- [ ] Display provider logos
- [ ] Handle provider selection event
- [ ] Show conversion preview (ARS ↔ USD)

**UI Mockup**:
```
┌────────────────────────────────────────┐
│  Seleccionar método de pago           │
├────────────────────────────────────────┤
│  ○ MercadoPago                         │
│    💳 Tarjeta, efectivo, saldo MP      │
│    💵 ARS (Pesos argentinos)           │
├────────────────────────────────────────┤
│  ● PayPal                              │
│    🌐 Tarjetas internacionales         │
│    💵 USD (Dólares)                    │
│    ℹ️  ~$1,500.00 ARS = $1.00 USD      │
└────────────────────────────────────────┘
```

---

### Phase 5.3: Update checkout Page for Provider Selection
**Status**: ⏳ Pending

**File**: `apps/web/src/app/features/bookings/checkout/checkout.page.ts`

**Tasks**:
- [ ] Add provider selection UI before payment
- [ ] Save selected provider in CheckoutStateService
- [ ] Use PaymentGatewayFactory to get correct gateway
- [ ] Handle provider-specific flows (capture for PayPal, redirect for MP)
- [ ] Show currency conversion info
- [ ] Update confirmation screen for multi-provider

**Implementation Pattern**:
```typescript
export class CheckoutPage {
  private gatewayFactory = inject(PaymentGatewayFactory);
  selectedProvider: PaymentProvider = 'mercadopago';

  processPayment() {
    const gateway = this.gatewayFactory.createBookingGateway(this.selectedProvider);

    gateway.createBookingPreference(this.bookingId, this.useSplitPayment).subscribe({
      next: (response) => {
        if (this.selectedProvider === 'paypal') {
          // PayPal flow: render button, capture after approval
          this.showPayPalButton(response);
        } else {
          // MercadoPago flow: redirect to checkout
          gateway.redirectToCheckout(response.init_point);
        }
      },
      error: (err) => this.handleError(err)
    });
  }
}
```

---

## 📦 Files Created (Phase 4 - Frontend)

```
apps/web/src/app/core/
├── interfaces/
│   └── payment-gateway.interface.ts          ← NEW (PaymentGateway, WalletPaymentGateway interfaces)
└── services/
    ├── payment-gateway.factory.ts            ← NEW (Factory for creating gateways)
    ├── paypal-booking-gateway.service.ts     ← NEW (PayPal booking payments)
    ├── paypal-wallet-gateway.service.ts      ← NEW (PayPal wallet deposits)
    └── mercadopago-booking-gateway.service.ts  (Already exists, compatible)
```

---

## 🧪 Testing Strategy (Frontend)

### Unit Tests (Services)

**PaymentGatewayFactory Tests**:
```typescript
describe('PaymentGatewayFactory', () => {
  it('should create MercadoPago gateway', () => {
    const gateway = factory.createBookingGateway('mercadopago');
    expect(gateway.provider).toBe('mercadopago');
  });

  it('should create PayPal gateway', () => {
    const gateway = factory.createBookingGateway('paypal');
    expect(gateway.provider).toBe('paypal');
  });

  it('should throw error for unsupported provider', () => {
    expect(() => factory.createBookingGateway('stripe')).toThrow();
  });
});
```

**PayPalBookingGatewayService Tests**:
```typescript
describe('PayPalBookingGatewayService', () => {
  it('should create booking order', (done) => {
    service.createBookingPreference('booking-123').subscribe({
      next: (response) => {
        expect(response.success).toBe(true);
        expect(response.provider).toBe('paypal');
        expect(response.approval_url).toContain('paypal.com');
        done();
      }
    });
  });

  it('should capture order', (done) => {
    service.captureOrder('order-123').subscribe({
      next: (response) => {
        expect(response.success).toBe(true);
        expect(response.status).toBe('COMPLETED');
        done();
      }
    });
  });
});
```

### Integration Tests (E2E)

**Multi-Provider Checkout Flow**:
```typescript
describe('Checkout with multiple providers', () => {
  it('should complete booking with PayPal', async () => {
    await page.goto('/checkout/booking-123');

    // Select PayPal
    await page.click('[data-testid="provider-paypal"]');

    // Click pay button
    await page.click('[data-testid="pay-button"]');

    // Wait for PayPal popup
    const popup = await page.waitForPopup();

    // Approve in PayPal sandbox
    await popup.click('#sandbox-approve-button');

    // Wait for redirect back
    await page.waitForURL('**/checkout/success');

    // Verify booking confirmed
    const status = await page.textContent('[data-testid="booking-status"]');
    expect(status).toContain('Confirmado');
  });
});
```

---

## 📋 Deployment Checklist (Updated)

### Backend Deployment ✅ READY
- [x] Migrations created (7 files)
- [x] RPC functions created (8 functions)
- [x] Edge Functions created (4 functions)
- [x] Shared utilities created (paypal-api.ts)
- [ ] Deploy migrations to production
- [ ] Deploy Edge Functions to Supabase
- [ ] Configure PayPal credentials (secrets)
- [ ] Configure webhook in PayPal Dashboard

### Frontend Deployment ⏳ IN PROGRESS
- [x] Interfaces created
- [x] Factory created
- [x] PayPal services created
- [x] MercadoPago service compatible
- [ ] Create UI components (Phase 5)
- [ ] Update existing pages for multi-provider
- [ ] Add provider selection UI
- [ ] Integrate PayPal JS SDK
- [ ] Test end-to-end flows
- [ ] Deploy to Cloudflare Pages

---

## 🎯 Next Immediate Steps

1. **Start Phase 5.1** - Create `paypal-button` component ⏳
   - Load PayPal JS SDK
   - Implement button rendering
   - Handle approval flow

2. **Update payment-method-selector** - Add PayPal option ⏳
   - Add provider selection logic
   - Show currency indicators
   - Display conversion preview

3. **Update checkout page** - Integrate factory ⏳
   - Use PaymentGatewayFactory
   - Handle provider-specific flows
   - Add multi-provider UI

4. **Testing** - E2E and unit tests ⏳
   - Test MercadoPago flow (regression)
   - Test PayPal flow (new)
   - Test provider switching

5. **Deployment** - Production rollout 🚀
   - Deploy backend migrations
   - Deploy Edge Functions
   - Deploy updated frontend
   - Monitor payment metrics

---

## 📊 Progress Summary

| Phase | Status | Files | Completion |
|-------|--------|-------|------------|
| Phase 1: Database | ✅ Complete | 7 migrations | 100% |
| Phase 2: RPC Functions | ✅ Complete | 2 migrations | 100% |
| Phase 3: Edge Functions | ✅ Complete | 4 functions + 1 util | 100% |
| **Phase 4: Frontend Services** | **✅ Complete** | **4 new files** | **100%** |
| Phase 5: UI Components | ⏳ Pending | 0/3 components | 0% |
| **Overall Progress** | **⚡ 80%** | **18 files created** | **4/5 phases done** |

---

## 💡 Key Achievements (Phase 4)

✅ **Provider-Agnostic Architecture**: Components can switch between MercadoPago and PayPal without code changes

✅ **Factory Pattern**: Centralizes gateway creation, easy to add new providers

✅ **Type-Safe Interfaces**: TypeScript interfaces ensure compile-time safety

✅ **Observable-Based**: Consistent RxJS patterns for all async operations

✅ **Error Handling**: Centralized error formatting in each gateway

✅ **Testing-Ready**: Mock providers supported via factory

---

**Last Updated**: November 6, 2025
**Next Phase**: UI Components (Phase 5)
**ETA to Complete**: 2-3 days (UI components + testing)
