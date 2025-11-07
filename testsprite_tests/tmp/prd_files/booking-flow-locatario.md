# PRD: Booking Flow (Locatario)

**Document**: Product Requirements Document
**Feature**: Complete Booking Flow for Renters (Locatarios)
**Priority**: P0 (Critical - Core Business Flow)
**Status**: Approved
**Owner**: Product Team
**Created**: 2025-11-04
**Last Updated**: 2025-11-04

---

## 1. Overview

### 1.1 Feature Description
The booking flow allows registered users (locatarios/renters) to search for available cars, select rental dates, review pricing, and complete payment to reserve a vehicle for their desired period.

### 1.2 Problem Statement
Users need a seamless, trustworthy way to rent cars from verified owners. The booking process must be:
- **Simple**: Complete booking in <3 minutes
- **Transparent**: Clear pricing breakdown (no hidden fees)
- **Secure**: Payment processed safely through wallet or MercadoPago
- **Reliable**: Instant confirmation after successful payment

### 1.3 Success Criteria
- 60%+ conversion rate (car detail view → confirmed booking)
- <3 minutes average time to complete booking
- 95%+ payment success rate
- <5% booking cancellation rate due to UX issues

---

## 2. User Story

> As a **locatario** (renter), I want to **easily book a car for specific dates** so that I can **have reliable transportation during my trip without owning a vehicle**.

**Acceptance**:
- User can browse available cars on map/list
- User can see real-time availability for selected dates
- User can review complete pricing breakdown before payment
- User can pay via wallet balance or MercadoPago
- User receives instant confirmation after successful payment

---

## 3. Acceptance Criteria

- ✅ **AC1**: User can browse cars on interactive map with filters (location, dates, price range)
- ✅ **AC2**: User can view car details including photos, specs, owner rating, pricing
- ✅ **AC3**: User can select start/end dates and see dynamic price calculation
- ✅ **AC4**: Price breakdown shows: base price + insurance + platform fee = total
- ✅ **AC5**: User can choose payment method: wallet (if sufficient balance) or MercadoPago
- ✅ **AC6**: If wallet payment: funds deducted instantly, booking confirmed
- ✅ **AC7**: If MercadoPago: redirected to checkout, webhook confirms payment, booking updated
- ✅ **AC8**: User sees confirmed booking in "Mis Reservas" section
- ✅ **AC9**: Booking prevents double-booking (date overlap validation)
- ✅ **AC10**: User cannot book their own cars

---

## 4. User Flow (Step-by-Step)

### 4.1 Happy Path: Wallet Payment

**Prerequisites**: User is logged in, has sufficient wallet balance

1. **Browse Cars** (`/cars`)
   - **User action**: Navigates to /cars (default route)
   - **System response**: Displays Mapbox map with car markers
   - **UI state**: Map centered on user's location (or Buenos Aires), markers show available cars

2. **Apply Filters**
   - **User action**: Sets date range picker (start date, end date)
   - **System response**: Filters cars by availability, updates markers
   - **UI state**: Only available cars shown, unavailable cars hidden or greyed out

3. **Select Car**
   - **User action**: Clicks on map marker or car card
   - **System response**: Navigates to `/cars/{car_id}`
   - **UI state**: Car detail page loads with photos carousel, specs, owner info

4. **View Car Details** (`/cars/{car_id}`)
   - **User action**: Reviews car information, photos, owner rating
   - **System response**: Displays complete car details
   - **UI state**:
     - Photos carousel (swipeable)
     - Car specs: make, model, year, transmission, fuel type
     - Owner profile: name, rating, member since
     - "Reservar" button visible at bottom

5. **Initiate Booking**
   - **User action**: Clicks "Reservar" button
   - **System response**:
     - If dates not selected: Shows date picker modal
     - If dates selected: Navigates to booking summary
   - **UI state**: Date picker modal appears with calendar

6. **Select Dates**
   - **User action**: Selects start and end dates from calendar
   - **System response**:
     - Validates dates (future, no overlap with existing bookings)
     - Calculates total price
     - Displays price breakdown
   - **UI state**:
     - Unavailable dates greyed out in calendar
     - Selected dates highlighted
     - Price breakdown shown:
       ```
       Alquiler (3 días x $5,000/día)    $15,000
       Seguro básico                      $2,000
       Comisión de plataforma (10%)       $1,500
       ─────────────────────────────────────────
       Total                              $18,500
       ```

7. **Confirm Dates**
   - **User action**: Clicks "Continuar"
   - **System response**:
     - Creates booking in database (status: "pending_payment")
     - Navigates to `/bookings/{booking_id}/payment`
   - **UI state**: Payment page loads

8. **Review Booking Summary** (`/bookings/{booking_id}/payment`)
   - **User action**: Reviews booking details
   - **System response**: Displays complete summary
   - **UI state**:
     - Car photo and name
     - Dates: "Nov 10 - Nov 13 (3 días)"
     - Pickup/dropoff location
     - Price breakdown
     - Payment method selector (wallet / MercadoPago)

9. **Select Wallet Payment**
   - **User action**: Selects "Pagar con Wallet" option
   - **System response**: Shows wallet balance
   - **UI state**:
     - "Saldo disponible: $25,000" displayed
     - "Pagar $18,500" button enabled

10. **Confirm Payment**
    - **User action**: Clicks "Pagar $18,500"
    - **System response**:
      - Calls `wallet_lock_funds(booking_id, amount)`
      - Deducts funds from wallet balance
      - Updates booking status to "confirmed"
      - Creates wallet transaction record
    - **UI state**:
      - Loading spinner appears
      - Success message: "¡Reserva confirmada!"

11. **View Confirmation** (`/bookings/{booking_id}`)
    - **User action**: Automatically redirected
    - **System response**: Displays confirmed booking
    - **UI state**:
      - Status badge: "Confirmada"
      - Booking details
      - Owner contact button
      - "Ver comprobante" link
      - Calendar invite download option

12. **Check "Mis Reservas"** (`/bookings`)
    - **User action**: Navigates to bookings list
    - **System response**: Shows all user bookings
    - **UI state**: Confirmed booking appears in list

### 4.2 Alternative Flow: MercadoPago Payment

**Steps 1-9**: Same as wallet payment

10. **Select MercadoPago Payment**
    - **User action**: Selects "Pagar con Tarjeta" option
    - **System response**: Shows MercadoPago payment form
    - **UI state**:
      - MercadoPago SDK loads
      - Card form appears (card number, expiry, CVV)
      - Or "Continuar con MercadoPago" button (redirects to checkout)

11. **Enter Card Details / Redirect to MercadoPago**
    - **User action**:
      - Option A: Enters card details directly
      - Option B: Clicks "Continuar con MercadoPago"
    - **System response**:
      - Option A: Validates card via MercadoPago API
      - Option B: Creates payment preference, redirects to checkout
    - **UI state**:
      - Option A: Card form with real-time validation
      - Option B: Redirects to MercadoPago hosted checkout page

12. **Complete Payment at MercadoPago**
    - **User action**: Completes payment (enters card details, confirms)
    - **System response**:
      - MercadoPago processes payment
      - Sends IPN webhook to AutorentA
      - Webhook calls `wallet_confirm_deposit()` (if applicable)
      - Or updates booking status directly
    - **UI state**: MercadoPago shows payment processing

13. **Return from MercadoPago**
    - **User action**: Automatically redirected back to AutorentA
    - **System response**:
      - Checks booking status (should be "confirmed" if webhook processed)
      - If not yet confirmed, polls status for 30 seconds
    - **UI state**: "Procesando pago..." message

14. **View Confirmation**
    - Same as step 11 in wallet flow

### 4.3 Alternative Flow: Insufficient Wallet Balance

**Steps 1-9**: Same as wallet payment

10. **Select Wallet Payment (Insufficient Balance)**
    - **User action**: Selects "Pagar con Wallet" option
    - **System response**: Checks wallet balance
    - **UI state**:
      - "Saldo disponible: $10,000" displayed
      - Error message: "Saldo insuficiente. Necesitas $18,500."
      - "Depositar ahora" button appears
      - "Pagar $18,500" button disabled

11. **Deposit Funds**
    - **User action**: Clicks "Depositar ahora"
    - **System response**: Opens deposit modal or redirects to /wallet
    - **UI state**: Deposit flow (see wallet-deposit-flow.md)

12. **Return to Booking After Deposit**
    - **User action**: Completes deposit, navigates back to booking
    - **System response**: Refreshes wallet balance
    - **UI state**: "Pagar $18,500" button now enabled

### 4.4 Alternative Flow: Car No Longer Available

**Steps 1-6**: Same as happy path

7. **Attempt to Book (Dates Conflict)**
   - **User action**: Selects dates that overlap with another booking
   - **System response**:
     - Validates availability in real-time
     - Detects conflict
   - **UI state**:
     - Error message: "Las fechas seleccionadas ya no están disponibles"
     - Calendar updates to show conflicting dates as unavailable
     - "Continuar" button disabled

8. **Select Different Dates**
   - **User action**: Chooses different dates
   - **System response**: Re-calculates price, validates availability
   - **UI state**: If dates available, "Continuar" button enabled

---

## 5. Edge Cases

### 5.1 Edge Case 1: Insufficient Wallet Balance

**Description**: User tries to pay with wallet but has insufficient funds.

**Expected behavior**:
- Wallet balance displayed: "Saldo disponible: $10,000"
- Error message: "Saldo insuficiente. Necesitas $18,500 para completar esta reserva."
- "Pagar" button disabled
- "Depositar ahora" button appears → redirects to /wallet deposit flow

**Error message**:
```
Tu saldo actual es $10,000. Necesitas depositar $8,500 más para completar esta reserva.
```

### 5.2 Edge Case 2: Car Becomes Unavailable During Booking

**Description**: Another user books the same car while current user is filling payment details.

**Expected behavior**:
- When user tries to confirm payment, system validates availability again
- Booking creation fails with error
- Error message: "Lo sentimos, este auto ya fue reservado por otro usuario para estas fechas."
- User redirected back to car detail page
- Calendar updated to show new unavailable dates

**Error message**:
```
⚠️ Este auto ya no está disponible para las fechas seleccionadas.
Por favor elige otras fechas o busca otro vehículo.
```

### 5.3 Edge Case 3: Payment Fails at MercadoPago

**Description**: User's card is declined by MercadoPago.

**Expected behavior**:
- MercadoPago shows error: "Tarjeta rechazada"
- User can try different card
- Booking remains in "pending_payment" status
- After 30 minutes, booking auto-cancels if not paid
- User receives notification: "Tu reserva fue cancelada por falta de pago"

**Error message**:
```
No pudimos procesar tu pago. Por favor verifica los datos de tu tarjeta
o intenta con otro método de pago.
```

### 5.4 Edge Case 4: User Tries to Book Own Car

**Description**: User (who is also a car owner) tries to book their own car.

**Expected behavior**:
- "Reservar" button hidden or disabled on own car detail page
- If user tries to access `/bookings/create?car_id={own_car}` directly:
  - Error message displayed
  - Redirected back to car detail page

**Error message**:
```
No puedes reservar tu propio auto.
Si necesitas editar o desactivar tu publicación, ve a "Mis Autos".
```

### 5.5 Edge Case 5: Webhook Delayed (Payment Confirmed but Status Not Updated)

**Description**: MercadoPago processes payment successfully, but IPN webhook is delayed >30 seconds.

**Expected behavior**:
- User sees "Procesando pago..." for 30 seconds
- System polls booking status every 5 seconds
- If after 30 seconds status is still "pending_payment":
  - Show message: "Tu pago está siendo procesado. Te notificaremos cuando esté confirmado."
  - User can navigate away
  - When webhook arrives, booking updated to "confirmed"
  - User receives notification (email/push)

**Message**:
```
🕒 Tu pago está siendo procesado
Esto puede tardar unos minutos. Te notificaremos cuando tu reserva esté confirmada.
Puedes cerrar esta página y revisar el estado en "Mis Reservas".
```

### 5.6 Edge Case 6: Booking Less Than 24 Hours in Advance

**Description**: User tries to book a car with pickup time <24 hours from now.

**Expected behavior**:
- Calendar dates within next 24 hours are disabled (greyed out)
- If user somehow bypasses UI and submits booking <24h in advance:
  - Validation error
  - Error message displayed

**Error message**:
```
Las reservas deben realizarse con al menos 24 horas de anticipación.
Por favor selecciona una fecha de inicio a partir del [DATE].
```

**Note**: This rule can be configurable (currently hardcoded to 24h in business logic).

---

## 6. Technical Implementation

### 6.1 Frontend Components

**Components involved**:
- `cars-list.page.ts` - Displays car catalog and map
- `cars-map.component.ts` - Interactive Mapbox map with car markers
- `car-card.component.ts` - Car card in list view
- `car-detail.page.ts` - Car detail view with "Reservar" button
- `booking-detail-payment.page.ts` - Payment flow
- `simple-checkout.component.ts` - Wallet/MercadoPago payment selector
- `booking-detail.page.ts` - Confirmed booking view
- `my-bookings.page.ts` - User's bookings list

**Key Files**:
- `apps/web/src/app/features/cars/list/cars-list.page.ts`
- `apps/web/src/app/features/cars/detail/car-detail.page.ts`
- `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts`
- `apps/web/src/app/features/bookings/booking-detail/booking-detail.page.ts`

### 6.2 Backend Services

**Services involved**:
- `bookings.service.ts` - `createBooking()`, `getBookingById()`, `updateBookingStatus()`
- `cars.service.ts` - `getCarById()`, `getAvailability()`
- `wallet.service.ts` - `getBalance()`, `debitFunds()`, `lockFunds()`
- `payments.service.ts` - `createPaymentIntent()`, `confirmPayment()`
- `pricing.service.ts` - `calculateBookingPrice()`

**Key Methods**:

```typescript
// bookings.service.ts
async createBooking(carId: string, startDate: Date, endDate: Date): Promise<Booking>

// pricing.service.ts
async calculateBookingPrice(carId: string, days: number): Promise<PriceBreakdown>

// wallet.service.ts
async lockFunds(bookingId: string, amount: number): Promise<void>
```

### 6.3 Database Operations

**Tables affected**:
- `bookings` - CREATE new booking, UPDATE status
- `cars` - READ car details, availability
- `wallet_transactions` - CREATE transaction record (if wallet payment)
- `user_wallets` - UPDATE balance (debit funds)
- `payment_intents` - CREATE intent (if MercadoPago payment)

**Row counts**:
- INSERT: 1 booking, 0-1 transaction, 0-1 payment intent
- UPDATE: 1 booking status, 0-1 wallet balance
- SELECT: Multiple (car, availability, wallet balance)

### 6.4 RPC Functions / Edge Functions

**RPC Functions called**:
- `request_booking(car_id, start_date, end_date, user_id)`
  - Creates booking with validation
  - Checks availability (no overlapping bookings)
  - Checks user is not booking own car
  - Returns booking_id or error

- `wallet_lock_funds(booking_id, amount)`
  - Locks funds in user wallet
  - Creates pending transaction
  - Updates booking status to "confirmed" if successful

- `calculate_booking_price(car_id, start_date, end_date)`
  - Calculates: base price + insurance + platform fee
  - Returns price breakdown

**Edge Functions**:
- `mercadopago-create-booking-preference`
  - Input: `{ booking_id, amount, currency: 'ARS' }`
  - Output: `{ init_point, preference_id }`
  - Creates MercadoPago checkout URL

- `mercadopago-webhook`
  - Receives IPN from MercadoPago
  - Validates payment signature
  - Updates booking status to "confirmed"
  - Credits funds if applicable

**Edge Function Locations**:
- `supabase/functions/mercadopago-create-booking-preference/index.ts`
- `supabase/functions/mercadopago-webhook/index.ts`

### 6.5 External APIs

**Third-party services**:
- **MercadoPago API**
  - `POST /v1/checkout/preferences` - Create payment preference
  - `POST /v1/payments` - Process payment
  - Webhook: IPN notifications for payment status
  - Authentication: Bearer token in `MERCADOPAGO_ACCESS_TOKEN`

- **Mapbox API**
  - `/geocoding/v5` - Convert addresses to coordinates (not used in booking flow directly)
  - Map rendering (client-side, in `cars-map.component.ts`)

**API Keys Required**:
- `MERCADOPAGO_ACCESS_TOKEN` (Supabase secret)
- `MERCADOPAGO_PUBLIC_KEY` (Angular environment variable)
- `MAPBOX_ACCESS_TOKEN` (Angular environment variable)

---

## 7. Test Scenarios

### 7.1 Happy Path Tests

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| **T1** | Successful booking with wallet payment | 1. Login as locatario<br>2. Browse cars on /cars<br>3. Select car<br>4. Choose dates (3 days)<br>5. Review price breakdown<br>6. Pay with wallet | Booking created with status "confirmed"<br>Wallet balance deducted<br>User sees booking in "Mis Reservas" |
| **T2** | Successful booking with MercadoPago | 1. Login as locatario<br>2. Select car and dates<br>3. Choose MercadoPago payment<br>4. Complete payment at checkout<br>5. Return to AutorentA | Webhook processes payment<br>Booking status updated to "confirmed"<br>User sees confirmation |
| **T3** | View booking details after confirmation | 1. Create confirmed booking<br>2. Navigate to /bookings/{id} | Booking details displayed<br>Status badge shows "Confirmada"<br>Owner contact button visible |
| **T4** | Dynamic price calculation | 1. Select car<br>2. Choose different date ranges<br>3. Observe price updates | Price recalculates correctly:<br>- 1 day: $6,500 total<br>- 3 days: $18,500 total<br>- 7 days: $40,500 total |

### 7.2 Edge Case Tests

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| **E1** | Insufficient wallet balance | 1. Login with wallet balance $10,000<br>2. Try to book car for $18,500<br>3. Select wallet payment | Error message displayed<br>"Pagar" button disabled<br>"Depositar ahora" button shown |
| **E2** | Car booked by another user (race condition) | 1. User A starts booking<br>2. User B completes booking for same dates<br>3. User A tries to confirm | Validation error<br>"Car no longer available" message<br>User A redirected to car detail |
| **E3** | Payment fails at MercadoPago | 1. Select MercadoPago payment<br>2. Enter invalid/declined card<br>3. Submit payment | MercadoPago shows error<br>Booking remains "pending_payment"<br>User can retry with different card |
| **E4** | User tries to book own car | 1. Login as car owner<br>2. Navigate to own car detail<br>3. Attempt to book | "Reservar" button hidden/disabled<br>If accessed via URL: error message shown |
| **E5** | Webhook delayed >30 seconds | 1. Complete MercadoPago payment<br>2. Simulate webhook delay | "Procesando pago..." shown for 30s<br>Message: "Te notificaremos cuando esté confirmado"<br>When webhook arrives: booking updated |
| **E6** | Booking <24h in advance | 1. Try to select today or tomorrow<br>2. Attempt to book | Dates within 24h disabled in calendar<br>If bypassed: validation error |

### 7.3 Assertions (Playwright)

```typescript
// T1: Successful wallet payment
await expect(page.locator('[data-testid="booking-status"]')).toContainText('Confirmada');
await expect(page.locator('[data-testid="wallet-balance"]')).toContainText('$6,500'); // Original $25,000 - $18,500
await expect(page).toHaveURL(/\/bookings\/[a-z0-9-]+$/);

// E1: Insufficient balance
const errorMsg = page.locator('[role="alert"]');
await expect(errorMsg).toContainText(/saldo insuficiente/i);
await expect(page.locator('button:has-text("Pagar")')).toBeDisabled();
await expect(page.locator('button:has-text("Depositar")')).toBeVisible();

// T4: Price calculation
const total = page.locator('[data-testid="total-price"]');
await expect(total).toContainText('$18,500'); // 3 days
```

---

## 8. Dependencies

### 8.1 Technical Dependencies

**Services that must be available**:
- [x] Supabase Auth (user authentication)
- [x] Supabase Database (bookings, cars, wallet tables)
- [x] Supabase RPC Functions (`request_booking`, `wallet_lock_funds`)
- [x] Supabase Edge Functions (MercadoPago preference, webhook)
- [x] MercadoPago API (payment processing)
- [x] Mapbox API (map rendering)

**Configuration required**:
- [x] MercadoPago credentials in Supabase secrets
- [x] Webhook URL configured in MercadoPago dashboard
- [x] RLS policies for bookings table

### 8.2 Feature Dependencies

**Features that must be implemented first**:
- [x] User authentication and registration
- [x] Car listing and availability calendar
- [x] Wallet system with balance tracking
- [x] MercadoPago integration (payment preference, webhook)
- [x] Pricing calculation service

**Features that enhance but are not required**:
- [ ] Push notifications for booking confirmation (nice-to-have)
- [ ] Email confirmations (nice-to-have)
- [ ] Calendar export (.ics file) (nice-to-have)

### 8.3 Data Dependencies

**Data that must exist**:
- [x] At least one published car (status: "active")
- [x] Test user accounts (locatario role)
- [x] Test user with wallet balance >$20,000 (for wallet payment tests)
- [x] MercadoPago test credentials (for sandbox testing)

**Test data setup**:
```sql
-- Create test locatario
INSERT INTO profiles (id, email, role) VALUES
('test-locatario-id', 'test+locatario@autorentar.com', 'locatario');

-- Give wallet balance
INSERT INTO user_wallets (user_id, balance) VALUES
('test-locatario-id', 25000);

-- Ensure test car exists
INSERT INTO cars (id, owner_id, status, base_price_per_day) VALUES
('test-car-id', 'test-owner-id', 'active', 5000);
```

---

## 9. Security Considerations

### 9.1 Authentication & Authorization

**Who can access this feature?**
- [x] Authenticated users only
- [x] Users with role "locatario" or "ambos"
- [ ] Admin users (can view but not book)

**Authorization checks**:
- User must be authenticated to view booking pages
- User cannot book their own cars (validated in RPC function)
- User can only view/modify their own bookings (RLS policy)

**RLS Policies**:
```sql
-- Users can only view their own bookings (as locatario or locador)
CREATE POLICY "Users view own bookings" ON bookings
FOR SELECT USING (
  auth.uid() = locatario_id OR
  auth.uid() = (SELECT owner_id FROM cars WHERE id = car_id)
);

-- Only locatarios can create bookings
CREATE POLICY "Locatarios create bookings" ON bookings
FOR INSERT WITH CHECK (
  auth.uid() = locatario_id AND
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('locatario', 'ambos')
);
```

### 9.2 Data Validation

**Input validation required**:
- [x] **Car ID**: Must be valid UUID, car must exist and be active
- [x] **Dates**: Must be in future, end > start, no overlap with existing bookings
- [x] **Dates**: Start date must be at least 24 hours in future
- [x] **Payment amount**: Must match calculated price (prevent tampering)
- [x] **User ID**: Must match authenticated user (prevent booking as someone else)

**Validation rules**:
```typescript
// Date validation
if (startDate < addDays(new Date(), 1)) {
  throw new Error('Booking must be at least 24 hours in advance');
}

if (endDate <= startDate) {
  throw new Error('End date must be after start date');
}

// Price validation (server-side)
const calculatedPrice = await calculatePrice(carId, days);
if (submittedPrice !== calculatedPrice) {
  throw new Error('Price mismatch. Please refresh and try again.');
}
```

**SQL Injection Prevention**:
- [x] All queries use parameterized queries (Supabase SDK)
- [x] No raw SQL with user input

**XSS Prevention**:
- [x] Angular sanitizes all user inputs automatically
- [x] No `innerHTML` usage with unsanitized data

### 9.3 RLS Policies

**Row Level Security policies to enforce**:
- [x] Users can only create bookings for themselves (locatario_id = auth.uid())
- [x] Users can only view bookings where they are locatario or locador
- [x] Users cannot update booking status directly (only via RPC functions)
- [x] Wallet transactions are read-only from client (created via RPC)

**Policy examples**:
```sql
-- Prevent double booking
CREATE POLICY "No overlapping bookings" ON bookings
FOR INSERT WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.car_id = NEW.car_id
    AND b.status NOT IN ('cancelled', 'rejected')
    AND (
      (NEW.start_date, NEW.end_date) OVERLAPS (b.start_date, b.end_date)
    )
  )
);

-- Prevent booking own cars
CREATE POLICY "Cannot book own cars" ON bookings
FOR INSERT WITH CHECK (
  auth.uid() != (SELECT owner_id FROM cars WHERE id = NEW.car_id)
);
```

---

## 10. Performance Considerations

### 10.1 Expected Load

**Anticipated usage**:
- **Peak concurrent users**: 100 users browsing
- **Bookings per day**: 50-100 bookings
- **Requests per second**: 10 RPS (peak)
- **Database queries per booking**: ~15 queries (reads + writes)

**Calculation**:
- 100 bookings/day = ~4 bookings/hour = 1 booking every 15 minutes (average)
- Peak hours (evenings): 10 bookings/hour = 1 booking every 6 minutes

### 10.2 Optimization Requirements

**Performance targets**:
- [x] Car list page load time < 2 seconds
- [x] Car detail page load time < 1.5 seconds
- [x] Price calculation API response < 300ms
- [x] Booking creation (wallet payment) < 500ms
- [x] Booking creation (MercadoPago redirect) < 1 second
- [x] Payment confirmation (webhook) < 2 seconds

**Optimizations applied**:
- Map markers cluster for >50 cars (reduces DOM nodes)
- Car photos lazy-loaded (only load visible images)
- Price calculation cached for 5 minutes (same car + dates)
- Database indexes on `bookings(car_id, start_date, end_date)`

**Database indexes**:
```sql
CREATE INDEX idx_bookings_car_dates ON bookings(car_id, start_date, end_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_cars_status ON cars(status) WHERE status = 'active';
```

---

## 11. Success Metrics

### 11.1 Quantitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| **Booking conversion rate** | 60% | (Confirmed bookings / Car detail views) × 100 |
| **Payment success rate** | 95% | (Successful payments / Payment attempts) × 100 |
| **Average time to book** | < 3 minutes | Track time from car detail view to confirmation |
| **Wallet payment adoption** | 40% | (Wallet payments / Total payments) × 100 |
| **Booking cancellation rate** | < 5% | (Cancelled bookings / Total bookings) × 100 |
| **Repeat booking rate** | 30% | Users who book 2+ times in 6 months |

**Tracking**:
```typescript
// Google Analytics events
gtag('event', 'booking_started', { car_id, value: price });
gtag('event', 'booking_confirmed', { booking_id, payment_method, value: price });
gtag('event', 'booking_failed', { reason: 'insufficient_balance' });
```

### 11.2 Qualitative Metrics

**User feedback**:
- [x] User satisfaction survey score > 8/10
- [x] < 10% of users report confusion during booking process
- [x] NPS (Net Promoter Score) > 50

**Support tickets**:
- [x] < 5% of bookings result in support contact
- [x] < 1% of bookings disputed due to pricing errors

---

## 12. Rollout Plan

### 12.1 Phased Rollout

**Phase 1: Internal Testing** (Week 1)
- [ ] Deploy to staging environment
- [ ] Test with 5 internal team members
- [ ] Create 20 test bookings (wallet + MercadoPago)
- [ ] Fix critical bugs (payment failures, price calculation errors)
- [ ] Validate webhook reliability (100% success rate)

**Phase 2: Beta Testing** (Week 2)
- [ ] Deploy to production with feature flag
- [ ] Invite 20 beta users (10 locatarios, 10 locadores)
- [ ] Monitor booking conversion rate (target: >50%)
- [ ] Gather feedback via in-app survey
- [ ] Fix UX issues (confusing pricing, navigation problems)

**Phase 3: Soft Launch** (Week 3)
- [ ] Enable for 50% of users (A/B test)
- [ ] Monitor metrics daily:
  - Conversion rate
  - Payment success rate
  - Support tickets
- [ ] Iterate based on data

**Phase 4: Full Release** (Week 4)
- [ ] Enable feature for 100% of users
- [ ] Monitor metrics for 1 week
- [ ] If metrics meet targets: declare success
- [ ] If not: investigate and iterate

### 12.2 Rollback Plan

**Criteria for rollback**:
- [x] Payment success rate drops below 80%
- [x] Server errors exceed 5% of requests
- [x] Booking confirmation failures >10%
- [x] Critical security vulnerability discovered

**Rollback procedure**:
1. Disable feature flag in Supabase (instant)
2. Display maintenance message: "Reservas temporalmente no disponibles"
3. Investigate root cause
4. Fix issue in staging
5. Re-deploy when fixed and tested
6. Notify affected users via email

**Emergency contact**:
- On-call engineer: [Phone number]
- Supabase support: [Support link]
- MercadoPago support: [Support link]

---

## 13. Open Questions

**Unresolved issues**:

1. **Should we allow bookings less than 24 hours in advance?**
   - **Owner**: Product Team
   - **Due date**: 2025-11-10
   - **Current**: Blocked <24h, but some users may want last-minute bookings

2. **What happens if a locador cancels a confirmed booking?**
   - **Owner**: Legal Team
   - **Due date**: 2025-11-15
   - **Current**: Not implemented - need refund policy

3. **Should we charge cancellation fees for locatarios?**
   - **Owner**: Product + Finance Teams
   - **Due date**: 2025-11-20
   - **Current**: No cancellation fees, but may incentivize abuse

4. **Do we need insurance verification before booking?**
   - **Owner**: Legal + Insurance Partner
   - **Due date**: 2025-12-01
   - **Current**: Basic insurance included in price, but no verification of user's driver's license

5. **Should we integrate calendar sync (Google Calendar, iCal)?**
   - **Owner**: Product Team
   - **Due date**: 2026-01-15
   - **Priority**: P2 (nice-to-have)

---

## 14. Appendix

### 14.1 Mockups / Wireframes

[Link to Figma designs - TBD]

### 14.2 Related Documents

- [AutoRenta Architecture Overview](../../CLAUDE.md)
- [Wallet System Documentation](../../docs/archived/WALLET_SYSTEM_DOCUMENTATION.md)
- [MercadoPago Integration](../../docs/implementation/MERCADOPAGO_INTEGRATION.md)
- [Pricing Service Documentation](../../docs/implementation/PRICING_SERVICE.md)
- [TestSprite MCP Integration Spec](../../docs/implementation/TESTSPRITE_MCP_INTEGRATION_SPEC.md)

### 14.3 API Endpoints Reference

**RPC Functions**:
```sql
-- Create booking
SELECT request_booking(
  p_car_id := 'uuid',
  p_start_date := '2025-11-10',
  p_end_date := '2025-11-13',
  p_user_id := 'uuid'
);

-- Lock wallet funds
SELECT wallet_lock_funds(
  p_booking_id := 'uuid',
  p_amount := 18500
);

-- Calculate price
SELECT calculate_booking_price(
  p_car_id := 'uuid',
  p_start_date := '2025-11-10',
  p_end_date := '2025-11-13'
);
```

**Edge Functions**:
```bash
# Create MercadoPago preference
curl -X POST https://[project].supabase.co/functions/v1/mercadopago-create-booking-preference \
  -H "Authorization: Bearer [anon-key]" \
  -d '{"booking_id": "uuid", "amount": 18500}'
```

### 14.4 Price Breakdown Example

**Scenario**: 3-day rental, car price $5,000/day

```
Item                              Calculation         Amount
─────────────────────────────────────────────────────────────
Base rental (3 days)              3 × $5,000         $15,000
Insurance (basic)                 Fixed               $2,000
Platform fee (10%)                $17,000 × 0.10      $1,700
─────────────────────────────────────────────────────────────
Subtotal                                             $18,700
Tax (not applicable in Uruguay)                           $0
─────────────────────────────────────────────────────────────
TOTAL                                                $18,700
```

**Note**: Insurance and platform fee percentages are configurable in database (`platform_settings` table).

---

## 15. Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-04 | Claude Code | Initial PRD created from template |

---

## 16. Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Product Owner** | [Pending] | [ ] | [ ] |
| **Tech Lead** | [Pending] | [ ] | [ ] |
| **QA Lead** | [Pending] | [ ] | [ ] |
| **Design Lead** | [Pending] | [ ] | [ ] |

**Status**: 🟡 Draft → Pending approval

---

**End of PRD: Booking Flow (Locatario)**

---

## Usage with TestSprite

Once approved, generate tests automatically:

```bash
npx @testsprite/testsprite-mcp@latest generate-tests \
  --prd docs/prd/booking-flow-locatario.md \
  --output tests/e2e/booking-flow.spec.ts \
  --environment staging
```

Expected outcome:
- 15+ automated test scenarios
- 90%+ code coverage of booking flow
- Tests for happy path, edge cases, and error states
