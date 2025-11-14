# Feature Gap Analysis - AutoRenta MVP

**Fecha:** 2025-11-12
**Versión:** 1.0
**Base:** Análisis de código + Market Research Argentina

---

## 📋 Executive Summary

Este documento analiza las brechas (gaps) entre las funcionalidades actuales de AutoRenta y los requisitos identificados en la investigación de mercado del sector de renta de autos para conductores de aplicaciones en Argentina.

**Hallazgos Clave:**
- ✅ **45% implementado** - Sistema de pagos, wallet, verificación básica
- 🔄 **30% parcial** - Contratos, seguros, pricing dinámico
- ❌ **25% faltante** - Términos parametrizables, inspecciones, mantenimiento

**Prioridad MVP:** Completar **Sistema de Contratos** y **Workflow de Inspecciones** para alcanzar product-market fit en el mercado argentino de app drivers.

---

## 1. Sistema de Contratos y Garantías

### 1.1 ✅ Lo que EXISTE

#### Booking Contracts (Basic)
**Archivo:** `apps/web/src/app/core/services/contracts.service.ts` (65 líneas)
**DB Migration:** Tabla `booking_contracts` implícita (referenciada en código)

**Funcionalidades:**
```typescript
interface BookingContract {
  id: string;
  booking_id: string;
  terms_version: string;          // ✅ Versioning de términos
  accepted_by_renter: boolean;    // ✅ Aceptación de locatario
  accepted_at: string | null;     // ✅ Timestamp de aceptación
  pdf_url: string | null;         // ✅ URL de PDF generado
  created_at: string;
}
```

**Métodos disponibles:**
- `prepareContract()` - Crear contrato para booking
- `acceptContract()` - Marcar como aceptado
- `getContractByBooking()` - Obtener contrato por booking

**Estado:** 🟢 **Funcional básico**

---

#### FGO - Fondo de Garantía Operativa
**Archivo:** `supabase/migrations/20251022_create_fgo_system.sql` (599+ líneas)
**Tipo:** Sistema contable completo

**Componentes:**
1. **Subfondos** (`fgo_subfunds`):
   - `liquidity` - Pagos inmediatos, siniestros, devoluciones
   - `capitalization` - Compras de autos, inversiones temporales
   - `profitability` - Intereses o excedentes

2. **Movimientos** (`fgo_movements`):
   - `user_contribution` - Aporte de usuario (α% = 15%)
   - `siniestro_payment` - Pago de siniestro
   - `franchise_payment` - Pago de franquicia
   - `capitalization` - Transferencia a capitalización
   - `return_to_user` - Devolución a usuario
   - `interest_earned` - Intereses ganados

3. **Métricas** (`fgo_metrics`):
   - Coverage Ratio (RC) = Total FGO / (12 × siniestros mensuales)
   - Loss Ratio (LR) = Siniestros pagados / Total aportes
   - Estado del fondo: `healthy`, `warning`, `critical`

**Parámetros configurables:**
- `alpha_percentage` = 15% (aporte de cada booking)
- `target_months_coverage` = 12 meses de cobertura

**Estado:** 🟢 **Producción-ready** (contabilidad completa)

---

#### Wallet + Depósitos
**Archivos:**
- `supabase/migrations/20251028_add_split_payment_system.sql`
- `supabase/migrations/20251028_fix_non_withdrawable_cash_deposits.sql`

**Funcionalidades:**
- Split payments: 85% locador, 15% plataforma
- Balance types: `available`, `locked`, `protected_credit`, `non_withdrawable`
- Bank accounts: CBU, CVU, Alias (Argentina)
- Wallet ledger: Double-entry accounting

**Estado:** 🟢 **Producción**

---

### 1.2 ❌ Lo que FALTA (MVP Gaps)

#### 1. Rental Terms Management (Sistema de Términos)
**Problema detectado:** Investigación de mercado muestra que **conflicto #1** es "Incumplimiento de condiciones pactadas verbalmente".

**Gap:**
```typescript
// ❌ NO EXISTE actualmente
interface RentalTermsTemplate {
  id: string;
  template_name: string;          // "Standard", "Premium", "Long-term"
  version: string;                // "v1.2.3"

  // Términos parametrizables
  late_return_fee_per_hour: number;      // ej: $5000/hora
  max_late_hours_without_penalty: number; // ej: 1 hora de gracia

  mileage_limit_km_per_day: number;      // ej: 300 km/día
  extra_km_fee: number;                  // ej: $200/km extra

  fuel_policy: 'full_to_full' | 'same_level' | 'flexible';
  refuel_fee_if_empty: number;           // ej: $15000 + combustible

  cleaning_fee_if_dirty: number;         // ej: $8000
  smoking_penalty: number;               // ej: $25000

  authorized_drivers_limit: number;      // ej: 2 conductores
  additional_driver_fee_per_day: number; // ej: $3000/día

  min_driver_age: number;                // ej: 21 años
  max_driver_age: number;                // ej: 75 años

  geographic_restrictions: string[];     // ej: ["CABA", "GBA", "Buenos Aires"]
  cross_border_allowed: boolean;         // ej: false (no cruzar a Uruguay)

  requires_deposit: boolean;
  deposit_amount_multiplier: number;     // ej: 1.5x daily rate

  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// ❌ NO EXISTE
interface CarRentalTerms {
  car_id: string;
  terms_template_id: string;
  custom_terms_override: Partial<RentalTermsTemplate>; // Override específico
  effective_from: string;
  effective_until: string | null;
}
```

**Impacto:** Sin términos claros y parametrizables, AutoRenta replica el problema #1 del mercado informal.

**Prioridad:** 🔴 **ALTA** - MVP blocker

---

#### 2. Electronic Contract Signing (Firma Electrónica)
**Problema:** Investigación muestra que **solo el 30% de los locadores usan contratos escritos** en el mercado informal.

**Gap:**
```typescript
// ❌ NO EXISTE
interface ContractSignature {
  contract_id: string;
  signer_user_id: string;
  signer_role: 'owner' | 'renter';

  // Evidencia de firma
  ip_address: string;
  device_fingerprint: string;
  signature_method: 'checkbox' | 'typed_name' | 'drawn' | 'otp';

  // Para firma dibujada
  signature_svg_data?: string;

  // Para OTP (One-Time Password)
  otp_sent_to?: string;           // Email o teléfono
  otp_verified_at?: string;

  signed_at: string;

  // Legal compliance
  terms_accepted_hash: string;    // SHA-256 del documento aceptado
  evidence_url: string;           // PDF firmado + metadata
}

// ❌ NO EXISTE
interface BipartiteConfirmation {
  booking_id: string;

  // Confirmaciones requeridas
  owner_confirmed_pickup: boolean;
  owner_confirmed_at: string | null;

  renter_confirmed_pickup: boolean;
  renter_confirmed_at: string | null;

  both_confirmed: boolean;        // Computed: ambos confirmaron

  // Para devolución
  owner_confirmed_return: boolean;
  renter_confirmed_return: boolean;
  return_confirmation_complete: boolean;
}
```

**Nota:** Existe `bilateral_confirmation` en `database/add-bilateral-confirmation-fields.sql` pero **no está migrado a producción**.

**Prioridad:** 🟡 **MEDIA** - Mejora confianza, pero no bloqueante

---

#### 3. Dispute Resolution System (Sistema de Disputas)
**Problema:** Investigación muestra **conflicto #2: Daños no documentados** y **#3: Problemas con depósitos**.

**Gap:**
```typescript
// ❌ NO EXISTE
interface BookingDispute {
  id: string;
  booking_id: string;

  raised_by_user_id: string;
  raised_by_role: 'owner' | 'renter';

  dispute_type:
    | 'damage_claim'              // Reclamo de daño
    | 'deposit_refund'            // Disputa por depósito
    | 'late_return'               // Retorno tardío
    | 'contract_breach'           // Incumplimiento de términos
    | 'cleanliness'               // Estado de limpieza
    | 'fuel_level'                // Nivel de combustible
    | 'mileage_excess'            // Kilometraje excedido
    | 'other';

  description: string;
  evidence_urls: string[];        // Fotos, videos, documentos

  amount_in_dispute_cents: number;

  status:
    | 'open'                      // Recién abierto
    | 'under_review'              // Admin revisando
    | 'awaiting_response'         // Esperando respuesta de otra parte
    | 'mediation'                 // Mediación en curso
    | 'resolved'                  // Resuelto
    | 'escalated';                // Escalado a legal

  resolution: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;

  created_at: string;
  updated_at: string;
}

// ❌ NO EXISTE
interface DisputeMessage {
  id: string;
  dispute_id: string;
  sent_by_user_id: string;
  message: string;
  attachments: string[];
  is_admin_message: boolean;
  created_at: string;
}
```

**Prioridad:** 🟡 **MEDIA** - Crítico para operaciones a escala, pero MVP puede usar soporte manual

---

### 1.3 🔄 Lo que está PARCIAL

#### Booking Contracts - Términos Hardcodeados
**Estado actual:**
- ✅ Existe tabla `booking_contracts`
- ✅ Versionado de términos (`terms_version`)
- ✅ PDF URL storage
- ❌ Los términos están **hardcodeados en frontend** o **no existen**
- ❌ No hay UI para configurar términos por locador
- ❌ No hay validación automática de términos al completar booking

**Recomendación:** Migrar términos hardcodeados → Template system parametrizable

---

## 2. Modelos de Pricing y Comisiones

### 2.1 ✅ Lo que EXISTE

#### Dynamic Pricing System
**Archivos:**
- `apps/web/src/app/core/services/pricing.service.ts` (476 líneas)
- `apps/web/src/app/core/services/dynamic-pricing.service.ts`
- `supabase/migrations/20251111_dynamic_pricing_bookings.sql`

**Funcionalidades:**
```typescript
interface QuoteBreakdown {
  price_subtotal: number;
  discount: number;
  service_fee: number;
  total: number;

  // Distance-based pricing
  delivery_fee?: number;
  delivery_distance_km?: number;
  distance_risk_tier?: 'local' | 'regional' | 'long_distance';

  // Dynamic pricing flags
  pricing_strategy?: 'dynamic' | 'custom';
  dynamic_pricing_applied?: boolean;
}
```

**Métodos:**
- `quoteBooking()` - Calcular cotización con todos los factores
- `calculateDeliveryFee()` - Fee basado en distancia
- `estimateVehicleValue()` - Valoración con FIPE API (Brasil)
- `calculateSuggestedRate()` - Tarifa sugerida por categoría

**Estado:** 🟢 **Producción**

---

#### Split Payment System (85/15)
**Archivo:** `supabase/migrations/20251028_add_split_payment_system.sql`

**Configuración:**
```sql
CREATE TABLE wallet_split_config (
  platform_fee_percent NUMERIC(5,2) DEFAULT 10.00,  -- 10% plataforma
  locador_id UUID,
  custom_fee_percent NUMERIC(5,2),                  -- Override por locador
  active BOOLEAN DEFAULT true
);
```

**Tabla de splits:**
```sql
CREATE TABLE payment_splits (
  payment_id UUID,

  -- Split amounts
  locador_amount_cents BIGINT,    -- 85% (o custom)
  platform_amount_cents BIGINT,   -- 15% (o custom)

  -- Deposit handling
  deposit_amount_cents BIGINT,
  deposit_returned_at TIMESTAMPTZ,

  -- FGO contribution (15% del total)
  fgo_contribution_cents BIGINT,

  split_completed BOOLEAN DEFAULT false
);
```

**Estado:** 🟢 **Producción** (MercadoPago Marketplace)

---

#### Vehicle Value Estimation (FIPE Integration)
**Funcionalidad:**
- API FIPE (Fundação Instituto de Pesquisas Econômicas - Brasil)
- Fallback a categorías si FIPE no tiene data
- Sugerencia automática de daily rate: **0.3% del valor del vehículo**

**Ejemplo:**
```typescript
// Auto valorado en USD $15,000
const suggestedRate = 15000 * 0.003 = $45 USD/día
```

**Limitación:** FIPE es brasileño, datos de autos argentinos son limitados.

**Estado:** 🟡 **Funcional pero con datos limitados para Argentina**

---

#### Platform Config (Comisiones configurables)
**Archivo:** `supabase/migrations/20251106_create_platform_config_table.sql`

```sql
CREATE TABLE platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ejemplo de configs
INSERT INTO platform_config (key, value, description) VALUES
  ('commission_rate', '{"rate": 0.15}'::jsonb, 'Platform commission rate'),
  ('min_booking_amount', '{"cents": 500000}'::jsonb, 'Minimum booking $5000 ARS'),
  ('cancellation_policy', '{"hours": 24, "refund_percent": 0.80}'::jsonb, 'Cancellation rules');
```

**Estado:** 🟢 **Implementado**

---

### 2.2 ❌ Lo que FALTA (MVP Gaps)

#### 1. Comisiones Variables por Volumen
**Problema:** Investigación muestra que **DeRentas cobra 40-50% de comisión**, pero locadores con más autos deberían tener descuentos.

**Gap:**
```typescript
// ❌ NO EXISTE
interface VolumeCommissionTier {
  id: string;
  tier_name: string;              // "Bronze", "Silver", "Gold", "Platinum"

  min_cars_count: number;         // ej: 1, 3, 10, 25
  max_cars_count: number | null;  // ej: 2, 9, 24, null (unlimited)

  min_monthly_revenue_ars: number;// ej: 0, 500k, 2M, 10M

  commission_rate: number;        // ej: 0.15, 0.12, 0.10, 0.08

  benefits: string[];             // ["Priority support", "Featured listings"]

  created_at: string;
  updated_at: string;
  is_active: boolean;
}

// ❌ NO EXISTE
interface OwnerCommissionOverride {
  owner_id: string;
  commission_tier_id: string;

  custom_rate: number | null;     // Override manual por admin

  effective_from: string;
  effective_until: string | null;

  reason: string;                 // "Volume discount", "Partnership", "Promotion"
}
```

**Competencia:**
- **DeRentas/Enchulame:** 40-50% fijo (sin descuentos)
- **AutoRenta actual:** 15% fijo
- **AutoRenta propuesto:** 15% → 12% → 10% → 8% según volumen

**Prioridad:** 🟡 **MEDIA** - Importante para atraer locadores grandes, pero MVP puede empezar con flat 15%

---

#### 2. Pricing Automático por Temporada/Demanda
**Problema:** Investigación muestra que **tarifas varían según demanda** (ej: fin de semana, feriados).

**Gap:**
```typescript
// ❌ NO EXISTE (parcialmente en dynamic-pricing.service.ts pero no configurable)
interface SeasonalPricingRule {
  id: string;
  rule_name: string;              // "Summer High Season", "Weekend Boost"

  date_ranges: Array<{
    start_date: string;           // "2025-12-01"
    end_date: string;             // "2025-03-15"
  }>;

  days_of_week: number[];         // [5, 6, 0] = Viernes, Sábado, Domingo

  price_multiplier: number;       // ej: 1.3 (30% más caro)

  applies_to_category_ids: string[] | null; // null = todos
  applies_to_cities: string[] | null;       // null = todas

  priority: number;               // En caso de reglas superpuestas

  is_active: boolean;
}
```

**Estado actual:** Existe `pricing_demand_snapshots` pero no hay UI ni automatización.

**Prioridad:** 🔴 **ALTA** - Crítico para competitividad con mercado informal

---

#### 3. Promociones y Descuentos
**Gap:**
```typescript
// ❌ NO EXISTE
interface PromotionCode {
  id: string;
  code: string;                   // "VERANO2025", "PRIMERACOMPRA"

  discount_type: 'percentage' | 'fixed_amount' | 'free_days';
  discount_value: number;         // ej: 20 (20% off), 5000 (5000 ARS off), 1 (1 día gratis)

  min_booking_days: number;       // ej: 7 (solo válido para 7+ días)
  min_booking_amount_cents: number;

  max_uses_total: number | null;  // ej: 100 usos totales
  max_uses_per_user: number;      // ej: 1 uso por usuario

  valid_from: string;
  valid_until: string;

  applies_to_first_booking_only: boolean;

  is_active: boolean;
}
```

**Prioridad:** 🟡 **MEDIA** - Growth tool, no MVP blocker

---

### 2.3 🔄 Lo que está PARCIAL

#### Dynamic Pricing - Sin Configuración UI
**Estado:**
- ✅ Existe backend (`dynamic_pricing_applied` flag en bookings)
- ✅ Cálculo de distance-based delivery fee
- ❌ No hay UI para configurar reglas de pricing
- ❌ No hay dashboard de pricing analytics
- ❌ Locadores no pueden ver/editar sus reglas de pricing

**Recomendación:** Agregar dashboard de pricing para locadores

---

## 3. Gestión de Seguros y Mantenimiento

### 3.1 ✅ Lo que EXISTE

#### Insurance System (Complete)
**Archivo:** `database/create-insurance-system.sql` (598 líneas)

**Tablas:**
1. **`insurance_policies`** - Pólizas flotantes y BYOI
2. **`booking_insurance_coverage`** - Cobertura activa por booking
3. **`insurance_addons`** - Add-ons opcionales (RC ampliada, etc.)
4. **`insurance_claims`** - Reclamos de siniestros

**Tipos de pólizas:**
```sql
policy_type: 'platform_floating' | 'owner_byoi'

-- Platform Floating (póliza de la plataforma)
- Aseguradoras: Rio Uruguay, Sancor, Federación Patronal
- Coberturas: RC $160M, daños propios, robo, incendio, mal uso ($25M)
- Franquicia: 5% (mín $500k ARS)
- Costo: $X/día cobrado al locatario

-- Owner BYOI (Bring Your Own Insurance)
- Locador usa su propia póliza
- Debe subir documento y ser verificado por admin
- Sin costo adicional para locatario
```

**Coberturas incluidas:**
- ✅ Responsabilidad Civil (RC): $160M ARS
- ✅ Daños propios: Incluido
- ✅ Robo: Incluido
- ✅ Incendio: Incluido
- ✅ Mal uso / Apropiación indebida: Hasta $25M ARS
- ✅ Franquicia: 5% (mínimo $500k ARS)

**Add-ons opcionales:**
```sql
- RC ampliada (aumentar cobertura)
- Reducción de franquicia (de 5% a 2%)
- Conductor adicional
- Cobertura en países limítrofes
- Asistencia mecánica 24/7
```

**Estado:** 🟢 **Producción-ready** (estructura completa)

---

#### Insurance Claims (Reclamos)
**Tabla:** `insurance_claims`

```sql
CREATE TABLE insurance_claims (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  coverage_id UUID REFERENCES booking_insurance_coverage(id),

  claim_type: 'damage' | 'theft' | 'third_party_liability' | 'fire' | 'other',

  reported_by_user_id UUID,
  reported_at TIMESTAMPTZ,

  incident_date TIMESTAMPTZ,
  incident_location TEXT,
  incident_description TEXT,

  estimated_damage_amount BIGINT,
  franchise_amount BIGINT,         -- Franquicia a cargo del locatario
  covered_amount BIGINT,           -- Monto cubierto por seguro

  evidence_urls TEXT[],            -- Fotos, videos, acta policial

  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid',

  insurer_claim_number TEXT,       -- Número de siniestro de aseguradora
  insurer_response JSONB,

  approved_amount BIGINT,
  payment_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Estado:** 🟢 **Implementado**

---

### 3.2 ❌ Lo que FALTA (MVP Gaps)

#### 1. Vehicle Inspection System (CRÍTICO)
**Problema:** Investigación muestra que **conflicto #2 es "Daños no documentados"**. DeRentas/Enchulame requieren inspección pre-entrega.

**Gap:**
```typescript
// ❌ NO EXISTE
interface VehicleInspection {
  id: string;
  car_id: string;
  booking_id: string | null;      // null = inspección general (no ligada a booking)

  inspection_type:
    | 'initial'                   // Primera inspección del auto
    | 'pre_booking_pickup'        // Antes de entregar al locatario
    | 'post_booking_return'       // Al devolver el auto
    | 'periodic'                  // Inspección periódica (cada 3 meses)
    | 'damage_report';            // Reporte de daño

  inspector_user_id: string;      // Quien hizo la inspección
  inspector_role: 'owner' | 'renter' | 'platform_agent';

  // Checklist de estado
  exterior_condition: {
    front_bumper: 'perfect' | 'minor_scratches' | 'dents' | 'damaged';
    rear_bumper: 'perfect' | 'minor_scratches' | 'dents' | 'damaged';
    doors: Record<'front_left' | 'front_right' | 'rear_left' | 'rear_right', 'perfect' | 'scratches' | 'dents'>;
    windows: Record<'front' | 'rear' | 'left' | 'right', 'perfect' | 'cracked' | 'broken'>;
    headlights: 'working' | 'not_working';
    taillights: 'working' | 'not_working';
    mirrors: Record<'left' | 'right', 'perfect' | 'cracked' | 'missing'>;
    tires: Record<'front_left' | 'front_right' | 'rear_left' | 'rear_right', {
      tread_depth_mm: number;
      condition: 'good' | 'worn' | 'needs_replacement';
    }>;
    paint: 'perfect' | 'minor_scratches' | 'major_damage';
  };

  interior_condition: {
    seats: 'clean' | 'stained' | 'torn';
    dashboard: 'perfect' | 'scratches' | 'damaged';
    steering_wheel: 'good' | 'worn' | 'damaged';
    floor_mats: 'clean' | 'dirty' | 'missing';
    cleanliness_rating: 1 | 2 | 3 | 4 | 5;  // 1=muy sucio, 5=impecable
    odor: 'none' | 'smoke' | 'pet' | 'mold' | 'other';
  };

  mechanical_condition: {
    engine_running: boolean;
    engine_noises: string | null;
    transmission_working: boolean;
    brakes_working: boolean;
    ac_working: boolean;
    warning_lights: string[];       // ["Check engine", "ABS"]
  };

  // Documentación fotográfica
  photos: Array<{
    url: string;
    caption: string;                // "Front bumper scratch"
    angle: 'front' | 'rear' | 'left' | 'right' | 'interior' | 'damage_closeup';
    timestamp: string;
  }>;

  // Odómetro
  odometer_reading_km: number;
  odometer_photo_url: string;

  // Combustible
  fuel_level_percent: number;       // 0-100
  fuel_gauge_photo_url: string;

  // Firmas (ambas partes confirman el estado)
  owner_confirmed: boolean;
  owner_confirmed_at: string | null;
  renter_confirmed: boolean;
  renter_confirmed_at: string | null;

  // Notas adicionales
  notes: string | null;

  created_at: string;
  updated_at: string;
}
```

**Flujo propuesto:**
1. **Pre-pickup inspection** (Locador + Locatario):
   - Ambos toman fotos del auto
   - Documentan estado actual
   - Firman digitalmente
   - Se crea baseline para comparar al retorno

2. **Post-return inspection** (Locador + Locatario):
   - Comparan contra baseline de pre-pickup
   - Identifican nuevos daños
   - Acuerdan resolución o escalan a disputa

**Prioridad:** 🔴 **CRÍTICA** - MVP blocker para market fit

---

#### 2. Maintenance Tracking System
**Problema:** Investigación muestra que **mantenimiento es crítico** para reliability. DeRentas/Enchulame requieren service history.

**Gap:**
```typescript
// ❌ NO EXISTE
interface VehicleMaintenanceRecord {
  id: string;
  car_id: string;

  maintenance_type:
    | 'oil_change'                // Cambio de aceite
    | 'tire_rotation'             // Rotación de neumáticos
    | 'tire_replacement'          // Reemplazo de neumáticos
    | 'brake_service'             // Service de frenos
    | 'alignment'                 // Alineación
    | 'battery_replacement'       // Cambio de batería
    | 'inspection'                // VTV (Verificación Técnica Vehicular)
    | 'ac_service'                // Service de A/C
    | 'engine_repair'             // Reparación de motor
    | 'transmission_service'      // Service de transmisión
    | 'other';

  performed_at: string;           // Fecha del service
  performed_by: string;           // Taller / Mecánico

  odometer_reading_km: number;

  cost_ars: number;

  description: string;
  invoice_url: string | null;

  next_service_due_km: number | null;  // ej: "Próximo cambio de aceite a los 5000 km"
  next_service_due_date: string | null;

  created_at: string;
  updated_at: string;
}

// ❌ NO EXISTE
interface MaintenanceSchedule {
  car_id: string;

  last_oil_change_km: number;
  next_oil_change_due_km: number;     // = last + 5000 km

  last_vtv_date: string;
  next_vtv_due_date: string;          // = last + 1 año

  tire_replacement_due_km: number;

  // Alertas automáticas
  alerts: Array<{
    type: 'oil_change_due' | 'vtv_expired' | 'tires_worn';
    severity: 'info' | 'warning' | 'critical';
    message: string;
  }>;
}
```

**Prioridad:** 🟡 **MEDIA** - Importante para calidad, pero MVP puede requerir VTV vigente solamente

---

#### 3. Mileage Tracking & Fuel Policy
**Gap:**
```typescript
// ❌ NO EXISTE
interface BookingMileageTracking {
  booking_id: string;

  // Al inicio
  start_odometer_km: number;
  start_odometer_photo_url: string;
  start_fuel_level_percent: number;
  start_fuel_photo_url: string;

  // Al retorno
  end_odometer_km: number;
  end_odometer_photo_url: string;
  end_fuel_level_percent: number;
  end_fuel_photo_url: string;

  // Cálculos
  total_km_driven: number;          // = end - start
  allowed_km: number;               // Según términos del contrato
  extra_km: number;                 // = total - allowed
  extra_km_fee_ars: number;         // = extra_km × rate

  fuel_policy: 'full_to_full' | 'same_level';
  fuel_deficit_liters: number;      // Si retorna con menos combustible
  refuel_fee_ars: number;           // Penalidad por no rellenar

  verified_by_owner: boolean;
  verified_by_renter: boolean;

  discrepancy_reported: boolean;    // Si hay desacuerdo
  discrepancy_notes: string | null;
}
```

**Prioridad:** 🟡 **MEDIA** - Mejora experiencia, pero MVP puede omitir

---

### 3.3 🔄 Lo que está PARCIAL

#### Insurance System - Sin Workflow UI
**Estado:**
- ✅ Database schema completo
- ✅ RPCs para CRUD de pólizas
- ❌ **No hay UI** para locadores subir pólizas BYOI
- ❌ **No hay workflow** de verificación de pólizas por admin
- ❌ **No hay UI** para locatarios ver coberturas y add-ons
- ❌ **No hay proceso** de claims (solo tabla)

**Recomendación:** Implementar UI de insurance en dashboard de locador y locatario

---

## 4. Sistemas de Verificación y Documentación

### 4.1 ✅ Lo que EXISTE

#### Progressive Verification System (3 Levels)
**Archivo:** `supabase/migrations/20251022_progressive_verification_system.sql` (472 líneas)

**Niveles:**
```plaintext
Level 1: Explorador (Email + Teléfono)
├─ Puede ver catálogo
├─ Puede agregar a favoritos
└─ NO puede publicar ni reservar

Level 2: Participante (Email + Teléfono + DNI)
├─ Puede publicar 1 auto
├─ Puede reservar hasta 7 días
├─ Puede depositar hasta $100k ARS
├─ Puede retirar hasta $50k/mes
└─ Límite de booking: $50k ARS

Level 3: Verificado Full (Level 2 + Selfie + Face Match)
├─ Publicar autos ilimitados
├─ Reservas sin límite
├─ Transacciones sin límite
├─ Seguros premium
└─ Soporte prioritario
```

**Tabla:** `user_identity_levels`
```sql
CREATE TABLE user_identity_levels (
  user_id UUID PRIMARY KEY,
  current_level INT CHECK (current_level IN (1, 2, 3)) DEFAULT 1,

  -- Level 1: Email + Phone
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  phone_number TEXT,
  phone_country_code TEXT DEFAULT '+54',  -- Argentina

  -- Level 2: Document verification
  document_type TEXT CHECK (document_type IN ('DNI', 'PASAPORTE', 'LC', 'LE', 'CI')),
  document_number TEXT,
  document_front_url TEXT,
  document_back_url TEXT,
  document_verified_at TIMESTAMPTZ,
  document_ai_score NUMERIC(5,2),         -- Confianza de AI (0-100)

  -- Level 3: Selfie + Face matching
  selfie_url TEXT,
  selfie_verified_at TIMESTAMPTZ,
  face_match_score NUMERIC(5,2),          -- Score de face matching (0-100)
  liveness_score NUMERIC(5,2),            -- Anti-spoofing (0-100)

  -- Manual review
  manual_review_required BOOLEAN DEFAULT false,
  manual_reviewed_by UUID,
  manual_reviewed_at TIMESTAMPTZ,
  manual_review_decision TEXT CHECK (manual_review_decision IN ('APPROVED', 'REJECTED', 'PENDING'))
);
```

**RPCs disponibles:**
- `check_user_level_access(p_required_level)` - Validar si usuario puede hacer acción
- `get_user_verification_status()` - Status detallado
- `get_verification_limits()` - Qué puede hacer el usuario

**Estado:** 🟢 **Producción-ready**

---

#### Driver Profile & Risk Scoring
**Archivo:** `supabase/migrations/20251022_add_driver_vehicle_verification.sql`

**Tabla:** `driver_risk_profile`
```sql
CREATE TABLE driver_risk_profile (
  user_id UUID PRIMARY KEY,

  driver_license_number TEXT,
  driver_license_country TEXT DEFAULT 'AR',
  driver_license_expiry DATE,
  driver_license_verified BOOLEAN DEFAULT false,

  years_of_experience INT,

  -- Historial de manejo
  total_trips_completed INT DEFAULT 0,
  total_km_driven BIGINT DEFAULT 0,

  -- Risk score (0-100, menor = menos riesgo)
  risk_score INT CHECK (risk_score >= 0 AND risk_score <= 100),

  -- Infracciones
  traffic_violations_count INT DEFAULT 0,
  accidents_count INT DEFAULT 0,

  last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

**Estado:** 🟢 **Implementado**

---

#### Bank Account Verification
**Archivo:** `supabase/migrations/20251028_add_split_payment_system.sql`

```sql
CREATE TABLE bank_accounts (
  user_id UUID,
  account_number VARCHAR(50),
  account_type VARCHAR(20) CHECK (account_type IN ('savings', 'checking', 'cbu', 'cvu', 'alias')),
  bank_code VARCHAR(10),
  bank_name VARCHAR(100),
  account_holder_name VARCHAR(200),
  account_holder_id VARCHAR(20),    -- DNI/CUIT
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ
);
```

**Estado:** 🟢 **Implementado**

---

### 4.2 ❌ Lo que FALTA (MVP Gaps)

#### 1. AI Document Verification (Level 2)
**Problema:** Tabla `user_identity_levels` tiene campos `document_ai_score`, `face_match_score`, `liveness_score` pero **no hay integración con servicio de AI**.

**Gap:**
```typescript
// ❌ NO EXISTE integración
interface AIVerificationService {
  // OCR + Fake detection
  verifyDocument(params: {
    documentFrontUrl: string;
    documentBackUrl: string;
    documentType: 'DNI' | 'PASAPORTE';
    country: string;
  }): Promise<{
    success: boolean;
    confidence_score: number;       // 0-100
    extracted_data: {
      full_name: string;
      document_number: string;
      birth_date: string;
      expiry_date: string;
      nationality: string;
    };
    fraud_indicators: string[];     // ["document_tampered", "photo_replacement"]
    is_fake: boolean;
  }>;

  // Selfie + Liveness + Face matching
  verifySelfie(params: {
    selfieUrl: string;
    documentPhotoUrl: string;       // Foto del DNI
  }): Promise<{
    success: boolean;
    liveness_score: number;         // Anti-spoofing
    face_match_score: number;       // Match con DNI
    is_same_person: boolean;
  }>;
}
```

**Proveedores recomendados:**
- **Onfido** (usado por Uber, Airbnb) - ~USD $1.50/verificación
- **Jumio** - ~USD $2/verificación
- **Veriff** - ~USD $1/verificación
- **AWS Rekognition** + **Textract** - ~USD $0.30/verificación (DIY)

**Prioridad:** 🟡 **MEDIA** - Level 2 funciona con verificación manual, AI mejora UX pero no es bloqueante

---

#### 2. Driver License Verification API
**Gap:**
```typescript
// ❌ NO EXISTE
interface DriverLicenseVerification {
  verifyLicense(params: {
    licenseNumber: string;
    country: 'AR' | 'UY' | 'BR' | 'CL';
  }): Promise<{
    is_valid: boolean;
    is_expired: boolean;
    holder_name: string;
    expiry_date: string;
    license_class: string;          // "B1", "B2", "C", "D"
    restrictions: string[];
    verified_at: string;
  }>;
}
```

**Problema:** Argentina no tiene API pública para validar licencias de conducir. Opciones:
1. **Manual:** Subir foto de licencia + verificación admin
2. **Semi-manual:** OCR + verificación admin
3. **3rd party:** Algunos sistemas provinciales (ej: CABA, Buenos Aires)

**Prioridad:** 🟢 **BAJA** - MVP puede usar verificación manual

---

#### 3. Vehicle Documentation Verification
**Gap:**
```typescript
// ❌ NO EXISTE
interface VehicleDocumentVerification {
  id: string;
  car_id: string;

  document_type:
    | 'title'                     // Título de propiedad
    | 'registration'              // Cédula verde/azul
    | 'vtv'                       // Verificación Técnica Vehicular
    | 'insurance'                 // Póliza de seguro
    | 'transfer_permit';          // Autorización para transferir

  document_number: string;
  issued_date: string;
  expiry_date: string | null;

  document_url: string;           // PDF/JPG del documento

  verified_by_admin: boolean;
  verified_at: string | null;
  verification_notes: string | null;

  is_expired: boolean;            // Computed: expiry_date < today

  created_at: string;
  updated_at: string;
}
```

**Documentos requeridos en Argentina:**
- ✅ **Título de propiedad** (verifica dueño)
- ✅ **Cédula verde/azul** (habilitación para circular)
- ✅ **VTV vigente** (Verificación Técnica Vehicular - obligatoria anual)
- ✅ **Póliza de seguro** (RC obligatoria)
- ⚠️ **Autorización de transferencia** (si el dueño no es quien maneja)

**Prioridad:** 🟡 **MEDIA** - Importante para compliance legal, pero MVP puede verificar manualmente

---

### 4.3 🔄 Lo que está PARCIAL

#### AI Verification - Tabla existe, integración no
**Estado:**
- ✅ `user_identity_levels` tiene campos `document_ai_score`, `face_match_score`, `liveness_score`
- ✅ RPCs para verificar nivel de usuario
- ❌ **No hay integración con servicio de AI** (Onfido, Jumio, AWS Rekognition)
- ❌ **Verificación es 100% manual** por admin

**Recomendación:** Integrar Onfido o AWS Rekognition para Level 2 y Level 3

---

#### Phone Verification - Existe servicio, no está conectado
**Archivo:** `apps/web/src/app/core/services/phone-verification.service.ts`

**Estado:**
- ✅ Servicio creado
- ❌ No está conectado a flujo de registro
- ❌ No actualiza `user_identity_levels.phone_verified_at`

**Recomendación:** Integrar en onboarding flow

---

## 5. Feature Prioritization Matrix

### 5.1 Prioridad CRÍTICA (MVP Blockers)

| Feature | Impact | Effort | Priority | Target Sprint |
|---------|--------|--------|----------|---------------|
| **Vehicle Inspection System** | 🔴 HIGH | 2 weeks | P0 | Sprint 1 |
| **Rental Terms Management** | 🔴 HIGH | 1 week | P0 | Sprint 1 |
| **Seasonal Pricing Rules** | 🔴 HIGH | 1 week | P0 | Sprint 2 |
| **Insurance Workflow UI** | 🟡 MED | 1 week | P1 | Sprint 2 |

**Justificación:**
- **Inspection System:** Conflicto #2 en market research ("Daños no documentados")
- **Rental Terms:** Conflicto #1 ("Incumplimiento de condiciones pactadas")
- **Seasonal Pricing:** Competitividad con mercado informal (weekend boost, etc.)
- **Insurance UI:** Locadores necesitan cargar pólizas BYOI para reducir costos

---

### 5.2 Prioridad ALTA (Post-MVP)

| Feature | Impact | Effort | Priority | Target Sprint |
|---------|--------|--------|----------|---------------|
| **Electronic Contract Signing** | 🟡 MED | 1 week | P1 | Sprint 3 |
| **Dispute Resolution System** | 🟡 MED | 2 weeks | P1 | Sprint 4 |
| **Volume Commission Tiers** | 🟡 MED | 3 days | P1 | Sprint 3 |
| **Maintenance Tracking** | 🟡 MED | 1 week | P2 | Sprint 5 |
| **Mileage & Fuel Tracking** | 🟡 MED | 1 week | P2 | Sprint 5 |

---

### 5.3 Prioridad MEDIA (Growth Features)

| Feature | Impact | Effort | Priority | Target Sprint |
|---------|--------|--------|----------|---------------|
| **Promotion Codes** | 🟢 LOW | 3 days | P2 | Sprint 6 |
| **AI Document Verification** | 🟢 LOW | 1 week | P2 | Sprint 7 |
| **Driver License Verification API** | 🟢 LOW | 1 week | P3 | Future |
| **Vehicle Documentation Verification** | 🟢 LOW | 1 week | P3 | Future |

---

## 6. Competitive Analysis - Feature Comparison

| Feature | AutoRenta (Actual) | AutoRenta (Propuesto) | DeRentas/Enchulame | Mercado Informal |
|---------|--------------------|-----------------------|---------------------|------------------|
| **Contratos escritos** | 🔄 Parcial | ✅ Completo | ✅ Sí | ❌ 30% solamente |
| **Inspección pre-entrega** | ❌ No | ✅ Sí (con fotos) | ✅ Sí | ❌ Raro |
| **Seguro incluido** | ✅ Sí (flotante) | ✅ Sí + BYOI | ✅ Sí | ❌ No (locador asume) |
| **Verificación de identidad** | ✅ Level 1-3 | ✅ Level 1-3 + AI | ⚠️ Básica | ❌ No verifican |
| **Sistema de disputas** | ❌ No | ✅ Sí | ⚠️ Manual | ❌ No (conflictos frecuentes) |
| **Pricing dinámico** | 🔄 Backend listo | ✅ UI + Automation | ❌ No | ✅ Sí (manual) |
| **Comisión** | 15% flat | 15-8% por volumen | 40-50% | 0% (P2P) |
| **Mantenimiento tracking** | ❌ No | ✅ Sí | ⚠️ Requieren VTV | ❌ No |
| **Mileage tracking** | ❌ No | ✅ Sí | ❌ No | ⚠️ A veces |
| **Split payments** | ✅ 85/15 | ✅ 85/15 + custom | ✅ 50/50 o 60/40 | N/A |

**Ventaja Competitiva de AutoRenta (post-MVP):**
1. ✅ **Comisión más baja** (15% vs 40-50% de DeRentas)
2. ✅ **Verificación más robusta** (3 niveles vs básica)
3. ✅ **Inspecciones digitales** (vs manual/inexistente)
4. ✅ **Sistema de disputas** (vs soporte lento)
5. ✅ **Pricing inteligente** (vs fijo/manual)

---

## 7. Technical Recommendations

### 7.1 Database Schema Updates Required

**Nuevas tablas a crear:**

```sql
-- Priority P0 (Sprint 1)
CREATE TABLE rental_terms_templates (...);
CREATE TABLE car_rental_terms (...);
CREATE TABLE vehicle_inspections (...);
CREATE TABLE inspection_photos (...);

-- Priority P1 (Sprint 2-3)
CREATE TABLE seasonal_pricing_rules (...);
CREATE TABLE contract_signatures (...);
CREATE TABLE bipartite_confirmations (...);  -- Migrar desde /database

-- Priority P2 (Sprint 4-5)
CREATE TABLE booking_disputes (...);
CREATE TABLE dispute_messages (...);
CREATE TABLE vehicle_maintenance_records (...);
CREATE TABLE maintenance_schedules (...);
CREATE TABLE booking_mileage_tracking (...);

-- Priority P3 (Future)
CREATE TABLE promotion_codes (...);
CREATE TABLE promotion_usage (...);
CREATE TABLE volume_commission_tiers (...);
CREATE TABLE owner_commission_overrides (...);
```

### 7.2 Service Integrations Required

**P0 - MVP Blockers:**
- ✅ **Cloudinary / AWS S3** - Ya existe para fotos de autos, extender para inspecciones
- ⏳ **WhatsApp Business API** - Notificaciones de inspección, recordatorios (opcional)

**P1 - Post-MVP:**
- ⏳ **Onfido / Jumio** - AI document verification (Level 2/3)
- ⏳ **DocuSign / HelloSign** - Electronic contract signing
- ⏳ **Twilio SendGrid** - Email templates para contratos

**P2 - Growth:**
- ⏳ **Stripe Radar / Sift** - Fraud detection (complementa verificación)
- ⏳ **Intercom / Zendesk** - Sistema de disputas + soporte

### 7.3 Frontend Components Required

**P0 - Sprint 1:**
```
/apps/web/src/app/features/
  inspections/
    ├─ components/
    │   ├─ inspection-form/           # Formulario de inspección
    │   ├─ photo-uploader/            # Subir fotos por sección del auto
    │   ├─ damage-marker/             # Marcar daños en diagrama del auto
    │   └─ odometer-fuel-capture/     # Capturar odómetro + combustible
    └─ pages/
        ├─ pre-pickup-inspection/
        ├─ post-return-inspection/
        └─ inspection-comparison/     # Comparar pre vs post

  terms/
    ├─ components/
    │   ├─ terms-editor/              # Admin: Editar template de términos
    │   └─ terms-selector/            # Locador: Seleccionar términos para auto
    └─ pages/
        └─ rental-terms-management/
```

**P1 - Sprint 2-3:**
```
  pricing/
    └─ components/
        ├─ seasonal-rules-editor/     # Configurar reglas de temporada
        ├─ pricing-calendar/          # Vista de calendario con precios dinámicos
        └─ commission-tier-display/   # Mostrar tier de comisión del locador

  contracts/
    └─ components/
        ├─ contract-viewer/           # Ver contrato antes de firmar
        ├─ signature-pad/             # Firma digital
        └─ otp-verifier/              # Verificar OTP para firma
```

**P2 - Sprint 4-5:**
```
  disputes/
    └─ components/
        ├─ dispute-form/              # Abrir disputa
        ├─ dispute-chat/              # Chat de disputa
        └─ evidence-uploader/         # Subir evidencia (fotos, docs)

  maintenance/
    └─ components/
        ├─ maintenance-log/           # Historial de mantenimiento
        ├─ maintenance-reminder/      # Alertas de service próximo
        └─ invoice-uploader/          # Subir facturas de mantenimiento
```

---

## 8. Migration Path

### Phase 1: MVP Foundation (Sprints 1-2) - 3 semanas
**Goal:** Alcanzar product-market fit con locadores de app drivers

- ✅ Implement Vehicle Inspection System
- ✅ Implement Rental Terms Management
- ✅ Implement Seasonal Pricing Rules
- ✅ Implement Insurance Workflow UI

**Deliverables:**
- Locadores pueden configurar términos de renta (km/día, late fees, etc.)
- Inspecciones pre/post con fotos obligatorias
- Pricing dinámico por día de semana / temporada
- Locadores pueden cargar pólizas BYOI

**Success Metrics:**
- 0% de disputas por "daños no documentados" (inspecciones resuelven)
- 50% de locadores usan términos custom (vs default)
- 30% de bookings en fin de semana tienen price boost

---

### Phase 2: Trust & Safety (Sprints 3-4) - 3 semanas
**Goal:** Reducir conflictos y aumentar confianza

- ✅ Implement Electronic Contract Signing
- ✅ Implement Dispute Resolution System
- ✅ Implement Volume Commission Tiers
- ✅ Integrate AI Document Verification (Level 2)

**Deliverables:**
- Contratos firmados digitalmente por ambas partes
- Sistema de disputas con chat + evidencia
- Comisiones escalonadas por volumen (8-15%)
- Verificación Level 2 con AI (95% aprobación automática)

**Success Metrics:**
- 100% de bookings con contrato firmado
- 80% de disputas resueltas en <48 horas
- 20% de locadores en tier Silver/Gold (3+ autos)

---

### Phase 3: Operational Excellence (Sprints 5-6) - 3 semanas
**Goal:** Reducir fricción operativa y mejorar reliability

- ✅ Implement Maintenance Tracking
- ✅ Implement Mileage & Fuel Tracking
- ✅ Implement Promotion Codes
- ✅ Enhanced Analytics Dashboard

**Deliverables:**
- Historial de mantenimiento por auto
- Tracking automático de km y combustible
- Sistema de promociones (VERANO2025, etc.)
- Dashboard de analytics para locadores

**Success Metrics:**
- 80% de autos con VTV vigente (vs 60% en mercado)
- 90% de returns sin disputas por combustible/km
- 15% de nuevos usuarios via promo codes

---

### Phase 4: Growth & Scale (Future)
**Goal:** Features de growth y competitividad

- ⏳ AI-powered pricing optimization
- ⏳ Multi-currency support (USD, BRL)
- ⏳ Cross-border rentals (Uruguay, Brasil)
- ⏳ Fleet management for large owners (10+ cars)
- ⏳ Integration with ride-hailing apps (Uber, Cabify)

---

## 9. Appendix: Market Research Alignment

### Cómo las features propuestas resuelven los Top 5 Conflictos

| Conflicto (Market Research) | Feature de AutoRenta | Status |
|-----------------------------|----------------------|--------|
| **#1: Incumplimiento de condiciones pactadas verbalmente** | Rental Terms Management + Electronic Contract Signing | ❌→✅ Sprint 1-3 |
| **#2: Daños no documentados al momento de entrega/devolución** | Vehicle Inspection System (Pre/Post con fotos) | ❌→✅ Sprint 1 |
| **#3: Problemas con devolución de depósitos de garantía** | FGO System + Dispute Resolution | ✅ + 🔄→✅ Sprint 4 |
| **#4: Cambios unilaterales en términos del acuerdo** | Immutable Contract Terms (blockchain-ready) | ❌→✅ Sprint 3 |
| **#5: Responsabilidad ante multas e infracciones** | Driver Risk Profile + Insurance Claims | ✅ + 🔄→✅ Sprint 2 |

---

## 10. Conclusiones

### 10.1 Estado Actual vs. Market Needs

**AutoRenta tiene bases sólidas:**
- ✅ Sistema de pagos + wallet (mejor que competencia)
- ✅ Verificación progresiva (único en el mercado)
- ✅ Insurance system (competitivo con DeRentas)
- ✅ Split payments automáticos (DeRentas es manual)

**Gaps críticos para MVP:**
- ❌ **Inspecciones** - Conflicto #2 del mercado
- ❌ **Términos parametrizables** - Conflicto #1 del mercado
- ❌ **Pricing dinámico UI** - Competitividad con informal

### 10.2 Ventaja Competitiva Post-MVP

Después de completar Phases 1-2, AutoRenta será:
1. **Más barato** que DeRentas/Enchulame (15% vs 40-50%)
2. **Más seguro** que mercado informal (inspecciones + verificación)
3. **Más flexible** que ambos (términos custom + pricing dinámico)
4. **Más justo** (sistema de disputas + contratos claros)

### 10.3 Roadmap Summary

```
Sprint 1-2 (3 weeks): MVP Foundation
├─ Vehicle Inspections ✅
├─ Rental Terms Management ✅
├─ Seasonal Pricing ✅
└─ Insurance Workflow UI ✅

Sprint 3-4 (3 weeks): Trust & Safety
├─ E-Signatures ✅
├─ Dispute Resolution ✅
├─ Volume Commissions ✅
└─ AI Verification ✅

Sprint 5-6 (3 weeks): Operational Excellence
├─ Maintenance Tracking ✅
├─ Mileage/Fuel Tracking ✅
├─ Promotion Codes ✅
└─ Analytics Dashboard ✅

Future: Growth & Scale
├─ AI Pricing Optimization
├─ Multi-currency
├─ Cross-border
└─ Fleet Management
```

**Total MVP Time:** 9 semanas (3 sprints de 3 semanas)

**Target Launch:** Q1 2026 (después de completar Sprint 2)

---

**Documento generado:** 2025-11-12
**Próximo paso:** Crear `IMPLEMENTATION_ROADMAP.md` con estimaciones detalladas y dependencies

