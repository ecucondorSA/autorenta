# 🎨 Auditoría UX - AutoRenta

**Fecha**: 2025-11-10
**Versión**: 1.0
**Issues Relacionados**: #183, #184, #185, #186, #187
**Branch**: `claude/ux-audit-design-flows-011CUyvN7pCWTNpzTmH5M9TZ`

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Metodología](#metodología)
3. [Sección 1: Auditoría de Flujos UX](#sección-1-auditoría-de-flujos-ux)
   - [1.1 Flujo de Booking](#11-flujo-de-booking)
   - [1.2 Flujo de Publicación](#12-flujo-de-publicación)
   - [1.3 Flujo de Wallet](#13-flujo-de-wallet)
   - [1.4 Dashboard del Locador](#14-dashboard-del-locador)
4. [Sección 2: Auditoría Visual](#sección-2-auditoría-visual)
   - [2.1 Auditoría de Colores](#21-auditoría-de-colores)
   - [2.2 Auditoría de Tipografía](#22-auditoría-de-tipografía)
   - [2.3 Auditoría de Espaciados](#23-auditoría-de-espaciados)
   - [2.4 Auditoría de Estados](#24-auditoría-de-estados)
   - [2.5 Auditoría de Componentes Críticos](#25-auditoría-de-componentes-críticos)
5. [Pain Points Identificados](#pain-points-identificados)
6. [Hallazgos Prioritarios](#hallazgos-prioritarios)
7. [Recomendaciones Generales](#recomendaciones-generales)
8. [Próximos Pasos](#próximos-pasos)

---

## Introducción

Este documento presenta los hallazgos de la **auditoría UX de los flujos críticos** de AutoRenta, realizada como parte del Issue #183. El objetivo es identificar pain points, inconsistencias y oportunidades de mejora en la experiencia de usuario de cuatro flujos principales:

- **Booking**: Proceso de reserva de autos (locatario)
- **Publicación**: Proceso de publicar un auto (locador)
- **Wallet**: Gestión de balance y transacciones
- **Dashboard**: Panel de control del locador

### Alcance

La auditoría se enfoca en el **happy path** de cada flujo, documentando:
- Mapeo completo del flujo paso a paso
- Componentes y páginas involucradas
- Pain points y fricción identificada
- Oportunidades de mejora UX

### Fuera de Alcance (para issues posteriores)

- Auditoría visual detallada (colores, tipografía) → Issue #184
- Propuestas de diseño y wireframes → Issue #185
- Implementación de mejoras → Issue #186
- Validación y QA final → Issue #187

---

## Metodología

### Herramientas Utilizadas

1. **Análisis de Código**: Revisión de componentes, páginas y servicios
2. **Mapeo de Rutas**: Documentación de navegación y transiciones
3. **Identificación de Componentes**: Listado de componentes involucrados por flujo
4. **Análisis de Estados**: Loading, error, empty states por flujo

### Criterios de Evaluación

Para cada flujo se evaluó:
- ✅ **Claridad**: ¿El usuario entiende qué hacer en cada paso?
- ✅ **Eficiencia**: ¿Cuántos pasos requiere completar el flujo?
- ✅ **Feedback**: ¿El sistema comunica claramente el estado?
- ✅ **Recuperación de Errores**: ¿El usuario puede recuperarse fácilmente de errores?
- ✅ **Consistencia**: ¿Los patrones son consistentes con el resto de la app?

---

## Sección 1: Auditoría de Flujos UX

---

### 1.1 Flujo de Booking

**Objetivo del Flujo**: Permitir a un locatario (renter) reservar un auto y completar el pago.

#### 1.1.1 Mapeo del Flujo

```
ENTRY POINT 1: Marketplace/Explore
├─ Browse cars on map
├─ Select car → Drawer
├─ Click "Reserve" → QuickBookingModal
└─ Navigate to checkout

ENTRY POINT 2: Car Detail Page
├─ View car details
├─ Select dates (DateRangePicker)
├─ See dynamic pricing
├─ Click "Book now"
└─ BookingLocationForm → Submit

   ↓

STEP 1: Booking Detail & Payment
Route: /bookings/detail-payment?bookingId={id}
├─ Booking Summary Card (car, dates, pricing)
├─ Payment Mode Toggle (card vs wallet)
├─ Coverage Upgrade Selector (standard/premium/zero)
├─ Risk Policy Table
├─ Payment Summary Panel
├─ Payment Authorization (if card)
├─ Terms & Consents
└─ Submit → Process Payment

   ↓

STEP 2: Payment Processing
├─ Wallet: Lock funds → Immediate confirmation
└─ Credit Card: Redirect MercadoPago → Polling

   ↓

STEP 3: Success Page
Route: /bookings/success/:id
├─ Confirmation details
├─ Next steps (check-in, contract)
└─ Navigate to "My Bookings"
```

#### 1.1.2 Componentes Clave

| Componente | Archivo | Propósito |
|------------|---------|-----------|
| **MarketplaceV2Page** | `features/marketplace/marketplace-v2.page.ts` | Entry point - map-based browsing |
| **CarDetailPage** | `features/cars/detail/car-detail.page.ts` | Detailed car view + date selection |
| **BookingLocationForm** | `features/bookings/components/booking-location-form/` | Pickup location and date confirmation |
| **BookingDetailPaymentPage** | `features/bookings/booking-detail-payment/` | **Main checkout page** |
| **BookingSummaryCard** | `booking-detail-payment/components/booking-summary-card` | Shows car, dates, pricing |
| **PaymentModeToggle** | `booking-detail-payment/components/payment-mode-toggle` | Card vs Wallet selection |
| **CoverageUpgradeSelector** | `booking-detail-payment/components/coverage-upgrade-selector` | Insurance options |
| **PaymentSummaryPanel** | `booking-detail-payment/components/payment-summary-panel` | Price breakdown |
| **TermsAndConsents** | `booking-detail-payment/components/terms-and-consents` | User consents (T&C, cancellation, insurance) |
| **BookingSuccessPage** | `features/bookings/booking-success/` | Confirmation page |

#### 1.1.3 Pain Points Identificados

##### 🔴 CRÍTICO: Complejidad de Checkout

**Problema**: La página `BookingDetailPaymentPage` es muy densa con múltiples decisiones simultáneas:
- Método de pago (card vs wallet)
- Upgrade de cobertura (3 opciones)
- Términos y consentimientos (4 checkboxes)
- Autorización de pago (si card)

**Impacto**:
- Sobrecarga cognitiva para el usuario
- Alto riesgo de abandono en este paso crítico
- Difícil de navegar en mobile (mucha información en scroll vertical)

**Evidencia**:
```typescript
// booking-detail-payment.page.ts - 1,800+ líneas
// Múltiples signals y estados:
readonly paymentMode = signal<PaymentMode>('card');
readonly coverageUpgrade = signal<CoverageUpgrade>('standard');
readonly consents = signal<UserConsents>({ ... });
readonly paymentAuth = signal<PaymentAuthorization | null>(null);
```

**Prioridad**: 🔴 Alta

---

##### 🟡 MEDIO: Confusión en Payment Mode (Card vs Wallet)

**Problema**: No está claro para usuarios nuevos cuál es la diferencia entre:
- **Card Mode**: Hold temporal en tarjeta (no cargo inmediato)
- **Wallet Mode**: Fondos bloqueados en wallet

**Impacto**:
- Usuarios pueden elegir wallet sin tener fondos suficientes
- Frustración al no entender por qué se "bloquea" dinero

**Evidencia**:
```html
<!-- PaymentModeToggleComponent -->
<!-- Descripción muy breve, sin explicación clara de diferencias -->
<button>Con Tarjeta</button>
<button>Con Wallet</button>
```

**Sugerencia**: Agregar tooltip o modal explicativo con comparación clara:

```
Con Tarjeta:
✓ Hold temporal (no se cobra aún)
✓ Liberado después del check-in
✓ No necesitas fondos en wallet

Con Wallet:
✓ Fondos bloqueados en tu wallet
✓ Más rápido (sin autorizaciones)
✓ Requiere balance suficiente
```

**Prioridad**: 🟡 Media

---

##### 🟡 MEDIO: Polling en Success Page (Credit Card)

**Problema**: Cuando el usuario completa pago con MercadoPago, regresa a la success page pero el booking puede estar aún "pending". El sistema hace polling cada 3 segundos por hasta 2 minutos.

**Impacto**:
- Ansiedad del usuario ("¿se confirmó mi pago?")
- No hay feedback claro durante el polling
- Si falla el webhook, el usuario puede quedar 2 minutos esperando

**Evidencia**:
```typescript
// booking-success.page.ts
startPolling(): void {
  const MAX_POLL_ATTEMPTS = 40; // 2 minutos
  const POLL_INTERVAL_MS = 3000; // 3 segundos

  // Polling sin feedback visual claro
  this.pollingInterval = setInterval(async () => {
    const booking = await this.bookingsService.getBookingById(id);
    // ...
  }, POLL_INTERVAL_MS);
}
```

**Sugerencia**:
- Mostrar spinner + mensaje: "Confirmando tu pago con MercadoPago... (puede tomar hasta 1 minuto)"
- Agregar botón "Verificar ahora" para polling manual
- Enviar notificación push cuando se confirme (no depender solo de polling)

**Prioridad**: 🟡 Media

---

##### 🟢 BAJO: Multi-Entry Points (Confusión de Navegación)

**Problema**: Hay múltiples formas de entrar al flujo de booking:
1. Marketplace map → QuickBookingModal → Directo a success
2. Marketplace map → Car detail → Location form → Detail-payment
3. Direct URL a car detail → Location form → Detail-payment

**Impacto**:
- Diferentes experiencias según entry point
- QuickBookingModal bypasea la página de detail-payment (menos transparencia)
- Confusión para usuarios que esperan pasos consistentes

**Sugerencia**: Unificar en un solo flujo consistente:
```
Map/List → Car Detail → Location → Payment → Success
```

**Prioridad**: 🟢 Baja (no afecta conversión directamente)

---

#### 1.1.4 Fortalezas del Flujo

✅ **Pricing Transparente**: El breakdown de precios es claro (rental amount, deposit, coverage upgrade)
✅ **Validación Robusta**: Múltiples validaciones antes de permitir submit
✅ **Wallet Integration**: Opción de pagar con balance interno reduce fricción
✅ **Coverage Options**: Claras diferencias entre standard, premium, zero franchise
✅ **Real-time Calculations**: Pricing se actualiza dinámicamente con cada cambio

---

#### 1.1.5 Métricas Recomendadas a Trackear

Para medir mejoras futuras:
- **Abandono por paso**: ¿En qué paso abandonan más usuarios?
  - Car detail → Location form: ____%
  - Location form → Detail-payment: ____%
  - Detail-payment → Submit: ____%
- **Tiempo promedio en detail-payment**: ¿Cuánto tardan en decidir?
- **Tasa de conversión wallet vs card**: ¿Cuál método completa más bookings?
- **Polling success rate**: ¿Cuántos usuarios completan el polling exitosamente?

---

### 1.2 Flujo de Publicación

**Objetivo del Flujo**: Permitir a un locador (owner) publicar su auto en la plataforma.

#### 1.2.1 Mapeo del Flujo

```
ENTRY POINT: My Cars Page
Route: /cars/my-cars
├─ Button: "Publicar nuevo auto"
└─ Navigate to /cars/publish

   ↓

STEP 1: Publish Form (Single Page Wizard)
Route: /cars/publish (create) OR /cars/publish?edit={carId} (edit)

SECCIÓN 1: 🚗 Información del Vehículo
├─ Brand (dropdown)
├─ Model (dropdown, filtered by brand)
├─ Year (number, 1980-2025)
├─ Color (text)
├─ Mileage (number)
├─ Transmission (dropdown: manual/automatic)
└─ Fuel Type (dropdown: nafta/diesel/electric/hybrid)

SECCIÓN 2: 💰 Precio y Condiciones
├─ Pricing Strategy (dynamic vs custom)
├─ Price per Day (number, USD/ARS/UYU)
├─ Currency (dropdown)
├─ Vehicle Value USD (number, $5k-$500k)
│  └─ Auto-suggestion: dailyPrice × 180 days
├─ Min/Max Rental Days
├─ Deposit Required (checkbox)
│  └─ Deposit Amount (if required)
├─ Insurance Included (checkbox)
└─ Auto-Approve Bookings (checkbox)

SECCIÓN 3: 📍 Ubicación
├─ Street (text)
├─ Street Number (text)
├─ City (text)
├─ State (text)
├─ Country (dropdown: AR, UY, BR, CL, PY)
├─ Optional: Neighborhood, Postal Code
└─ Button: "📍 Usar Mi Ubicación" (GPS auto-locate)

SECCIÓN 4: 📸 Fotos del Auto
├─ Min: 3 photos, Max: 10 photos
├─ Method A: Manual upload (file input)
├─ Method B: Stock photos (modal selector)
├─ Method C: AI generation (modal generator)
└─ Photo grid with drag-to-reorder (first = cover)

   ↓

STEP 2: Submit & Geocode
├─ Validate form (all required fields)
├─ Validate photos (min 3)
├─ Geocode address → lat/lng
├─ POST /rest/v1/cars (create or update)
├─ Upload photos to Supabase Storage
└─ Success alert

   ↓

STEP 3: Redirect to My Cars
Route: /cars/my-cars
└─ Car appears in list with status='active'
```

#### 1.2.2 Componentes Clave

| Componente | Archivo | Propósito |
|------------|---------|-----------|
| **MyCarsPage** | `features/cars/my-cars/my-cars.page.ts` | Entry point - lista de autos del locador |
| **PublishCarV2Page** | `features/cars/publish/publish-car-v2.page.ts` | **Main publish form** (recommended) |
| **PublishCarFormService** | `publish/services/publish-car-form.service.ts` | Form management, validation |
| **PublishCarPhotoService** | `publish/services/publish-car-photo.service.ts` | Photo upload (manual, stock, AI) |
| **PublishCarLocationService** | `publish/services/publish-car-location.service.ts` | Geocoding, GPS location |
| **PublishCarMpOnboardingService** | `publish/services/publish-car-mp-onboarding.service.ts` | MercadoPago onboarding banner |
| **StockPhotosSelectorComponent** | `shared/components/stock-photos-selector/` | Modal para seleccionar fotos de stock |
| **AiPhotoGeneratorComponent** | `shared/components/ai-photo-generator/` | Modal para generar fotos con IA |

#### 1.2.3 Pain Points Identificados

##### 🔴 CRÍTICO: Formulario Muy Largo (Single-Page)

**Problema**: El formulario de publicación es una sola página con 4 secciones extensas (~20 campos requeridos). Requiere mucho scroll vertical, especialmente en mobile.

**Impacto**:
- Sobrecarga cognitiva (demasiada info visible simultáneamente)
- Alto riesgo de abandono antes de completar
- Difícil de navegar en mobile (scroll infinito)
- Usuario no tiene sensación de progreso

**Evidencia**:
```html
<!-- publish-car-v2.page.html -->
<!-- Formulario de ~800 líneas de template -->
<!-- Sin indicador de progreso o steps visibles -->
```

**Sugerencia**: Convertir a wizard multi-step:
```
Step 1: Vehículo (brand, model, year, specs)        [1/4]
Step 2: Precio y Condiciones                        [2/4]
Step 3: Ubicación                                   [3/4]
Step 4: Fotos → Preview → Submit                    [4/4]
```

**Prioridad**: 🔴 Alta

---

##### 🟡 MEDIO: Confusión con Pricing Strategy (Dynamic vs Custom)

**Problema**: El toggle de "Pricing Strategy" (dinámico vs custom) no explica claramente qué hace el modo dinámico.

**Impacto**:
- Locadores no entienden si perderán control del precio
- Miedo a dejar precio en "automático"
- Preferencia por custom sin entender los beneficios del dinámico

**Evidencia**:
```html
<!-- Descripción muy básica -->
<label>Precio Dinámico</label>
<p>AutoRenta ajusta el precio automáticamente</p>
<!-- ¿Qué factores considera? ¿Qué rango de precios? -->
```

**Sugerencia**: Agregar explicación expandible:
```
Precio Dinámico:
✓ AutoRenta ajusta el precio según:
  - Demanda en tu zona
  - Temporada (alta/baja)
  - Competencia
✓ Ganas hasta 20% más en promedio
✓ Puedes establecer un precio mínimo

Precio Personalizado:
✓ Tú controlas el precio fijo
✓ No cambia automáticamente
```

**Prioridad**: 🟡 Media

---

##### 🟡 MEDIO: MercadoPago Onboarding Demasiado Prominente

**Problema**: El banner de MercadoPago onboarding aparece en la parte superior del form, ocupando mucho espacio y distrayendo del objetivo principal (completar publicación).

**Impacto**:
- Distracción del flujo principal
- Locador puede abandonar para configurar MP y no volver
- No es crítico para publicar (opcional)

**Evidencia**:
```html
<!-- Banner ocupa ~100px en mobile -->
<div class="mp-onboarding-banner">
  💳 Conectá Mercado Pago y empezá a ganar
  <button>Conectar ahora</button>
</div>
```

**Sugerencia**:
- Mover al final del form (después de fotos)
- O convertir en banner dismissable que reaparece después
- O mostrar solo después de publicar exitosamente

**Prioridad**: 🟡 Media

---

##### 🟡 MEDIO: Falta Previsualización Antes de Publicar

**Problema**: No hay step de "preview" antes de submit. El locador no puede ver cómo se verá su auto en la plataforma antes de publicar.

**Impacto**:
- Ansiedad ("¿Cómo se verá mi publicación?")
- Posibles errores no detectados (typos, foto incorrecta)
- Necesidad de editar después de publicar

**Sugerencia**: Agregar step final de "Preview":
```
[Datos] → [Fotos] → [Preview] → [Confirmar]
                       ↑
          Muestra cómo se verá en:
          - Map marker
          - Car detail page
          - Search results
```

**Prioridad**: 🟡 Media

---

##### 🟢 BAJO: Value USD Auto-Suggestion No Es Clara

**Problema**: El sistema sugiere `value_usd = dailyPrice × 180` pero no explica por qué este cálculo.

**Impacto**:
- Locadores pueden ignorar la sugerencia sin entender su importancia
- Puede resultar en valores incorrectos (muy altos o muy bajos)

**Sugerencia**: Agregar explicación:
```
Valor del Vehículo (USD):
Este valor se usa para:
✓ Calcular el depósito de seguridad
✓ Determinar la cobertura del seguro
✓ Proteger tu auto en caso de daños

Sugerencia: $X USD
(basado en 180 días de renta = ~6 meses)
```

**Prioridad**: 🟢 Baja

---

##### 🟢 BAJO: GPS Location No Es Precisa en Interiores

**Problema**: El botón "📍 Usar Mi Ubicación" usa GPS del browser, que puede ser impreciso en interiores o en desktop.

**Impacto**:
- Ubicación incorrecta auto-rellenada
- Usuario debe corregir manualmente
- Falsa sensación de conveniencia

**Sugerencia**:
- Agregar warning: "La ubicación GPS puede no ser precisa en interiores"
- Mostrar dirección detectada y pedir confirmación
- Permitir ajustar en mapa interactivo

**Prioridad**: 🟢 Baja

---

#### 1.2.4 Fortalezas del Flujo

✅ **Multi-Method Photo Upload**: Flexible (manual, stock, AI) reduce fricción
✅ **Smart Auto-Fill**: Model info se auto-completa al seleccionar marca
✅ **Value Suggestion**: Sistema sugiere valor del vehículo basado en precio diario
✅ **GPS Integration**: Botón de ubicación actual facilita llenado de dirección
✅ **Immediate Active Status**: En V2, el auto es publicado inmediatamente (status='active')
✅ **Edit Mode**: Mismo form sirve para editar autos existentes

---

#### 1.2.5 Métricas Recomendadas a Trackear

- **Abandono por sección**: ¿En qué sección abandonan más?
  - Vehículo: ____%
  - Precio: ____%
  - Ubicación: ____%
  - Fotos: ____%
- **Tiempo promedio de completación**: ¿Cuánto tardan en publicar?
- **Método de fotos más usado**: Manual vs Stock vs AI
- **Tasa de uso de GPS**: ¿Cuántos usan "Usar Mi Ubicación"?
- **Tasa de edición post-publicación**: ¿Cuántos editan inmediatamente después?

---

### 1.3 Flujo de Wallet

**Objetivo del Flujo**: Permitir a usuarios gestionar su balance, depositar fondos, retirar dinero y ver historial de transacciones.

**Nota**: Este flujo está completamente documentado en `WALLET_SYSTEM_FLOW.md` (1,200+ líneas). A continuación un resumen ejecutivo para esta auditoría.

#### 1.3.1 Mapeo del Flujo

```
ENTRY POINT: Wallet Page
Route: /wallet

MAIN SECTIONS:
├─ Hero Snapshot (balance cards + CTAs)
├─ Protected Credit Banner (if incomplete)
├─ Benefits Section (collapsible)
├─ Balance Breakdown (3 cards: protected/transferible/withdrawable)
├─ Tabs:
│  ├─ Transactions History (default)
│  └─ Withdrawals History
└─ Bottom CTA Section

   ↓

FLOW 1: DEPOSIT FUNDS
├─ Click "Depositar" → DepositModal
├─ Select Amount (ARS 100-1,000,000)
├─ View USD conversion (real-time FX)
├─ Select Deposit Type:
│  ├─ Protected Credit (non-withdrawable, $300 USD target)
│  └─ Withdrawable Funds (can transfer/withdraw)
├─ Select Payment Method:
│  ├─ MercadoPago (primary)
│  ├─ Stripe (alternative)
│  └─ Bank Transfer (fallback)
├─ Submit → Redirect to payment gateway
└─ Return → Webhook updates balance

   ↓

FLOW 2: REQUEST WITHDRAWAL
├─ Click "Retirar" → WithdrawalRequestForm
├─ Enter Amount (max: withdrawable balance)
├─ View Fee (1.5%) + Net Amount
├─ Select Bank Account (or add new)
├─ Submit → Status: pending
└─ Admin approves → Money sent to bank

   ↓

FLOW 3: VIEW TRANSACTIONS
├─ Tab: "Transactions"
├─ Filter by Type (12 types: deposit, lock, charge, etc.)
├─ Filter by Status (pending, completed, failed)
├─ Expandable rows with details
└─ Real-time updates via Supabase subscription
```

#### 1.3.2 Componentes Clave

| Componente | Archivo | Propósito |
|------------|---------|-----------|
| **WalletPage** | `features/wallet/wallet.page.ts` | Main wallet page (1,000+ lines) |
| **DepositModal** | `shared/components/deposit-modal/` | Deposit funds modal |
| **WalletBalanceCard** | `shared/components/wallet-balance-card/` | Balance display with auto-refresh |
| **TransactionHistory** | `shared/components/transaction-history/` | Transaction ledger with filters |
| **WithdrawalRequestForm** | `shared/components/withdrawal-request-form/` | Withdrawal form + fee calculation |
| **BankAccountsList** | `shared/components/bank-accounts-list/` | Manage bank accounts |

**Servicios**:
- `WalletService`: Balance, deposits, transactions
- `WithdrawalService`: Bank accounts, withdrawal requests
- `WalletLedgerService`: Detailed ledger, transfers

#### 1.3.3 Pain Points Identificados

##### 🔴 CRÍTICO: Confusión sobre Balance Types

**Problema**: Usuarios no entienden la diferencia entre:
- **Available Balance** (disponible)
- **Locked Balance** (bloqueado)
- **Protected Credit** (crédito protegido, non-withdrawable)
- **Withdrawable Balance** (retirable)

**Impacto**:
- Frustración al no poder retirar todo el balance
- Confusión sobre por qué hay fondos "bloqueados"
- Tickets de soporte sobre "mi dinero desapareció"

**Evidencia**:
```typescript
// wallet.page.ts
readonly availableBalance = computed(() => ...);
readonly lockedBalance = computed(() => ...);
readonly protectedCredit = computed(() => ...);
readonly withdrawableBalance = computed(() => ...);

// 4 conceptos diferentes sin explicación clara
```

**Sugerencia**: Agregar tooltips informativos en cada card:
```
💵 Disponible: $X
   ℹ️ Puedes usar estos fondos para reservas

⏳ Bloqueado: $Y
   ℹ️ Fondos reservados en bookings activos
   Se liberan al completar check-out

🛡️ Crédito Protegido: $Z (target: $300 USD)
   ℹ️ Garantía no retirable
   Mejora tu perfil y te da prioridad

💰 Retirable: $W
   ℹ️ Puedes transferir o retirar a tu banco
```

**Prioridad**: 🔴 Alta

---

##### 🟡 MEDIO: Deposit Flow Requiere Demasiados Pasos

**Problema**: Para depositar fondos, el usuario debe:
1. Click "Depositar"
2. Select amount
3. Select deposit type (protected vs withdrawable)
4. Select payment method
5. Confirm
6. Redirect to MercadoPago
7. Complete payment there
8. Return to wallet
9. Wait for webhook to update balance

**Impacto**:
- Muchos puntos de abandono
- Confusión en cada decisión
- Tiempo total: 2-5 minutos

**Sugerencia**: Simplificar a 2-3 pasos:
```
Step 1: Amount + Payment Method (combine)
Step 2: Confirm (skip deposit type if not relevant)
Step 3: Redirect to MercadoPago
```

**Prioridad**: 🟡 Media

---

##### 🟡 MEDIO: Transaction History No Tiene Búsqueda

**Problema**: El ledger de transacciones solo tiene filtros por tipo y estado, pero no búsqueda por:
- Monto específico
- Fecha exacta
- Booking ID
- Descripción

**Impacto**:
- Difícil encontrar transacciones antiguas
- Usuario debe scrollear manualmente
- No hay exportación a CSV/PDF

**Sugerencia**: Agregar:
- Barra de búsqueda (monto, descripción, ID)
- Date range picker
- Exportar a CSV button

**Prioridad**: 🟡 Media

---

##### 🟢 BAJO: Withdrawal Fee (1.5%) No Es Clara Upfront

**Problema**: El fee de 1.5% se muestra solo al solicitar retiro, no en la página principal del wallet.

**Impacto**:
- Sorpresa desagradable al retirar
- Percepción de "hidden fee"

**Sugerencia**: Mostrar fee en balance card:
```
💰 Retirable: $100.00 USD
   (Fee de retiro: 1.5% = -$1.50)
   Recibirás: $98.50 USD
```

**Prioridad**: 🟢 Baja

---

#### 1.3.4 Fortalezas del Flujo

✅ **Real-Time Updates**: Balance se actualiza automáticamente vía Supabase subscriptions
✅ **Multiple Payment Methods**: MercadoPago, Stripe, Bank Transfer
✅ **Protected Credit System**: Gamification para mejorar perfil de usuario
✅ **Detailed Transaction Ledger**: 12 tipos de transacciones rastreadas
✅ **Bank Account Management**: Usuarios pueden guardar múltiples cuentas
✅ **Fee Transparency**: Fee de retiro calculado y mostrado antes de confirmar

---

#### 1.3.5 Métricas Recomendadas a Trackear

- **Tasa de completación de depósitos**: ¿Cuántos completan el pago?
  - Modal abierto → Amount selected: ____%
  - Amount selected → Payment method: ____%
  - Payment method → MercadoPago: ____%
  - MercadoPago → Confirmed: ____%
- **Abandono en retiros**: ¿Cuántos abandonan al ver el fee?
- **Uso de protected credit**: ¿Cuántos completan los $300 USD?
- **Métodos de pago más usados**: MercadoPago vs Stripe vs Bank
- **Tickets de soporte**: ¿Cuántos sobre balance types confusion?

---

### 1.4 Dashboard del Locador

**Objetivo del Flujo**: Proporcionar al locador una vista consolidada de sus autos, bookings y ganancias.

#### 1.4.1 Mapeo del Flujo

```
ENTRY POINT: Owner Dashboard
Route: /dashboard (or /dashboard/owner)

LAYOUT SECTIONS:

┌─────────────────────────────────────────────────────────┐
│ HEADER: "Panel del Locador"                            │
│ Button: "💰 Ir a Wallet" →                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ MISSING DOCUMENTS WIDGET (if applicable)                │
│ ⚠️ Completá tu perfil para activar pagos               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ BALANCE CARDS (3 columns)                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│ │💵 Disponible│ │⏳ Pendiente │ │💰 Total     │       │
│ │   $X.XX     │ │   $Y.YY     │ │   $Z.ZZ     │       │
│ │Listo retirar│ │De reservas  │ │Histórico    │       │
│ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 📊 GANANCIAS MENSUALES                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│ │Este Mes     │ │Mes Anterior │ │Crecimiento  │       │
│ │  $A.AA      │ │  $B.BB      │ │  +X%        │       │
│ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ PAYOUTS HISTORY COMPONENT                              │
│ Historial de ingresos recientes                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ STATS CARDS (4 columns)                                │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│ │🚗 Mis│ │✅    │ │📅    │ │✓     │                   │
│ │Autos │ │Activ.│ │Próx. │ │Compl.│                   │
│ │  N   │ │  N   │ │  N   │ │  N   │                   │
│ └──────┘ └──────┘ └──────┘ └──────┘                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ MULTI-CAR CALENDAR (expandable)                        │
│ [Show/Hide Calendar] toggle                            │
│ Calendar grid showing all cars + bookings              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ QUICK ACTIONS                                          │
│ [Publicar Nuevo Auto] [Ver Mis Bookings] [Ver Wallet] │
└─────────────────────────────────────────────────────────┘
```

#### 1.4.2 Componentes Clave

| Componente | Archivo | Propósito |
|------------|---------|-----------|
| **OwnerDashboardPage** | `features/dashboard/owner-dashboard.page.ts` | Main dashboard (142 lines) |
| **MissingDocumentsWidget** | `shared/components/missing-documents-widget/` | Onboarding reminder |
| **PayoutsHistoryComponent** | `dashboard/components/payouts-history/` | Recent payouts list |
| **MultiCarCalendarComponent** | `dashboard/components/multi-car-calendar/` | Calendar view of all cars + bookings |

**Servicios**:
- `WalletService`: Balance data
- `BookingsService`: Bookings statistics
- `CarsService`: Cars list and status
- `PayoutService`: Earnings history

#### 1.4.3 Pain Points Identificados

##### 🟡 MEDIO: Información Abrumadora Sin Priorización

**Problema**: El dashboard muestra mucha información simultáneamente:
- 3 balance cards
- 3 earnings cards
- Payouts history
- 4 stats cards
- Calendar (optional)

**Impacto**:
- No hay jerarquía visual clara
- Usuario no sabe qué revisar primero
- Importantes notificaciones (missing docs) pueden perderse

**Evidencia**:
```html
<!-- owner-dashboard.page.html - 329 líneas -->
<!-- Todo visible al mismo tiempo sin priorización -->
```

**Sugerencia**: Priorizar con jerarquía visual:
```
1. Missing Docs (si aplica) - CRÍTICO, destacado
2. Balance disponible - PRIMARY CTA
3. Upcoming bookings - URGENTE si hay próximos
4. Stats generales - SECUNDARIO
5. Calendar - OPCIONAL, colapsado por default
```

**Prioridad**: 🟡 Media

---

##### 🟡 MEDIO: Multi-Car Calendar Es Complejo

**Problema**: El MultiCarCalendarComponent es un componente sofisticado pero complejo:
- Muestra múltiples autos simultáneamente
- Grid de días del mes
- Bookings y blocked dates superpuestos
- Difícil de usar en mobile

**Impacto**:
- Sobrecarga visual
- Confusión sobre qué auto tiene qué booking
- No es mobile-friendly (mucho scroll horizontal)

**Sugerencia**:
- En mobile: Mostrar un auto a la vez (dropdown selector)
- Agregar filtros: "Solo autos con bookings próximos"
- Simplificar vista: Reducir información por celda

**Prioridad**: 🟡 Media

---

##### 🟢 BAJO: Payouts History Sin Contexto

**Problema**: El componente PayoutsHistoryComponent muestra lista de payouts pero sin contexto:
- No muestra qué booking generó el payout
- No muestra qué auto
- Solo monto + fecha + estado

**Impacto**:
- Difícil reconciliar payouts con bookings
- Usuario no puede entender de dónde viene cada pago

**Sugerencia**: Agregar contexto:
```
Payout: $50.00 USD
De: Booking #12345 (Toyota Corolla 2022)
Fecha: 2025-11-05
Estado: Pagado ✓
```

**Prioridad**: 🟢 Baja

---

##### 🟢 BAJO: No Hay Acciones Rápidas Visibles

**Problema**: Las acciones comunes (publicar nuevo auto, ver bookings pendientes) requieren navegación a otras páginas.

**Impacto**:
- Fricción para tareas frecuentes
- Dashboard se siente "read-only"

**Sugerencia**: Agregar sección de Quick Actions:
```
┌────────────────────────────────┐
│ ACCIONES RÁPIDAS               │
│ [+ Publicar Auto]              │
│ [Ver Bookings Pendientes (3)]  │
│ [Bloquear Fechas]              │
│ [Solicitar Retiro]             │
└────────────────────────────────┘
```

**Prioridad**: 🟢 Baja

---

#### 1.4.4 Fortalezas del Flujo

✅ **Comprehensive Overview**: Todas las métricas clave en un solo lugar
✅ **Real-Time Data**: Datos actualizados con cada load
✅ **Mobile Responsive**: Layout adapta a mobile (stacked columns)
✅ **Missing Docs Widget**: Proactivo en recordar completar perfil
✅ **Calendar Integration**: Vista visual de disponibilidad
✅ **Earnings Trend**: Muestra crecimiento mes a mes

---

#### 1.4.5 Métricas Recomendadas a Trackear

- **Engagement con dashboard**: ¿Cuántos locadores lo visitan diariamente?
- **Acciones más comunes**: ¿Qué hacen después de ver dashboard?
  - Ir a Wallet: ____%
  - Publicar nuevo auto: ____%
  - Ver bookings: ____%
  - Abrir calendar: ____%
- **Tiempo en dashboard**: ¿Cuánto tiempo pasan revisando?
- **Uso del calendar**: ¿Cuántos expanden el calendario?

---

## Sección 2: Auditoría Visual

**Completado**: 2025-11-10 (Issue #184)

Esta sección documenta los hallazgos de la auditoría visual de colores, tipografía, espaciados y estados en la aplicación AutoRenta.

---

### 2.1 Auditoría de Colores

#### 2.1.1 Metodología

Se realizó un análisis automatizado del código fuente para identificar:
1. Uso de colores Tailwind por defecto (prohibido según `COLOR_SYSTEM_GUIDE.md`)
2. Uso de colores semánticos del sistema (success, warning, error, info)
3. Uso de colores legacy en dark mode
4. Consistencia en el uso de tokens de color

**Herramientas**:
- `grep -r` para buscar patrones de clases Tailwind
- Análisis de archivos `.html` y `.ts` en `apps/web/src/app/features/`

---

#### 2.1.2 Hallazgos Críticos

##### 🔴 CRÍTICO: Uso Masivo de Colores Tailwind Por Defecto

**Problema**: La aplicación usa extensamente colores Tailwind por defecto, lo cual está **explícitamente prohibido** según `docs/COLOR_SYSTEM_GUIDE.md`.

**Datos Cuantitativos**:
```bash
# Colores de background prohibidos
bg-blue-* , bg-green-*, bg-red-*, bg-yellow-*:  185 usos
bg-purple-*, bg-pink-*, bg-indigo-*:          (adicionales)

# Colores de text prohibidos
text-blue-*, text-green-*, text-red-*, text-yellow-*: 245 usos

# Otros colores Tailwind prohibidos
bg-emerald-*, bg-amber-*:                      51 usos

TOTAL ESTIMADO: 480+ violaciones
```

**Ejemplos Específicos**:

```html
<!-- ❌ INCORRECTO - booking-detail.page.html:8 -->
<div class="bg-red-50 border border-red-200 rounded-xl p-6">
  <p class="text-red-800">Error message</p>
</div>

<!-- ❌ INCORRECTO - booking-detail.page.html:12 -->
<button class="bg-red-600 text-white hover:bg-red-700">
  Reintentar
</button>

<!-- ❌ INCORRECTO - booking-status.component.ts:46 -->
return 'bg-red-100 text-red-800';  // Hardcoded Tailwind colors

<!-- ❌ INCORRECTO - check-in.page.html:177 -->
<div class="bg-yellow-50 border border-yellow-200">
  Warning message
</div>
```

**Impacto**:
- ❌ Violación directa de las guías de diseño
- ❌ Inconsistencia visual (diferentes tonos de rojo, verde, etc.)
- ❌ Imposible cambiar paleta globalmente
- ❌ No soporta dark mode correctamente
- ❌ Contraste no verificado (puede violar WCAG AA)

**Solución Requerida**: Migrar a colores semánticos:

```html
<!-- ✅ CORRECTO - Usar colores semánticos -->
<div class="bg-error-50 dark:bg-error-500/15 border border-error-500 dark:border-error-500/40">
  <p class="text-error-900 dark:text-error-100">Error message</p>
</div>

<button class="bg-error-600 hover:bg-error-700 text-white">
  Reintentar
</button>

<!-- O usar variables CSS -->
<div class="bg-surface-raised border-border-default">
  <p class="text-text-primary">Content</p>
</div>
```

**Prioridad**: 🔴 Crítica
**Estimación de trabajo**: 40-60 horas de refactorización
**Archivos afectados**: ~50-70 archivos `.html` y `.ts`

---

##### 🟡 MEDIO: Uso de Gray en Dark Mode (Legacy)

**Problema**: 239 usos de `dark:text-gray-*` y `dark:bg-gray-*` que deberían migrar a tokens neutrales del sistema.

**Datos**:
```bash
dark:text-gray-* , dark:bg-gray-*:  239 usos
```

**Ejemplo**:
```html
<!-- ❌ Legacy -->
<p class="text-gray-700 dark:text-gray-300">Descripción</p>

<!-- ✅ Correcto -->
<p class="text-text-primary dark:text-text-primary">Descripción</p>
<!-- O -->
<p class="text-text-secondary dark:text-text-secondary/70">Descripción</p>
```

**Impacto**: Medio
- Funciona, pero no sigue el sistema unificado
- Dificulta ajustes globales de dark mode

**Prioridad**: 🟡 Media
**Estimación**: 8-12 horas

---

#### 2.1.3 Hallazgos Positivos

##### ✅ Uso Correcto de Colores Semánticos

**Dato**: 105 usos de `bg-success-*`, `bg-warning-*`, `bg-error-*`, `bg-info-*`

Estos usos SÍ siguen el sistema de diseño correctamente:

```html
<!-- ✅ CORRECTO -->
<div class="bg-success-50 dark:bg-success-500/15 border border-success-500">
  <p class="text-success-900 dark:text-success-100">Operación exitosa</p>
</div>
```

**Recomendación**: Mantener este patrón y extenderlo al resto del código.

---

#### 2.1.4 Análisis de Contraste WCAG AA

**Nota**: No se realizó análisis automatizado de contraste en esta fase. Se recomienda:

1. **Herramientas a usar**:
   - WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
   - Lighthouse (Chrome DevTools): Audit de accesibilidad
   - axe DevTools: Extension para verificar WCAG

2. **Componentes críticos a verificar**:
   - Botones primarios (text sobre background)
   - Error messages (debe cumplir 4.5:1)
   - Success messages
   - Warning alerts
   - Disabled states

3. **Guideline WCAG AA**:
   - Texto normal: Mínimo 4.5:1
   - Texto grande (18px+): Mínimo 3:1
   - Elementos UI: Mínimo 3:1

**Recomendación para Issue #185**: Incluir verificación de contraste en propuestas de diseño.

---

#### 2.1.5 Resumen de Colores

| Categoría | Cantidad | Estado | Acción Requerida |
|-----------|----------|--------|------------------|
| **Colores Tailwind por defecto** | 480+ | 🔴 Crítico | Migrar a semánticos |
| **Colores semánticos (correcto)** | 105 | ✅ OK | Mantener patrón |
| **Gray legacy en dark mode** | 239 | 🟡 Medio | Migrar a tokens |
| **Contraste WCAG** | N/A | ⚠️ Pendiente | Verificar en #185 |

**Impacto Total**: 🔴 **Crítico** - Requiere refactorización masiva

---

### 2.2 Auditoría de Tipografía

#### 2.2.1 Metodología

Análisis de uso de la escala tipográfica definida en `tailwind.config.js`:

```javascript
fontSize: {
  xs: ['0.75rem', { lineHeight: '1.4' }],    // 12px
  sm: ['0.875rem', { lineHeight: '1.5' }],   // 14px
  base: ['1rem', { lineHeight: '1.6' }],     // 16px
  lg: ['1.125rem', { lineHeight: '1.5' }],   // 18px
  xl: ['1.25rem', { lineHeight: '1.4' }],    // 20px
  '2xl': ['1.5rem', { lineHeight: '1.3' }],  // 24px
  '3xl': ['1.875rem', { lineHeight: '1.25' }], // 30px
  // ...
}
```

---

#### 2.2.2 Hallazgos Positivos

##### ✅ Uso Consistente de Escala Tipográfica

**Dato**: Análisis de archivos muestra uso predominante de clases Tailwind predefinidas:
- `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, etc.

**Ejemplos**:
```html
<!-- ✅ CORRECTO - Uso de escala -->
<h1 class="text-3xl font-bold">Título Principal</h1>
<p class="text-base">Contenido principal</p>
<span class="text-xs text-text-muted">Detalles pequeños</span>
```

**Conclusión**: ✅ La tipografía sigue el sistema de diseño correctamente.

---

##### ✅ Font-sizes Hardcoded Muy Bajo

**Dato**: Solo **4 usos** de font-sizes hardcoded (`text-[...px]`, `text-[...rem]`)

```bash
# Búsqueda de hardcoded sizes
text-[.*px] | text-[.*rem]:  4 usos
```

**Conclusión**: ✅ Casi no hay hardcoded sizes, excelente adherencia al sistema.

---

#### 2.2.3 Hallazgos de Mejora

##### 🟡 MEDIO: Inconsistencia en Font-weights

**Observación**: Se observan diferentes font-weights sin patrón claro:

```html
<!-- Ejemplo: Varios weights para títulos -->
<h2 class="text-lg font-semibold">Título A</h2>
<h2 class="text-lg font-bold">Título B</h2>
<h2 class="text-lg font-medium">Título C</h2>
```

**Recomendación**: Definir jerarquía tipográfica clara:
```
h1: text-3xl font-bold
h2: text-2xl font-semibold
h3: text-xl font-semibold
h4: text-lg font-medium
Body: text-base font-normal
Small: text-sm font-normal
Tiny: text-xs font-medium
```

**Prioridad**: 🟡 Media
**Estimación**: 4-6 horas para documentar + aplicar

---

##### 🟢 BAJO: Line-heights Inconsistentes

**Problema**: Algunos componentes sobreescriben line-heights manualmente:

```html
<!-- ❌ Evitar override manual -->
<p class="text-base leading-relaxed">...</p>
<p class="text-base leading-tight">...</p>

<!-- ✅ Usar defaults del sistema -->
<p class="text-base">...</p>  <!-- Ya tiene lineHeight: 1.6 -->
```

**Recomendación**: Confiar en los line-heights definidos en `tailwind.config.js`.

**Prioridad**: 🟢 Baja

---

#### 2.2.4 Resumen de Tipografía

| Aspecto | Estado | Notas |
|---------|--------|-------|
| **Escala tipográfica** | ✅ Excelente | Uso consistente de text-xs, sm, base, lg, xl, etc. |
| **Font-sizes hardcoded** | ✅ Muy bajo | Solo 4 usos, excelente |
| **Font-weights** | 🟡 Mejorable | Falta jerarquía clara documentada |
| **Line-heights** | 🟢 Bueno | Algunos overrides innecesarios |
| **Font-family** | ✅ Correcto | Inter usado consistentemente |

**Impacto Total**: ✅ **Bueno** - Mejoras menores requeridas

---

### 2.3 Auditoría de Espaciados

#### 2.3.1 Metodología

Búsqueda de spacing hardcoded vs uso de sistema de Tailwind:

```bash
# Buscar padding/margin hardcoded
p-[.*px] | m-[.*px] | p-[.*rem] | m-[.*rem]
```

---

#### 2.3.2 Hallazgo Principal

##### ✅ EXCELENTE: Cero Espaciados Hardcoded

**Dato**: **0 usos** de padding/margin hardcoded en templates HTML

```bash
p-[.*px] | m-[.*px]:  0 usos
```

**Conclusión**: ✅ Todo el spacing usa el sistema de Tailwind:
- `p-1`, `p-2`, `p-4`, `p-6`, `p-8`, etc.
- `m-1`, `m-2`, `m-4`, `m-6`, `m-8`, etc.
- `gap-2`, `gap-4`, `space-x-4`, etc.

**Ejemplos correctos**:
```html
<!-- ✅ Usa tokens de Tailwind -->
<div class="p-6 mb-8 space-y-4">
  <div class="flex gap-4">
    <button class="px-4 py-2">Acción</button>
  </div>
</div>
```

---

#### 2.3.3 Variables CSS de Spacing

El sistema define variables CSS en `styles.css`:

```css
:root {
  --spacing-xs: 0.25rem;   /* 4px */
  --spacing-sm: 0.5rem;    /* 8px */
  --spacing-md: 0.75rem;   /* 12px */
  --spacing-base: 1rem;    /* 16px */
  --spacing-lg: 1.25rem;   /* 20px */
  --spacing-xl: 1.5rem;    /* 24px */
  --spacing-2xl: 2rem;     /* 32px */
  --spacing-3xl: 3rem;     /* 48px */
}
```

**Recomendación**: Estas variables están definidas pero **no se usan** en el código.

**Opciones**:
1. **Opción A**: Remover variables (no aportan valor si Tailwind ya tiene sistema)
2. **Opción B**: Migrar Tailwind spacing a estas variables (innecesario, Tailwind ya lo maneja)

**Recomendación**: Opción A - Remover variables no usadas, confiar 100% en Tailwind.

---

#### 2.3.4 Resumen de Espaciados

| Aspecto | Estado | Notas |
|---------|--------|-------|
| **Hardcoded spacing** | ✅ Excelente | 0 usos, perfecto |
| **Uso de Tailwind spacing** | ✅ Excelente | Consistente en todo el código |
| **Variables CSS spacing** | ⚠️ No usado | Definidas pero innecesarias |
| **Responsive spacing** | ✅ Bueno | Uso de sm:, md:, lg: breakpoints |

**Impacto Total**: ✅ **Excelente** - Sin problemas

---

### 2.4 Auditoría de Estados

#### 2.4.1 Metodología

Análisis de patrones de estados visuales:
1. **Loading states**: Spinners, skeletons, progress indicators
2. **Empty states**: Sin datos, sin resultados
3. **Error states**: Validación, network errors, system errors
4. **Success states**: Confirmaciones, feedback positivo
5. **Disabled states**: Botones, inputs, acciones no disponibles

---

#### 2.4.2 Hallazgos

##### 🟡 MEDIO: Alta Variación en Loading States

**Dato**: **857 referencias** a loading states en el código

```bash
# Patrones encontrados
animate-spin, loading(), isLoading(), skeleton:  857 usos
```

**Problema**: Hay múltiples patrones sin estandarización:

**Patrón 1: Spinner Genérico**
```html
<div *ngIf="loading()" class="flex justify-center py-8">
  <svg class="animate-spin h-8 w-8 text-primary-600">...</svg>
</div>
```

**Patrón 2: Spinner con Mensaje**
```html
<div *ngIf="loading()" class="flex items-center gap-2">
  <div class="animate-spin rounded-full h-4 w-4 border-b-2"></div>
  <span>Cargando...</span>
</div>
```

**Patrón 3: Skeleton Screen**
```html
<div class="animate-pulse space-y-4">
  <div class="h-4 bg-gray-200 rounded w-3/4"></div>
  <div class="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

**Patrón 4: Component-Level Loading**
```typescript
readonly loading = signal(true);

@if (loading()) {
  <div>Loading...</div>
} @else {
  <div>Content</div>
}
```

**Impacto**:
- Inconsistencia visual (diferentes spinners, tamaños, colores)
- Usuario no tiene expectativa consistente de feedback
- Difícil mantener y actualizar globalmente

**Solución Requerida**: Crear componente `LoadingState` compartido:

```typescript
// shared/components/loading-state.component.ts
@Component({
  selector: 'app-loading-state',
  template: `
    @if (type() === 'spinner') {
      <div class="loading-spinner">
        <svg class="animate-spin h-8 w-8 text-primary-600">...</svg>
        @if (message()) {
          <p class="text-sm text-text-secondary mt-2">{{ message() }}</p>
        }
      </div>
    } @else if (type() === 'skeleton') {
      <div class="loading-skeleton animate-pulse">
        <ng-content></ng-content>
      </div>
    }
  `
})
export class LoadingStateComponent {
  type = input<'spinner' | 'skeleton'>('spinner');
  message = input<string>();
}
```

**Prioridad**: 🟡 Media
**Estimación**: 12-16 horas para crear componente + migrar

---

##### 🟢 BUENO: Empty States Presentes

**Dato**: **64 empty states** identificados

**Ejemplos encontrados**:
```html
<!-- Patrón common -->
<div class="empty-state text-center py-12">
  <svg class="mx-auto h-12 w-12 text-gray-400">...</svg>
  <h3 class="mt-4 text-lg font-medium">No hay resultados</h3>
  <p class="mt-2 text-sm text-gray-500">Intenta ajustar los filtros</p>
  <button class="mt-4 btn-primary">Nueva Acción</button>
</div>
```

**Observación**: Los empty states siguen un patrón razonablemente consistente:
- Icon
- Título
- Descripción
- CTA (opcional)

**Recomendación**: Formalizar en componente compartido `EmptyState`:

```typescript
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state-container">
      <div class="empty-state-icon">
        <ng-content select="[icon]"></ng-content>
      </div>
      <h3 class="empty-state-title">{{ title() }}</h3>
      <p class="empty-state-description">{{ description() }}</p>
      @if (actionLabel()) {
        <button class="empty-state-action" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `
})
```

**Prioridad**: 🟢 Baja (funciona, pero mejorable)
**Estimación**: 6-8 horas

---

##### 🔴 CRÍTICO: Error States Inconsistentes

**Problema**: Múltiples patrones de error sin unificación

**Patrón 1: Error Banner**
```html
<div class="bg-red-50 border border-red-200 p-4">
  <p class="text-red-800">{{ error() }}</p>
  <button (click)="retry()">Reintentar</button>
</div>
```

**Patrón 2: Inline Validation Error**
```html
<input [class.border-red-500]="hasError()" />
<p class="text-xs text-red-600">{{ errorMessage() }}</p>
```

**Patrón 3: Toast/Notification**
```typescript
this.toastService.error('Operación fallida');
```

**Patrón 4: Error Page/Component**
```html
<div *ngIf="error()">
  <h2>Algo salió mal</h2>
  <p>{{ error() }}</p>
</div>
```

**Problema**: Sin unificación, además usa colores Tailwind prohibidos (bg-red-50, text-red-600)

**Solución**: Crear sistema de error handling:

```typescript
// shared/components/error-state.component.ts
@Component({
  selector: 'app-error-state',
  template: `
    <div class="error-state bg-error-50 dark:bg-error-500/15 border border-error-500">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <h3 class="text-error-900 dark:text-error-100">{{ title() }}</h3>
        <p class="text-error-700 dark:text-error-200">{{ message() }}</p>
      </div>
      @if (retryable()) {
        <button class="btn-error" (click)="retry.emit()">Reintentar</button>
      }
    </div>
  `
})
```

**Prioridad**: 🔴 Alta (ligado a migración de colores)
**Estimación**: 8-12 horas

---

#### 2.4.3 Resumen de Estados

| Estado | Cantidad | Consistencia | Prioridad | Acción |
|--------|----------|--------------|-----------|--------|
| **Loading** | 857 usos | 🟡 Media | 🟡 Media | Crear LoadingState component |
| **Empty** | 64 usos | 🟢 Buena | 🟢 Baja | Opcional: formalizar componente |
| **Error** | ~200+ | 🔴 Baja | 🔴 Alta | Crear ErrorState component |
| **Success** | ~100+ | 🟡 Media | 🟡 Media | Usar ToastService + SuccessState |
| **Disabled** | N/A | ✅ OK | - | Nativo de Tailwind funciona |

**Impacto Total**: 🟡 **Medio** - Requiere estandarización

---

### 2.5 Auditoría de Componentes Críticos

#### 2.5.1 Componentes Compartidos

**Dato**: **122 componentes** en `apps/web/src/app/shared/components/`

**Observación**: Buena reutilización de componentes compartidos.

**Componentes clave revisados**:
- `deposit-modal`
- `wallet-balance-card`
- `payment-method-selector`
- `date-range-picker`
- `car-card`
- `booking-card`
- `upload-image`

**Hallazgo General**: La mayoría de componentes siguen patrones consistentes, pero **heredan el problema de colores Tailwind por defecto**.

---

#### 2.5.2 Botones

**Análisis**: Revisión de patrones de botones

**Patrón Común**:
```html
<!-- Primary -->
<button class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
  Acción Principal
</button>

<!-- Secondary -->
<button class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg">
  Acción Secundaria
</button>

<!-- Danger (❌ Usa Tailwind por defecto) -->
<button class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
  Eliminar
</button>
```

**Problema**: No hay componente `Button` unificado, cada página define botones inline.

**Solución**: Crear `ButtonComponent`:

```typescript
@Component({
  selector: 'app-button',
  template: `
    <button
      [class]="buttonClasses()"
      [disabled]="disabled()"
      [type]="type()">
      @if (loading()) {
        <span class="spinner"></span>
      }
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary' | 'danger' | 'ghost'>('primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  loading = input(false);
  disabled = input(false);
  type = input<'button' | 'submit'>('button');

  buttonClasses = computed(() => {
    const base = 'btn transition-colors rounded-lg font-medium';
    const variants = {
      primary: 'bg-primary-600 hover:bg-primary-700 text-white',
      secondary: 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800',
      danger: 'bg-error-600 hover:bg-error-700 text-white',
      ghost: 'bg-transparent hover:bg-neutral-100 text-neutral-700'
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };
    return `${base} ${variants[this.variant()]} ${sizes[this.size()]}`;
  });
}
```

**Prioridad**: 🟡 Media
**Estimación**: 8-10 horas para crear + migrar botones críticos

---

#### 2.5.3 Cards

**Análisis**: Componentes tipo "card" están por toda la app

**Patrón Común**:
```html
<div class="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6 shadow-sm">
  <h3 class="text-lg font-semibold mb-2">Título</h3>
  <p class="text-sm text-neutral-600">Contenido</p>
</div>
```

**Observación**: Razonablemente consistente, usa tokens de color correctos (neutral-*).

**Recomendación**: Formalizar en `CardComponent` para mayor consistencia.

**Prioridad**: 🟢 Baja

---

#### 2.5.4 Forms & Inputs

**Análisis**: Forms usan componentes nativos de Angular con clases Tailwind

**Patrón Común**:
```html
<label class="block text-sm font-medium text-neutral-700 mb-1">
  Campo
</label>
<input
  type="text"
  class="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500"
  [class.border-red-500]="hasError()"
/>
<p class="text-xs text-red-600 mt-1" *ngIf="errorMessage()">
  {{ errorMessage() }}
</p>
```

**Problema**: Usa `text-red-600` para errores (Tailwind por defecto).

**Solución**: Migrar a `text-error-600` o crear `InputComponent` con errores integrados.

**Prioridad**: 🟡 Media

---

#### 2.5.5 Modales

**Análisis**: Modales usan overlay + contenedor centrado

**Patrón Común**:
```html
<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
  <div class="bg-white dark:bg-neutral-800 rounded-lg max-w-md w-full mx-4 shadow-xl">
    <div class="p-6">
      <h2 class="text-xl font-bold mb-4">Título</h2>
      <div class="modal-content">
        <ng-content></ng-content>
      </div>
      <div class="flex gap-2 mt-6">
        <button class="btn-secondary">Cancelar</button>
        <button class="btn-primary">Confirmar</button>
      </div>
    </div>
  </div>
</div>
```

**Observación**: Patrón relativamente consistente.

**Mejora**: Agregar `@HostListener('document:keydown.escape')` para cerrar con ESC (accesibilidad).

**Prioridad**: 🟢 Baja

---

#### 2.5.6 Resumen de Componentes

| Componente | Estado Actual | Prioridad | Acción |
|------------|---------------|-----------|--------|
| **Botones** | 🟡 Inline, sin componente | 🟡 Media | Crear ButtonComponent |
| **Cards** | 🟢 Relativamente consistente | 🟢 Baja | Opcional: CardComponent |
| **Forms/Inputs** | 🟡 Usa colores prohibidos en errores | 🟡 Media | Migrar a semantic colors |
| **Modales** | 🟢 Patrón consistente | 🟢 Baja | Agregar keyboard handling |
| **Loading States** | 🟡 Alta variación | 🟡 Media | Crear LoadingState component |
| **Empty States** | 🟢 Patrón común | 🟢 Baja | Opcional: formalizar |
| **Error States** | 🔴 Inconsistente | 🔴 Alta | Crear ErrorState component |

---

## Pain Points Identificados

### Resumen por Prioridad

#### 🔴 CRÍTICOS (Alto Impacto, Alta Urgencia)

| Pain Point | Flujo | Impacto en Conversión |
|------------|-------|----------------------|
| **Checkout demasiado complejo** | Booking | 🔴 Alto riesgo de abandono en paso crítico |
| **Formulario de publicación muy largo** | Publicación | 🔴 Locadores abandonan antes de completar |
| **Confusión sobre balance types** | Wallet | 🔴 Frustración y tickets de soporte |

**Recomendación**: Priorizar estos 3 pain points en Issue #186 (Implementación).

---

#### 🟡 MEDIOS (Medio Impacto, Media Urgencia)

| Pain Point | Flujo | Impacto |
|------------|-------|---------|
| Confusión card vs wallet | Booking | Frustración, elección incorrecta |
| Polling en success page | Booking | Ansiedad, percepción de "algo falló" |
| Confusión pricing strategy | Publicación | Locadores eligen custom sin entender dinámico |
| MP onboarding demasiado prominente | Publicación | Distracción del flujo principal |
| Falta preview antes de publicar | Publicación | Ansiedad, errores no detectados |
| Deposit flow con muchos pasos | Wallet | Abandono en depósitos |
| Transaction history sin búsqueda | Wallet | Difícil encontrar transacciones |
| Dashboard sin priorización | Dashboard | Sobrecarga cognitiva |
| Multi-car calendar complejo | Dashboard | Confusión en mobile |

**Recomendación**: Abordar en Issue #186 si hay tiempo, o en iteración posterior.

---

#### 🟢 BAJOS (Bajo Impacto, Baja Urgencia)

| Pain Point | Flujo | Impacto |
|------------|-------|---------|
| Multi-entry points | Booking | Inconsistencia, pero no afecta conversión |
| Value USD auto-suggestion | Publicación | Locadores pueden ignorar |
| GPS location imprecisa | Publicación | Inconveniencia menor |
| Withdrawal fee no clara upfront | Wallet | Sorpresa menor |
| Payouts sin contexto | Dashboard | Dificultad de reconciliación |
| Falta quick actions | Dashboard | Fricción menor |

**Recomendación**: "Nice to have", abordar en futuras iteraciones.

---

## Hallazgos Prioritarios

### Top 5 Mejoras de Mayor Impacto

1. **Simplificar Checkout de Booking** (🔴 Crítico)
   - Reducir de 1 página densa a 2-3 pasos claros
   - Separar: (1) Método de pago → (2) Cobertura → (3) Review & Submit
   - **Impacto esperado**: +15-20% conversión

2. **Convertir Publicación a Wizard Multi-Step** (🔴 Crítico)
   - 4 steps claros con indicador de progreso
   - Sensación de avance, menos sobrecarga
   - **Impacto esperado**: +25-30% completación de publicaciones

3. **Clarificar Balance Types en Wallet** (🔴 Crítico)
   - Tooltips explicativos en cada balance card
   - Modal "¿Qué es el crédito protegido?"
   - **Impacto esperado**: -50% tickets de soporte

4. **Agregar Explicación de Payment Mode** (🟡 Medio)
   - Modal comparativo "Card vs Wallet"
   - Destacar beneficios de cada método
   - **Impacto esperado**: +10% elección correcta

5. **Priorizar Información en Dashboard** (🟡 Medio)
   - Jerarquía visual clara (crítico → importante → opcional)
   - Collapse calendar por default
   - **Impacto esperado**: -30% tiempo de comprensión

---

## Recomendaciones Generales

### Principios de Diseño a Aplicar

1. **Progressive Disclosure**
   - No mostrar toda la info simultáneamente
   - Revelar opciones avanzadas solo cuando sean relevantes
   - Ejemplo: Collapse sections en forms largos

2. **Clear Feedback**
   - Loading states visibles (spinners + mensajes)
   - Success states celebratorios (confetti, checkmarks)
   - Error states con recovery actions claras

3. **Consistency**
   - Patrones de componentes reutilizables (botones, cards, modals)
   - Terminología consistente (balance vs saldo, booking vs reserva)
   - Colores semánticos para estados (success, warning, error)

4. **Mobile-First**
   - Diseñar primero para mobile, luego escalar a desktop
   - Evitar scroll horizontal
   - Touch targets mínimo 44×44px

5. **Accessibility**
   - Contraste WCAG AA (4.5:1)
   - Keyboard navigation completa
   - Screen reader friendly (ARIA labels)

---

### Patrones a Estandarizar

#### Pattern 1: Multi-Step Forms

Para forms largos (>10 campos), usar wizard:

```
[Step 1] → [Step 2] → [Step 3] → [Review]
   ○         ●          ○          ○
```

**Aplicar en**:
- Booking checkout
- Car publish
- Profile onboarding

---

#### Pattern 2: Balance Display

Para mostrar balances/montos, usar card consistente:

```
┌─────────────────────┐
│ 💵 Título           │
│                     │
│ $X,XXX.XX USD       │ ← Grande, bold
│                     │
│ Descripción breve   │ ← Pequeño, gray
│ ℹ️ [Más info]      │ ← Tooltip
└─────────────────────┘
```

**Aplicar en**:
- Wallet balance cards
- Dashboard balance
- Booking payment summary

---

#### Pattern 3: Empty States

Para listas/tablas vacías, usar empty state:

```
     🎨 Icon

   Título Principal

   Descripción de por qué está vacío

   [CTA Button]
```

**Aplicar en**:
- My bookings (sin bookings)
- My cars (sin autos)
- Transaction history (sin transacciones)
- Payouts history (sin pagos)

---

#### Pattern 4: Loading States

Para operaciones async, usar skeleton screens:

```
┌─────────────────────┐
│ ████░░░░░░░░░░░░░░░ │
│ ██████░░░░░░░░░░░░░ │
│ ████████░░░░░░░░░░░ │
└─────────────────────┘
```

**Mejor que**: Spinner genérico

**Aplicar en**:
- Car list loading
- Booking detail loading
- Dashboard stats loading

---

## Próximos Pasos

### Issue #184 - Auditoría Visual (siguiente)

Ahora que tenemos los flujos mapeados, el siguiente paso es auditar:

1. **Colores**
   - Buscar colores Tailwind por defecto (bg-blue-500, etc.)
   - Verificar contraste WCAG AA
   - Listar colores legacy a migrar

2. **Tipografía**
   - Verificar uso de escala tipográfica
   - Identificar font-sizes hardcoded
   - Documentar inconsistencias de line-height

3. **Espaciados**
   - Verificar uso de variables de spacing
   - Identificar padding/margin hardcoded
   - Documentar problemas responsive

4. **Estados**
   - Auditar loading states (spinner, skeleton, progressive)
   - Auditar empty states (sin datos, sin resultados)
   - Auditar error states (validation, network, system)

**Entregable**: `docs/ux-audit.md` (Sección 2: Auditoría Visual)

---

### Issue #185 - Propuestas de Diseño (después)

Con los hallazgos de #183 y #184, crear:

1. **Sistema de Tokens Refinado**
   - Tokens de color semánticos
   - Tokens de spacing
   - Tokens de sombras (elevation)

2. **Wireframes de Mejoras**
   - Booking checkout multi-step
   - Publish wizard con progreso
   - Wallet con tooltips explicativos
   - Dashboard con jerarquía clara

3. **Patrones de Componentes**
   - Loading patterns
   - Empty state patterns
   - Error message patterns
   - Modal patterns

**Entregable**: `docs/design-tokens-v2.md` + `docs/wireframes/`

---

### Issue #186 - Implementación UI (después)

Implementar las mejoras propuestas:

1. **Migración de Tokens**
   - Actualizar tailwind.config.js
   - Migrar componentes a nuevos tokens
   - Buscar/reemplazar colores Tailwind

2. **Refactorización de Componentes**
   - Booking: Convertir a multi-step
   - Publish: Convertir a wizard
   - Wallet: Agregar tooltips
   - Dashboard: Agregar jerarquía visual

3. **Testing**
   - Unit tests actualizados
   - E2E tests para flujos críticos
   - Visual regression tests

**Entregable**: PR con componentes refactorizados + tests passing

---

### Issue #187 - Validación UX Final (después)

Validar las mejoras implementadas:

1. **QA Visual**
   - Verificar colores consistentes
   - Verificar tipografía consistente
   - Verificar estados (hover, focus, disabled)

2. **QA de Accesibilidad**
   - Lighthouse audit (score 90+)
   - Keyboard navigation
   - Screen reader compatibility

3. **QA de Flujos**
   - Testear booking completo
   - Testear publicación completa
   - Testear wallet operations
   - Testear dashboard

**Entregable**: `docs/ux-audit.md` (Sección 4: Validación) + Checklist completado

---

## Apéndice

### Archivos de Referencia

**Documentación Detallada**:
- `WALLET_SYSTEM_FLOW.md` - Flujo de wallet completo (1,200+ líneas)
- `docs/ux-audit-workplan.md` - Plan de trabajo completo

**Guías de Diseño**:
- `docs/COLOR_SYSTEM_GUIDE.md` - Sistema de colores
- `CLAUDE.md` - Guía principal del proyecto

**Componentes Críticos**:
- `apps/web/src/app/features/bookings/booking-detail-payment/`
- `apps/web/src/app/features/cars/publish/publish-car-v2.page.ts`
- `apps/web/src/app/features/wallet/wallet.page.ts`
- `apps/web/src/app/features/dashboard/owner-dashboard.page.ts`

---

**Última actualización**: 2025-11-10
**Autor**: Claude Code
**Estado**: Issues #183 y #184 completados ✅
**Siguiente**: Issue #185 (Propuestas de Diseño)
