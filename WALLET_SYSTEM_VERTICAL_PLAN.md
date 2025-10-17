# 💰 Plan de Workflow Vertical: Sistema de Wallet/Depósito Autorentar

**Fecha**: 2025-10-17
**Feature**: Wallet interna con depósitos para garantías y pagos
**Objetivo**: Permitir alquileres sin tarjeta, aumentar confianza y fidelización

---

## 📋 LAYER 1: User Story & Requirements

### User Stories Principales

**US-1**: Como **locatario sin tarjeta de crédito**, quiero **depositar dinero en mi wallet de Autorentar** para **poder alquilar autos sin necesitar tarjeta**.

**US-2**: Como **locatario recurrente**, quiero **ver mi saldo disponible y bloqueado** para **saber cuánto tengo para futuras reservas**.

**US-3**: Como **locador**, quiero **que el sistema retenga garantías automáticamente** del wallet del locatario para **protegerme de daños**.

**US-4**: Como **usuario nuevo**, quiero **depositar y obtener bonificaciones** para **tener incentivo de usar la plataforma**.

**US-5**: Como **admin**, quiero **ver y gestionar transacciones de wallet** para **resolver disputas y auditar movimientos**.

### Casos de Uso

1. **Depósito inicial**:
   - Usuario nuevo deposita USD 350 vía MercadoPago/Transferencia
   - Saldo aparece en su perfil como "Available Balance"
   - Obtiene badge "Verified Wallet" en su perfil

2. **Reserva con wallet**:
   - Usuario selecciona auto con depósito de USD 200
   - Sistema bloquea USD 200 del wallet como garantía
   - Remaining balance: USD 150 disponible
   - Al finalizar reserva sin problemas: USD 200 se libera

3. **Pago parcial con wallet**:
   - Usuario con USD 100 en wallet alquila auto de USD 150/día por 3 días (USD 450 total)
   - Usa USD 100 del wallet + USD 350 con tarjeta/transferencia
   - Depósito de USD 200 se bloquea del wallet (error: insuficiente)
   - **Solución**: Requerir depósito externo o mantener mínimo en wallet

4. **Programa de recompensas**:
   - Usuario completa 5 reservas sin incidentes
   - Gana USD 50 de crédito bonus
   - Crédito solo usable para garantías (no retirable)

### Criterios de Aceptación

**Funcionales**:
- ✅ Usuario puede depositar dinero desde dashboard
- ✅ Saldo se divide en: `available_balance` y `locked_balance`
- ✅ Sistema bloquea automáticamente garantías al crear reserva
- ✅ Garantías se liberan al completar reserva sin daños
- ✅ Transacciones son atómicas (no puede haber inconsistencias)
- ✅ Usuario puede ver historial completo de movimientos

**No funcionales**:
- ✅ Transacciones procesadas en < 3 segundos
- ✅ Sistema ACID compliant (base de datos transaccional)
- ✅ Auditoría completa de todos los movimientos
- ✅ KYC básico antes de habilitar wallet (documento + selfie)
- ✅ Cumplimiento legal: Wallet cerrada, no retirable

---

## 🎨 LAYER 2: UI/UX Design

### Componentes Angular Nuevos

1. **`WalletDashboardComponent`**
   - Path: `/profile/wallet`
   - Vista principal del wallet con saldo y transacciones

2. **`DepositModalComponent`**
   - Modal para iniciar depósito
   - Opciones: MercadoPago, Transferencia, Tarjeta

3. **`TransactionHistoryComponent`**
   - Lista de movimientos con filtros
   - Estados: completed, pending, failed, refunded

4. **`WalletBalanceCardComponent`**
   - Card que muestra saldo en sidebar del profile
   - Available + Locked con iconos

5. **`DepositMethodSelectorComponent`**
   - Selector visual de método de pago
   - Icons: MP, Bank, Credit Card

### Wireframes ASCII

```
┌─────────────────────────────────────────────────────────┐
│  Profile > Wallet                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  💰 Tu Wallet                                           │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Available        │  │ Locked           │            │
│  │ USD 350.00       │  │ USD 200.00       │            │
│  │ Para usar ahora  │  │ En garantías     │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                         │
│  [Depositar dinero]  [Ver historial completo]          │
│                                                         │
│  📊 Últimas Transacciones                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ↓ Depósito - MercadoPago    +USD 350.00  ✅    │   │
│  │   2025-10-17 10:30                              │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🔒 Garantía bloqueada        -USD 200.00  🔒    │   │
│  │   Reserva #1234 - Toyota Corolla                │   │
│  │   2025-10-17 11:00                              │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 🔓 Garantía liberada         +USD 200.00  ✅    │   │
│  │   Reserva #1230 - Nissan Versa                  │   │
│  │   2025-10-16 18:00                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Tailwind Classes a Usar

**Balance Cards**:
```html
<div class="card-premium rounded-2xl bg-gradient-to-br from-accent-petrol to-accent-warm text-white p-6 shadow-medium">
  <div class="text-4xl font-bold">USD 350.00</div>
  <div class="text-sm opacity-90">Available Balance</div>
</div>
```

**Transaction Items**:
```html
<div class="flex items-center justify-between p-4 hover:bg-sand-light rounded-xl transition">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
      <svg>...</svg> <!-- Icono según tipo -->
    </div>
    <div>
      <div class="font-semibold text-smoke-black">Depósito - MercadoPago</div>
      <div class="text-sm text-ash-gray">2025-10-17 10:30</div>
    </div>
  </div>
  <div class="text-right">
    <div class="font-bold text-green-600">+USD 350.00</div>
    <div class="text-xs text-ash-gray">Completado ✅</div>
  </div>
</div>
```

---

## 💻 LAYER 3: Frontend Logic (Angular)

### Services TypeScript

#### 1. **`WalletService`**

```typescript
// apps/web/src/app/core/services/wallet.service.ts

import { Injectable, signal } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

export interface WalletBalance {
  available_balance: number;
  locked_balance: number;
  total_balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'lock' | 'unlock' | 'charge' | 'refund' | 'bonus';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  reference_type?: 'booking' | 'deposit' | 'reward';
  reference_id?: string;
  provider?: 'mercadopago' | 'stripe' | 'bank_transfer';
  provider_transaction_id?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class WalletService {
  private readonly supabase = injectSupabase();

  readonly balance = signal<WalletBalance | null>(null);
  readonly transactions = signal<WalletTransaction[]>([]);
  readonly loading = signal(false);

  async getBalance(): Promise<WalletBalance> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.rpc('wallet_get_balance');
      if (error) throw error;

      const balance: WalletBalance = {
        available_balance: data.available_balance,
        locked_balance: data.locked_balance,
        total_balance: data.available_balance + data.locked_balance,
        currency: data.currency || 'USD',
      };

      this.balance.set(balance);
      return balance;
    } finally {
      this.loading.set(false);
    }
  }

  async getTransactions(limit = 50): Promise<WalletTransaction[]> {
    const { data, error } = await this.supabase
      .from('wallet_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    this.transactions.set(data as WalletTransaction[]);
    return data as WalletTransaction[];
  }

  async initiateDeposit(amount: number, provider: 'mercadopago' | 'stripe'): Promise<string> {
    const { data, error } = await this.supabase.rpc('wallet_initiate_deposit', {
      p_amount: amount,
      p_provider: provider,
    });

    if (error) throw error;

    // Devuelve URL de pago para redireccionar
    return data.payment_url;
  }

  async lockFunds(bookingId: string, amount: number): Promise<void> {
    const { error } = await this.supabase.rpc('wallet_lock_funds', {
      p_booking_id: bookingId,
      p_amount: amount,
    });

    if (error) throw error;
    await this.getBalance(); // Refresh
  }

  async unlockFunds(bookingId: string): Promise<void> {
    const { error } = await this.supabase.rpc('wallet_unlock_funds', {
      p_booking_id: bookingId,
    });

    if (error) throw error;
    await this.getBalance(); // Refresh
  }

  async chargeFunds(bookingId: string, amount: number, reason: string): Promise<void> {
    const { error } = await this.supabase.rpc('wallet_charge_funds', {
      p_booking_id: bookingId,
      p_amount: amount,
      p_reason: reason,
    });

    if (error) throw error;
    await this.getBalance(); // Refresh
  }
}
```

#### 2. **Signals & Computed Properties**

```typescript
// En WalletDashboardComponent
export class WalletDashboardComponent implements OnInit {
  private readonly walletService = inject(WalletService);

  readonly balance = this.walletService.balance;
  readonly transactions = this.walletService.transactions;
  readonly loading = this.walletService.loading;

  // Computed: puede depositar más?
  readonly canDeposit = computed(() => {
    const bal = this.balance();
    if (!bal) return false;
    return bal.total_balance < 10000; // Límite: USD 10k
  });

  // Computed: transacciones pendientes
  readonly pendingCount = computed(() => {
    return this.transactions().filter(t => t.status === 'pending').length;
  });

  // Computed: total depositado historicamente
  readonly totalDeposited = computed(() => {
    return this.transactions()
      .filter(t => t.type === 'deposit' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  });
}
```

---

## 🔌 LAYER 4: API / Backend Integration (Supabase)

### Database RPC Functions (PostgreSQL)

#### 1. **`wallet_get_balance()`**

```sql
-- apps/web/database/wallet/rpc_wallet_get_balance.sql

CREATE OR REPLACE FUNCTION wallet_get_balance()
RETURNS TABLE (
  available_balance NUMERIC,
  locked_balance NUMERIC,
  currency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate balances from transactions
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN status = 'completed' AND type IN ('deposit', 'unlock', 'refund', 'bonus') THEN amount
                      WHEN status = 'completed' AND type IN ('lock', 'charge') THEN -amount
                      ELSE 0 END), 0) AS available_balance,
    COALESCE(SUM(CASE WHEN type = 'lock' AND status = 'pending' THEN amount ELSE 0 END), 0) AS locked_balance,
    'USD'::TEXT AS currency
  FROM wallet_transactions
  WHERE user_id = v_user_id;
END;
$$;
```

#### 2. **`wallet_initiate_deposit()`**

```sql
-- apps/web/database/wallet/rpc_wallet_initiate_deposit.sql

CREATE OR REPLACE FUNCTION wallet_initiate_deposit(
  p_amount NUMERIC,
  p_provider TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_transaction_id UUID;
  v_payment_url TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate amount
  IF p_amount <= 0 OR p_amount > 10000 THEN
    RAISE EXCEPTION 'Invalid amount. Must be between 1 and 10000';
  END IF;

  -- Create pending transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    provider,
    reference_type
  ) VALUES (
    v_user_id,
    'deposit',
    p_amount,
    'USD',
    'pending',
    p_provider,
    'deposit'
  ) RETURNING id INTO v_transaction_id;

  -- TODO: Call payment provider API (MercadoPago/Stripe)
  -- For now, return mock URL
  v_payment_url := format(
    'https://mercadopago.com/checkout/%s',
    v_transaction_id::TEXT
  );

  RETURN json_build_object(
    'transaction_id', v_transaction_id,
    'payment_url', v_payment_url,
    'status', 'pending'
  );
END;
$$;
```

#### 3. **`wallet_lock_funds()`**

```sql
-- apps/web/database/wallet/rpc_wallet_lock_funds.sql

CREATE OR REPLACE FUNCTION wallet_lock_funds(
  p_booking_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_available_balance NUMERIC;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check available balance
  SELECT available_balance INTO v_available_balance
  FROM wallet_get_balance();

  IF v_available_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds. Available: %, Required: %', v_available_balance, p_amount;
  END IF;

  -- Create lock transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    reference_type,
    reference_id,
    notes
  ) VALUES (
    v_user_id,
    'lock',
    p_amount,
    'USD',
    'pending',
    'booking',
    p_booking_id,
    format('Deposit lock for booking %s', p_booking_id)
  );

  -- Update booking to mark deposit as paid via wallet
  UPDATE bookings
  SET
    deposit_paid_via_wallet = TRUE,
    deposit_amount_wallet = p_amount
  WHERE id = p_booking_id AND renter_id = v_user_id;
END;
$$;
```

#### 4. **`wallet_unlock_funds()`**

```sql
-- apps/web/database/wallet/rpc_wallet_unlock_funds.sql

CREATE OR REPLACE FUNCTION wallet_unlock_funds(
  p_booking_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_lock_amount NUMERIC;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get lock amount
  SELECT amount INTO v_lock_amount
  FROM wallet_transactions
  WHERE user_id = v_user_id
    AND reference_id = p_booking_id
    AND type = 'lock'
    AND status = 'pending'
  LIMIT 1;

  IF v_lock_amount IS NULL THEN
    RAISE EXCEPTION 'No lock found for booking %', p_booking_id;
  END IF;

  -- Mark lock as completed (funds return to available)
  UPDATE wallet_transactions
  SET
    status = 'completed',
    updated_at = NOW()
  WHERE user_id = v_user_id
    AND reference_id = p_booking_id
    AND type = 'lock'
    AND status = 'pending';

  -- Create unlock transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    currency,
    status,
    reference_type,
    reference_id,
    notes
  ) VALUES (
    v_user_id,
    'unlock',
    v_lock_amount,
    'USD',
    'completed',
    'booking',
    p_booking_id,
    format('Deposit unlocked for booking %s', p_booking_id)
  );
END;
$$;
```

### Edge Function: Payment Webhook

```typescript
// functions/workers/wallet_webhook/src/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { provider, transaction_id, status } = await req.json();

  if (provider === 'mercadopago' && status === 'approved') {
    // Update transaction status
    const { error } = await supabase
      .from('wallet_transactions')
      .update({
        status: 'completed',
        provider_transaction_id: transaction_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction_id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## 🗄️ LAYER 5: Database Schema

### Tables

#### 1. **`wallet_transactions`**

```sql
-- apps/web/database/wallet/table_wallet_transactions.sql

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Transaction details
  type TEXT NOT NULL CHECK (type IN ('deposit', 'lock', 'unlock', 'charge', 'refund', 'bonus')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

  -- Reference to booking/deposit/reward
  reference_type TEXT CHECK (reference_type IN ('booking', 'deposit', 'reward')),
  reference_id UUID,

  -- Payment provider info
  provider TEXT CHECK (provider IN ('mercadopago', 'stripe', 'bank_transfer', 'internal')),
  provider_transaction_id TEXT,

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT wallet_transactions_user_idx UNIQUE (user_id, id)
);

-- Indexes for performance
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_reference ON wallet_transactions(reference_type, reference_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users cannot insert directly"
  ON wallet_transactions FOR INSERT
  WITH CHECK (FALSE); -- Only via RPC functions

CREATE POLICY "Admins can view all"
  ON wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );
```

#### 2. **Update `bookings` table**

```sql
-- apps/web/database/wallet/alter_bookings_add_wallet_fields.sql

ALTER TABLE bookings
ADD COLUMN deposit_paid_via_wallet BOOLEAN DEFAULT FALSE,
ADD COLUMN deposit_amount_wallet NUMERIC(10, 2),
ADD COLUMN wallet_lock_transaction_id UUID REFERENCES wallet_transactions(id);

CREATE INDEX idx_bookings_wallet_lock ON bookings(wallet_lock_transaction_id);
```

#### 3. **`wallet_balance_view`** (Materialized View for Performance)

```sql
-- apps/web/database/wallet/view_wallet_balance.sql

CREATE MATERIALIZED VIEW wallet_balance_view AS
SELECT
  user_id,
  SUM(CASE
    WHEN status = 'completed' AND type IN ('deposit', 'unlock', 'refund', 'bonus') THEN amount
    WHEN status = 'completed' AND type IN ('charge') THEN -amount
    ELSE 0
  END) AS available_balance,
  SUM(CASE
    WHEN type = 'lock' AND status = 'pending' THEN amount
    ELSE 0
  END) AS locked_balance,
  MAX(updated_at) AS last_updated
FROM wallet_transactions
GROUP BY user_id;

-- Refresh policy: after each transaction
CREATE UNIQUE INDEX ON wallet_balance_view (user_id);

-- Function to refresh on insert/update
CREATE OR REPLACE FUNCTION refresh_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY wallet_balance_view;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_wallet_balance
AFTER INSERT OR UPDATE ON wallet_transactions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_wallet_balance();
```

---

## 🧪 LAYER 6: Testing & Validation

### Unit Tests (Jasmine/Karma)

```typescript
// apps/web/src/app/core/services/wallet.service.spec.ts

describe('WalletService', () => {
  let service: WalletService;
  let supabase: SupabaseClient;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WalletService);
    supabase = TestBed.inject(SupabaseClient);
  });

  it('should get balance', async () => {
    const mockBalance = {
      available_balance: 350,
      locked_balance: 200,
      currency: 'USD'
    };

    spyOn(supabase, 'rpc').and.returnValue(Promise.resolve({ data: mockBalance, error: null }));

    const balance = await service.getBalance();

    expect(balance.total_balance).toBe(550);
    expect(service.balance()).toEqual(jasmine.objectContaining(mockBalance));
  });

  it('should lock funds', async () => {
    spyOn(supabase, 'rpc').and.returnValue(Promise.resolve({ data: null, error: null }));

    await service.lockFunds('booking-123', 200);

    expect(supabase.rpc).toHaveBeenCalledWith('wallet_lock_funds', {
      p_booking_id: 'booking-123',
      p_amount: 200
    });
  });
});
```

### Integration Tests

```sql
-- apps/web/database/wallet/test_wallet_flow.sql

BEGIN;

-- Setup: Create test user
INSERT INTO auth.users (id, email) VALUES ('test-user-1', 'test@example.com');
INSERT INTO profiles (id, full_name) VALUES ('test-user-1', 'Test User');

-- Test 1: Deposit
SELECT wallet_initiate_deposit(500.00, 'mercadopago');

-- Simulate webhook completion
UPDATE wallet_transactions SET status = 'completed' WHERE user_id = 'test-user-1';

-- Test 2: Check balance
SELECT * FROM wallet_get_balance(); -- Should show 500.00 available

-- Test 3: Lock funds
SELECT wallet_lock_funds('booking-test-1', 200.00);

-- Test 4: Check balance after lock
SELECT * FROM wallet_get_balance(); -- Should show 300 available, 200 locked

-- Test 5: Unlock funds
SELECT wallet_unlock_funds('booking-test-1');

-- Test 6: Check balance after unlock
SELECT * FROM wallet_get_balance(); -- Should show 500.00 available

ROLLBACK;
```

### Manual QA Checklist

**Depósito**:
- [ ] Usuario puede iniciar depósito desde dashboard
- [ ] Redirección a MercadoPago funciona
- [ ] Webhook actualiza transacción a completed
- [ ] Balance se actualiza en UI sin refresh

**Lock de Fondos**:
- [ ] Al crear reserva con wallet, fondos se bloquean
- [ ] Balance available disminuye
- [ ] Balance locked aumenta
- [ ] Transacción aparece en historial

**Unlock de Fondos**:
- [ ] Al completar reserva, fondos se liberan
- [ ] Balance locked disminuye
- [ ] Balance available aumenta

**Edge Cases**:
- [ ] Error al intentar bloquear más de lo disponible
- [ ] No permite depósitos > USD 10,000
- [ ] Transacciones atómicas (no hay race conditions)

---

## 📊 Roadmap de Implementación

### Phase 1: MVP (2 semanas)
- ✅ Database schema: `wallet_transactions` table
- ✅ RPC functions: get_balance, lock, unlock
- ✅ WalletService en Angular
- ✅ WalletDashboardComponent básico
- ✅ Integración con MercadoPago para depósitos

### Phase 2: Mejoras UX (1 semana)
- ✅ TransactionHistoryComponent con filtros
- ✅ Notificaciones push al completar transacción
- ✅ Badges de "Verified Wallet" en perfil

### Phase 3: Gamification (2 semanas)
- ✅ Sistema de rewards (bonus por reservas completadas)
- ✅ Levels: Bronze, Silver, Gold (descuentos progresivos)
- ✅ Referral system: USD 50 por referido

### Phase 4: Admin Tools (1 semana)
- ✅ Dashboard de admin para gestionar transacciones
- ✅ Resolución de disputas
- ✅ Reportes financieros

---

## ⚖️ Consideraciones Legales

### Términos y Condiciones (Draft)

```
WALLET DE AUTORENTAR - TÉRMINOS DE USO

1. NATURALEZA DEL SALDO
   - El saldo de la Wallet es un crédito prepago dentro de la plataforma Autorentar.
   - NO es una cuenta bancaria ni instrumento financiero regulado.
   - Los fondos solo son utilizables para reservas y garantías dentro de Autorentar.

2. DEPÓSITOS
   - Monto mínimo: USD 10
   - Monto máximo: USD 10,000 por depósito
   - Monto máximo acumulado: USD 50,000
   - Procesado por proveedores certificados (MercadoPago, Stripe)

3. RETIROS
   - NO se permiten retiros directos a cuenta bancaria.
   - Los fondos solo pueden usarse dentro de la plataforma.
   - Excepción: Casos de cierre de cuenta previa revisión.

4. GARANTÍAS
   - Al crear una reserva, se bloquean fondos como garantía.
   - Los fondos se liberan al completar la reserva sin incidentes.
   - En caso de daños, el dueño puede reclamar cargos contra la garantía.

5. KYC (Conozca a su Cliente)
   - Requerimos verificación de identidad antes de habilitar Wallet.
   - Documentos: DNI/Pasaporte + Selfie.
   - Cumplimiento con normativas anti-lavado de dinero.

6. RESPONSABILIDAD
   - Autorentar no es responsable por fondos perdidos debido a:
     - Uso fraudulento de credenciales del usuario
     - Errores de proveedores de pago externos
   - Autorentar se compromete a mantener auditoría completa de transacciones.
```

### Compliance Checklist

- [ ] **No es wallet financiera**: Clarificar en T&C que es "crédito interno"
- [ ] **KYC obligatorio**: Validar identidad antes de permitir depósitos > USD 100
- [ ] **Anti-lavado**: Reportar transacciones sospechosas (> USD 10k acumulado rápido)
- [ ] **Auditoría**: Logs completos de todas las transacciones
- [ ] **Seguro**: Considerar seguro para fondos en plataforma

---

## 🚨 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Regulación financiera | Media | Alto | Mantener como "crédito cerrado", no wallet regulada |
| Fraude en depósitos | Media | Medio | KYC + límites diarios |
| Race conditions en locks | Baja | Alto | Transacciones ACID, locks optimistas |
| Reclamaciones de devolución | Alta | Medio | T&C claros: no reembolsable |
| Cargos incorrectos | Baja | Medio | Sistema de disputas con admin review |

---

## 📈 KPIs y Métricas

**Adoption**:
- % de usuarios con Wallet habilitada
- Promedio de saldo por usuario
- Tasa de conversión: usuario → wallet → reserva

**Financial**:
- Total depositado (USD)
- Total bloqueado en garantías (USD)
- Promedio de transacciones por usuario/mes

**Engagement**:
- % de reservas pagadas con wallet vs tarjeta
- Tiempo promedio de fondos bloqueados
- Tasa de retención de usuarios con wallet

---

## 🎯 Siguiente Paso

**¿Quieres que empiece por alguna capa específica?**

Opciones:
1. **Database first**: Crear schema completo + RPC functions
2. **Frontend first**: Crear componentes UI + service
3. **Integration first**: Webhook de MercadoPago + testing end-to-end

Dime por dónde empezamos y creo una rama nueva tipo `feature/wallet-system` 🚀

---

**Generated by**: Claude Code
**Date**: 2025-10-17
**Document**: Wallet System Vertical Plan
