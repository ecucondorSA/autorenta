# 📋 Plan E2E Completo - LOCATARIO (Renter)
## Flujo Completo: Primera Impresión → Reserva → Check-in → Check-out → Pago

**Fecha**: 2025-11-14  
**Objetivo**: Testear toda la experiencia del locatario desde su llegada hasta completar una reserva  
**Duración Estimada**: ~2 horas de tests automatizados  
**Framework**: Playwright + TypeScript  

---

## 🎯 Objetivos del Plan

### Objetivos Principales
- ✅ Validar experiencia completa del usuario desde landing hasta pago final
- ✅ Verificar todos los puntos de contacto críticos
- ✅ Asegurar flujos de éxito Y de error
- ✅ Testear responsive en mobile y desktop
- ✅ Validar integraciones (Supabase, MercadoPago, Storage, Real-time)

### Métricas de Éxito
- 100% de casos críticos (P0) pasando
- <5% de flaky tests
- Tiempo de ejecución <45 minutos
- Cobertura de código >80% en rutas críticas

---

## 🗺️ Mapa del Viaje del Usuario (User Journey)

```
FASE 1: DESCUBRIMIENTO (Visitor)
├── 1.1 Landing Page
├── 1.2 Catálogo Browse
├── 1.3 Detalle de Auto
└── 1.4 CTA Registro

FASE 2: ONBOARDING (New User)
├── 2.1 Registro
├── 2.2 Verificación Email/SMS
├── 2.3 Completar Perfil
├── 2.4 Verificación Identidad
└── 2.5 Tour Inicial (Opcional)

FASE 3: BÚSQUEDA & SELECCIÓN (Authenticated Renter)
├── 3.1 Filtros Avanzados
├── 3.2 Comparación de Autos
├── 3.3 Ver Disponibilidad
├── 3.4 Revisar Precio
└── 3.5 Leer Reviews

FASE 4: PRE-RESERVA (Booking Intent)
├── 4.1 Seleccionar Fechas
├── 4.2 Calcular Precio Total
├── 4.3 Revisar Términos
├── 4.4 Verificar Wallet
└── 4.5 Iniciar Reserva

FASE 5: WALLET & PAGO (Financial)
├── 5.1 Verificar Balance
├── 5.2 Depositar Fondos (MercadoPago)
├── 5.3 Esperar Confirmación
├── 5.4 Lock de Fondos
└── 5.5 Confirmación de Reserva

FASE 6: PRE-CHECK-IN (Preparation)
├── 6.1 Notificación de Aprobación
├── 6.2 Chat con Owner
├── 6.3 Ver Ubicación (Mapbox)
├── 6.4 Instrucciones de Entrega
└── 6.5 Recordatorios

FASE 7: CHECK-IN (Start Rental)
├── 7.1 Confirmar Llegada
├── 7.2 Inspección del Auto
├── 7.3 Subir Fotos (Storage)
├── 7.4 Firmar Contrato Digital
└── 7.5 Activar Seguro (Bonus Protector)

FASE 8: DURANTE LA RENTA (Active Rental)
├── 8.1 Ver Detalles de Reserva
├── 8.2 Reportar Incidentes
├── 8.3 Chat con Owner/Admin
├── 8.4 Extender Reserva (Opcional)
└── 8.5 Ver Tiempo Restante

FASE 9: PRE-CHECK-OUT (End Preparation)
├── 9.1 Notificación de Fin
├── 9.2 Coordinar Devolución
├── 9.3 Limpiar Auto (Opcional)
├── 9.4 Llenar Tanque (Opcional)
└── 9.5 Revisar Condiciones

FASE 10: CHECK-OUT (End Rental)
├── 10.1 Confirmar Devolución
├── 10.2 Inspección Final
├── 10.3 Subir Fotos Finales
├── 10.4 Firma de Conformidad
└── 10.5 Liberar Fondos

FASE 11: POST-RESERVA (Review & Payment)
├── 11.1 Split de Pago (85% Owner / 15% Platform)
├── 11.2 Dejar Review
├── 11.3 Reportar Problemas
├── 11.4 Ver Historial
└── 11.5 Rebooking (CTA)
```

---

## 📋 Tests Detallados por Fase

### FASE 1: DESCUBRIMIENTO (VISITOR) - 4 Tests

#### Test 1.1: Landing Page - Primera Impresión
**File**: `tests/renter/journey/01-landing-first-impression.spec.ts`  
**Priority**: P0  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Hero section visible with CTA
✓ Search bar functional (location, dates)
✓ Featured cars carousel
✓ Value propositions (seguro, sin tarjeta, etc)
✓ Trust signals (testimonios, reviews count)
✓ Footer links (Terms, Privacy, Help)
✓ Mobile responsive
✓ Performance <3s LCP
✓ SEO meta tags present
```

**Success Criteria**:
- Hero loads <1s
- CTA buttons functional
- No console errors
- Mobile: hamburger menu works

---

#### Test 1.2: Catálogo Browse - Exploración
**File**: `tests/renter/journey/02-catalog-browse.spec.ts`  
**Priority**: P0  
**Duration**: 4min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Grid/List view toggle
✓ Infinite scroll / Pagination
✓ Car cards show: photo, brand, model, price, rating
✓ Filter panel visible
✓ Sort options (price, rating, year)
✓ Empty state cuando no hay resultados
✓ Loading skeletons
✓ Favorite icon (guest: prompt login)
```

**Success Criteria**:
- Load 20 cars <2s
- Filters apply instantly
- Images lazy load
- Responsive grid (1/2/3 columns)

---

#### Test 1.3: Detalle de Auto - Información Completa
**File**: `tests/renter/journey/03-car-detail-page.spec.ts`  
**Priority**: P0  
**Duration**: 5min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Photo gallery (swipe/click)
✓ All car specs visible
✓ Price breakdown (daily, weekly, monthly)
✓ Availability calendar
✓ Owner profile snippet
✓ Reviews section (pagination)
✓ Similar cars (recomendaciones)
✓ CTA "Reservar Ahora" visible
✓ Share buttons (WhatsApp, Copy Link)
✓ Report car button
✓ Mapbox location preview
```

**Success Criteria**:
- Gallery images HD
- Calendar interactive
- Reviews load on scroll
- CTA sticky on mobile

---

#### Test 1.4: CTA Registro - Conversion
**File**: `tests/renter/journey/04-cta-to-register.spec.ts`  
**Priority**: P1  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Click "Reservar" → redirect to /auth/register
✓ Query params preserve car intent (?carId=xxx)
✓ Modal "Debes iniciar sesión" appears
✓ Options: Registro / Login
✓ Social login buttons visible (Google, Facebook)
```

**Success Criteria**:
- Intent preserved across redirect
- Modal accessible (keyboard)
- Social buttons functional

---

### FASE 2: ONBOARDING (NEW USER) - 5 Tests

#### Test 2.1: Registro - Account Creation
**File**: `tests/renter/journey/05-register-account.spec.ts`  
**Priority**: P0  
**Duration**: 4min  
**Status**: 🚧 IN PROGRESS (ya existe parcialmente en auth/)

**Scenarios**:
```typescript
✓ Form fields: email, password, confirm password, nombre, apellido
✓ Password strength indicator
✓ Email format validation
✓ Terms checkbox required
✓ Captcha (opcional)
✓ Submit → loading state
✓ Success → redirect to /auth/verify-email
✓ Error handling (email ya existe, red error, etc)
```

**Success Criteria**:
- Validation instant (on blur)
- Password visibility toggle
- No double submit
- Error messages claros

---

#### Test 2.2: Verificación Email/SMS
**File**: `tests/renter/journey/06-verify-email-sms.spec.ts`  
**Priority**: P0  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Email enviado a inbox (check Supabase logs)
✓ Link de verificación funcional
✓ Click link → redirect to /dashboard
✓ Session creada correctamente
✓ Badge "Email Verificado" en perfil
✓ Resend email button (rate limit 1/min)
✓ SMS verificación (opcional, si aplica)
```

**Success Criteria**:
- Email llega <30s
- Link expira en 24h
- Rate limit funcional

---

#### Test 2.3: Completar Perfil - First Data Entry
**File**: `tests/renter/journey/07-complete-profile.spec.ts`  
**Priority**: P0  
**Duration**: 5min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Upload profile photo (avatars bucket)
✓ Añadir teléfono
✓ Añadir dirección
✓ Añadir fecha de nacimiento
✓ Seleccionar idioma preferido
✓ Notificaciones (email/sms/push preferences)
✓ Submit → loading
✓ Success → redirect to /profile
✓ Profile completeness indicator (80% complete)
```

**Success Criteria**:
- Photo upload <5MB
- Phone validation (formato internacional)
- Address autocomplete (Mapbox/Google)
- Date picker accesible

---

#### Test 2.4: Verificación Identidad - KYC
**File**: `tests/renter/journey/08-identity-verification.spec.ts`  
**Priority**: P1  
**Duration**: 6min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Upload DNI/Pasaporte (front + back)
✓ Upload selfie
✓ Upload licencia de conducir
✓ Image size validation (<10MB)
✓ Image format validation (jpg, png, pdf)
✓ Submit → "En revisión" state
✓ Notification cuando admin aprueba
✓ Badge "Verificado" en perfil
✓ Skip option (pero limita funciones)
```

**Success Criteria**:
- Images stored in Supabase Storage
- Clear upload progress
- Can continue without verification (limited)

---

#### Test 2.5: Tour Inicial - Onboarding UX
**File**: `tests/renter/journey/09-initial-tour.spec.ts`  
**Priority**: P2  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Modal/Tooltip tour aparece
✓ Steps: 1) Dashboard, 2) Buscar autos, 3) Wallet, 4) Mensajes
✓ Skip button visible
✓ Dots navigation
✓ Finish → cookie/localstorage "tour_completed"
✓ Never show again checkbox
```

**Success Criteria**:
- Smooth animations
- Keyboard accessible (Esc to close)
- Tour dismissible

---

### FASE 3: BÚSQUEDA & SELECCIÓN (AUTHENTICATED) - 5 Tests

#### Test 3.1: Filtros Avanzados - Search UX
**File**: `tests/renter/journey/10-advanced-filters.spec.ts`  
**Priority**: P0  
**Duration**: 5min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Location filter (city/province autocomplete)
✓ Date range picker (start, end)
✓ Price range slider (min, max)
✓ Brand/Model multi-select
✓ Transmission (manual, automático)
✓ Fuel type (nafta, diesel, electric)
✓ Features (A/C, GPS, Bluetooth, etc)
✓ Rating (4+ stars only)
✓ Instant delivery option
✓ Apply filters → URL query params update
✓ Clear all filters
✓ Save filter preset (opcional)
```

**Success Criteria**:
- Filters apply <1s
- URL shareable (deep link)
- Filter count badge
- Mobile: drawer panel

---

#### Test 3.2: Comparación de Autos - Decision Support
**File**: `tests/renter/journey/11-car-comparison.spec.ts`  
**Priority**: P1  
**Duration**: 4min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Add car to compare (max 3)
✓ Comparison table: price, specs, features, rating
✓ Highlight differences
✓ Remove from comparison
✓ Clear all
✓ Select winner → go to detail
```

**Success Criteria**:
- Sticky comparison bar
- Responsive table (horizontal scroll mobile)
- Persist selections (localStorage)

---

#### Test 3.3: Ver Disponibilidad - Calendar Interaction
**File**: `tests/renter/journey/12-availability-calendar.spec.ts`  
**Priority**: P0  
**Duration**: 4min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Calendar modal opens
✓ Blocked dates highlighted (gray)
✓ Available dates selectable
✓ Select start date → only valid end dates enabled
✓ Min rental period (24h)
✓ Max rental period (30 days)
✓ Price updates on date change
✓ Holidays/Peak dates marked (higher price)
✓ Sync with Google Calendar (owner's blocked dates)
```

**Success Criteria**:
- Calendar loads <1s
- Real-time updates (Supabase Realtime)
- Mobile: native date picker fallback

---

#### Test 3.4: Revisar Precio - Transparency
**File**: `tests/renter/journey/13-price-breakdown.spec.ts`  
**Priority**: P0  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Price breakdown visible:
  - Daily rate × days
  - Weekly discount (if >7 days)
  - Monthly discount (if >30 days)
  - Deposit amount (20% del total)
  - Seguro Bonus Protector (opcional, +10%)
  - Platform fee (15%)
  - Total final
✓ Tooltips con explicaciones
✓ Simulate different date ranges
✓ Currency selector (ARS, USD, BRL)
```

**Success Criteria**:
- Math precision (2 decimals)
- Currency conversion real-time
- No hidden fees

---

#### Test 3.5: Leer Reviews - Social Proof
**File**: `tests/renter/journey/14-reviews-social-proof.spec.ts`  
**Priority**: P1  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Average rating (stars)
✓ Total reviews count
✓ Breakdown by star (5: 80%, 4: 15%, etc)
✓ Sort reviews (recent, highest, lowest)
✓ Filter by rating
✓ Pagination (10 per page)
✓ Verified renter badge
✓ Owner responses visible
✓ Report review button
```

**Success Criteria**:
- Load reviews <2s
- Infinite scroll or pagination
- Photos in reviews (if any)

---

### FASE 4: PRE-RESERVA (BOOKING INTENT) - 5 Tests

#### Test 4.1: Seleccionar Fechas - Booking Start
**File**: `tests/renter/journey/15-select-booking-dates.spec.ts`  
**Priority**: P0  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Click "Reservar Ahora"
✓ Calendar opens in modal
✓ Select start date
✓ Select end date (min 24h later)
✓ Disabled dates (already booked)
✓ Price updates live
✓ Continue → /bookings/new?carId=xxx&start=xxx&end=xxx
```

**Success Criteria**:
- Validation prevents past dates
- Price recalculates on change
- Error if dates unavailable

---

#### Test 4.2: Calcular Precio Total - Quote
**File**: `tests/renter/journey/16-calculate-total-price.spec.ts`  
**Priority**: P0  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Summary card visible
✓ Breakdown:
  - Base price
  - Days count
  - Discounts applied
  - Deposit (20%)
  - Insurance (opcional)
  - Platform fee
  - Total
✓ Edit dates button
✓ Apply promo code (si existe)
```

**Success Criteria**:
- Math matches backend calculation
- Responsive layout
- No rounding errors

---

#### Test 4.3: Revisar Términos - Legal
**File**: `tests/renter/journey/17-review-terms.spec.ts`  
**Priority**: P1  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Terms & Conditions link
✓ Cancellation Policy
✓ Insurance Terms
✓ Checkbox "Acepto términos"
✓ Cannot proceed without checkbox
✓ Modal con PDF viewer (opcional)
```

**Success Criteria**:
- Terms PDF downloadable
- Checkbox required
- Accessible (screen reader)

---

#### Test 4.4: Verificar Wallet - Balance Check
**File**: `tests/renter/journey/18-verify-wallet-balance.spec.ts`  
**Priority**: P0  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Check current balance
✓ Calculate required amount (total + deposit)
✓ If sufficient: enable "Confirmar Reserva"
✓ If insufficient: show "Depositar Fondos"
✓ Display deficit amount
```

**Success Criteria**:
- Balance fetched real-time
- Clear messaging
- CTA button state accurate

---

#### Test 4.5: Iniciar Reserva - Booking Creation
**File**: `tests/renter/journey/19-initiate-booking.spec.ts`  
**Priority**: P0  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Click "Confirmar Reserva"
✓ Loading state (spinner)
✓ Backend creates booking (status: pending_payment)
✓ Redirect to /wallet/deposit if insufficient
✓ Redirect to /bookings/:id if sufficient
✓ Error handling (car no longer available)
```

**Success Criteria**:
- Idempotent (no double booking)
- Optimistic UI
- Rollback on error

---

### FASE 5: WALLET & PAGO (FINANCIAL) - 5 Tests

#### Test 5.1: Verificar Balance Inicial
**File**: `tests/renter/journey/20-wallet-check-balance.spec.ts`  
**Priority**: P0  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ /wallet page shows:
  - Current balance
  - Locked funds
  - Available funds
  - Transaction history (last 10)
✓ "Depositar Fondos" button
```

**Success Criteria**:
- Balance fetched from Supabase
- Locked funds accurate
- Transactions paginated

---

#### Test 5.2: Depositar Fondos - MercadoPago Flow
**File**: `tests/renter/journey/21-deposit-mercadopago.spec.ts`  
**Priority**: P0  
**Duration**: 8min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Enter deposit amount (min $1000)
✓ Select payment method (credit card, debit card, cash)
✓ Click "Depositar"
✓ Redirect to MercadoPago checkout
✓ Fill card details (test card)
✓ Submit payment
✓ Redirect back to /wallet/deposit-success
✓ Webhook receives payment confirmation
✓ Balance updates in DB
✓ Notification toast "Depósito exitoso"
✓ Email confirmation sent
```

**Success Criteria**:
- End-to-end <60s
- Webhook idempotent
- Balance reflects immediately
- No race conditions

**Test Card** (Sandbox):
```
Card: 5031 7557 3453 0604
CVV: 123
Expiry: 11/25
```

---

#### Test 5.3: Esperar Confirmación - Async Payment
**File**: `tests/renter/journey/22-wait-payment-confirmation.spec.ts`  
**Priority**: P0  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ "Procesando pago..." screen
✓ Real-time updates via Supabase Realtime
✓ Success → redirect to /bookings/:id
✓ Failure → show error, allow retry
✓ Timeout after 2 minutes → manual check
```

**Success Criteria**:
- Real-time WebSocket connection
- Retry logic
- Clear error messages

---

#### Test 5.4: Lock de Fondos - Escrow
**File**: `tests/renter/journey/23-lock-funds.spec.ts`  
**Priority**: P0  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Booking created → funds locked
✓ Check wallet_transactions table:
  - Type: lock
  - Amount: booking_total + deposit
  - Status: locked
✓ Available balance reduced
✓ Locked balance increased
✓ Cannot withdraw locked funds
```

**Success Criteria**:
- Atomic transaction
- Cannot double-lock
- DB constraints enforced

---

#### Test 5.5: Confirmación de Reserva - Booking Confirmed
**File**: `tests/renter/journey/24-booking-confirmed.spec.ts`  
**Priority**: P0  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Booking status: pending_approval
✓ Email sent to owner (new booking request)
✓ Email sent to renter (booking created)
✓ Notification in-app (both)
✓ Redirect to /bookings/:id (detail page)
✓ Show "Esperando aprobación del dueño"
✓ Countdown timer (owner has 24h to respond)
```

**Success Criteria**:
- Emails sent <30s
- Notifications real-time
- Timer accurate

---

### FASE 6: PRE-CHECK-IN (PREPARATION) - 5 Tests

#### Test 6.1: Notificación de Aprobación
**File**: `tests/renter/journey/25-approval-notification.spec.ts`  
**Priority**: P0  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Owner approves booking
✓ Status: confirmed
✓ Email sent to renter
✓ Push notification (if enabled)
✓ Badge count updates
✓ Booking detail page refreshes
```

**Success Criteria**:
- Real-time update (<5s)
- Multiple notification channels
- Badge accurate

---

#### Test 6.2: Chat con Owner - Communication
**File**: `tests/renter/journey/26-chat-with-owner.spec.ts`  
**Priority**: P1  
**Duration**: 5min  
**Status**: 🚧 IN PROGRESS (WhatsApp inbox implementado)

**Scenarios**:
```typescript
✓ Click "Mensajes" in booking detail
✓ Opens /messages?bookingId=xxx
✓ Chat thread created
✓ Send text message
✓ Upload image (comprobante)
✓ Upload document (DNI)
✓ Real-time messages (Supabase Realtime)
✓ Unread count badge
✓ Message history persists
```

**Success Criteria**:
- Messages send <1s
- File upload <10MB
- Real-time bidirectional
- Notification on new message

---

#### Test 6.3: Ver Ubicación - Map View
**File**: `tests/renter/journey/27-view-location-map.spec.ts`  
**Priority**: P1  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Click "Ver ubicación"
✓ Mapbox map loads
✓ Pin with car location
✓ Directions button (Google Maps)
✓ Estimated distance/time
✓ Street view (opcional)
```

**Success Criteria**:
- Map loads <2s
- Accurate coordinates
- Directions open external app

---

#### Test 6.4: Instrucciones de Entrega
**File**: `tests/renter/journey/28-delivery-instructions.spec.ts`  
**Priority**: P2  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Owner's delivery notes visible
✓ Parking instructions
✓ Contact info (phone)
✓ Alternative contact (WhatsApp)
✓ Checklist for pick-up
```

**Success Criteria**:
- Clear formatting
- Phone numbers clickable
- Checklist interactive

---

#### Test 6.5: Recordatorios - Email/SMS
**File**: `tests/renter/journey/29-reminders.spec.ts`  
**Priority**: P2  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ 24h before: reminder email
✓ 2h before: SMS reminder
✓ 30min before: push notification
✓ Can dismiss reminders
✓ Snooze option
```

**Success Criteria**:
- Scheduled correctly
- Time zone aware
- Unsubscribe option

---

### FASE 7: CHECK-IN (START RENTAL) - 5 Tests

#### Test 7.1: Confirmar Llegada - Geolocation
**File**: `tests/renter/journey/30-confirm-arrival.spec.ts`  
**Priority**: P0  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Button "Confirmar llegada"
✓ Request geolocation permission
✓ Verify proximity (<100m from car)
✓ If too far: warning "Debes estar cerca del auto"
✓ If close: enable check-in
✓ Status updates to: in_progress
```

**Success Criteria**:
- Geolocation accurate
- Fallback for no GPS
- Owner notified

---

#### Test 7.2: Inspección del Auto - Condition Check
**File**: `tests/renter/journey/31-car-inspection.spec.ts`  
**Priority**: P0  
**Duration**: 5min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Checklist:
  - Exterior (scratches, dents)
  - Interior (cleanliness, smells)
  - Tires (pressure, condition)
  - Lights (all functional)
  - Fuel level
  - Odometer reading
✓ Each item: OK / Not OK / Notes
✓ Cannot proceed if critical items Not OK
```

**Success Criteria**:
- Checklist mandatory
- Photos required for "Not OK"
- Owner notified of issues

---

#### Test 7.3: Subir Fotos - Evidence Upload
**File**: `tests/renter/journey/32-upload-photos-checkin.spec.ts`  
**Priority**: P0  
**Duration**: 5min  
**Status**: 🚧 IN PROGRESS (FAB upload implementado)

**Scenarios**:
```typescript
✓ Upload 4 photos (front, back, left, right)
✓ Optional: interior, dashboard, odometer
✓ Image compression (<2MB each)
✓ Upload to Supabase Storage (bucket: car-inspections)
✓ Progress bar per photo
✓ Retry on failure
✓ Thumbnail preview
✓ Delete photo (before submit)
```

**Success Criteria**:
- All uploads <30s
- Compress to <500KB
- Store with metadata (timestamp, GPS)

---

#### Test 7.4: Firmar Contrato Digital - E-Signature
**File**: `tests/renter/journey/33-sign-contract.spec.ts`  
**Priority**: P1  
**Duration**: 4min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Contract PDF generated (backend)
✓ Preview in iframe
✓ Signature pad (canvas)
✓ "Firmar aquí" placeholder
✓ Clear signature button
✓ Submit signature
✓ PDF updated with signature
✓ Stored in Supabase Storage
✓ Email copy sent
```

**Success Criteria**:
- Signature smooth (touch/mouse)
- PDF legally valid
- Timestamped

---

#### Test 7.5: Activar Seguro - Bonus Protector
**File**: `tests/renter/journey/34-activate-insurance.spec.ts`  
**Priority**: P1  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Optional: activate Bonus Protector
✓ Coverage details modal
✓ Additional cost (+10%)
✓ Payment from locked funds
✓ Insurance certificate generated
✓ Status: active
```

**Success Criteria**:
- Clear terms
- Immediate activation
- Certificate downloadable

---

### FASE 8: DURANTE LA RENTA (ACTIVE RENTAL) - 5 Tests

#### Test 8.1: Ver Detalles de Reserva - Active State
**File**: `tests/renter/journey/35-view-active-booking.spec.ts`  
**Priority**: P0  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ /bookings/:id page shows:
  - Status badge: "En curso"
  - Start/End dates
  - Time remaining (countdown)
  - Car details
  - Owner contact
  - Emergency numbers
  - "Reportar incidente" button
  - "Extender reserva" button
```

**Success Criteria**:
- Real-time countdown
- All info visible
- CTAs functional

---

#### Test 8.2: Reportar Incidentes - Incident Report
**File**: `tests/renter/journey/36-report-incident.spec.ts`  
**Priority**: P1  
**Duration**: 5min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Click "Reportar incidente"
✓ Form:
  - Tipo (accidente, robo, avería)
  - Descripción
  - Ubicación (GPS auto-fill)
  - Fotos (hasta 10)
  - Severidad (low, medium, high)
✓ Submit → creates incident record
✓ Notification to owner + admin
✓ If insurance active: claim process starts
```

**Success Criteria**:
- Form validation
- Photos upload
- Notifications sent <1min

---

#### Test 8.3: Chat con Owner/Admin - Support
**File**: `tests/renter/journey/37-chat-during-rental.spec.ts`  
**Priority**: P1  
**Duration**: 3min  
**Status**: 🚧 IN PROGRESS (inbox existente)

**Scenarios**:
```typescript
✓ Access chat from booking detail
✓ Send/receive messages
✓ Upload photos (car issues)
✓ Admin can join chat (if incident)
✓ Message history persists
```

**Success Criteria**:
- Same as chat pre-checkin
- Admin join seamless

---

#### Test 8.4: Extender Reserva - Extend Booking
**File**: `tests/renter/journey/38-extend-booking.spec.ts`  
**Priority**: P2  
**Duration**: 4min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Click "Extender reserva"
✓ Calendar opens (only future dates)
✓ Select new end date
✓ Calculate additional cost
✓ Check wallet balance
✓ If sufficient: lock additional funds
✓ If insufficient: prompt deposit
✓ Notification to owner (approval)
✓ Owner accepts/rejects
```

**Success Criteria**:
- Extension request created
- Funds locked atomically
- Owner notified real-time

---

#### Test 8.5: Ver Tiempo Restante - Countdown
**File**: `tests/renter/journey/39-rental-countdown.spec.ts`  
**Priority**: P2  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Countdown visible on booking detail
✓ Updates every minute
✓ Changes color when <2h (yellow)
✓ Changes color when <30min (red)
✓ Alert when time expires
```

**Success Criteria**:
- Accurate to the second
- Timezone correct
- Persistent across tabs

---

### FASE 9: PRE-CHECK-OUT (END PREPARATION) - 5 Tests

#### Test 9.1: Notificación de Fin - End Reminder
**File**: `tests/renter/journey/40-end-reminder.spec.ts`  
**Priority**: P2  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ 2h before end: reminder email
✓ 30min before: SMS reminder
✓ 10min before: push notification
✓ Instructions for return
```

**Success Criteria**:
- Scheduled correctly
- Clear instructions
- Contact info visible

---

#### Test 9.2: Coordinar Devolución - Return Coordination
**File**: `tests/renter/journey/41-coordinate-return.spec.ts`  
**Priority**: P1  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Chat with owner to confirm time
✓ Update return location (if different)
✓ Agree on exact time
✓ Calendar invite (optional)
```

**Success Criteria**:
- Chat accessible
- Location updatable
- Confirmation sent

---

#### Test 9.3: Limpiar Auto - Cleaning Checklist
**File**: `tests/renter/journey/42-cleaning-checklist.spec.ts`  
**Priority**: P2  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Optional checklist:
  - Remove trash
  - Vacuum floor
  - Wipe dashboard
  - Check for personal items
✓ Upload photo (proof of cleaning)
```

**Success Criteria**:
- Checklist optional
- Photo optional but encouraged

---

#### Test 9.4: Llenar Tanque - Fuel Policy
**File**: `tests/renter/journey/43-fuel-policy.spec.ts`  
**Priority**: P2  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Show fuel level at start (from checkin)
✓ Reminder to return with same level
✓ Photo of fuel gauge
✓ Receipt upload (if refueled)
```

**Success Criteria**:
- Clear policy
- Photo upload functional

---

#### Test 9.5: Revisar Condiciones - Pre-Return Check
**File**: `tests/renter/journey/44-pre-return-check.spec.ts`  
**Priority**: P1  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Compare checkin vs current condition
✓ Note any new damages
✓ Upload photos if needed
✓ Prepare for checkout
```

**Success Criteria**:
- Side-by-side comparison
- New damages flagged
- Photos uploaded

---

### FASE 10: CHECK-OUT (END RENTAL) - 5 Tests

#### Test 10.1: Confirmar Devolución - Arrival at Return
**File**: `tests/renter/journey/45-confirm-return.spec.ts`  
**Priority**: P0  
**Duration**: 2min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Click "Devolver auto"
✓ Verify geolocation (same as pickup)
✓ Enable checkout
```

**Success Criteria**:
- GPS verification
- Status updates

---

#### Test 10.2: Inspección Final - Condition Verification
**File**: `tests/renter/journey/46-final-inspection.spec.ts`  
**Priority**: P0  
**Duration**: 5min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Same checklist as checkin
✓ Owner also inspects (parallel)
✓ Both must agree on condition
✓ Note discrepancies
✓ Owner can flag damages
✓ Renter can dispute
```

**Success Criteria**:
- Checklist mandatory
- Disputes logged
- Admin notified if dispute

---

#### Test 10.3: Subir Fotos Finales - Final Evidence
**File**: `tests/renter/journey/47-upload-photos-checkout.spec.ts`  
**Priority**: P0  
**Duration**: 4min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Upload same angles as checkin
✓ Compare side-by-side
✓ Highlight differences
✓ Store in Supabase Storage
```

**Success Criteria**:
- Comparison view
- Differences flagged
- All photos uploaded

---

#### Test 10.4: Firma de Conformidad - Acceptance
**File**: `tests/renter/journey/48-sign-acceptance.spec.ts`  
**Priority**: P0  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Both parties sign (renter + owner)
✓ Signature pad for each
✓ Generate final document
✓ Status: completed
✓ Trigger payment split
```

**Success Criteria**:
- Both signatures required
- Document timestamped
- Status update atomic

---

#### Test 10.5: Liberar Fondos - Unlock Funds
**File**: `tests/renter/journey/49-unlock-funds.spec.ts`  
**Priority**: P0  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Check wallet_transactions:
  - Previous lock record
  - Create unlock record
  - Update available balance
✓ If damages: deduct from deposit
✓ Remaining deposit returned
```

**Success Criteria**:
- Atomic transaction
- Balance accurate
- Transaction logged

---

### FASE 11: POST-RESERVA (REVIEW & PAYMENT) - 5 Tests

#### Test 11.1: Split de Pago - Payment Distribution
**File**: `tests/renter/journey/50-payment-split.spec.ts`  
**Priority**: P0  
**Duration**: 4min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Calculate split:
  - 85% to owner
  - 15% to platform
✓ Create wallet_transactions:
  - Type: transfer_to_owner
  - Type: platform_fee
✓ Owner balance increases
✓ Platform balance increases
✓ Renter sees deduction
✓ Email receipts sent (all parties)
```

**Success Criteria**:
- Math accurate
- Transactions atomic
- All parties notified

---

#### Test 11.2: Dejar Review - Feedback
**File**: `tests/renter/journey/51-leave-review.spec.ts`  
**Priority**: P1  
**Duration**: 4min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Prompt to review (modal or email link)
✓ Rating: 1-5 stars
✓ Categories:
  - Car condition
  - Owner communication
  - Value for money
  - Overall experience
✓ Text review (optional)
✓ Upload photos (optional)
✓ Submit → creates review
✓ Owner notified
✓ Review appears on car detail page
```

**Success Criteria**:
- Review persisted
- Average rating recalculated
- Verified badge shown

---

#### Test 11.3: Reportar Problemas - Post-Rental Issues
**File**: `tests/renter/journey/52-report-post-issues.spec.ts`  
**Priority**: P2  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ "Reportar problema" button
✓ Form:
  - Issue type (billing, car, owner)
  - Description
  - Evidence (photos, docs)
✓ Submit → creates support ticket
✓ Admin receives notification
✓ Ticket status tracking
```

**Success Criteria**:
- Form validation
- Ticket created
- Admin dashboard updated

---

#### Test 11.4: Ver Historial - Booking History
**File**: `tests/renter/journey/53-view-booking-history.spec.ts`  
**Priority**: P1  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ /bookings page shows all bookings:
  - Status badges
  - Dates
  - Car info
  - Total cost
  - Actions (view detail, review, rebook)
✓ Filter by status
✓ Sort by date
✓ Pagination
✓ Export as PDF/CSV (opcional)
```

**Success Criteria**:
- All bookings listed
- Filters functional
- Export working

---

#### Test 11.5: Rebooking - Repeat Customer Flow
**File**: `tests/renter/journey/54-rebooking.spec.ts`  
**Priority**: P2  
**Duration**: 3min  
**Status**: 📝 TODO

**Scenarios**:
```typescript
✓ Click "Reservar nuevamente" on past booking
✓ Pre-fill dates (similar period)
✓ Same car, same location
✓ Skip to booking confirmation (faster flow)
✓ Apply loyalty discount (si existe)
```

**Success Criteria**:
- Data pre-filled
- Faster checkout
- Discount applied

---

## 📊 Resumen de Tests

### Por Fase
| Fase | # Tests | Duración | Prioridad |
|------|---------|----------|-----------|
| 1. Descubrimiento | 4 | 14min | P0-P1 |
| 2. Onboarding | 5 | 21min | P0-P2 |
| 3. Búsqueda | 5 | 19min | P0-P1 |
| 4. Pre-Reserva | 5 | 13min | P0-P1 |
| 5. Wallet & Pago | 5 | 19min | P0 |
| 6. Pre-Check-in | 5 | 14min | P0-P2 |
| 7. Check-in | 5 | 20min | P0-P1 |
| 8. Durante Renta | 5 | 16min | P0-P2 |
| 9. Pre-Check-out | 5 | 12min | P1-P2 |
| 10. Check-out | 5 | 17min | P0 |
| 11. Post-Reserva | 5 | 17min | P0-P2 |
| **TOTAL** | **54** | **~182min** | **(3h)** |

### Por Prioridad
| Prioridad | # Tests | Descripción |
|-----------|---------|-------------|
| **P0** | 32 (59%) | Critical path - bloqueadores de release |
| **P1** | 15 (28%) | Important - deberían pasar |
| **P2** | 7 (13%) | Nice to have - pueden diferirse |

---

## ✅ Estado Actual vs Pendiente

### ✅ YA IMPLEMENTADO
1. ✅ WhatsApp-style Inbox (Fase 6.2, 8.3)
2. ✅ File Upload FAB (Fase 7.3, 10.3)
3. ✅ Toast Notifications (UX en toda la app)
4. ✅ Bottom Navigation Bar (Mobile UX)
5. ✅ Supabase Storage Integration (Fase 7.3)
6. ✅ Real-time Messages (Fase 6.2)

### 📝 PENDIENTE (POR IMPLEMENTAR)

#### CRÍTICOS (P0) - 32 tests
```
Fase 1: Landing, Catálogo, Detalle Auto
Fase 2: Registro, Verificación, Perfil
Fase 3: Filtros, Calendario
Fase 4: Selección fechas, Wallet check
Fase 5: TODO el flujo de pago (5 tests)
Fase 6: Notificaciones de aprobación
Fase 7: TODO el flujo de check-in (5 tests)
Fase 8: Ver reserva activa
Fase 10: TODO el flujo de check-out (5 tests)
Fase 11: Split de pago, Review
```

#### IMPORTANTES (P1) - 15 tests
```
Fase 1: SEO check
Fase 2: Verificación identidad, Tour
Fase 3: Comparación, Reviews
Fase 4: Términos legales
Fase 6: Chat, Mapa, Instrucciones
Fase 7: Contrato digital, Seguro
Fase 8: Reportar incidente, Chat support
Fase 9: Coordinar devolución, Condiciones
Fase 11: Historial, Reportar problemas
```

#### OPCIONALES (P2) - 7 tests
```
Fase 2: Theme persistence, Tour onboarding
Fase 6: Recordatorios
Fase 8: Extender reserva, Countdown
Fase 9: Limpiar auto, Llenar tanque
Fase 11: Rebooking
```

---

## 🎯 Roadmap de Implementación

### Sprint 1 (Semana 1): Fundación E2E
**Objetivo**: Setup completo de testing framework
- [ ] Playwright config finalizado
- [ ] Auth fixtures (3 roles)
- [ ] Page Objects base (10 páginas principales)
- [ ] Test helpers (data generators, Supabase utils)
- [ ] Seed data SQL script
- [ ] CI/CD pipeline (GitHub Actions)

**Entregable**: Framework listo para escribir tests

---

### Sprint 2 (Semana 2): Critical Path - Parte 1
**Objetivo**: Tests P0 desde descubrimiento hasta pre-reserva
- [ ] Fase 1: Descubrimiento (4 tests)
- [ ] Fase 2: Onboarding (3 tests P0)
- [ ] Fase 3: Búsqueda (2 tests P0)
- [ ] Fase 4: Pre-Reserva (5 tests)

**Total**: 14 tests P0  
**Entregable**: Usuario puede llegar hasta iniciar reserva

---

### Sprint 3 (Semana 3): Critical Path - Parte 2 (Payments)
**Objetivo**: Tests P0 de wallet y pagos completos
- [ ] Fase 5: Wallet & Pago (5 tests) **MÁS CRÍTICO**
  - Integración MercadoPago
  - Webhook testing
  - Balance operations
  - Transaction integrity

**Total**: 5 tests P0  
**Entregable**: Flujo de pago end-to-end funcional

---

### Sprint 4 (Semana 4): Critical Path - Parte 3 (Check-in/out)
**Objetivo**: Tests P0 de check-in y check-out
- [ ] Fase 6: Pre-Check-in (1 test P0)
- [ ] Fase 7: Check-in (5 tests) **CRÍTICO**
  - Geolocation
  - Photo uploads
  - Inspection checklist
- [ ] Fase 10: Check-out (5 tests) **CRÍTICO**
  - Final inspection
  - Signatures
  - Fund release

**Total**: 11 tests P0  
**Entregable**: Rental lifecycle completo

---

### Sprint 5 (Semana 5): Critical Path - Finalización
**Objetivo**: Tests P0 restantes + post-reserva
- [ ] Fase 8: Durante Renta (1 test P0)
- [ ] Fase 11: Post-Reserva (2 tests P0) **CRÍTICO**
  - Payment split (85/15)
  - Reviews

**Total**: 3 tests P0  
**Entregable**: 32 tests P0 completos (100%)

---

### Sprint 6 (Semana 6): Important Tests (P1)
**Objetivo**: Tests P1 para mejorar cobertura
- [ ] 15 tests P1 distribuidos en todas las fases
- [ ] Comparación de autos
- [ ] Verificación identidad
- [ ] Incident reports
- [ ] Legal terms

**Entregable**: 47 tests totales (P0+P1)

---

### Sprint 7 (Semana 7): Nice-to-Have (P2)
**Objetivo**: Tests P2 y polish
- [ ] 7 tests P2 restantes
- [ ] Visual regression tests
- [ ] Performance tests (Lighthouse)
- [ ] Accessibility tests (axe-core)

**Entregable**: 54 tests completos

---

### Sprint 8 (Semana 8): CI/CD & Documentation
**Objetivo**: Production-ready testing
- [ ] GitHub Actions workflows optimized
- [ ] Parallel execution (<30min total)
- [ ] Flaky test monitoring (Playwright reporter)
- [ ] Test documentation
- [ ] Training sessions para el equipo
- [ ] Runbooks para debugging

**Entregable**: Sistema de testing production-ready

---

## 🚨 Bloqueadores Conocidos

### 1. MercadoPago Sandbox
**Issue**: Sandbox puede ser inestable  
**Mitigación**: 
- Usar test mode con webhook mock
- Retry logic en tests
- Fallback a payments stub

### 2. Geolocation en CI
**Issue**: GitHub Actions no tiene GPS  
**Mitigación**:
- Mock geolocation API
- Skip geolocation tests en CI
- Run geolocation tests en BrowserStack

### 3. File Uploads Timing
**Issue**: Large images timeout  
**Mitigación**:
- Use compressed test images (<100KB)
- Increase timeout para uploads
- Mock storage en unit tests

### 4. Supabase Rate Limits
**Issue**: Too many test runs hit rate limits  
**Mitigación**:
- Use separate test database
- Clear data between runs
- Implement request throttling

---

## 📈 Métricas de Éxito

### Coverage Goals
- **Code Coverage**: >80% en rutas críticas
- **E2E Coverage**: 100% de P0 tests passing
- **Flake Rate**: <5% (máximo 2-3 tests flaky)
- **Execution Time**: <30min en CI (parallel)

### Quality Gates
✅ Todos los P0 tests pasan  
✅ <3 flaky tests  
✅ No console errors en producción  
✅ Lighthouse score >90  
✅ Accessibility score 100%  

---

## 🛠️ Herramientas & Stack

### Core
- **Playwright** 1.40+ (browser automation)
- **TypeScript** 5.0+ (type safety)
- **Supabase Client** (DB access en tests)

### Utilities
- **Faker.js** (data generation)
- **date-fns** (date manipulation)
- **sharp** (image compression para uploads)

### CI/CD
- **GitHub Actions** (runner)
- **Playwright Reporter** (HTML reports)
- **Allure** (optional, advanced reporting)

### Monitoring
- **Sentry** (error tracking en tests)
- **Playwright Trace Viewer** (debugging)
- **Lighthouse CI** (performance)

---

## 📞 Contacto & Support

**Maintainer**: AutoRenta Testing Team  
**Slack**: #e2e-testing  
**Docs**: `/tests/README.md`  
**Issues**: GitHub Issues con label `testing`

---

**Última Actualización**: 2025-11-14  
**Versión**: 1.0.0  
**Estado**: 📝 Plan Completo - Ready for Implementation
