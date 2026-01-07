# Troubleshooting Guide

## Common Issues

### 1. Booking Creation Fails

#### Symptoms
- Error message: "No se pudo crear la reserva"
- Console error: `createBookingAtomic failed`

#### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Email not verified | User must verify email before booking |
| Car not available | Check car availability for dates |
| Pricing lock expired | Refresh prices and retry |
| Database constraint | Check RPC function logs in Supabase |

#### Debug Steps
```typescript
// Enable debug logging
this.logger.setLevel('debug');

// Check booking request data
console.log('Booking request:', bookingData);

// Check Supabase RPC response
const { data, error } = await supabase.rpc('create_booking_atomic', params);
if (error) console.error('RPC Error:', error);
```

### 2. Payment Not Confirming

#### Symptoms
- User stuck on "Procesando pago..."
- Payment shows as pending indefinitely
- Success page polling timeout

#### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Webhook not received | Check MercadoPago webhook config |
| Realtime disconnected | Check WebSocket connection |
| Edge function error | Check Supabase Edge Function logs |
| Rate limit hit | Wait 60 seconds and retry |

#### Debug Steps
```bash
# Check Edge Function logs
supabase functions logs mercadopago-webhook --project-ref <ref>

# Check if webhook is configured
curl -X GET "https://api.mercadopago.com/v1/webhooks" \
  -H "Authorization: Bearer $MP_ACCESS_TOKEN"
```

### 3. Real-time Updates Not Working

#### Symptoms
- Booking status doesn't update automatically
- Need to refresh page to see changes
- Console shows WebSocket errors

#### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Subscription not active | Verify `subscribeToBooking()` called |
| Channel limit reached | Reduce concurrent subscriptions |
| Auth token expired | Re-authenticate user |
| RLS policy blocking | Check Supabase RLS policies |

#### Debug Steps
```typescript
// Check subscription status
console.log('Active channels:', this.activeChannels.size);

// Monitor connection status
this.bookingRealtime.subscribeToBooking(id, {
  onConnectionChange: (status) => {
    console.log('Connection status:', status);
  }
});

// Check browser DevTools
// Network → WS → Messages
```

### 4. Check-in/Check-out Fails

#### Symptoms
- "Error al guardar inspeccion"
- Photos not uploading
- Inspection stuck in "pending"

#### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Photo too large | Compress images client-side |
| Storage quota exceeded | Check Supabase Storage limits |
| Missing permissions | Verify Storage bucket RLS |
| Owner hasn't checked in | Owner must check-in first |

#### Debug Steps
```typescript
// Check inspection status
const { data } = await supabase
  .from('booking_inspections')
  .select('*')
  .eq('booking_id', bookingId);
console.log('Inspections:', data);

// Check storage upload
const { error } = await supabase.storage
  .from('inspections')
  .upload(path, file);
if (error) console.error('Upload error:', error);
```

### 5. Wallet Operations Fail

#### Symptoms
- "Saldo insuficiente" when balance appears sufficient
- Lock creation fails
- Funds not released after confirmation

#### Causes & Solutions

| Cause | Solution |
|-------|----------|
| Balance cached | Refresh wallet balance |
| Existing lock on funds | Check wallet_locks table |
| RPC function error | Check Supabase logs |
| Currency mismatch | Verify amounts in same currency |

#### Debug Steps
```sql
-- Check wallet balance
SELECT * FROM wallet_balances WHERE user_id = 'xxx';

-- Check active locks
SELECT * FROM wallet_locks WHERE user_id = 'xxx' AND released_at IS NULL;

-- Check ledger entries
SELECT * FROM wallet_ledger WHERE user_id = 'xxx' ORDER BY created_at DESC LIMIT 10;
```

## Logging

### Enable Debug Mode

```typescript
// In component or service
import { LoggerService } from '@core/services/infrastructure/logger.service';

constructor(private logger: LoggerService) {
  this.logger.setLevel('debug');
}

// Usage
this.logger.debug('Booking data:', booking);
this.logger.error('Payment failed:', error);
```

### Key Log Locations

| Service | What to Log |
|---------|-------------|
| BookingsService | Request/response, errors |
| BookingRealtimeService | Connection status, events |
| MercadoPagoGateway | Payment attempts, responses |
| BookingConfirmationService | Confirmation states |

### Supabase Logs

```bash
# Edge Function logs
supabase functions logs <function-name> --project-ref <ref>

# Database logs (via Supabase Dashboard)
# Logs → Postgres → Recent queries
```

## Error Codes

### MercadoPago Errors

| Code | Meaning | Action |
|------|---------|--------|
| `cc_rejected_bad_filled_card_number` | Invalid card number | Ask user to check card |
| `cc_rejected_insufficient_amount` | Insufficient funds | Try different card |
| `cc_rejected_call_for_authorize` | Call issuer | User must call bank |
| `cc_rejected_high_risk` | Fraud suspected | Use different payment method |

### Supabase RPC Errors

| Error | Meaning | Action |
|-------|---------|--------|
| `PGRST301` | Row not found | Check ID validity |
| `PGRST401` | Unauthorized | Check auth token |
| `PGRST403` | RLS violation | Check user permissions |
| `23505` | Unique constraint | Duplicate entry |
| `23503` | Foreign key | Referenced row missing |

## Performance Issues

### Slow Booking List

```typescript
// Use pagination
const bookings = await this.bookingsService.getMyBookings({
  page: 1,
  limit: 20
});

// Avoid loading all at once
// Use virtual scrolling for long lists
```

### Memory Leaks

```typescript
// Always unsubscribe in ngOnDestroy
ngOnDestroy() {
  this.bookingRealtime.unsubscribeAll();
  this.subscription?.unsubscribe();
}
```

### Excessive Re-renders

```typescript
// Use OnPush change detection
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})

// Use signals instead of observables in templates
readonly booking = signal<Booking | null>(null);
```

## Support Escalation

### Level 1: Self-Service
1. Check this troubleshooting guide
2. Review browser console errors
3. Check network requests in DevTools

### Level 2: Developer Investigation
1. Check Supabase Dashboard logs
2. Review Edge Function logs
3. Query database directly

### Level 3: Infrastructure
1. Check Supabase service status
2. Review MercadoPago API status
3. Check rate limits and quotas

## Contact

For unresolved issues:
- Technical: Check `/docs/` for more documentation
- Supabase: https://supabase.com/docs
- MercadoPago: https://www.mercadopago.com.ar/developers
