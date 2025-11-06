# Domain Boundaries

**Last Updated:** 2025-11-06
**Purpose:** Define business domain boundaries for surgical code changes

---

## Overview

This document maps the business domains in AutoRenta and defines clear boundaries between them. Understanding domain boundaries is critical for:
- Making targeted changes without cross-domain side effects
- Understanding which services/tables belong to which domain
- Identifying acceptable vs problematic dependencies

---

## Domain Map

```
┌────────────────────────────────────────────────────────────────────┐
│ AUTH DOMAIN                                                         │
│ Users, Profiles, Authentication, Verification                      │
│ Services: AuthService, ProfileService, VerificationService         │
│ Tables: profiles, verification_documents                            │
│ Dependencies: NONE (foundation domain)                              │
└────────────────────────────────────────────────────────────────────┘
                             │
                             ↓ (all domains depend on Auth)
         ┌───────────────────┴───────────────────┐
         ↓                                       ↓
┌─────────────────────┐                ┌─────────────────────┐
│ CAR DOMAIN          │                │ WALLET DOMAIN       │
│ Vehicle management  │                │ User funds          │
│ - CarsService       │                │ - WalletService     │
│ - cars table        │                │ - user_wallets      │
│ Dependencies: Auth  │                │ Dependencies: Auth  │
└─────────────────────┘                └─────────────────────┘
         │                                       │
         └───────────────────┬───────────────────┘
                             ↓
                    ┌─────────────────────┐
                    │ BOOKING DOMAIN      │
                    │ Rental bookings     │
                    │ - BookingsService   │
                    │ - bookings table    │
                    │ Depends: Car, Wallet│
                    │          Insurance  │
                    └─────────────────────┘
                             │
                             ↓
                    ┌─────────────────────┐
                    │ PAYMENT DOMAIN      │
                    │ Payment processing  │
                    │ - PaymentsService   │
                    │ - payment_intents   │
                    │ Depends: Booking    │
                    │          Wallet     │
                    └─────────────────────┘
```

---

## Domain 1: Authentication & Profiles

### Purpose
Manage user identities, authentication, and profile data.

### Services

| Service | File | Responsibilities |
|---------|------|------------------|
| AuthService | `core/services/auth.service.ts` | Login, logout, session management |
| ProfileService | `core/services/profile.service.ts` | Profile CRUD, avatar upload |
| VerificationService | `core/services/verification.service.ts` | Identity verification checks |
| VerificationStateService | `core/services/verification-state.service.ts` | Verification state tracking |
| EmailVerificationService | `core/services/email-verification.service.ts` | Email verification |
| PhoneVerificationService | `core/services/phone-verification.service.ts` | Phone/SMS verification |
| FaceVerificationService | `core/services/face-verification.service.ts` | Facial recognition |
| IdentityLevelService | `core/services/identity-level.service.ts` | Identity levels (L1-L4) |

### Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User profile data | id, full_name, email, phone, avatar_url, role |
| `verification_documents` | ID documents | user_id, document_type, url, status |

### Storage Buckets

| Bucket | Purpose | Path Pattern |
|--------|---------|--------------|
| `avatars` | Profile photos | `{user_id}/{filename}` |
| `documents` | ID documents (private) | `{user_id}/{doc_type}/{filename}` |

### Dependencies

**Depends On:** NONE (foundation domain)

**Depended On By:** ALL OTHER DOMAINS

**Rule:** Auth domain should NOT depend on any business domain.

---

## Domain 2: Car Management

### Purpose
Manage vehicle listings, photos, and availability.

### Services

| Service | File | Responsibilities |
|---------|------|------------------|
| CarsService | `core/services/cars.service.ts` | Car CRUD, photo uploads |
| CarsCompareService | `core/services/cars-compare.service.ts` | Car comparison utilities |
| CarLocationsService | `core/services/car-locations.service.ts` | Car location management |
| GeocodingService | `core/services/geocoding.service.ts` | Address → lat/lng conversion |

### Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `cars` | Vehicle listings | id, owner_id, brand, model, price_per_day, status |
| `car_photos` | Car images | id, car_id, url, stored_path, position |
| `car_brands` | Brand catalog | id, name, country |
| `car_models` | Model catalog | id, brand_id, name, body_type |
| `car_features` | Feature catalog | id, name, category |

### Storage Buckets

| Bucket | Purpose | Path Pattern |
|--------|---------|--------------|
| `car-images` | Car photos (public) | `{user_id}/{car_id}/{filename}` |

### Dependencies

**Depends On:** Auth (for owner_id)

**Depended On By:** Booking, Risk

**Rule:** Car domain should NOT depend on Booking, Payment, or Wallet.

---

## Domain 3: Booking Management

### Purpose
Handle rental bookings, availability, and booking lifecycle.

### Services

| Service | File | Responsibilities |
|---------|------|------------------|
| BookingsService | `core/services/bookings.service.ts` | Booking CRUD, availability checks |
| BookingConfirmationService | `core/services/booking-confirmation.service.ts` | Booking confirmation logic |
| UrgentRentalService | `core/services/urgent-rental.service.ts` | Urgent rental handling |

### Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `bookings` | Rental bookings | id, car_id, renter_id, start_at, end_at, status, total_amount |
| `booking_details` | Extended booking info | booking_id, pickup_location, delivery_fee |
| `booking_risk_snapshot` | Risk snapshot at booking time | booking_id, fx_snapshot, franchise_usd, has_card |
| `booking_inspections` | Check-in/check-out evidence | id, booking_id, stage, photos, odometer, fuel_level |

### RPCs

| Function | Purpose |
|----------|---------|
| `request_booking` | Create booking with validation |
| `cancel_booking` | Cancel booking with refund logic |
| `pricing_recalculate` | Recalculate booking breakdown |

### Dependencies

**Depends On:**
- Auth (renter_id, owner_id)
- Car (car_id)
- Wallet (for locking funds)
- Insurance (for coverage activation)
- DriverProfile (for bonus-malus)

**Depended On By:** Payment, Settlement

**Rule:** Booking domain can depend on Car, Wallet, Insurance but should NOT depend on Payment.

---

## Domain 4: Payment Processing

### Purpose
Handle payment intents, gateways, and payment confirmation.

### Services

| Service | File | Responsibilities |
|---------|------|------------------|
| PaymentsService | `core/services/payments.service.ts` | Payment intent creation |
| CheckoutPaymentService | `core/services/checkout-payment.service.ts` | Payment checkout orchestration |
| PaymentGatewayFactory | `core/services/payment-gateway-factory.service.ts` | Gateway provider routing |
| MercadoPagoBookingGatewayService | `core/services/mercadopago-booking-gateway.service.ts` | MercadoPago integration |
| PayPalBookingGatewayService | `core/services/paypal-booking-gateway.service.ts` | PayPal integration |
| PaymentAuthorizationService | `core/services/payment-authorization.service.ts` | Payment auth checks |

### Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `payment_intents` | Payment records | id, booking_id, amount, status, provider, provider_payment_id |
| `payments` | Completed payments | id, booking_id, amount, payment_method, provider |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `mercadopago-create-booking-preference` | Create MP preference for booking |
| `mercadopago-webhook` | Process MP payment notifications |

### Dependencies

**Depends On:**
- Auth (user_id)
- Booking (booking_id)
- Wallet (for wallet payments)
- FX (for exchange rates)

**Depended On By:** NONE (terminal domain)

**Rule:** Payment domain should NOT be depended on by other domains (no circular dependencies with Booking).

---

## Domain 5: Wallet Management

### Purpose
Manage user wallet balances, transactions, deposits, withdrawals.

### Services

| Service | File | Responsibilities |
|---------|------|------------------|
| WalletService | `core/services/wallet.service.ts` | Balance, deposit, transactions |
| WithdrawalService | `core/services/withdrawal.service.ts` | Withdrawal requests |
| WalletLedgerService | `core/services/wallet-ledger.service.ts` | Transaction ledger |
| FxService | `core/services/fx.service.ts` | FX rate snapshots |
| ExchangeRateService | `core/services/exchange-rate.service.ts` | Currency exchange rates |

### Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user_wallets` | Wallet balances | user_id, available_balance, locked_balance, non_withdrawable_floor |
| `wallet_transactions` | Transaction log | id, user_id, type, amount, status, provider_transaction_id |
| `exchange_rates` | FX rates | currency_pair, rate, timestamp |

### RPCs

| Function | Purpose |
|----------|---------|
| `wallet_get_balance` | Get user wallet balance breakdown |
| `wallet_initiate_deposit` | Create pending deposit transaction |
| `wallet_confirm_deposit_admin` | Confirm deposit (from webhook) |
| `wallet_lock_funds` | Lock funds for booking |
| `wallet_unlock_funds` | Unlock funds (cancellation) |
| `wallet_charge` | Charge locked funds |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `mercadopago-create-preference` | Create MP preference for wallet deposit |
| `mercadopago-webhook` | Process deposit confirmations |

### Dependencies

**Depends On:**
- Auth (user_id)

**Depended On By:** Booking, Payment

**Rule:** Wallet domain should NOT depend on Booking or Payment (to avoid circular dependencies).

---

## Domain 6: Insurance & Claims

### Purpose
Insurance coverage, FGO (Fondo de Garantía), claims, settlements.

### Services

| Service | File | Responsibilities |
|---------|------|------------------|
| InsuranceService | `core/services/insurance.service.ts` | Insurance CRUD, coverage activation |
| SettlementService | `core/services/settlement.service.ts` | Settlement calculation, claim processing |
| FgoService | `core/services/fgo.service.ts` | FGO ledger operations (legacy) |
| FgoV1_1Service | `core/services/fgo-v1-1.service.ts` | FGO v1.1 eligibility & waterfall |

### Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `insurance_policies` | Policy definitions | id, name, coverage_amount, premium_rate |
| `booking_insurance_coverage` | Coverage per booking | id, booking_id, policy_id, premium |
| `booking_insurance_addon` | Additional coverage | id, coverage_id, addon_id, cost |
| `claims` | Insurance claims | id, booking_id, reported_by, total_estimated_cost_usd, status |
| `fgo_subfunds` | FGO balances | subfund_type, balance_cents |
| `fgo_movements` | FGO transaction log | id, booking_id, movement_type, amount_cents, operation |
| `fgo_parameters` | FGO operational params | country_code, bucket, alpha, rc_floor, event_cap_usd |

### RPCs

| Function | Purpose |
|----------|---------|
| `activate_insurance_coverage` | Activate insurance for booking |
| `report_insurance_claim` | Report incident/claim |
| `fgo_assess_eligibility` | Check if FGO covers claim |
| `fgo_execute_waterfall` | Execute 4-step payment waterfall |
| `calculate_pem` | Calculate monthly expected payout |
| `calculate_rc_v1_1` | Calculate coverage ratio (solvency) |

### Dependencies

**Depends On:**
- Auth (user_id)
- Booking (booking_id)
- Risk (RiskMatrixService, RiskCalculatorService)

**Depended On By:** Booking

**Rule:** Insurance domain can depend on Risk but should NOT depend on Payment or Wallet.

---

## Domain 7: Risk Assessment

### Purpose
Driver risk profiling, risk band calculation, bonus-malus system.

### Services

| Service | File | Responsibilities |
|---------|------|------------------|
| RiskService | `core/services/risk.service.ts` | Risk snapshot calculation |
| RiskCalculatorService | `core/services/risk-calculator.service.ts` | Risk scoring with distance logic |
| RiskMatrixService | `core/services/risk-matrix.service.ts` | Risk band mapping (economy/standard/premium/luxury) |
| DriverProfileService | `core/services/driver-profile.service.ts` | Driver-specific profile & bonus-malus |
| FranchiseTableService | `core/services/franchise-table.service.ts` | Deductible calculations |

### Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `driver_risk_profile` | Driver risk data | user_id, age, driving_experience_years, class |
| `risk_snapshots` | Risk at booking time | booking_id, driver_age, vehicle_value, daily_price |
| `bonus_malus_history` | Bonus-malus events | user_id, event_type, class_before, class_after, timestamp |

### Dependencies

**Depends On:**
- Auth (user_id)
- Car (for vehicle value risk bands)

**Depended On By:** Insurance, Booking

**Rule:** Risk domain should NOT depend on Booking, Payment, or Wallet.

---

## Cross-Domain Dependencies Summary

| Domain | Depends On | Depended On By |
|--------|------------|----------------|
| **Auth** | NONE | ALL |
| **Car** | Auth | Booking, Risk |
| **Booking** | Auth, Car, Wallet, Insurance, Risk | Payment, Insurance |
| **Payment** | Auth, Booking, Wallet | NONE |
| **Wallet** | Auth | Booking, Payment |
| **Insurance** | Auth, Booking, Risk | Booking |
| **Risk** | Auth, Car | Booking, Insurance |

---

## Domain Interaction Rules

### ✅ ALLOWED Dependencies

1. **Any Domain → Auth:** All domains can depend on Auth (foundation)
2. **Booking → Car:** Bookings need car details
3. **Booking → Wallet:** Bookings lock funds
4. **Booking → Insurance:** Bookings activate coverage
5. **Booking → Risk:** Bookings need risk assessment
6. **Payment → Booking:** Payments reference bookings
7. **Payment → Wallet:** Payments can use wallet
8. **Insurance → Risk:** Insurance premiums based on risk
9. **Insurance → Booking:** Insurance validates booking inspections
10. **Risk → Car:** Risk bands based on car value

### ❌ PROHIBITED Dependencies

1. **Auth → Any Business Domain:** Auth must remain independent
2. **Car → Booking:** Cars should not know about bookings
3. **Car → Payment:** Cars should not know about payments
4. **Wallet → Booking:** Wallet should not know about bookings (only fund locks)
5. **Wallet → Payment:** Wallet should not know about payment intents
6. **Payment → Insurance:** Payments should not trigger insurance logic
7. **Risk → Booking:** Risk should not know about booking lifecycle
8. **Risk → Payment:** Risk should not know about payments
9. **Risk → Wallet:** Risk should not know about wallet balances

---

## Domain Change Impact Matrix

| Change Domain | Affects Domains |
|---------------|-----------------|
| **Auth** | ALL (critical) |
| **Car** | Booking, Risk |
| **Booking** | Payment, Insurance |
| **Payment** | NONE (terminal) |
| **Wallet** | Booking, Payment |
| **Insurance** | Booking |
| **Risk** | Booking, Insurance |

**Rule:** Changes in domains listed in "Affects Domains" column require testing those domains.

---

## Related Documentation

- **Service Dependencies:** See `docs/architecture/DEPENDENCY_GRAPH.md`
- **Domain Dependency Matrix:** See `docs/architecture/DOMAIN_DEPENDENCY_MATRIX.md`
- **Layer Separation:** See `docs/architecture/LAYER_SEPARATION.md`
- **Flow Documentation:** See `docs/flows/` for cross-domain flows

---

**Last Verified:** 2025-11-06
