# AutoRenta Wallet System Flow Documentation

## Overview

The AutoRenta wallet is a comprehensive financial management system that allows users to:
- View and manage their balance (available, locked, withdrawable, non-withdrawable)
- Make deposits via multiple payment providers
- Request withdrawals to bank accounts
- Transfer funds to other users
- Track transaction history

---

## 1. Entry Point: How Users Access the Wallet

### Route Configuration
**File**: `/home/user/autorenta/apps/web/src/app/features/wallet/wallet.routes.ts`

```typescript
WALLET_ROUTES: Routes = [
  {
    path: 'history',
    loadComponent: () => import('./components/ledger-history.component'),
    title: 'Historial de Movimientos - AutoRenta',
  },
  {
    path: 'transfer',
    loadComponent: () => import('./components/transfer-funds.component'),
    title: 'Transferir AutoCréditos - AutoRenta',
  },
  {
    path: '',
    redirectTo: 'history',
    pathMatch: 'full',
  },
];
```

### Main Entry Point Component
**File**: `/home/user/autorenta/apps/web/src/app/features/wallet/wallet.page.ts`

**Route**: `/wallet` (main wallet dashboard)

Users can access the wallet from:
- Navigation menu (links to `/wallet`)
- Booking flow (when depositing for reservations)
- Profile menu or account settings

---

## 2. Main Wallet Page Sections

The wallet page (`wallet.page.html`) is organized into these key sections:

### 2.1 Hero Snapshot Section
- **Location**: Top of page
- **Components**:
  - Page title: "Mi Wallet"
  - Status badges: Balance updated, Protected credit status, Pending deposits count
  - Quick action buttons:
    - **Primary CTA**: Dynamic button that changes based on protected credit status
      - If pending: "Configurar crédito protegido" (orange/warning color)
      - If partial: "Completar crédito" (shows remaining amount)
      - If active: "Depositar fondos" (primary color)
    - Secondary CTAs: View transactions, Request withdrawal

### 2.2 Balance Display Card
**Component**: `WalletBalanceCardComponent`
**File**: `/home/user/autorenta/apps/web/src/app/shared/components/wallet-balance-card/`

Displays:
- **Available Balance** (USD): Fondos que puedes usar inmediatamente
  - `availableBalance()` signal
  - Computed from balance - locked_balance
  
- **Balance Sections** (visual cards):
  ```
  ┌─────────────────────────────────────┐
  │ Crédito Protegido (no retirable)    │ USD 300.00
  │ Meta: USD 300                       │
  ├─────────────────────────────────────┤
  │ Transferible (in-app)               │ USD 150.50
  │ Envíalo a otros usuarios            │
  ├─────────────────────────────────────┤
  │ Retirable (off-ramp)                │ USD 200.75
  │ Disponible para tu cuenta bancaria  │
  └─────────────────────────────────────┘
  ```

- **Pending Deposits Alert**: Shows count of pending deposits
- **Deposit Button**: Opens deposit modal
- **Auto-refresh**: Updates every 30 seconds
- **Last Update Timestamp**: Shows when balance was last refreshed

### 2.3 Onboarding Banner (Protected Credit)
**Visibility**: Only shown if `protectedCreditStatus() === 'pending'`

- **Benefits List**:
  - No necesitas tarjeta internacional
  - Úsalo en cada reserva
  - Se libera inmediatamente
  - Reservas más rápidas

- **Use Cases**:
  - Viajeros del exterior
  - Usuarios frecuentes
  - Preferencia por no usar tarjeta

- **CTA**: "Configurar crédito protegido ahora" (with countdown: "5 minutos")

### 2.4 Benefits Section (Collapsible)
**Visibility**: Only shown if `protectedCreditStatus() !== 'active'`

- **Expandable header**: "¿Por qué usar Crédito Autorentar?"
- **Expandable content**:
  - Benefits grid (4 items)
  - Use cases list (3 items)
  - CTA button

### 2.5 Protection + Quick Info Section
**Left Column (2/3 width)**:
- Crédito Autorentar information
- Guarantee options (card + credit comparison)
- Three balance cards (Protected, Transferible, Withdrawable)

**Right Column (1/3 width)**:
- Wallet Account Number card (shows unique 16-char identifier)
  - Copy to clipboard button
  - Shows format: `AR12345678901234`

- Quick Actions card:
  - Button: Depositar
  - Button: Transferir
  - Button: Retirar

### 2.6 Transactions & Withdrawals Tabs
**Two main tabs**:

1. **Transacciones Tab** (default):
   - Uses `TransactionHistoryComponent`
   - Shows all wallet movements
   - Filterable by type and status

2. **Retiros Tab**:
   - Sub-tabs for mode:
     - **Solicitar retiro**: Withdrawal request form
     - **Cuentas bancarias**: Bank account management
   - Shows withdrawal history

### 2.7 Bottom CTA Section
Gradient section with:
- Title: "Gestiona tu dinero fácilmente"
- Description: Fund management call-to-action
- Three buttons:
  - Depositar
  - Transferir
  - Retirar

### 2.8 FAQ Section
**Component**: `WalletFaqComponent`
- Frequently asked questions about wallet usage

---

## 3. Deposit Flow

### 3.1 Entry Points
Users can initiate a deposit from:
1. Wallet page: Primary CTA button ("Depositar fondos" or "Configurar crédito protegido")
2. Balance card: "Depositar" button
3. Quick actions sidebar: "Depositar" button
4. Onboarding banner: "Configurar crédito protegido" button

### 3.2 Deposit Modal
**Component**: `DepositModalComponent`
**File**: `/home/user/autorenta/apps/web/src/app/shared/components/deposit-modal/`

#### Modal Structure
```
┌─────────────────────────────────────────────────────────┐
│ Depositar Fondos                          [X close]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ¿Qué tipo de depósito deseas realizar?                │
│                                                         │
│ ┌─ Crédito Autorentar (No retirable) ┐ ┌──────────┐   │
│ │ (Descripción y beneficios)         │ │ Selec... │   │
│ │ ✓ Se usa automáticamente...        │ │          │   │
│ │ ✓ Se libera después...             │ └──────────┘   │
│ │ ⓘ No reembolsable en 90 días       │               │
│ └──────────────────────────────────────┘               │
│                                                         │
│ ┌─ Fondos Retirables ┐                  ┌──────────┐   │
│ │ (Para transferir o retirar)         │          │   │
│ │ ✓ Puedes retirar a tu banco        │          │   │
│ │ ✓ Transferible a otros usuarios    │ Usar...  │   │
│ └──────────────────────────────────────┘          │   │
│                                                    │   │
│ Monto en ARS                                       │   │
│ ┌─────────────────────────────────────────┐       │   │
│ │ $ 1000.00 ARS (mínimo: $100)           │       │   │
│ └─────────────────────────────────────────┘       │   │
│                                                    │   │
│ Conversión a USD                                  │   │
│ ≈ USD 0.57 (a tasa: 1 USD = 1,748.01 ARS)       │   │
│                                                    │   │
│ Método de pago                                    │   │
│ ┌────────────────────────────────────────┐        │   │
│ │ Mercado Pago (Tarjeta, Rapipago)      │ Usar  │   │
│ │ Stripe (Tarjeta internacional)        │ Usar  │   │
│ │ Transferencia Bancaria                │ Usar  │   │
│ └────────────────────────────────────────┘        │   │
│                                                    │   │
│ Descripción (opcional)                            │   │
│ ┌────────────────────────────────────────┐        │   │
│ │                                        │        │   │
│ └────────────────────────────────────────┘        │   │
│                                                    │   │
│                    [Continuar] [Cancelar]         │   │
│                                                    │   │
└─────────────────────────────────────────────────────────┘
```

#### Deposit Type Selection (2 Options)

**Option 1: Crédito Autorentar (Protected Credit)**
- **Type**: `protected_credit`
- **Purpose**: Garantía para reservas sin tarjeta
- **Non-withdrawable**: Cannot be withdrawn to bank
- **Auto-renewable**: Releases after each completed trip
- **90-day lock**: If not used, non-refundable after 90 days
- **Target**: USD 300 initial goal
- **Benefits**:
  - No need for international card
  - Reusable in every booking
  - Releases immediately after trip
  - Faster bookings

**Option 2: Fondos Retirables (Withdrawable)**
- **Type**: `withdrawable`
- **Purpose**: General funds, transfer, or withdrawal
- **Withdrawable**: Can request withdrawal to bank account
- **Transferable**: Can send to other users
- **No lock period**: Available anytime
- **Benefits**:
  - Full control over funds
  - Withdraw anytime to your bank
  - Transfer to other users
  - Use for booking payments

#### Amount Selection

**Input Field**: ARS amount
- **Minimum**: ARS 100 (approximately USD 10)
- **Maximum**: ARS 1,000,000
- **Default**: ARS 1,000
- **Validation**:
  ```
  ✗ Amount < ARS 100: "El depósito mínimo es $100 ARS"
  ✗ Amount > ARS 1,000,000: "El depósito máximo es $1,000,000 ARS"
  ✗ Converted USD < $10: "El depósito mínimo es USD 10"
  ```

**Conversion Preview**:
- Real-time calculation using `ExchangeRateService`
- Shows: `≈ USD X.XX (a tasa: 1 USD = X,XXX.XX ARS)`
- Platform rate fetched from Supabase edge function

#### Payment Method Selection

Three providers available:

1. **Mercado Pago** (Default)
   - Methods: Tarjeta, Débito, Rapipago, Pago Fácil
   - Best for: Argentine residents with local payment methods
   - Flow: Opens Mercado Pago payment page in new window

2. **Stripe**
   - Methods: International credit/debit cards
   - Best for: International travelers
   - Flow: Redirect to Stripe payment page

3. **Transferencia Bancaria** (Fallback)
   - Manual bank transfer to:
     - **Account**: Autorentar Operaciones SRL
     - **Bank**: Banco Galicia
     - **Alias**: AUTORENTAR.PAGOS
     - **CBU**: 0170018740000000123456
   - **Concept**: "Crédito Autorentar"
   - **Email**: pagos@autorentar.com

#### Form Submission

**Validation**:
1. Amount validation (see above)
2. USD conversion validation
3. Double-click prevention (2-second delay)

**Process**:
1. User clicks "Continuar"
2. Component calls `WalletService.initiateDeposit()`
3. Service calls Supabase edge function to create Mercado Pago preference
4. Edge function returns `payment_url`
5. Modal emits `depositSuccess` event with payment_url
6. Payment page opens automatically

**API Call** (WalletService.initiateDeposit):
```typescript
initiateDeposit({
  amount: number,        // USD amount
  provider: 'mercadopago' | 'stripe' | 'bank_transfer',
  description: string,   // "Depósito de X ARS"
  allowWithdrawal: boolean, // true for withdrawable, false for protected_credit
})
```

**Response**:
```typescript
{
  success: boolean,
  payment_url?: string,
  message?: string
}
```

#### Success/Error Handling

**Success**:
- Payment URL opens in new window (with fallback to location.assign)
- User redirected to payment gateway
- Modal can be closed by user

**Error Display**:
- Error message shown in form
- Fallback suggestion: If Mercado Pago fails, suggest bank transfer
- User can retry with different provider

**Analytics Tracking**:
- `wallet_deposit_modal_opened`
- `wallet_deposit_initiated`
- `wallet_deposit_completed`
- `wallet_deposit_failed`

---

## 4. Withdrawal Flow

### 4.1 Entry Point
Users access withdrawal from:
1. Wallet page: Retiros tab
2. Quick actions sidebar: "Retirar" button
3. Hero section: "Solicitar retiro" button

### 4.2 Withdrawal Management Interface

**Two Sub-modes**:
1. **Solicitar retiro** (Request Withdrawal)
2. **Cuentas bancarias** (Bank Account Management)

#### Mode 1: Request Withdrawal

**Component**: `WithdrawalRequestFormComponent`
**File**: `/home/user/autorenta/apps/web/src/app/shared/components/withdrawal-request-form/`

##### Form Layout
```
┌────────────────────────────────────────────────┐
│ Solicitar Retiro                               │
├────────────────────────────────────────────────┤
│                                                │
│ Saldo Retirable Disponible                     │
│ USD 200.75                                     │
│                                                │
│ Cuenta Bancaria *                              │
│ ┌──────────────────────────────────────────┐  │
│ │ Seleccionar cuenta...                    │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Monto a Retirar (ARS) *                        │
│ ┌──────────────────────────────────────────┐  │
│ │ 5,000                                    │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Comisión (1.5%)                   ARS 75.00   │
│ Neto a recibir                    ARS 4,925   │
│ Total debito de tu wallet         ARS 5,075   │
│                                                │
│ Notas (opcional)                               │
│ ┌──────────────────────────────────────────┐  │
│ │                                          │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│              [Solicitar Retiro] [Cancelar]    │
│                                                │
└────────────────────────────────────────────────┘
```

##### Bank Account Selection

**Dropdown**: Shows active bank accounts with details
- Account holder name
- Bank name
- Last 4 digits
- Account type badge
- "(Default)" label if applicable

**Required**: User must select an account before submitting

**No Accounts Alert**:
```
⚠️ Aún no registraste cuentas bancarias.
   [Agregar cuenta bancaria] (link to accounts tab)
```

##### Amount Input

**Validation**:
- **Minimum**: ARS 100
- **Maximum**: Available withdrawable balance
- **Format**: Decimal with 2 digits

**Computed Values**:
- **Fee**: 1.5% of amount
  ```
  feeAmount = amount * 0.015
  ```
- **Net Amount**: Amount after fee
  ```
  netAmount = amount - fee
  ```
- **Total Debit**: Amount + Fee
  ```
  totalDebit = amount + fee
  ```

**Display**:
```
Monto a Retirar:      ARS 5,000.00
Comisión (1.5%):      ARS 75.00
─────────────────────────────────
Neto a recibir:       ARS 4,925.00
```

**Validation Error**:
```
❌ No tienes saldo suficiente para este retiro.
   Saldo disponible: ARS X,XXX.XX
   Necesitas: ARS X,XXX.XX
```

##### Submission

**API Call** (WithdrawalService.requestWithdrawal):
```typescript
requestWithdrawal({
  bank_account_id: string,
  amount: number,  // ARS amount
  user_notes?: string
})
```

**Response**:
```typescript
{
  success: boolean,
  message?: string,
  fee_amount?: number,
  net_amount?: number,
  withdrawal_id?: string
}
```

**Success Message**:
```
✅ Éxito
Retiro solicitado exitosamente! 
Monto: $5,000.00
Comisión: $75.00
Neto: $4,925.00
```

**Withdrawal Request Status**: 
- **pending**: Awaiting admin approval
- **approved**: Ready to be processed
- **completed**: Funds transferred to bank
- **rejected**: Withdrawal was denied
- **cancelled**: User cancelled request

##### Withdrawal History

**Below form**: Shows recent withdrawal requests

**Columns**:
- Date
- Amount
- Status (badge)
- Bank account (last 4 digits)
- Actions (Cancel if pending)

---

#### Mode 2: Bank Account Management

**Component**: `BankAccountsListComponent` + `BankAccountFormComponent`

##### List Bank Accounts

Shows all user's bank accounts:

**Card per account**:
```
┌──────────────────────────────────────────────────────┐
│ Juan García                      [Set Default] [Delete]│
│ Banco Nación • Cuenta Corriente                       │
│ CBU: 0170018740000000123456                           │
│ CUIL: 20-12345678-9                                   │
│ Creada: 10 nov, 2024                                  │
│                                                       │
│ ✓ Default ✓ Active                                    │
└──────────────────────────────────────────────────────┘
```

**Account Details Shown**:
- Account holder full name
- Bank name
- Account type (Cuenta Corriente, Caja de Ahorro, etc.)
- CBU (17 digits)
- CUIL/CUIT
- Creation date
- Status badges: Default, Active

**Actions**:
- **Set as Default**: Make this the default withdrawal account
- **Delete**: Remove the account (only if not the last account)

##### Add New Bank Account

**Form Fields**:

1. **Account Holder Name** *
   - Full name of account owner
   - Validation: Required, 3-100 chars

2. **Bank Selection** *
   - Dropdown of Argentine banks
   - Common banks: Galicia, Nación, Santander, BBVA, Scotiabank, etc.

3. **Account Type** *
   - Radio or dropdown:
     - Cuenta Corriente (Checking)
     - Caja de Ahorro (Savings)
     - Cuenta Sueldo (Payroll)
     - Cuenta Inversión (Investment)

4. **CBU (Código Bancario Uniforme)** *
   - 17 digits
   - Validation: Must be exactly 17 digits
   - Format: XXXXXXXXXXXXXX

5. **CUIL/CUIT** *
   - Argentine tax ID
   - Validation: 11 digits for CUIL or 11 digits for CUIT

6. **Use as Default**
   - Checkbox
   - If checked, becomes default withdrawal account

**Submission**:

**API Call** (WithdrawalService.addBankAccount):
```typescript
addBankAccount({
  account_holder_name: string,
  bank_name: string,
  account_type: BankAccountType,
  cbu: string,
  cuil_cuit: string,
  is_default?: boolean
})
```

**Success**:
```
✅ Éxito
Cuenta bancaria agregada exitosamente
```

**Errors**:
- Invalid CBU format
- Duplicate account
- Bank connection error

---

## 5. Transaction Ledger

### 5.1 Transactions Tab

**Component**: `TransactionHistoryComponent`
**File**: `/home/user/autorenta/apps/web/src/app/shared/components/transaction-history/`

#### Display Layout
```
┌─────────────────────────────────────────────────────┐
│ Historial de Transacciones      [Actualizar]        │
├─────────────────────────────────────────────────────┤
│ Filtrar por tipo: [All ▼]  Filtrar por estado: [All▼]│
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Transaction Entry] [Transaction Entry] ...        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Filter Options

**Filter by Type**:
- All (default)
- Depósitos
- Bloqueos
- Desbloqueos
- Cargos
- Reembolsos
- Bonificaciones
- Retiros
- Bloqueos de Alquiler
- Pagos de Alquiler
- Bloqueos de Garantía
- Devoluciones de Garantía
- Cargos de Garantía

**Filter by Status**:
- All (default)
- Pendientes
- Completadas
- Fallidas
- Reembolsadas

#### Transaction Entry Design

**Expanded View**:
```
┌─────────────────────────────────────────────────────┐
│ 💰 Depósito                                         │
│    10 nov, 2024 • 15:30                             │
│                                                     │
│    USD 100.00                    [Completada]      │
│                                                     │
│    ▼ [Expandable for more details]                 │
├─────────────────────────────────────────────────────┤
│ [If expanded] Additional Details:                  │
│ • Transaction ID: abc123...                        │
│ • Booking ID: (if related)                         │
│ • Currency: USD                                    │
│ • Source: mercadopago                              │
│ • Metadata: {...}                                  │
└─────────────────────────────────────────────────────┘
```

**Collapsed View** (Transaction Row):
```
┌────────────────────────────────────────────┐
│ 💰 Depósito                                │
│ 10 nov, 2024 • 15:30                      │
│                        USD +100.00         │
│                        [Completada]        │
└────────────────────────────────────────────┘
```

#### Transaction Types & Icons

| Type | Icon | Color | Description |
|------|------|-------|-------------|
| Deposit | 💰 | Green/Success | Money added to wallet |
| Withdrawal | 🏦 | Blue/CTA | Money removed to bank |
| Lock | 🔒 | Amber/Warning | Funds locked for booking |
| Unlock | 🔓 | Blue/CTA | Funds released |
| Charge | 💳 | Red/Error | Payment debited |
| Refund | ↩️ | Green/Success | Money refunded |
| Bonus | 🎁 | Green/Success | Promotional credit |
| Rental Payment Lock | 🚗🔒 | Amber/Warning | Rental payment locked |
| Rental Payment Transfer | 🚗💸 | Blue/CTA | Rental payment transferred |
| Security Deposit Lock | 🛡️🔒 | Amber/Warning | Security deposit locked |
| Security Deposit Release | 🛡️✅ | Green/Success | Security deposit released |
| Security Deposit Charge | 🛡️⚠️ | Red/Error | Security deposit charged |

#### Transaction Statuses & Colors

| Status | Badge Color | Definition |
|--------|------------|-----------|
| Pending | Amber | Awaiting confirmation |
| Completed | Green | Successfully processed |
| Failed | Red | Transaction failed |
| Refunded | Neutral | Funds returned |

#### Data Shown per Transaction

- **transaction_id**: Unique identifier
- **transaction_date**: ISO datetime string
- **transaction_type**: Type of movement
- **status**: pending, completed, failed, refunded
- **amount_cents**: Amount in cents
- **currency**: Usually USD
- **booking_id**: Reference to booking (if applicable)
- **source_system**: Source (mercadopago, wallet, booking, etc.)
- **metadata**: Additional context/details

#### Empty State
```
┌─────────────────────────────────────────┐
│                                         │
│      📋 Sin transacciones               │
│                                         │
│  No hay transacciones que mostrar.      │
│  Realiza un depósito para empezar.      │
│                                         │
│        [Ir a Depositar]                 │
│                                         │
└─────────────────────────────────────────┘
```

#### Loading & Error States

**Loading**:
```
Cargando transacciones...
(Spinning loader)
```

**Error**:
```
❌ Error al cargar transacciones
   [Error message from API]
   [Reintentar button]
```

---

## 6. Key UI Patterns & Components

### 6.1 Balance Card Pattern

**Component**: `WalletBalanceCardComponent`

**Visual Structure**:
```
┌─────────────────────────────────────┐
│ Disponible                          │
│ USD 150.50                          │ ← Large, prominent
│                                     │
│ Bloqueado: USD 45.25 (for booking)  │ ← Secondary info
│ Total: USD 195.75                   │ ← Summary
│                                     │
│ Saldo actualizado hace 30s          │ ← Last update time
│                                     │
│ ⚠️ 3 depósito(s) pendiente(s)       │ ← If applicable
│ [Actualizar] [Entiendo]             │
│                                     │
│ [Depositar]                         │ ← Primary action
└─────────────────────────────────────┘
```

**States**:
- **Loading**: Spinner during balance fetch
- **Error**: Error message with Retry button
- **Normal**: Balance display with actions
- **Pending Deposits**: Alert banner when deposits are pending

**Key Features**:
- Auto-refresh every 30 seconds
- Real-time subscription to wallet changes
- Notification when deposit is confirmed
- Copy-to-clipboard for bank details

### 6.2 Balance Breakdown Cards

**Three-column layout** showing balance types:

```
┌──────────────────┬──────────────────┬──────────────────┐
│ Crédito          │ Transferible     │ Retirable        │
│ Protegido        │ (in-app)         │ (off-ramp)       │
├──────────────────┼──────────────────┼──────────────────┤
│ USD 300.00       │ USD 150.50       │ USD 200.75       │
│ Meta: USD 300    │ Envíalo a otros  │ Tu cuenta        │
│ [Configurar]     │ [Transferir]     │ [Retirar]        │
└──────────────────┴──────────────────┴──────────────────┘
```

**Color Coding**:
- Protected Credit: Warning color (amber/orange)
- Transferable: Success color (green)
- Withdrawable: Neutral color (gray)

### 6.3 Status Badge Pattern

**Styles**:
```
✅ Completada    (Green background, dark text)
⏳ Pendiente     (Amber background, dark text)
❌ Fallida       (Red background, light text)
🔄 Reembolsada   (Gray background, dark text)
```

**Usage**: Transaction status, withdrawal status, deposit status

### 6.4 Input Field Pattern (Currency)

**Deposit/Withdrawal amount inputs**:
```
ARS
┌────────────────────┐
│ 5,000.00           │ ← Decimal with 2 digits
└────────────────────┘

Conversión: ≈ USD 2.86
Mínimo: ARS 100
Máximo: ARS 1,000,000
```

**Validation Error Display**:
```
⚠️ El depósito mínimo es $100 ARS
```

### 6.5 Modal Overlay Pattern

**Deposit Modal**:
- Semi-transparent overlay (50% opacity)
- Centered modal
- Close button (X) in top-right
- Close on ESC key
- Close on overlay click
- Focus trap inside modal

**Modal Size**: max-width: 28rem (448px)

### 6.6 Section Header Pattern

```
Sección Label (uppercase, secondary text)
Main Title Here (large, bold, primary text)
Descripción: Subtitle text explaining the section
```

### 6.7 Alert/Info Card Patterns

**Warning/Info Card**:
```
┌──────────────────────────────────────┐
│ ⚠️ Título del Aviso                  │
│ Descripción del aviso que proporciona│
│ información importante al usuario.   │
│ [Action Button]                      │
└──────────────────────────────────────┘
```

**Success Message**:
```
✅ Éxito
Operación completada correctamente.
Detalles de la operación.
```

**Error Message**:
```
❌ Error
Error al procesar tu solicitud.
Por favor, reintenta más tarde.
[Reintentar] [Contactar Soporte]
```

### 6.8 Form Field Pattern

**Label + Input + Helper Text**:
```
Label *
┌──────────────────────────────────┐
│ Input value                      │
└──────────────────────────────────┘
Helper text or validation error message
```

**Validation States**:
- ✓ Valid: Green border (optional)
- ✗ Invalid: Red border + error message
- ⚠️ Warning: Amber border + warning message
- Disabled: Grayed out, no interaction

### 6.9 Expandable Section Pattern

```
[▼ Título de Sección Expandible]
   Subtítulo

┌─────────────────────────────────┐
│ Contenido expandible            │
│ - Item 1                        │
│ - Item 2                        │
│ - Item 3                        │
│ [CTA Button]                    │
└─────────────────────────────────┘
```

**Icon rotation**: Arrow rotates 180° when expanded

### 6.10 Tab Navigation Pattern

**Tab Buttons**:
```
[Transacciones] [Retiros]
     ▲ Active (filled background)  Inactive (border only)
```

**Active State**: 
- Background color: Primary or CTA color
- Text color: Light/inverse
- Indicator bar below

**Inactive State**:
- Border only
- Secondary text color
- Hover: Slight background change

---

## 7. Service Architecture

### 7.1 WalletService
**File**: `/home/user/autorenta/apps/web/src/app/core/services/wallet.service.ts`

**Key Methods**:
- `getBalance()`: Fetch current balance
- `initiateDeposit()`: Start deposit process with payment provider
- `getTransactions()`: Fetch transaction history
- `refreshPendingDepositsCount()`: Update pending deposits
- `forcePollPendingPayments()`: Force check for completed MercadoPago payments
- `subscribeToWalletChanges()`: Real-time wallet updates via Supabase

**Key Signals**:
- `balance()`: Current wallet balance object
- `availableBalance()`: Computed available funds
- `withdrawableBalance()`: Computed withdrawable funds
- `protectedCreditBalance()`: Computed protected credit amount
- `lockedBalance()`: Computed locked funds
- `totalBalance()`: Computed total
- `pendingDepositsCount()`: Count of pending deposits
- `transactions()`: Array of transactions
- `loading()`: Loading state
- `error()`: Current error (if any)

### 7.2 WithdrawalService
**File**: `/home/user/autorenta/apps/web/src/app/core/services/withdrawal.service.ts`

**Key Methods**:
- `getBankAccounts()`: Fetch user's bank accounts
- `addBankAccount()`: Add a new bank account
- `setDefaultBankAccount()`: Set account as default
- `deleteBankAccount()`: Remove bank account
- `getWithdrawalRequests()`: Fetch withdrawal history
- `requestWithdrawal()`: Submit withdrawal request
- `approveWithdrawal()`: Admin approval
- `rejectWithdrawal()`: Admin rejection

**Key Signals**:
- `bankAccounts()`: Array of bank accounts
- `withdrawalRequests()`: Array of withdrawal requests
- `defaultBankAccount()`: Computed default account
- `activeBankAccounts()`: Computed active accounts
- `pendingWithdrawals()`: Computed pending withdrawals
- `loading`: Loading state object (requesting, approving, etc.)
- `error()`: Current error

### 7.3 WalletLedgerService
**File**: `/home/user/autorenta/apps/web/src/app/core/services/wallet-ledger.service.ts`

**Key Methods**:
- `loadLedgerHistory()`: Fetch detailed transaction ledger
- `loadTransfers()`: Fetch recent transfers to other users
- `transferFunds()`: Transfer funds to another user
- `searchUserByWalletNumber()`: Find user by wallet account number
- `formatAmount()`: Format currency amounts

**Key Signals**:
- `ledgerHistory()`: Array of ledger entries
- `transfers()`: Array of transfers
- `loading()`: Loading state
- `error()`: Current error

---

## 8. Data Models

### Balance Object
```typescript
{
  user_id: string;
  available_balance: number;      // in cents
  locked_balance: number;          // in cents (booking holds)
  protected_credit_balance: number; // in cents (non-withdrawable)
  withdrawable_balance: number;     // in cents (available for withdrawal)
  total_balance: number;            // in cents
  currency: string;                 // "USD"
}
```

### Transaction Entry
```typescript
{
  id: string;
  user_id: string;
  transaction_date: string;        // ISO datetime
  transaction_type: string;        // "deposit", "lock", "charge", etc.
  status: string;                  // "pending", "completed", "failed"
  amount_cents: number;
  currency: string;                // "USD"
  metadata: Record<string, any>;   // Additional context
  booking_id?: string;             // Related booking
  source_system: string;           // "mercadopago", "wallet", etc.
}
```

### Bank Account
```typescript
{
  id: string;
  user_id: string;
  account_holder_name: string;
  bank_name: string;
  account_type: string;            // "corriente", "ahorro", etc.
  cbu: string;                     // 17 digits
  cuil_cuit: string;               // Tax ID
  is_default: boolean;
  is_active: boolean;
  created_at: string;              // ISO datetime
}
```

### Withdrawal Request
```typescript
{
  id: string;
  user_id: string;
  bank_account_id: string;
  amount_cents: number;
  fee_amount_cents: number;        // 1.5%
  net_amount_cents: number;        // amount - fee
  status: string;                  // "pending", "approved", "completed", "rejected"
  user_notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
```

---

## 9. Payment Webhook Integration

**Flow**:
1. User deposits via Mercado Pago
2. MercadoPago sends webhook to Cloudflare Worker
3. Worker validates signature and confirms payment
4. Worker updates wallet balance in Supabase
5. Supabase broadcasts realtime update
6. WalletBalanceCard receives update and shows notification

**Webhook URL**: `https://autorenta-web.pages.dev/webhooks/payments`

**Realtime Subscription**: WalletService subscribes to `wallet_transactions` table changes

---

## 10. Common User Flows

### Flow 1: New User Sets Up Protected Credit
1. User visits `/wallet`
2. Sees onboarding banner: "Configura tu crédito protegido"
3. Clicks "Configurar crédito protegido"
4. Deposit modal opens with "Crédito Autorentar" pre-selected
5. User enters ARS 30,000 (≈USD 300)
6. Selects Mercado Pago
7. Clicks "Continuar"
8. Mercado Pago opens in new window
9. User completes payment
10. Payment webhook confirms
11. Balance updates in wallet
12. User gets toast notification: "✅ Depósito Confirmado!"
13. Protected credit banner disappears
14. Benefits section collapses

### Flow 2: User Requests Withdrawal
1. User visits `/wallet`
2. Clicks "Solicitar retiro"
3. Switches to "Retiros" tab
4. Clicks "Cuentas bancarias" subtab
5. Adds bank account (if first time):
   - Enters account details
   - Clicks "Guardar Cuenta"
6. Returns to "Solicitar retiro" subtab
7. Selects bank account from dropdown
8. Enters amount: ARS 5,000
9. Sees calculated fee: ARS 75, Net: ARS 4,925
10. Clicks "Solicitar Retiro"
11. Withdrawal request created with status "pending"
12. Admin approves withdrawal
13. Funds transferred to bank account
14. Status changes to "completed"
15. User sees updated balance

### Flow 3: User Transfers Funds to Another User
1. User visits `/wallet`
2. Clicks quick action "Transferir"
3. Navigates to `/wallet/transfer`
4. Enters recipient's wallet account number (16 chars: AR12345678901234)
5. System searches and finds recipient
6. User's name appears with checkmark
7. User enters transfer amount
8. Optional: Adds description
9. Clicks "Transferir"
10. Funds transferred immediately
11. Both users' balances update
12. Success message: "Transferencia exitosa: ARS X,XXX.XX"
13. Recent transfers list updates

### Flow 4: User Views Transaction History
1. User visits `/wallet`
2. Sees "Transacciones" tab (default)
3. Optionally filters by type or status
4. Sees list of all movements
5. Clicks on transaction to expand details
6. Views metadata, booking reference, etc.
7. Clicks "Actualizar" to refresh list
8. Retries if error occurs

---

## 11. Error Handling & Edge Cases

### Insufficient Balance
```
❌ No tienes saldo suficiente para este retiro.
   Saldo disponible: USD 100.00
   Necesitas: USD 150.00
   [Depositar] [Contactar Soporte]
```

### Pending Deposits
```
⏳ Tienes 2 depósito(s) pendiente(s). 
   Se acreditan automáticamente en unos minutos.
   [Actualizar ahora]
```

### Payment Provider Failures
- **Mercado Pago Down**: Suggest bank transfer alternative
- **Network Error**: Show retry button
- **Invalid Card**: Show error from payment provider

### Locked Funds
Funds locked for booking security deposits cannot be withdrawn until:
- Booking is completed
- Security deposit is released
- 14-day hold period expires

---

## 12. Accessibility & Dark Mode

**Accessibility Features**:
- Focus trap in modals (ESC to close)
- Semantic HTML (labels, buttons, inputs)
- ARIA labels for icons
- Color + icons for status (not color alone)
- Keyboard navigation support

**Dark Mode**:
- All colors have dark variants
- Text colors adjust for contrast
- Images/icons adapt
- Backgrounds transition smoothly

---

## Summary: Key Files & Components

| Feature | Component | File |
|---------|-----------|------|
| Main Wallet Page | WalletPage | `/wallet/wallet.page.ts` |
| Balance Display | WalletBalanceCardComponent | `/shared/components/wallet-balance-card/` |
| Deposit Modal | DepositModalComponent | `/shared/components/deposit-modal/` |
| Transaction History | TransactionHistoryComponent | `/shared/components/transaction-history/` |
| Withdrawal Form | WithdrawalRequestFormComponent | `/shared/components/withdrawal-request-form/` |
| Bank Accounts | BankAccountsListComponent, BankAccountFormComponent | `/shared/components/bank-accounts-list/`, `/shared/components/bank-account-form/` |
| Withdrawal History | WithdrawalHistoryComponent | `/shared/components/withdrawal-history/` |
| Transfer | TransferFundsComponent | `/features/wallet/components/transfer-funds.component` |
| Wallet Service | WalletService | `/core/services/wallet.service.ts` |
| Withdrawal Service | WithdrawalService | `/core/services/withdrawal.service.ts` |
| Ledger Service | WalletLedgerService | `/core/services/wallet-ledger.service.ts` |

---

**Last Updated**: 2025-11-10
**Documentation Version**: 1.0
