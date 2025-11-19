# Implementation Plan - Stabilize Renter Flow V3

## Goal Description
Stabilize the `feature/renter-flow-v3` branch by aligning it with the new "Golden Path" standards. This involves auditing the database schema for missing constraints, verifying RLS policies, and ensuring critical paths are covered by E2E tests.

## User Review Required
> [!IMPORTANT]
> This plan assumes the `tech-debt-remediation` changes are either already in `main` or accessible. If not, we will need to locate them.

## Proposed Changes

### Database & Security
#### [MODIFY] [supabase/migrations](file:///home/edu/autorenta/supabase/migrations)
- Audit `bookings` table for constraints (e.g., `check (end_date > start_date)`).
- Audit `wallets` table for constraints (e.g., `check (balance >= 0)`).
- Verify RLS policies for `bookings` and `wallets` to ensure renters can only see their own data.
- Create a new migration if any constraints or policies are missing.

### Backend (Edge Functions / Services)
#### [MODIFY] [apps/web/src/app/core/services](file:///home/edu/autorenta/apps/web/src/app/core/services)
- Verify `BookingsService` handles errors correctly and uses typed responses.
- Verify `WalletService` (if exists) or related logic handles negative balances gracefully.
- **[NEW]** Audit `risk-calculator.service.spec.ts`: Investigate and enable skipped tests (`xdescribe`) identified by user.

### Frontend (UI)
#### [MODIFY] [apps/web/src/app/features/bookings](file:///home/edu/autorenta/apps/web/src/app/features/bookings)
- Ensure UI handles "blocked funds" errors from the backend.

## Verification Plan

### Automated Tests
- **E2E Test**: Run `npm run test:e2e -- tests/renter/booking/payment-wallet.spec.ts` (or create if missing) to verify the booking flow with wallet payment.
- **SQL Test**: Run `npm run test:db` (if available) or manually execute SQL tests to verify constraints.

### Manual Verification
- **Booking Flow**:
    1. Login as a renter.
    2. Select a car.
    3. Attempt to book with insufficient funds (should fail gracefully).
    4. Attempt to book with sufficient funds (should succeed).
    5. Verify database state after booking (balance deducted, booking created).
