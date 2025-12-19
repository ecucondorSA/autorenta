# AutoRenta - Referencia Técnica

> Comandos, patrones y configuraciones clave de la plataforma AutoRenta

## Stack Tecnológico

**Frontend:** Angular 20 (Standalone), Ionic 8, Capacitor 7, TailwindCSS, Three.js, Mapbox GL
**Backend:** Supabase (PostgreSQL), Supabase Auth, Deno Edge Functions
**Payments:** MercadoPago SDK v2 (Checkout Bricks), PayPal REST API

---

## Reglas de Desarrollo

### Diseño UI
- **NO WIZARDS:** Prohibidos los step-by-step wizards
- **NO MODALS:** Prohibidos los modales/dialogs
- **NO COMPONENTES HUÉRFANOS:** Todo componente DEBE estar integrado (rutas, módulos, o templates)

### Código
- **Signals > BehaviorSubject:** Usar signals para estado reactivo
- **OnPush obligatorio:** Todos los componentes con ChangeDetectionStrategy.OnPush
- **LoggerService:** Usar LoggerService, NO console.log en producción
- **Standalone only:** No usar NgModules, solo standalone components

### Seguridad
- **RLS obligatorio:** Toda tabla nueva requiere políticas RLS
- **No secrets en código:** Usar environment variables o Supabase secrets

### Git
- **Commits:** `feat|fix|chore|refactor: descripción concisa`
- **Branch:** `feature/nombre`, `fix/nombre`, `chore/nombre`

---

## Deployment

### Android
```bash
# Script: /apps/web/scripts/deploy-android.sh
./scripts/deploy-android.sh                    # Debug
./scripts/deploy-android.sh --release          # Release
./scripts/deploy-android.sh --no-icons         # Sin regenerar assets
```

### Web (Cloudflare Pages)
```bash
npm run build
CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 \
npx wrangler pages deploy dist/web/browser --project-name=autorentar --commit-dirty=true
```

### Supabase Functions
```bash
supabase functions deploy mercadopago-process-booking-payment
supabase functions deploy && supabase functions logs <function-name> --follow

# Secrets
supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR_xxxxx"
supabase secrets set MERCADOPAGO_PUBLIC_KEY="APP_USR_xxxxx"
supabase secrets list
```

### Database
```bash
# Migrations
supabase migration new <name>
supabase db push  # Local

# Production
PGPASSWORD='Ab.12345' psql -h aws-1-sa-east-1.pooler.supabase.com -p 6543 \
  -U postgres.pisqjmoklivzpwufhscx -d postgres -f supabase/migrations/<file>.sql

# Generate types
supabase gen types typescript --project-id obxvffplochgeiclibng \
  > apps/web/src/app/core/models/supabase.types.generated.ts
```

---

## MercadoPago Integration

### Payment Brick Component
**Archivo:** `/apps/web/src/app/shared/components/mercadopago-card-form/`

```typescript
// Exponential backoff retry: 200ms → 400ms → 800ms → 1600ms → 3200ms
private async initializePaymentBrick(): Promise<void> {
  const maxAttempts = 5, baseDelayMs = 200;
  const mp = await this.mpScriptService.getMercadoPago(publicKey);

  this.brickController = await mp.bricks().create('cardPayment', 'paymentBrick_container', {
    initialization: { amount: Math.max(1, Math.ceil(this.amountArs)) },
    callbacks: {
      onReady: () => { this.loading.set(false); },
      onSubmit: async (cardFormData: any) => {
        this.cardTokenGenerated.emit({
          cardToken: cardFormData.token,
          last4: cardFormData.bin?.slice(-4) || 'XXXX'
        });
        return false; // Prevent default submit
      }
    }
  });
}
```

### Edge Function
**Archivo:** `/supabase/functions/mercadopago-process-booking-payment/index.ts`

```typescript
// Features: Rate limiting (60 req/min), Price lock (15min), Split payment (15% fee)
serve(async (req) => {
  const { booking_id, card_token, payer_info } = await req.json();

  // Validate price lock
  if (booking.price_locked_until && new Date(booking.price_locked_until) < new Date()) {
    return Response.json({ error: 'PRICE_LOCK_EXPIRED' }, { status: 400 });
  }

  // Split payment (15% platform fee)
  const platformFee = expectedAmount * 0.15;
  const paymentPayload = {
    transaction_amount: expectedAmount,
    token: card_token,
    marketplace_fee: platformFee,
    collector_id: owner.mercadopago_collector_id,
    external_reference: booking_id
  };

  const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
    headers: { 'X-Idempotency-Key': booking_id }
  });
});
```

---

## Patrones Únicos

### 1. Dual FX Rate System
Dos tasas simultáneas: **Binance Rate** (sin margen, alquiler) + **Platform Rate** (+10%, garantías)

```typescript
interface DualRateFxSnapshot {
  binanceRate: number;    // Raw Binance (alquiler)
  platformRate: number;   // Binance + 10% (garantía)
}

calculatePricing(): void {
  const rentalCostArs = rentalCostUsd * fx.binanceRate;      // Sin margen
  const guaranteeArs = guaranteeUsd * fx.platformRate;       // Con margen
}
```

### 2. Price Lock (15 min)
```typescript
// Frontend
const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
await supabase.from('bookings').insert({
  total_amount: totalArs,
  price_locked_until: lockedUntil.toISOString(),
  metadata: { fx_locked: { binanceRate, platformRate, expiresAt } }
});

// Backend valida expiry antes de procesar pago
```

### 3. Wallet Dual Lock (Rental + Deposit)
```typescript
// Lock rental + deposit en una operación
await supabase.rpc('wallet_lock_rental_and_deposit', {
  p_booking_id: bookingId,
  p_rental_amount: rentalAmount,  // Se cobra al propietario
  p_deposit_amount: 250            // Se devuelve al renter
});

// Completar sin daños: rental → owner, deposit → renter
await supabase.rpc('wallet_complete_booking', { p_booking_id });

// Completar con daños: rental → owner, damage → owner, resto → renter
await supabase.rpc('wallet_complete_booking_with_damages', {
  p_booking_id, p_damage_amount, p_damage_description
});
```

### 4. Exponential Backoff
```typescript
async retryWithBackoff<T>(operation: () => Promise<T>, maxAttempts = 5): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (attempt < maxAttempts) {
        await sleep(200 * Math.pow(2, attempt - 1)); // 200→400→800→1600→3200ms
      } else throw error;
    }
  }
}
```

### 5. Confirmación Bilateral
```typescript
// 1. Owner marca como devuelto
await supabase.rpc('booking_mark_as_returned', { p_booking_id, p_has_damages: false });

// 2. Owner confirma sin daños
await supabase.rpc('booking_confirm_and_release', {
  p_booking_id, p_role: 'owner', p_reported_damages: false
});

// 3. Renter confirma pago
await supabase.rpc('booking_confirm_and_release', { p_booking_id, p_role: 'renter' });
// → Libera fondos: rental → owner (- fee), deposit → renter
```

---

## SQL Functions (RPC)

### wallet_lock_rental_and_deposit
```sql
CREATE FUNCTION wallet_lock_rental_and_deposit(
  p_booking_id UUID, p_rental_amount NUMERIC, p_deposit_amount NUMERIC DEFAULT 250
) RETURNS JSONB AS $$
  -- Check balance → Lock rental → Lock deposit → Update booking
  -- Returns: { rental_lock_transaction_id, deposit_lock_transaction_id, total_locked }
$$;
```

### get_available_cars
```sql
CREATE FUNCTION get_available_cars(
  p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ,
  p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION, p_radius_km INTEGER DEFAULT 50
) RETURNS TABLE (...) AS $$
  -- Filters: active/published, price, transmission, fuel
  -- Excludes: conflicting bookings, blocked dates
  -- Orders: distance, rating, created_at
  -- Limit: 100
$$;
```

### calculate_bonus_malus
```sql
CREATE FUNCTION calculate_bonus_malus(p_user_id UUID) RETURNS JSONB AS $$
  -- Factors: rating (-10% a +10%), cancellation (0% a +15%)
  --          completion (-5%), verification (-5%)
  -- Total clamp: -15% a +20%
  -- Returns: { total_factor, percentage, type, breakdown }
$$;
```

### v_wallet_history (View)
```sql
CREATE VIEW v_wallet_history AS
  -- Combina wallet_transactions (legacy) + wallet_ledger (nuevo)
  SELECT COALESCE(wt.id, wl.id), transaction_date, transaction_type, amount
  FROM wallet_transactions wt
  FULL OUTER JOIN wallet_ledger wl ON wl.legacy_transaction_id = wt.id;
```

---

## Services

### EncryptionService (AES-GCM)
```typescript
// /apps/web/src/app/core/services/encryption.service.ts
@Injectable({ providedIn: 'root' })
export class EncryptionService {
  async encrypt(text: string, password: string): Promise<string> {
    // AES-GCM + PBKDF2 (100k iterations) → Base64
  }
  async decrypt(encryptedText: string, password: string): Promise<string> {
    // Base64 → AES-GCM decrypt
  }
}
```

### FxService
```typescript
// /apps/web/src/app/core/services/fx.service.ts
@Injectable({ providedIn: 'root' })
export class FxService {
  async getCurrentRateAsync(): Promise<number> { /* Platform rate (Binance + 10%) */ }
  async getBinanceRateAsync(): Promise<number> { /* Raw Binance rate */ }
  async getDualFxSnapshot(): Promise<{ binanceRate, platformRate }> { /* Both */ }
  async calculateWithBonusMalus(baseAmount, userId): Promise<{...}> {
    /* Apply bonus-malus factor */
  }
}
```

### LoggerService (Sentry)
```typescript
// /apps/web/src/app/core/services/logger.service.ts
@Injectable({ providedIn: 'root' })
export class LoggerService {
  info(message: string, data?: unknown): void { /* Console + Sentry breadcrumb */ }
  warn(message: string, data?: unknown): void { /* Sentry.captureMessage */ }
  error(message: string, error?: any, data?: unknown): void { /* Sentry.captureException */ }
  setUser(userId: string, email?: string): void { /* Sentry.setUser */ }
}
```

---

## Testing & Debug

### E2E (Playwright)
```bash
npm run test:e2e                    # All tests
npm run test:e2e:booking            # Booking flow
npm run test:e2e:wallet             # Wallet ops
npm run test:e2e:calendar:ui        # Google Calendar OAuth (UI)
npm run test:e2e --debug            # Debug mode
```

### Debug Scripts
```bash
npm run debug:mercadopago           # MercadoPago SDK debug
npm run debug:chrome                # Chrome DevTools Protocol
npm run generar:tests               # Playwright codegen
npm run lint:orphans                # Find unused components
```

### Database Operations
```bash
# Connect (production)
PGPASSWORD='Ab.12345' psql -h aws-1-sa-east-1.pooler.supabase.com -p 6543 \
  -U postgres.pisqjmoklivzpwufhscx -d postgres

# Execute SQL
PGPASSWORD='Ab.12345' psql ... -f migration.sql

# Dump schema
pg_dump ... --schema-only > schema.sql
```

---

## Quick Commands

```bash
# Development
pnpm dev                            # Dev server
pnpm build                          # Production build
pnpm lint                           # Lint

# Testing
npm test                            # Unit tests
npm run test:e2e                    # E2E tests
npm run test:coverage               # Coverage

# Deploy
./scripts/deploy-android.sh         # Android debug
./scripts/deploy-android.sh --release  # Android release
npm run build && npm run deploy:web    # Web production
supabase functions deploy           # Edge functions

# Database
supabase gen types typescript > types.ts
supabase db push                    # Apply migrations
supabase db reset                   # Reset local DB
```

---

**Última actualización:** 2025-12-12
**Versión:** 2.0.0 (optimizada)
**Proyecto:** AutoRenta - Plataforma P2P
