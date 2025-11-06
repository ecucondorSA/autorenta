# Plan de Refactoring: Payment Services & Large Files

**Fecha:** 2025-11-06
**Branch:** `claude/refactor-payment-services-011CUrGLJJyJ4sBuU2BnBnpS`
**Prioridad:** 🔴 CRÍTICA

## 📊 Análisis de Archivos Problemáticos

### Archivos Críticos (>1,000 líneas)

| Archivo | Líneas | Prioridad | Complejidad | Tiempo Estimado |
|---------|--------|-----------|-------------|-----------------|
| `bookings.service.ts` | 1,427 | 🔴 Alta | Crítico | 6-8h |
| `publish-car-v2.page.ts` | 1,747 | 🔴 Alta | Medio | 6-8h |
| `wallet services` | 1,098 | 🔴 Alta | Crítico | 4-6h |
| `payment services` | Varios | 🔴 Alta | Crítico | 8-12h |

**Tiempo total estimado:** 24-34 horas

---

## 🎯 Problema 1: bookings.service.ts (1,427 líneas)

### Diagnóstico

**Responsabilidades mezcladas:**
- ✅ CRUD de bookings (correcto)
- ❌ Operaciones de wallet (lock/unlock funds, deposits)
- ❌ Gestión de seguros (activación, cálculos)
- ❌ Driver class (bonus-malus updates)
- ❌ Aprobación manual de reservas
- ❌ Validaciones complejas de disponibilidad
- ❌ Cálculos de precios
- ❌ Gestión de cancelaciones con reembolsos

**Dependencias inyectadas (God Object):**
```typescript
WalletService
InsuranceService
DriverProfileService
PwaService
ErrorHandlerService
LoggerService
```

### Solución: Arquitectura de 4 Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    BookingsService                          │
│  (Core CRUD + Orchestration)                                │
│  - getMyBookings()                                          │
│  - getBookingById()                                         │
│  - updateBooking()                                          │
│  - requestBooking() [simple]                                │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐  ┌────────▼────────┐  ┌──────▼────────┐
│   Booking    │  │    Booking      │  │   Booking     │
│   Wallet     │  │   Insurance     │  │  Validation   │
│  Operations  │  │   Operations    │  │   Service     │
└──────────────┘  └─────────────────┘  └───────────────┘
│                 │                    │
│ - lockFunds()   │ - activateCoverage()│ - validate   │
│ - unlockFunds() │ - getInsurance     │   Availability│
│ - charge        │   Summary()        │ - validate    │
│   Rental()      │ - calculate        │   Dates()     │
│ - release       │   Deposit()        │ - canWaitlist()│
│   Deposit()     │                    │               │
└─────────────────┴────────────────────┴───────────────┘
```

### Archivos a crear:

#### 1. `booking-wallet-operations.service.ts` (~250 líneas)
```typescript
@Injectable({ providedIn: 'root' })
export class BookingWalletOperationsService {
  // Extracted from bookings.service.ts:
  // - chargeRentalFromWallet() [lines 295-344]
  // - processRentalPayment() [lines 350-394]
  // - lockSecurityDeposit() [lines 400-459]
  // - releaseSecurityDeposit() [lines 464-499]
  // - deductFromSecurityDeposit() [lines 505-617]
}
```

#### 2. `booking-insurance-operations.service.ts` (~150 líneas)
```typescript
@Injectable({ providedIn: 'root' })
export class BookingInsuranceOperationsService {
  // Extracted from bookings.service.ts:
  // - activateInsuranceCoverage() [lines 1022-1042]
  // - getBookingInsuranceSummary() [lines 1047-1049]
  // - calculateInsuranceDeposit() [lines 1054-1056]
  // - hasOwnerInsurance() [lines 1061-1063]
  // - getInsuranceCommissionRate() [lines 1069-1071]
}
```

#### 3. `booking-validation.service.ts` (~300 líneas)
```typescript
@Injectable({ providedIn: 'root' })
export class BookingValidationService {
  // Extracted from bookings.service.ts:
  // - createBookingWithValidation() [lines 699-823]
  // - validateDates()
  // - checkAvailability()
  // - canWaitlist()
  // - validateUserPermissions()
}
```

#### 4. `booking-approval.service.ts` (~150 líneas)
```typescript
@Injectable({ providedIn: 'root' })
export class BookingApprovalService {
  // Extracted from bookings.service.ts:
  // - getPendingApprovals() [lines 1308-1316]
  // - approveBooking() [lines 1321-1361]
  // - rejectBooking() [lines 1366-1408]
  // - carRequiresApproval() [lines 1413-1427]
}
```

#### 5. `bookings.service.ts` (REFACTORED ~400 líneas)
```typescript
@Injectable({ providedIn: 'root' })
export class BookingsService {
  // Only orchestration + simple CRUD:
  private readonly bookingWallet = inject(BookingWalletOperationsService);
  private readonly bookingInsurance = inject(BookingInsuranceOperationsService);
  private readonly bookingValidation = inject(BookingValidationService);
  private readonly bookingApproval = inject(BookingApprovalService);

  // Simple CRUD:
  getMyBookings() { /* ... */ }
  getBookingById() { /* ... */ }
  updateBooking() { /* ... */ }

  // Orchestration:
  async createBooking(params) {
    await this.bookingValidation.validate(params);
    const booking = await this.requestBooking(...);
    await this.bookingInsurance.activateCoverage(booking.id);
    return booking;
  }
}
```

---

## 🎯 Problema 2: publish-car-v2.page.ts (1,747 líneas)

### Diagnóstico

**Responsabilidades mezcladas:**
- ❌ Template inline de 955 líneas
- ❌ Lógica de formulario (validaciones, autocompletado)
- ❌ Upload de fotos + AI generation
- ❌ Geocoding + reverse geocoding
- ❌ MercadoPago onboarding flow
- ❌ Carga de marcas/modelos

**Componente hace TODO:**
```typescript
// Lines 1-1747: EVERYTHING
- Form management (100+ lines)
- Photo upload + AI (200+ lines)
- Geocoding (150+ lines)
- MP onboarding (200+ lines)
- Submit logic (150+ lines)
- Template (955 lines!!!)
```

### Solución: Arquitectura Feature-Based

```
┌──────────────────────────────────────────────────────────┐
│            PublishCarV2Page (Component)                  │
│  (Only UI coordination + template)                       │
│  - Template: publish-car-v2.page.html (~300 lines)      │
│  - Component: ~250 lines                                 │
└──────────────────────────────────────────────────────────┘
                          │
      ┌───────────────────┼───────────────────┐
      │                   │                   │
┌─────▼──────┐  ┌────────▼────────┐  ┌──────▼────────┐
│  Publish   │  │   Publish       │  │   Publish     │
│   Car      │  │    Car          │  │     Car       │
│   Form     │  │   Photo         │  │   Location    │
│  Service   │  │  Service        │  │   Service     │
└────────────┘  └─────────────────┘  └───────────────┘
      │                   │                   │
      └───────────────────┴───────────────────┘
                          │
                  ┌───────▼──────────┐
                  │   Publish Car    │
                  │   MP Onboarding  │
                  │     Service      │
                  └──────────────────┘
```

### Archivos a crear:

#### 1. `publish-car-form.service.ts` (~200 líneas)
```typescript
@Injectable()
export class PublishCarFormService {
  // Extracted from publish-car-v2.page.ts:
  // - Form initialization (lines 1265-1298)
  // - Brand/model filtering (lines 1397-1413)
  // - Validation logic
  // - Auto-fill from last car (lines 1314-1344)
  // - Dynamic pricing toggle (lines 1070-1076)

  initForm(): FormGroup { /* ... */ }
  loadBrandsAndModels(): Observable<void> { /* ... */ }
  filterModels(brandId: string): CarModel[] { /* ... */ }
  autoFillFromLastCar(): Promise<void> { /* ... */ }
  setPricingStrategy(mode: 'dynamic' | 'custom'): void { /* ... */ }
}
```

#### 2. `publish-car-photo.service.ts` (~250 líneas)
```typescript
@Injectable()
export class PublishCarPhotoService {
  // Extracted from publish-car-v2.page.ts:
  // - Photo selection + validation (lines 1415-1454)
  // - AI photo generation (lines 1463-1520)
  // - Photo removal (lines 1456-1458)
  // - Preview generation

  selectPhotos(files: FileList): Promise<PhotoPreview[]> { /* ... */ }
  generateAIPhotos(brand: string, model: string, year: number): Promise<Blob[]> { /* ... */ }
  removePhoto(index: number): void { /* ... */ }
  validatePhoto(file: File): boolean { /* ... */ }
}
```

#### 3. `publish-car-location.service.ts` (~150 líneas)
```typescript
@Injectable()
export class PublishCarLocationService {
  // Extracted from publish-car-v2.page.ts:
  // - GPS location capture (lines 1522-1586)
  // - Reverse geocoding (lines 1536-1558)
  // - Address geocoding (lines 1632-1660)
  // - Coordinate validation

  useCurrentLocation(): Promise<GeoLocation> { /* ... */ }
  reverseGeocode(lat: number, lng: number): Promise<Address> { /* ... */ }
  geocodeAddress(address: Address): Promise<Coordinates> { /* ... */ }
}
```

#### 4. `publish-car-mp-onboarding.service.ts` (~200 líneas)
```typescript
@Injectable()
export class PublishCarMpOnboardingService {
  // Extracted from publish-car-v2.page.ts:
  // - MP status check (lines 1122-1147)
  // - Onboarding modal (lines 1194-1244)
  // - Status refresh (lines 1169-1192)
  // - Banner logic (computed signals)

  checkOnboardingStatus(): Promise<MarketplaceStatus> { /* ... */ }
  openOnboardingModal(): Promise<boolean> { /* ... */ }
  dismissReminder(): void { /* ... */ }
}
```

#### 5. `publish-car-v2.page.html` (~300 líneas)
```html
<!-- Template extracted from component -->
<!-- Hero section -->
<!-- Form sections -->
<!-- Sidebar -->
```

#### 6. `publish-car-v2.page.ts` (REFACTORED ~250 líneas)
```typescript
@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss']
})
export class PublishCarV2Page {
  private readonly formService = inject(PublishCarFormService);
  private readonly photoService = inject(PublishCarPhotoService);
  private readonly locationService = inject(PublishCarLocationService);
  private readonly mpService = inject(PublishCarMpOnboardingService);

  // Only orchestration:
  async onSubmit() {
    const formData = this.formService.getFormData();
    const photos = this.photoService.getPhotos();
    const location = await this.locationService.getCoordinates(formData.address);

    await this.carsService.createCar({ ...formData, ...location });
    await this.photoService.uploadPhotos(photos, carId);
  }
}
```

---

## 🎯 Problema 3: Servicios de Pago Duplicados

### Diagnóstico

**Archivo duplicado:**
- `/apps/web/src/app/core/services/checkout-payment.service.ts` (373 líneas)
- `/apps/web/src/app/features/bookings/checkout/services/checkout-payment.service.ts` (318 líneas)

**Diferencias clave:**
- **Core version**: Usa RxJS Observables, manejo transaccional explícito, rollback manual
- **Feature version**: Usa async/await, integra con CheckoutStateService, más moderno

### Solución: Consolidar en Feature Module

#### Decisión: **Usar versión de features/bookings/checkout/services**

**Razones:**
1. ✅ Más moderno (async/await > Observables innecesarios)
2. ✅ Integrado con CheckoutStateService
3. ✅ Mejor manejo de errores
4. ✅ Específico del feature (no es genérico)
5. ✅ Usa gateway pattern (MercadoPagoBookingGateway)

#### Paso 1: Eliminar versión duplicada

```bash
# Eliminar versión vieja
rm apps/web/src/app/core/services/checkout-payment.service.ts
```

#### Paso 2: Buscar y actualizar imports

```bash
# Buscar todos los imports del servicio viejo
grep -r "from.*core/services/checkout-payment" apps/web/src/
```

#### Paso 3: Actualizar imports a nueva ubicación

```typescript
// ❌ VIEJO (core)
import { CheckoutPaymentService } from '@core/services/checkout-payment.service';

// ✅ NUEVO (feature)
import { CheckoutPaymentService } from '@features/bookings/checkout/services/checkout-payment.service';
```

---

## 🎯 Problema 4: wallet.service.ts (509 líneas)

### Diagnóstico

**Responsabilidades mezcladas:**
- ✅ Balance queries (correcto)
- ✅ Transaction history (correcto)
- ✅ Lock/unlock funds (correcto)
- ❌ Protection Credit operations (lines 388-508)
- ❌ Renewal eligibility checks
- ❌ Issue protection credit (admin operation)

**Protection Credit añadido después** (comentario line 387):
```typescript
// ============================================================================
// PROTECTION CREDIT METHODS - Added 2025-11-05
// ============================================================================
```

### Solución: Extraer WalletProtectionCreditService

```
┌─────────────────────────────────────────┐
│        WalletService                    │
│  (Core wallet operations)               │
│  - getBalance()                         │
│  - getTransactions()                    │
│  - lockFunds()                          │
│  - unlockFunds()                        │
│  - initiateDeposit()                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  WalletProtectionCreditService          │
│  (Protection Credit specific)           │
│  - getProtectionCreditBalance()         │
│  - issueProtectionCredit()              │
│  - checkRenewalEligibility()            │
│  - getTotalCoverageBalance()            │
└─────────────────────────────────────────┘
```

### Archivos a crear:

#### 1. `wallet-protection-credit.service.ts` (~150 líneas)
```typescript
@Injectable({ providedIn: 'root' })
export class WalletProtectionCreditService {
  private readonly supabase = inject(SupabaseClientService);
  private readonly walletService = inject(WalletService);

  // Extracted from wallet.service.ts:
  // - getProtectionCreditBalance() [lines 395-419]
  // - issueProtectionCredit() [lines 425-447]
  // - checkProtectionCreditRenewal() [lines 452-491]
  // - getProtectionCreditFormatted() [lines 496-499]
  // - getTotalCoverageBalance() [lines 505-507]
}
```

#### 2. `wallet.service.ts` (REFACTORED ~350 líneas)
```typescript
@Injectable({ providedIn: 'root' })
export class WalletService {
  // Remove lines 387-508 (Protection Credit methods)
  // Keep only:
  // - Balance operations
  // - Transaction history
  // - Lock/unlock funds
  // - Deposit initiation
  // - Realtime subscriptions
}
```

---

## 🎯 Problema 5: Arquitectura de Payment Services

### Diagnóstico Actual

**Servicios fragmentados sin jerarquía clara:**
```
payments.service.ts (290 lines)
  - Basic payment intent creation
  - Mock payment simulation (DEV only)

split-payment.service.ts (401 lines)
  - Payment splitting across collectors
  - Platform fee calculation

payment-authorization.service.ts (172 lines)
  - Pre-authorizations (credit card holds)
  - Capture/cancel operations

checkout-payment.service.ts (318 lines x2)
  - Orchestrates checkout payment flow
  - Wallet + credit card + partial
```

**Problemas:**
1. No hay un "orchestrator" central
2. Responsabilidades solapadas
3. No está claro qué servicio usar en qué contexto
4. Lógica de negocio duplicada

### Solución: Arquitectura en Capas

```
┌────────────────────────────────────────────────────────┐
│            PaymentOrchestrationService                 │
│  (High-level orchestration)                            │
│  - processBookingPayment()                             │
│  - handlePaymentWebhook()                              │
│  - processRefund()                                     │
└────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼─────┐  ┌────────▼────────┐  ┌───▼──────────┐
│  Payments   │  │   Payment       │  │  Payment     │
│  Service    │  │ Authorization   │  │   Split      │
│  (Core)     │  │   Service       │  │  Service     │
└─────────────┘  └─────────────────┘  └──────────────┘
│                │                    │
│ - create      │ - authorize()       │ - split      │
│   Intent()    │ - capture()         │   Payment()  │
│ - get         │ - cancel()          │ - calculate  │
│   Status()    │                     │   Fees()     │
└───────────────┴─────────────────────┴──────────────┘
                          │
                          │
        ┌─────────────────▼─────────────────┐
        │  CheckoutPaymentService           │
        │  (Feature-specific orchestration)  │
        │  - payWithWallet()                │
        │  - payWithCreditCard()            │
        │  - payWithPartialWallet()         │
        └───────────────────────────────────┘
```

### Archivos a crear:

#### 1. `payment-orchestration.service.ts` (~300 líneas)
```typescript
@Injectable({ providedIn: 'root' })
export class PaymentOrchestrationService {
  private readonly payments = inject(PaymentsService);
  private readonly auth = inject(PaymentAuthorizationService);
  private readonly split = inject(SplitPaymentService);
  private readonly checkout = inject(CheckoutPaymentService);

  /**
   * High-level payment processing
   * Decides which flow to use based on context
   */
  async processBookingPayment(params: BookingPaymentParams): Promise<PaymentResult> {
    // Decide flow: wallet, credit card, or partial
    // Handle errors + rollback
    // Send notifications
    // Update analytics
  }

  /**
   * Process webhook from payment provider
   */
  async handlePaymentWebhook(webhook: WebhookPayload): Promise<void> {
    // Validate signature
    // Update payment intent
    // Trigger side effects (email, update booking)
  }

  /**
   * Process refund (cancellation or dispute)
   */
  async processRefund(params: RefundParams): Promise<RefundResult> {
    // Check refund policy
    // Calculate amount
    // Process via provider
    // Update booking status
  }
}
```

### Jerarquía de responsabilidades:

| Servicio | Responsabilidad | Usado por |
|----------|----------------|-----------|
| `PaymentOrchestrationService` | Orquestación de alto nivel, webhooks | Controllers, webhooks |
| `CheckoutPaymentService` | Flujo específico de checkout | Checkout feature |
| `PaymentsService` | CRUD de payment intents | Todos los servicios |
| `PaymentAuthorizationService` | Pre-auths de tarjetas | PaymentOrchestration |
| `SplitPaymentService` | División de pagos | PaymentOrchestration |

---

## 📋 Plan de Implementación

### Fase 1: Bookings Service (Día 1-2)

**Duración:** 6-8 horas

#### Step 1.1: Crear servicios auxiliares
```bash
# Crear archivos nuevos
touch apps/web/src/app/core/services/booking-wallet-operations.service.ts
touch apps/web/src/app/core/services/booking-insurance-operations.service.ts
touch apps/web/src/app/core/services/booking-validation.service.ts
touch apps/web/src/app/core/services/booking-approval.service.ts
```

#### Step 1.2: Extraer métodos de wallet
```typescript
// 1. Copy methods from bookings.service.ts lines 295-617
// 2. Paste in booking-wallet-operations.service.ts
// 3. Update dependencies
// 4. Add proper error handling
```

#### Step 1.3: Extraer métodos de insurance
```typescript
// 1. Copy methods from bookings.service.ts lines 1022-1071
// 2. Paste in booking-insurance-operations.service.ts
// 3. Inject InsuranceService
```

#### Step 1.4: Extraer validaciones
```typescript
// 1. Copy createBookingWithValidation (lines 699-823)
// 2. Extract validation logic to booking-validation.service.ts
// 3. Simplify error handling
```

#### Step 1.5: Extraer aprobaciones
```typescript
// 1. Copy approval methods (lines 1308-1427)
// 2. Create booking-approval.service.ts
```

#### Step 1.6: Refactorizar BookingsService
```typescript
// 1. Remove extracted methods
// 2. Inject new services
// 3. Update method calls to delegate
// 4. Keep only CRUD + orchestration
```

#### Step 1.7: Actualizar imports
```bash
# Buscar todos los archivos que usan BookingsService
grep -r "BookingsService" apps/web/src/ | grep -v "node_modules"

# Actualizar imports según métodos movidos
```

#### Step 1.8: Tests
```bash
npm run test -- bookings.service.spec.ts
npm run test -- booking-wallet-operations.service.spec.ts
```

---

### Fase 2: Publish Car Component (Día 3-4)

**Duración:** 6-8 horas

#### Step 2.1: Extraer template
```bash
# Crear archivo de template
touch apps/web/src/app/features/cars/publish/publish-car-v2.page.html
touch apps/web/src/app/features/cars/publish/publish-car-v2.page.scss

# Mover template (lines 24-954) a .html
# Mover estilos (lines 956-1005) a .scss
```

#### Step 2.2: Crear servicios auxiliares
```bash
touch apps/web/src/app/features/cars/publish/services/publish-car-form.service.ts
touch apps/web/src/app/features/cars/publish/services/publish-car-photo.service.ts
touch apps/web/src/app/features/cars/publish/services/publish-car-location.service.ts
touch apps/web/src/app/features/cars/publish/services/publish-car-mp-onboarding.service.ts
```

#### Step 2.3: Extraer lógica de formulario
```typescript
// 1. Move form initialization to publish-car-form.service.ts
// 2. Move brand/model filtering
// 3. Move validation logic
// 4. Move auto-fill logic
```

#### Step 2.4: Extraer lógica de fotos
```typescript
// 1. Move photo selection (lines 1415-1454)
// 2. Move AI generation (lines 1463-1520)
// 3. Move photo removal
```

#### Step 2.5: Extraer lógica de ubicación
```typescript
// 1. Move GPS capture (lines 1522-1586)
// 2. Move geocoding (lines 1632-1660)
```

#### Step 2.6: Extraer MP onboarding
```typescript
// 1. Move MP status check (lines 1122-1147)
// 2. Move onboarding modal (lines 1194-1244)
```

#### Step 2.7: Refactorizar componente
```typescript
// 1. Remove extracted logic
// 2. Inject new services
// 3. Update template bindings
// 4. Simplify onSubmit() to orchestration only
```

---

### Fase 3: Payment Services (Día 5-6)

**Duración:** 8-12 horas

#### Step 3.1: Consolidar checkout-payment duplicados
```bash
# 1. Analizar diferencias
diff apps/web/src/app/core/services/checkout-payment.service.ts \
     apps/web/src/app/features/bookings/checkout/services/checkout-payment.service.ts

# 2. Eliminar versión vieja
rm apps/web/src/app/core/services/checkout-payment.service.ts

# 3. Buscar imports
grep -r "core/services/checkout-payment" apps/web/src/

# 4. Actualizar imports
# core/services/checkout-payment → features/bookings/checkout/services/checkout-payment
```

#### Step 3.2: Crear PaymentOrchestrationService
```bash
touch apps/web/src/app/core/services/payment-orchestration.service.ts
```

```typescript
@Injectable({ providedIn: 'root' })
export class PaymentOrchestrationService {
  private readonly payments = inject(PaymentsService);
  private readonly auth = inject(PaymentAuthorizationService);
  private readonly split = inject(SplitPaymentService);

  async processBookingPayment(params) { /* ... */ }
  async handlePaymentWebhook(webhook) { /* ... */ }
  async processRefund(params) { /* ... */ }
}
```

#### Step 3.3: Actualizar PaymentsService
```typescript
// 1. Keep only core payment intent operations
// 2. Remove orchestration logic
// 3. Remove webhook handling (move to PaymentOrchestration)
```

#### Step 3.4: Actualizar referencias
```bash
# Buscar todos los usos de payment services
grep -r "PaymentsService\|CheckoutPaymentService\|SplitPaymentService" apps/web/src/

# Actualizar según nueva jerarquía
```

---

### Fase 4: Wallet Service (Día 7)

**Duración:** 4-6 horas

#### Step 4.1: Crear WalletProtectionCreditService
```bash
touch apps/web/src/app/core/services/wallet-protection-credit.service.ts
```

```typescript
@Injectable({ providedIn: 'root' })
export class WalletProtectionCreditService {
  // Move lines 388-508 from wallet.service.ts
}
```

#### Step 4.2: Refactorizar WalletService
```typescript
// 1. Remove Protection Credit methods (lines 388-508)
// 2. Remove deprecated computed signals
// 3. Clean up comments
```

#### Step 4.3: Actualizar referencias
```bash
# Buscar usos de Protection Credit
grep -r "protectedCreditBalance\|getProtectionCredit" apps/web/src/

# Actualizar imports
```

---

### Fase 5: Testing & Cleanup (Día 8)

**Duración:** 4-6 horas

#### Step 5.1: Ejecutar tests
```bash
npm run test:quick
npm run lint
npm run build
```

#### Step 5.2: Verificar imports rotos
```bash
# Buscar imports que no existen
grep -r "from.*services/.*" apps/web/src/ | while read line; do
  # Verify file exists
done
```

#### Step 5.3: Actualizar documentation
```bash
# Actualizar CLAUDE.md con nueva arquitectura
# Agregar diagramas de dependencias
```

#### Step 5.4: Commit & push
```bash
git add .
git commit -m "refactor: payment services architecture

- Split bookings.service.ts into 4 services (1,427→400 lines)
- Extract publish-car-v2 logic to 4 services (1,747→250 lines)
- Consolidate duplicate checkout-payment services
- Extract wallet-protection-credit.service (509→350 lines)
- Create payment-orchestration.service for high-level flows
- Update all imports and references

BREAKING CHANGES:
- BookingsService methods moved to dedicated services
- CheckoutPaymentService moved to feature module
- WalletService Protection Credit methods extracted

Closes #XX"

git push origin claude/refactor-payment-services-011CUrGLJJyJ4sBuU2BnBnpS
```

---

## 📊 Métricas de Éxito

### Antes del Refactoring

| Archivo | Líneas | Responsabilidades | Dependencias |
|---------|--------|-------------------|--------------|
| bookings.service.ts | 1,427 | 7 | 6 |
| publish-car-v2.page.ts | 1,747 | 6 | 8 |
| wallet.service.ts | 509 | 4 | 3 |
| payment services | 1,183 | 5 | 10 |
| **TOTAL** | **4,866** | **22** | **27** |

### Después del Refactoring

| Archivo | Líneas | Responsabilidades | Dependencias |
|---------|--------|-------------------|--------------|
| bookings.service.ts | ~400 | 2 (CRUD + orchestration) | 4 |
| publish-car-v2.page.ts | ~250 | 1 (UI coordination) | 4 |
| wallet.service.ts | ~350 | 2 (balance + transactions) | 2 |
| payment services | ~1,500 | 1 cada uno | 15 |
| **TOTAL** | **~2,500** | **6-8** | **25** |

### Mejoras

- ✅ **-48% líneas de código** en archivos críticos
- ✅ **-63% responsabilidades** por archivo
- ✅ **+12 servicios** bien definidos
- ✅ **100% separación de concerns**
- ✅ **Testeable** (cada servicio independiente)

---

## 🚨 Riesgos y Mitigación

### Riesgo 1: Breaking Changes
**Impacto:** Alto
**Probabilidad:** Alta

**Mitigación:**
- Deprecar métodos antes de eliminar
- Crear aliases temporales
- Actualizar todos los imports en un solo commit
- Ejecutar tests exhaustivos

### Riesgo 2: Circular Dependencies
**Impacto:** Medio
**Probabilidad:** Media

**Mitigación:**
- Usar jerarquía clara (orquestador → servicios específicos)
- Evitar inject() cruzados
- Usar interfaces para desacoplar

### Riesgo 3: Regresiones en Producción
**Impacto:** Crítico
**Probabilidad:** Baja

**Mitigación:**
- Feature flag para nuevo código
- Desplegar en staging primero
- Monitoreo de errores (Sentry)
- Rollback plan preparado

---

## 📚 Referencias

- [Angular Service Best Practices](https://angular.io/guide/styleguide#services)
- [Single Responsibility Principle](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

## ✅ Checklist de Implementación

### Fase 1: Bookings Service
- [ ] Crear booking-wallet-operations.service.ts
- [ ] Crear booking-insurance-operations.service.ts
- [ ] Crear booking-validation.service.ts
- [ ] Crear booking-approval.service.ts
- [ ] Refactorizar bookings.service.ts
- [ ] Actualizar imports
- [ ] Tests unitarios

### Fase 2: Publish Car Component
- [ ] Extraer template a .html
- [ ] Crear publish-car-form.service.ts
- [ ] Crear publish-car-photo.service.ts
- [ ] Crear publish-car-location.service.ts
- [ ] Crear publish-car-mp-onboarding.service.ts
- [ ] Refactorizar componente
- [ ] Actualizar bindings

### Fase 3: Payment Services
- [ ] Consolidar checkout-payment duplicados
- [ ] Crear payment-orchestration.service.ts
- [ ] Refactorizar payments.service.ts
- [ ] Actualizar referencias

### Fase 4: Wallet Service
- [ ] Crear wallet-protection-credit.service.ts
- [ ] Refactorizar wallet.service.ts
- [ ] Actualizar referencias

### Fase 5: Testing & Cleanup
- [ ] npm run test:quick
- [ ] npm run lint
- [ ] npm run build
- [ ] Actualizar documentación
- [ ] Commit & push

---

**Autor:** Claude (Anthropic)
**Fecha:** 2025-11-06
**Estado:** 🟡 PENDIENTE DE APROBACIÓN
