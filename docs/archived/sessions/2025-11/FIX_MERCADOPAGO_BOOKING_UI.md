# Fix: MercadoPago Booking UI Issue

## Problem

Users were unable to initiate bookings with MercadoPago payment method due to the booking detail payment page becoming stuck or unresponsive. This prevented testing of the delayed webhook behavior.

## Root Cause Analysis

### Issue 1: Page Hangs on Initialization Failures

The booking detail payment page (`booking-detail-payment.page.html:163`) had a strict conditional that hides the entire booking form if ANY required snapshot fails to load:

```html
@if (
  bookingInput() && fxSnapshot() && riskSnapshot() && priceBreakdown() && bookingDates();
  as dates
) {
  <!-- All booking UI content including payment form -->
}
```

If any of these conditions are falsy:
- `bookingInput()` - Booking input data
- `fxSnapshot()` - Exchange rate data
- `riskSnapshot()` - Risk analysis data
- `priceBreakdown()` - Price calculation
- `bookingDates()` - Booking dates

The user would see:
1. A loading spinner (if still loading)
2. An error message (if error was set)
3. Or nothing/blank page (if loading finished but snapshots failed silently)

**Result**: User cannot proceed with booking, cannot retry, and gets no clear indication of what failed.

### Issue 2: No Timeout on External Service Calls

The `loadFxSnapshot()` method calls `fxService.getFxSnapshot()` without any timeout:

```typescript
const snapshot = await firstValueFrom(this.fxService.getFxSnapshot('USD', 'ARS'));
```

If this service hangs or is slow:
- Page shows loading spinner indefinitely
- User cannot interact with the page
- LCP (Largest Contentful Paint) becomes extremely high (observed: 33.19s)

### Issue 3: No Retry Mechanism

When initialization failed, users had no way to retry without:
1. Refreshing the entire page
2. Going back and starting over
3. Clearing browser cache/storage

## Solutions Implemented

### Fix 1: Added Retry Button to Error State

**File**: `booking-detail-payment.page.html`

Added a "Reintentar" (Retry) button to the error message display that allows users to retry initialization without leaving the page:

```html
<button
  type="button"
  (click)="retryInitialization()"
  class="mt-3 inline-flex items-center px-3 py-1.5 border border-red-300 ..."
>
  <svg class="w-4 h-4 mr-1.5" ...>...</svg>
  Reintentar
</button>
```

**Benefits**:
- Users can recover from transient network errors
- No need to navigate away and lose booking data
- Faster recovery time

### Fix 2: Implemented retryInitialization() Method

**File**: `booking-detail-payment.page.ts`

Added a new method to allow re-running the initialization sequence:

```typescript
/**
 * Retry initialization of snapshots and data
 */
protected async retryInitialization(): Promise<void> {
  this.error.set(null);
  await this.initializeSnapshots();
}
```

### Fix 3: Enhanced Error Messages with Diagnostics

**File**: `booking-detail-payment.page.ts`

Improved error handling in `initializeSnapshots()` to provide specific diagnostic information:

```typescript
catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Error desconocido';
  let detailedError = 'Error al inicializar cálculos de reserva: ' + message;

  // Add diagnostic information
  if (!this.fxSnapshot()) {
    detailedError += ' (No se pudo obtener el tipo de cambio)';
  } else if (!this.riskSnapshot()) {
    detailedError += ' (No se pudo calcular el análisis de riesgo)';
  } else if (!this.priceBreakdown()) {
    detailedError += ' (No se pudo calcular el precio final)';
  }

  console.error('Initialization error:', err);
  this.error.set(detailedError);
}
```

**Benefits**:
- Users see exactly which step failed
- Developers get detailed console logs
- Easier debugging and support

### Fix 4: Added Timeout to FX Service Call

**File**: `booking-detail-payment.page.ts`

Implemented a 10-second timeout for the FX snapshot call to prevent indefinite hangs:

```typescript
private async loadFxSnapshot(): Promise<void> {
  this.loadingFx.set(true);
  try {
    // Add timeout to prevent hanging forever (10 seconds)
    const fxPromise = firstValueFrom(this.fxService.getFxSnapshot('USD', 'ARS'));
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout obteniendo tipo de cambio')), 10000);
    });

    const snapshot = await Promise.race([fxPromise, timeoutPromise]);
    if (!snapshot) {
      throw new Error('No se pudo obtener tipo de cambio');
    }
    this.fxSnapshot.set(snapshot);
  } catch (err: unknown) {
    throw err;
  } finally {
    this.loadingFx.set(false);
  }
}
```

**Benefits**:
- Page responds within 10 seconds max
- Prevents 33+ second loading times
- Users get clear timeout error message
- Can retry with the new retry button

## Testing the Fix

### Before Fix
- User navigates to booking detail payment page
- FX service hangs or times out
- Page shows loading spinner for 30+ seconds
- Eventually shows error or blank page
- User cannot proceed or retry easily
- LCP: 33.19s (terrible)

### After Fix
- User navigates to booking detail payment page
- If FX service is slow, timeout occurs after 10s
- Clear error message shows: "Error al inicializar cálculos de reserva: Timeout obteniendo tipo de cambio (No se pudo obtener el tipo de cambio)"
- User clicks "Reintentar" button
- Initialization retries
- If successful, page loads and user can proceed
- Expected LCP: < 5s (significant improvement)

## Impact on Webhook Testing

With this fix, users can now:
1. Successfully navigate through the booking flow
2. Authorize their card via MercadoPago form
3. Click "Confirmar y pagar" to create booking
4. Get redirected to MercadoPago checkout
5. Complete payment
6. Test delayed webhook scenarios

The UI no longer blocks the booking initiation process, allowing comprehensive testing of the MercadoPago webhook behavior.

## Files Modified

1. `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.html`
   - Added retry button to error state (lines 157-166)

2. `apps/web/src/app/features/bookings/booking-detail-payment/booking-detail-payment.page.ts`
   - Added `retryInitialization()` method (lines 770-773)
   - Enhanced error messages in `initializeSnapshots()` (lines 538-553)
   - Added timeout to `loadFxSnapshot()` (lines 559-578)

## Future Improvements

Consider implementing:
1. Retry with exponential backoff for network calls
2. Cached FX rates with fallback values
3. Progressive loading (show form with estimated values while loading actual data)
4. Better loading state indicators (skeleton screens)
5. Offline mode support with cached data
