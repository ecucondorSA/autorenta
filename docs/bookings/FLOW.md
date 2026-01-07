# Booking Flows

## Complete Booking Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft: User starts wizard
    Draft --> PendingPayment: Submit booking
    PendingPayment --> Confirmed: Payment received
    PendingPayment --> Cancelled: Payment timeout
    Confirmed --> InProgress: Check-in complete
    InProgress --> PendingReview: Check-out complete
    PendingReview --> Completed: Both parties confirm
    PendingReview --> Disputed: Dispute opened
    Disputed --> Resolved: Resolution reached
    Resolved --> Completed: Final confirmation

    Confirmed --> Cancelled: User/Owner cancels
    InProgress --> Cancelled: Emergency cancel
```

## 1. Booking Creation Flow (Wizard)

### Route: `/bookings/wizard?carId=xxx`

```mermaid
graph TD
    A[Start Wizard] --> B[Step 1: Dates & Location]
    B --> C[Step 2: Insurance Selection]
    C --> D[Step 3: Extras]
    D --> E[Step 4: Driver Details]
    E --> F[Step 5: Payment Config]
    F --> G[Step 6: Review & Terms]
    G --> H{Email Verified?}
    H -->|No| I[Block: Verify Email]
    H -->|Yes| J[Create Booking]
    J --> K[Navigate to Payment]
```

### Step Details

| Step | Component | Required Fields |
|------|-----------|-----------------|
| 1 | `BookingDatesStepComponent` | start_date, end_date, pickup_location |
| 2 | `BookingInsuranceStepComponent` | insurance_tier (basic/standard/premium) |
| 3 | `BookingExtrasStepComponent` | extras[] (optional) |
| 4 | `BookingDriverStepComponent` | license_number, license_expiry, emergency_contact |
| 5 | `BookingPaymentStepComponent` | payment_method, payment_plan |
| 6 | `BookingReviewStepComponent` | terms_accepted, cancellation_policy_accepted |

### Draft Persistence
```typescript
// Auto-saved to localStorage
key: `booking_draft_${carId}`
// Loaded on wizard init, cleared on submit
```

## 2. Payment Flow

### Route: `/bookings/:id/detail-payment` → `/bookings/:id/checkout`

```mermaid
sequenceDiagram
    participant U as User
    participant DP as DetailPayment
    participant CO as Checkout
    participant GW as MercadoPagoGateway
    participant EF as Edge Function
    participant MP as MercadoPago
    participant WH as Webhook
    participant DB as Database
    participant RT as Realtime
    participant SP as SuccessPage

    U->>DP: View guarantee details
    DP->>U: Show card hold, risk snapshot
    U->>DP: Accept pre-auth
    DP->>CO: Navigate to checkout

    U->>CO: Select provider (MercadoPago)
    CO->>GW: createBookingPreference()
    GW->>EF: POST /mercadopago-create-preference
    EF->>MP: Create preference (with FX)
    MP-->>EF: preference_id, init_point
    EF-->>GW: Return preference
    GW-->>CO: Redirect URL
    CO->>MP: User completes payment

    MP->>WH: IPN notification
    WH->>DB: Update booking status = confirmed
    DB->>RT: Broadcast change
    RT->>SP: Push update
    SP->>U: Show confirmation
```

### Payment Modes
- **Card**: Full payment via MercadoPago
- **Wallet**: Deduct from user wallet balance
- **Split**: Partial wallet + card

### Payment Plans
- **Full**: 100% now
- **50/50**: 50% now, 50% at check-in
- **Deposit**: 20% now, 80% 7 days before

## 3. Check-in / Check-out Flow

### Route: `/bookings/:id/check-in` (Renter) | `/bookings/:id/owner-check-in` (Owner)

```mermaid
graph TD
    subgraph Owner Check-in
        OC1[Owner arrives at handover]
        OC2[Upload vehicle photos]
        OC3[Record odometer & fuel]
        OC4[Submit inspection]
        OC1 --> OC2 --> OC3 --> OC4
    end

    subgraph Renter Check-in
        RC1[Wait for owner inspection]
        RC2[Review owner's photos]
        RC3[Upload renter's photos]
        RC4[Confirm vehicle condition]
        RC5[Start rental]
        RC1 --> RC2 --> RC3 --> RC4 --> RC5
    end

    OC4 --> RC1
```

### FGO v1.1 Inspection System
```typescript
interface BookingInspection {
  booking_id: string;
  inspection_type: 'checkin' | 'checkout';
  photos_url: string[];
  odometer_reading: number;
  fuel_level: number; // 0-100%
  damage_reported: boolean;
  notes?: string;
}
```

## 4. Return & Confirmation Flow

```mermaid
sequenceDiagram
    participant R as Renter
    participant O as Owner
    participant S as System
    participant W as Wallet

    R->>S: Complete check-out
    S->>S: Calculate km driven, fuel diff
    S->>O: Notify: Vehicle returned

    O->>S: owner_confirm(damages?)
    Note over O,S: Can report damages

    R->>S: renter_confirm()
    Note over R,S: Confirms payment release

    S->>S: Both confirmed?
    S->>W: confirm_and_release()
    W->>O: Transfer funds to owner wallet
    S->>R: Refund security deposit
    S->>S: Status = completed
```

### Bilateral Confirmation States
| State | Owner Confirmed | Renter Confirmed | Funds |
|-------|-----------------|------------------|-------|
| RETURNED | - | - | Locked |
| PENDING_OWNER | No | - | Locked |
| PENDING_RENTER | Yes | No | Locked |
| FUNDS_RELEASED | Yes | Yes | Released |

## 5. Dispute Resolution Flow

```mermaid
graph TD
    A[Booking Completed] --> B{Issue?}
    B -->|Yes| C[Open Dispute]
    C --> D[Admin Review]
    D --> E{Decision}
    E -->|Owner favor| F[Charge renter deposit]
    E -->|Renter favor| G[Full refund to renter]
    E -->|Partial| H[Split based on evidence]
    F --> I[Resolved]
    G --> I
    H --> I
    I --> J[Completed]
```

## 6. Extension Request Flow

```mermaid
sequenceDiagram
    participant R as Renter
    participant S as System
    participant O as Owner

    R->>S: Request extension (new_end_date)
    S->>S: Calculate additional cost
    S->>O: Notify: Extension request

    alt Owner Approves
        O->>S: Approve extension
        S->>R: Notify: Approved
        S->>R: Charge additional amount
        S->>S: Update booking end_date
    else Owner Rejects
        O->>S: Reject extension
        S->>R: Notify: Rejected
    end
```

## Key RPC Functions

| Function | Purpose |
|----------|---------|
| `request_booking` | Create booking with location |
| `create_booking_atomic` | Atomic creation with risk snapshot |
| `pricing_recalculate` | Recalculate after changes |
| `mark_as_returned` | Mark vehicle returned |
| `owner_confirm` | Owner confirmation |
| `renter_confirm` | Renter confirmation |
| `confirm_and_release` | Release funds |
| `wallet_charge_rental` | Charge from wallet |
| `wallet_lock_rental_and_deposit` | Lock security deposit |
