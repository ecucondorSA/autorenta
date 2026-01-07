# Bookings API Reference

## BookingsService

**Location:** `apps/web/src/app/core/services/bookings/bookings.service.ts`

### Core Methods

#### Create Booking
```typescript
// With location data and delivery fees
async requestBookingWithLocation(data: BookingRequestData): Promise<Booking>

// Atomic creation with risk snapshot (prevents phantom bookings)
async createBookingAtomic(data: CreateBookingAtomicData): Promise<Booking>
```

#### Read Bookings
```typescript
// Get user's bookings (as renter)
async getMyBookings(options?: PaginationOptions): Promise<Booking[]>

// Get owner's bookings
async getOwnerBookings(options?: PaginationOptions): Promise<Booking[]>

// Get single booking with full details
async getBookingById(id: string): Promise<Booking | null>

// Get booking for owner view
async getOwnerBookingById(id: string): Promise<Booking | null>
```

#### Update Booking
```typescript
// Update booking fields
async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking>

// Recalculate pricing after changes
async recalculatePricing(bookingId: string): Promise<PricingBreakdown>

// Mark as paid with payment intent
async markAsPaid(bookingId: string, paymentIntentId: string): Promise<void>
```

### Delegated Services

#### BookingWalletService
```typescript
// Charge rental from wallet
async chargeRentalFromWallet(bookingId: string, amount: number): Promise<void>

// Lock security deposit
async lockSecurityDeposit(bookingId: string, amount: number): Promise<string>

// Release locked deposit
async releaseSecurityDeposit(bookingId: string): Promise<void>

// Deduct from deposit (for damages)
async deductFromSecurityDeposit(bookingId: string, amount: number, reason: string): Promise<void>
```

#### BookingConfirmationService
```typescript
// Mark vehicle as returned
async markAsReturned(bookingId: string): Promise<void>

// Owner confirms (can report damages)
async ownerConfirm(bookingId: string, damages?: DamageReport): Promise<void>

// Renter confirms payment release
async renterConfirm(bookingId: string): Promise<void>

// Release funds when both confirm
async confirmAndRelease(bookingId: string): Promise<ConfirmAndReleaseResponse>
```

#### BookingStateMachineService
```typescript
// Derive canonical state from booking data
deriveState(booking: Booking): BookingState

// Check if transition is valid
canTransition(from: BookingState, to: BookingState): boolean

// Get available actions for role
getAvailableActions(state: BookingState, role: 'owner' | 'renter'): string[]
```

---

## Supabase RPC Functions

### Booking Creation
```sql
-- Create booking with location
request_booking(
  p_car_id UUID,
  p_start_at TIMESTAMP,
  p_end_at TIMESTAMP,
  p_pickup_lat NUMERIC,
  p_pickup_lng NUMERIC,
  p_dropoff_lat NUMERIC,
  p_dropoff_lng NUMERIC,
  p_insurance_tier TEXT,
  p_extras JSONB,
  p_payment_mode TEXT,
  p_promo_code TEXT
) RETURNS bookings

-- Atomic creation (production recommended)
create_booking_atomic(
  p_booking_data JSONB,
  p_risk_snapshot JSONB
) RETURNS bookings
```

### Pricing
```sql
-- Recalculate pricing breakdown
pricing_recalculate(
  p_booking_id UUID
) RETURNS pricing_breakdown

-- Get dynamic price for dates
calculate_dynamic_price(
  p_car_id UUID,
  p_start_at TIMESTAMP,
  p_end_at TIMESTAMP
) RETURNS JSONB
```

### Confirmation Flow
```sql
-- Mark vehicle returned
mark_as_returned(
  p_booking_id UUID
) RETURNS VOID

-- Owner confirmation
owner_confirm(
  p_booking_id UUID,
  p_damage_amount NUMERIC DEFAULT 0,
  p_damage_reason TEXT DEFAULT NULL
) RETURNS VOID

-- Renter confirmation
renter_confirm(
  p_booking_id UUID
) RETURNS VOID

-- Release funds (called when both confirm)
confirm_and_release(
  p_booking_id UUID
) RETURNS confirm_release_response
```

### Wallet Operations
```sql
-- Charge from wallet
wallet_charge_rental(
  p_booking_id UUID,
  p_amount NUMERIC
) RETURNS wallet_transaction

-- Record payment received
wallet_record_rental_payment(
  p_booking_id UUID,
  p_amount NUMERIC
) RETURNS wallet_transaction

-- Lock funds for deposit
wallet_lock_rental_and_deposit(
  p_booking_id UUID,
  p_rental_amount NUMERIC,
  p_deposit_amount NUMERIC
) RETURNS wallet_lock

-- Unlock funds
wallet_unlock_funds(
  p_lock_id UUID
) RETURNS VOID
```

---

## Edge Functions

### Payment Functions

#### Create Booking Preference
```typescript
// POST /functions/v1/mercadopago-create-booking-preference
interface Request {
  bookingId: string;
  useSplitPayment?: boolean;
}

interface Response {
  preference_id: string;
  init_point: string; // Checkout URL
  sandbox_init_point: string;
}
```

#### Process Payment
```typescript
// POST /functions/v1/mercadopago-process-booking-payment
interface Request {
  bookingId: string;
  token: string; // Card token
  payment_method_id: string;
  issuer_id: string;
  installments: number;
}

interface Response {
  status: 'approved' | 'pending' | 'rejected';
  payment_id: string;
}
```

#### Webhook Handler
```typescript
// POST /functions/v1/mercadopago-webhook
// Handles IPN notifications from MercadoPago
// Updates booking status automatically
```

### Document Functions

#### Generate Contract PDF
```typescript
// POST /functions/v1/generate-booking-contract-pdf
interface Request {
  bookingId: string;
  language?: 'es' | 'en';
}

interface Response {
  pdf_url: string;
  expires_at: string;
}
```

---

## TypeScript Types

### Booking
```typescript
interface Booking {
  id: string;
  car_id: string;
  renter_id: string;
  owner_id: string;

  // Dates
  start_at: string;
  end_at: string;
  returned_at?: string;
  paid_at?: string;

  // Status
  status: BookingStatus;
  completion_status?: string;

  // Pricing
  total_amount: number;
  currency: string;
  price_per_day: number;

  // Payment
  payment_intent_id?: string;
  payment_mode: PaymentMode;

  // Wallet/Security
  wallet_lock_id?: string;
  wallet_status?: string;

  // Insurance
  insurance_coverage_id?: string;
  coverage_upgrade?: CoverageUpgrade;

  // Location
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  delivery_required: boolean;
  delivery_fee_cents?: number;

  // Confirmations
  owner_confirmed_delivery: boolean;
  renter_confirmed_payment: boolean;
  funds_released_at?: string;

  // Disputes
  dispute_open_at?: string;
  dispute_status?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}
```

### Status Types
```typescript
type BookingStatus =
  | 'pending'
  | 'pending_payment'
  | 'pending_approval'
  | 'confirmed'
  | 'in_progress'
  | 'pending_review'
  | 'disputed'
  | 'resolved'
  | 'completed'
  | 'cancelled'
  | 'cancelled_owner'
  | 'cancelled_renter'
  | 'cancelled_system'
  | 'expired'
  | 'rejected'
  | 'no_show';

type PaymentMode = 'card' | 'wallet' | 'bank_transfer' | 'split';

type CoverageUpgrade = 'standard' | 'premium50' | 'zero';

type BookingState =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'RETURNED'
  | 'PENDING_OWNER'
  | 'PENDING_RENTER'
  | 'FUNDS_RELEASED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';
```

### Request Types
```typescript
interface BookingRequestData {
  car_id: string;
  start_at: string;
  end_at: string;
  pickup_location: Location;
  dropoff_location?: Location;
  insurance_tier: 'basic' | 'standard' | 'premium';
  extras?: string[];
  payment_mode: PaymentMode;
  payment_plan: 'full' | 'split_50_50' | 'deposit_20';
  promo_code?: string;
  driver_license: DriverLicense;
  emergency_contact: EmergencyContact;
}

interface Location {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  province?: string;
}

interface DriverLicense {
  number: string;
  expiry: string;
  front_url?: string;
  back_url?: string;
}

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}
```
