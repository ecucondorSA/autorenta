# Implementation Roadmap - AutoRenta MVP

**Fecha:** 2025-11-12
**Versión:** 1.0
**Horizonte:** Q1 2026 (9 semanas de desarrollo)

---

## 📋 Executive Summary

Este roadmap define la implementación de features críticas identificadas en el **Feature Gap Analysis** para alcanzar product-market fit en el mercado argentino de renta de autos para conductores de aplicaciones.

**Objetivos:**
- ✅ Resolver los **Top 5 conflictos** del mercado informal
- ✅ Competir efectivamente con **DeRentas/Enchulame**
- ✅ Lanzar MVP en **Q1 2026** (12 semanas totales)

**Team Size:** 2-3 desarrolladores full-stack + 1 QA

**Total Effort:** ~27 semanas-persona (9 semanas con team de 3)

---

## 1. Sprint Planning Overview

### Timeline

```
Week 1-3:   Sprint 1 (MVP Foundation Part 1)
Week 4-6:   Sprint 2 (MVP Foundation Part 2)
Week 7-9:   Sprint 3 (Trust & Safety Part 1)
Week 10-12: Sprint 4 (Trust & Safety Part 2)
Week 13-15: Sprint 5 (Operational Excellence Part 1)
Week 16-18: Sprint 6 (Operational Excellence Part 2)

Launch Target: Week 9 (after Sprint 3)
Post-Launch: Sprints 4-6 (continuous improvement)
```

### Resource Allocation

| Sprint | Frontend | Backend | DB/Migrations | QA | Total Days |
|--------|----------|---------|---------------|-----|------------|
| Sprint 1 | 8 days | 7 days | 3 days | 2 days | 20 days |
| Sprint 2 | 7 days | 6 days | 2 days | 2 days | 17 days |
| Sprint 3 | 6 days | 5 days | 2 days | 2 days | 15 days |
| Sprint 4 | 8 days | 6 days | 3 days | 3 days | 20 days |
| Sprint 5 | 7 days | 6 days | 2 days | 2 days | 17 days |
| Sprint 6 | 5 days | 4 days | 1 day | 2 days | 12 days |
| **Total** | **41 days** | **34 days** | **13 days** | **13 days** | **101 days** |

**Con team de 3 devs:** 101 días / 3 = ~34 días = **7 semanas** (acelerado)
**Con team de 2 devs:** 101 días / 2 = ~51 días = **10 semanas** (recomendado)
**Incluyendo buffer 20%:** **12 semanas** (Q1 2026 launch)

---

## 2. Phase 1: MVP Foundation

**Duration:** 6 semanas (Sprints 1-2)
**Goal:** Resolver conflictos #1 y #2 del mercado
**Launch Readiness:** 70% (suficiente para beta privada)

---

### Sprint 1: Vehicle Inspections + Rental Terms (3 semanas)

#### 1.1 Vehicle Inspection System

**Priority:** 🔴 P0 - MVP Blocker
**Effort:** 12 días (6 frontend + 4 backend + 2 DB)
**Owner:** Dev 1 (lead) + Dev 2 (support)

**Database Migrations:**
```sql
-- File: supabase/migrations/20251115_create_vehicle_inspections.sql
-- Effort: 1 day

CREATE TABLE vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id),
  booking_id UUID REFERENCES bookings(id),
  inspection_type TEXT CHECK (inspection_type IN (
    'initial', 'pre_booking_pickup', 'post_booking_return', 'periodic', 'damage_report'
  )),
  inspector_user_id UUID NOT NULL REFERENCES profiles(id),
  inspector_role TEXT CHECK (inspector_role IN ('owner', 'renter', 'platform_agent')),

  -- Checklist JSON schemas
  exterior_condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  interior_condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  mechanical_condition JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Readings
  odometer_reading_km INT NOT NULL,
  odometer_photo_url TEXT,
  fuel_level_percent INT CHECK (fuel_level_percent >= 0 AND fuel_level_percent <= 100),
  fuel_gauge_photo_url TEXT,

  -- Confirmations
  owner_confirmed BOOLEAN DEFAULT false,
  owner_confirmed_at TIMESTAMPTZ,
  renter_confirmed BOOLEAN DEFAULT false,
  renter_confirmed_at TIMESTAMPTZ,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspections_car ON vehicle_inspections(car_id);
CREATE INDEX idx_inspections_booking ON vehicle_inspections(booking_id);
CREATE INDEX idx_inspections_type ON vehicle_inspections(inspection_type);

-- Photos table
CREATE TABLE inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  angle TEXT CHECK (angle IN ('front', 'rear', 'left', 'right', 'interior', 'damage_closeup', 'odometer', 'fuel_gauge')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspection_photos_inspection ON inspection_photos(inspection_id);
```

**Backend Services:**
```typescript
// File: apps/web/src/app/core/services/vehicle-inspection.service.ts
// Effort: 2 days

@Injectable({ providedIn: 'root' })
export class VehicleInspectionService {
  // Create new inspection
  async createInspection(params: CreateInspectionParams): Promise<VehicleInspection>;

  // Upload photos (batch)
  async uploadInspectionPhotos(inspectionId: string, files: File[]): Promise<void>;

  // Update checklist (exterior, interior, mechanical)
  async updateInspectionChecklist(inspectionId: string, checklist: Partial<InspectionChecklist>): Promise<void>;

  // Confirm inspection (owner or renter)
  async confirmInspection(inspectionId: string, role: 'owner' | 'renter'): Promise<void>;

  // Get inspection by booking
  async getInspectionByBooking(bookingId: string, type: 'pre_pickup' | 'post_return'): Promise<VehicleInspection | null>;

  // Compare pre vs post inspections
  async compareInspections(preInspectionId: string, postInspectionId: string): Promise<InspectionComparison>;
}
```

**Frontend Components:**
```typescript
// File: apps/web/src/app/features/inspections/components/inspection-form/inspection-form.component.ts
// Effort: 4 days (complex UI with photo upload + checklist)

@Component({
  selector: 'app-inspection-form',
  templateUrl: './inspection-form.component.html'
})
export class InspectionFormComponent {
  // Wizard steps: Photos → Exterior → Interior → Mechanical → Odometer → Review
  currentStep = signal(1);

  // Photo uploader (multi-file with angle tagging)
  uploadedPhotos = signal<InspectionPhoto[]>([]);

  // Exterior checklist (front bumper, doors, windows, etc.)
  exteriorChecklist = this.fb.group({
    front_bumper: ['perfect'],
    rear_bumper: ['perfect'],
    doors: this.fb.group({
      front_left: ['perfect'],
      front_right: ['perfect'],
      rear_left: ['perfect'],
      rear_right: ['perfect']
    }),
    // ... más campos
  });

  // Submit inspection
  async submitInspection(): Promise<void>;
}
```

**UI Pages:**
1. `/inspections/pre-pickup/:bookingId` - Inspección pre-entrega
2. `/inspections/post-return/:bookingId` - Inspección post-devolución
3. `/inspections/compare/:preId/:postId` - Comparación pre vs post
4. `/inspections/history/:carId` - Historial de inspecciones de un auto

**Testing:**
- Unit tests: Inspection service (80% coverage)
- Integration tests: Upload photos + submit inspection
- E2E test: Complete pre-pickup inspection flow (Playwright)

**Acceptance Criteria:**
- ✅ Locador y locatario pueden crear inspección con fotos
- ✅ Checklist de exterior (10+ puntos), interior (8+ puntos), mecánico (5+ puntos)
- ✅ Subir hasta 20 fotos por inspección
- ✅ Ambas partes deben confirmar inspección (bilateral confirmation)
- ✅ Comparación automática de pre vs post inspections
- ✅ Bloqueo de booking si falta inspección pre-pickup

**Risks & Mitigations:**
- ⚠️ **Risk:** Usuarios no completan inspecciones → **Mitigation:** Bloquear inicio de booking hasta completar
- ⚠️ **Risk:** Muchas fotos → storage costs → **Mitigation:** Comprimir imágenes (max 1MB/foto)

---

#### 1.2 Rental Terms Management

**Priority:** 🔴 P0 - MVP Blocker
**Effort:** 8 días (4 frontend + 3 backend + 1 DB)
**Owner:** Dev 2 (lead) + Dev 1 (review)

**Database Migrations:**
```sql
-- File: supabase/migrations/20251118_create_rental_terms.sql
-- Effort: 1 day

CREATE TABLE rental_terms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,        -- "Standard", "Premium", "Long-term"
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_platform_default BOOLEAN DEFAULT false,

  -- Términos parametrizables
  late_return_fee_per_hour_cents BIGINT DEFAULT 500000,  -- $5000/hora
  max_late_hours_without_penalty INT DEFAULT 1,

  mileage_limit_km_per_day INT DEFAULT 300,
  extra_km_fee_cents BIGINT DEFAULT 20000,               -- $200/km

  fuel_policy TEXT CHECK (fuel_policy IN ('full_to_full', 'same_level', 'flexible')) DEFAULT 'full_to_full',
  refuel_fee_if_empty_cents BIGINT DEFAULT 1500000,      -- $15000

  cleaning_fee_if_dirty_cents BIGINT DEFAULT 800000,     -- $8000
  smoking_penalty_cents BIGINT DEFAULT 2500000,          -- $25000

  authorized_drivers_limit INT DEFAULT 1,
  additional_driver_fee_per_day_cents BIGINT DEFAULT 300000,

  min_driver_age INT DEFAULT 21,
  max_driver_age INT DEFAULT 75,

  geographic_restrictions TEXT[] DEFAULT ARRAY['CABA', 'GBA'],
  cross_border_allowed BOOLEAN DEFAULT false,

  requires_deposit BOOLEAN DEFAULT true,
  deposit_amount_multiplier NUMERIC(3,2) DEFAULT 1.50,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Asociación auto → términos
CREATE TABLE car_rental_terms (
  car_id UUID PRIMARY KEY REFERENCES cars(id) ON DELETE CASCADE,
  terms_template_id UUID NOT NULL REFERENCES rental_terms_templates(id),
  custom_terms_override JSONB DEFAULT '{}'::jsonb,     -- Override específico
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ
);

-- Seed default templates
INSERT INTO rental_terms_templates (template_name, is_platform_default) VALUES
  ('Standard (CABA/GBA)', true),
  ('Premium (Sin límites)', false),
  ('Long-term (7+ días)', false);
```

**Backend Services:**
```typescript
// File: apps/web/src/app/core/services/rental-terms.service.ts
// Effort: 2 days

@Injectable({ providedIn: 'root' })
export class RentalTermsService {
  // Get all templates (for selection)
  async getTemplates(): Promise<RentalTermsTemplate[]>;

  // Get template by ID
  async getTemplate(templateId: string): Promise<RentalTermsTemplate>;

  // Create custom template (owner)
  async createCustomTemplate(params: CreateTemplateParams): Promise<RentalTermsTemplate>;

  // Assign terms to car
  async assignTermsToCar(carId: string, templateId: string, overrides?: Partial<RentalTermsTemplate>): Promise<void>;

  // Get effective terms for car
  async getCarTerms(carId: string): Promise<RentalTermsTemplate>;

  // Calculate fees based on terms (for late return, extra km, etc.)
  async calculateTermsFees(params: {
    carId: string;
    actualReturnTime: string;
    expectedReturnTime: string;
    kmDriven: number;
    fuelLevelPercent: number;
  }): Promise<{
    late_fee_cents: number;
    extra_km_fee_cents: number;
    refuel_fee_cents: number;
    total_fees_cents: number;
  }>;
}
```

**Frontend Components:**
```typescript
// File: apps/web/src/app/features/terms/components/terms-editor/terms-editor.component.ts
// Effort: 3 days

@Component({
  selector: 'app-terms-editor',
  templateUrl: './terms-editor.component.html'
})
export class TermsEditorComponent {
  // Form con todos los parámetros de términos
  termsForm = this.fb.group({
    template_name: ['', Validators.required],
    late_return_fee_per_hour: [5000, Validators.min(0)],
    mileage_limit_km_per_day: [300, Validators.min(0)],
    fuel_policy: ['full_to_full'],
    // ... más campos
  });

  // Preview de términos en lenguaje natural
  termsPreview = computed(() => {
    const values = this.termsForm.value;
    return `
      - Retorno tardío: $${values.late_return_fee_per_hour}/hora (1 hora de gracia)
      - Kilometraje: ${values.mileage_limit_km_per_day} km/día ($${values.extra_km_fee}/km extra)
      - Combustible: ${values.fuel_policy === 'full_to_full' ? 'Llenar tanque' : 'Mismo nivel'}
    `;
  });

  async saveTemplate(): Promise<void>;
}
```

**UI Pages:**
1. `/dashboard/owner/terms` - Ver y editar templates de términos
2. `/dashboard/owner/cars/:id/terms` - Asignar términos a auto específico
3. `/bookings/:id/terms` - Ver términos de una reserva (read-only para locatario)

**Integration Points:**
- **Booking creation:** Copiar términos del auto a booking (snapshot)
- **Booking completion:** Calcular fees automáticamente según términos
- **Contract generation:** Incluir términos en PDF del contrato

**Testing:**
- Unit tests: Fee calculation logic
- Integration tests: Assign terms to car → booking inherits terms
- E2E test: Owner creates custom template → assigns to car → renter sees terms

**Acceptance Criteria:**
- ✅ Plataforma tiene 3 templates por defecto (Standard, Premium, Long-term)
- ✅ Locadores pueden crear templates custom
- ✅ Cada auto tiene términos asignados (default si no hay custom)
- ✅ Términos se muestran en booking details antes de confirmar
- ✅ Fees se calculan automáticamente al completar booking
- ✅ Términos se incluyen en contrato PDF

**Risks & Mitigations:**
- ⚠️ **Risk:** Locadores crean términos abusivos → **Mitigation:** Platform review + max limits configurables
- ⚠️ **Risk:** Cambios de términos afectan bookings activos → **Mitigation:** Snapshot de términos al crear booking

---

### Sprint 2: Seasonal Pricing + Insurance UI (3 semanas)

#### 2.1 Seasonal Pricing Rules

**Priority:** 🔴 P0 - Competitividad
**Effort:** 7 días (3 frontend + 3 backend + 1 DB)
**Owner:** Dev 1

**Database Migrations:**
```sql
-- File: supabase/migrations/20251122_create_seasonal_pricing.sql
-- Effort: 1 day

CREATE TABLE seasonal_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,

  -- Date ranges (array of {start, end})
  date_ranges JSONB NOT NULL,          -- [{"start": "2025-12-01", "end": "2026-03-15"}]

  -- Days of week (0=Sunday, 6=Saturday)
  days_of_week INT[] DEFAULT NULL,     -- [5, 6, 0] = Fri, Sat, Sun

  -- Multiplier
  price_multiplier NUMERIC(4,2) NOT NULL CHECK (price_multiplier >= 0.5 AND price_multiplier <= 3.0),

  -- Filters
  applies_to_category_ids UUID[] DEFAULT NULL,
  applies_to_cities TEXT[] DEFAULT NULL,

  priority INT DEFAULT 0,              -- Higher priority wins

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_seasonal_pricing_active ON seasonal_pricing_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_seasonal_pricing_priority ON seasonal_pricing_rules(priority DESC);

-- RPC: Calculate price with seasonal rules
CREATE OR REPLACE FUNCTION calculate_price_with_seasonal_rules(
  p_car_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  base_price_cents BIGINT,
  seasonal_multiplier NUMERIC,
  final_price_cents BIGINT,
  applied_rule_name TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_car RECORD;
  v_rule RECORD;
  v_max_priority INT := -1;
  v_best_multiplier NUMERIC := 1.0;
  v_best_rule_name TEXT := NULL;
BEGIN
  -- Get car base price
  SELECT * INTO v_car FROM cars WHERE id = p_car_id;

  -- Find applicable seasonal rules
  FOR v_rule IN
    SELECT *
    FROM seasonal_pricing_rules
    WHERE is_active = true
    AND (
      -- Check date ranges
      EXISTS (
        SELECT 1 FROM jsonb_array_elements(date_ranges) AS range
        WHERE p_start_date::date <= (range->>'end')::date
        AND p_end_date::date >= (range->>'start')::date
      )
    )
    AND (
      -- Check city filter
      applies_to_cities IS NULL OR v_car.city = ANY(applies_to_cities)
    )
    ORDER BY priority DESC
    LIMIT 1
  LOOP
    v_best_multiplier := v_rule.price_multiplier;
    v_best_rule_name := v_rule.rule_name;
  END LOOP;

  RETURN QUERY SELECT
    v_car.price_per_day_cents,
    v_best_multiplier,
    (v_car.price_per_day_cents * v_best_multiplier)::BIGINT,
    v_best_rule_name;
END;
$$;
```

**Backend Services:**
```typescript
// File: apps/web/src/app/core/services/seasonal-pricing.service.ts
// Effort: 2 days

@Injectable({ providedIn: 'root' })
export class SeasonalPricingService {
  // Admin: Create seasonal rule
  async createSeasonalRule(params: CreateSeasonalRuleParams): Promise<SeasonalPricingRule>;

  // Admin: Update rule
  async updateSeasonalRule(ruleId: string, updates: Partial<SeasonalPricingRule>): Promise<void>;

  // Admin: Deactivate rule
  async deactivateRule(ruleId: string): Promise<void>;

  // Public: Get active rules
  async getActiveRules(): Promise<SeasonalPricingRule[]>;

  // Public: Calculate price with seasonal adjustments
  async calculatePrice(carId: string, startDate: string, endDate: string): Promise<{
    basePrice: number;
    seasonalMultiplier: number;
    finalPrice: number;
    appliedRuleName: string | null;
  }>;
}
```

**Frontend Components:**
```typescript
// File: apps/web/src/app/features/pricing/components/seasonal-rules-editor/seasonal-rules-editor.component.ts
// Effort: 2 days (Admin only)

@Component({
  selector: 'app-seasonal-rules-editor',
  templateUrl: './seasonal-rules-editor.component.html'
})
export class SeasonalRulesEditorComponent {
  rulesForm = this.fb.group({
    rule_name: [''],
    date_ranges: this.fb.array([]),   // Dynamic form array
    days_of_week: [[]],               // Checkbox group
    price_multiplier: [1.3, [Validators.min(0.5), Validators.max(3.0)]],
    applies_to_cities: [[]],
  });

  // Add date range to form array
  addDateRange(): void {
    const rangeGroup = this.fb.group({
      start: ['', Validators.required],
      end: ['', Validators.required]
    });
    this.dateRangesArray.push(rangeGroup);
  }

  async saveRule(): Promise<void>;
}
```

**Frontend - Pricing Calendar:**
```typescript
// File: apps/web/src/app/features/pricing/components/pricing-calendar/pricing-calendar.component.ts
// Effort: 1 day

@Component({
  selector: 'app-pricing-calendar',
  templateUrl: './pricing-calendar.component.html'
})
export class PricingCalendarComponent {
  // Show calendar with daily prices
  selectedMonth = signal(new Date());

  dailyPrices = computed(() => {
    // Fetch prices for each day of the month
    // Show base price vs. seasonal adjusted price
  });

  // Color-code high-demand days (red), normal (green)
}
```

**UI Pages:**
1. `/admin/pricing/seasonal-rules` - Admin: CRUD de reglas
2. `/admin/pricing/calendar` - Admin: Vista de calendario con precios
3. `/marketplace` - Public: Ver precios ajustados en search results
4. `/cars/:id` - Public: Ver calendario de disponibilidad con precios dinámicos

**Integration Points:**
- **Booking quote:** Usar `calculate_price_with_seasonal_rules` RPC
- **Car detail page:** Mostrar "Precio desde $X/día" con disclaimer de variación estacional
- **Search results:** Ordenar por precio ajustado

**Testing:**
- Unit tests: Seasonal price calculation logic
- Integration tests: Create rule → prices adjust in booking quote
- E2E test: User books weekend (higher price) vs weekday (normal price)

**Acceptance Criteria:**
- ✅ Admin puede crear reglas de pricing estacional
- ✅ Reglas soportan date ranges + days of week
- ✅ Múltiples reglas → priority determina cuál aplica
- ✅ Precios se ajustan automáticamente en booking quotes
- ✅ Usuarios ven "Desde $X/día (varía según fechas)" en car detail

**Risks & Mitigations:**
- ⚠️ **Risk:** Reglas superpuestas causan confusión → **Mitigation:** Priority system + UI preview
- ⚠️ **Risk:** Precios muy altos espantan usuarios → **Mitigation:** Max multiplier 3.0x, alertas a admin

---

#### 2.2 Insurance Workflow UI

**Priority:** 🟡 P1 - Importante para reducción de costos
**Effort:** 10 días (4 frontend + 4 backend + 2 DB)
**Owner:** Dev 2

**Database Migrations:**
```sql
-- File: supabase/migrations/20251125_insurance_workflow_enhancements.sql
-- Effort: 1 day

-- Nota: Las tablas de insurance ya existen en database/create-insurance-system.sql
-- Este migration agrega campos de workflow

ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS
  verification_status TEXT CHECK (verification_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending';

ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS
  rejection_reason TEXT;

ALTER TABLE insurance_policies ADD COLUMN IF NOT EXISTS
  verified_by_admin_id UUID REFERENCES profiles(id);

-- Add-ons comprados por locatario
CREATE TABLE IF NOT EXISTS booking_insurance_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES insurance_addons(id),
  daily_cost_cents BIGINT NOT NULL,
  total_cost_cents BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_addons_booking ON booking_insurance_addons(booking_id);
```

**Backend Services:**
```typescript
// File: apps/web/src/app/core/services/insurance-policies.service.ts
// Effort: 3 days

@Injectable({ providedIn: 'root' })
export class InsurancePoliciesService {
  // Owner: Upload BYOI policy
  async uploadOwnerPolicy(params: {
    carId: string;
    insurerName: string;
    policyNumber: string;
    policyStartDate: string;
    policyEndDate: string;
    policyDocumentFile: File;
    coverageDetails: {
      liability_coverage_amount: number;
      own_damage: boolean;
      theft: boolean;
      // ...
    };
  }): Promise<InsurancePolicy>;

  // Owner: Get my policies
  async getMyPolicies(): Promise<InsurancePolicy[]>;

  // Admin: Review pending policies
  async getPendingPolicies(): Promise<InsurancePolicy[]>;

  // Admin: Approve policy
  async approvePolicy(policyId: string): Promise<void>;

  // Admin: Reject policy
  async rejectPolicy(policyId: string, reason: string): Promise<void>;

  // Renter: Get available add-ons for booking
  async getAvailableAddons(bookingId: string): Promise<InsuranceAddon[]>;

  // Renter: Purchase add-on
  async purchaseAddon(bookingId: string, addonId: string): Promise<void>;

  // Public: Get policy for car
  async getCarPolicy(carId: string): Promise<InsurancePolicy | null>;
}
```

**Frontend Components:**
```typescript
// File: apps/web/src/app/features/insurance/components/policy-uploader/policy-uploader.component.ts
// Effort: 2 days

@Component({
  selector: 'app-policy-uploader',
  templateUrl: './policy-uploader.component.html'
})
export class PolicyUploaderComponent {
  policyForm = this.fb.group({
    insurer: ['rio_uruguay', Validators.required],
    policy_number: ['', Validators.required],
    policy_start_date: ['', Validators.required],
    policy_end_date: ['', Validators.required],
    policy_document: [null, Validators.required],   // File upload

    // Coverages (checkboxes)
    liability_coverage: [true],
    own_damage_coverage: [true],
    theft_coverage: [true],
    // ...
  });

  async uploadPolicy(): Promise<void>;
}
```

**Frontend - Admin Review:**
```typescript
// File: apps/web/src/app/features/admin/insurance-review/insurance-review.component.ts
// Effort: 2 days

@Component({
  selector: 'app-insurance-review',
  templateUrl: './insurance-review.component.html'
})
export class InsuranceReviewComponent implements OnInit {
  pendingPolicies = signal<InsurancePolicy[]>([]);

  async ngOnInit(): Promise<void> {
    this.pendingPolicies.set(await this.insuranceService.getPendingPolicies());
  }

  // View policy PDF
  viewPolicyDocument(policy: InsurancePolicy): void {
    window.open(policy.owner_policy_document_url, '_blank');
  }

  // Approve
  async approvePolicy(policyId: string): Promise<void> {
    await this.insuranceService.approvePolicy(policyId);
    // Remove from pending list
  }

  // Reject
  async rejectPolicy(policyId: string): Promise<void> {
    const reason = prompt('Razón de rechazo:');
    if (!reason) return;
    await this.insuranceService.rejectPolicy(policyId, reason);
  }
}
```

**UI Pages:**
1. `/dashboard/owner/insurance` - Ver y subir pólizas BYOI
2. `/dashboard/owner/insurance/upload` - Subir nueva póliza
3. `/admin/insurance/review` - Admin: Revisar pólizas pendientes
4. `/bookings/:id/insurance` - Renter: Ver cobertura + comprar add-ons
5. `/cars/:id/insurance` - Public: Ver cobertura incluida

**Integration Points:**
- **Car publish:** Requerir póliza válida (plataforma o BYOI) para activar auto
- **Booking creation:** Calcular costo de seguro (si usa plataforma) o $0 (si BYOI)
- **Booking quote:** Mostrar cobertura incluida + add-ons disponibles

**Testing:**
- Unit tests: Policy upload + validation
- Integration tests: Owner uploads BYOI → admin approves → car activates
- E2E test: Renter purchases addon → price adjusts → included in booking

**Acceptance Criteria:**
- ✅ Locadores pueden subir pólizas BYOI con documento PDF
- ✅ Admin puede aprobar/rechazar pólizas con razón
- ✅ Autos con BYOI aprobado no cobran seguro a locatario
- ✅ Autos sin póliza válida quedan en estado "pending" (no publicables)
- ✅ Locatarios pueden ver coberturas y comprar add-ons
- ✅ Add-ons se reflejan en precio final del booking

**Risks & Mitigations:**
- ⚠️ **Risk:** Pólizas falsas → **Mitigation:** Admin review obligatorio + verificar con aseguradora
- ⚠️ **Risk:** Pólizas vencidas → **Mitigation:** Cron job daily para desactivar autos con pólizas expiradas

---

## 3. Phase 2: Trust & Safety

**Duration:** 6 semanas (Sprints 3-4)
**Goal:** Reducir conflictos y aumentar confianza
**Launch Readiness:** 85% (suficiente para beta pública)

---

### Sprint 3: E-Signatures + Volume Commissions (3 semanas)

#### 3.1 Electronic Contract Signing

**Priority:** 🟡 P1 - Trust builder
**Effort:** 9 días (4 frontend + 3 backend + 2 DB)
**Owner:** Dev 1

**Database Migrations:**
```sql
-- File: supabase/migrations/20251129_create_contract_signatures.sql
-- Effort: 1 day

CREATE TABLE contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES booking_contracts(id) ON DELETE CASCADE,
  signer_user_id UUID NOT NULL REFERENCES profiles(id),
  signer_role TEXT CHECK (signer_role IN ('owner', 'renter')) NOT NULL,

  -- Signature method
  signature_method TEXT CHECK (signature_method IN ('checkbox', 'typed_name', 'drawn', 'otp')) NOT NULL,

  -- Signature data (if drawn)
  signature_svg_data TEXT,

  -- OTP verification (if method = otp)
  otp_sent_to TEXT,
  otp_verified_at TIMESTAMPTZ,

  -- Evidence
  ip_address INET NOT NULL,
  user_agent TEXT,
  device_fingerprint TEXT,

  signed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Legal compliance
  terms_accepted_hash TEXT NOT NULL,  -- SHA-256 del contrato
  evidence_url TEXT,                   -- PDF firmado con metadata

  UNIQUE(contract_id, signer_user_id)
);

CREATE INDEX idx_signatures_contract ON contract_signatures(contract_id);
CREATE INDEX idx_signatures_signer ON contract_signatures(signer_user_id);

-- Bipartite confirmation for pickup/return
CREATE TABLE bipartite_confirmations (
  booking_id UUID PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,

  -- Pickup confirmations
  owner_confirmed_pickup BOOLEAN DEFAULT false,
  owner_confirmed_pickup_at TIMESTAMPTZ,
  renter_confirmed_pickup BOOLEAN DEFAULT false,
  renter_confirmed_pickup_at TIMESTAMPTZ,
  both_confirmed_pickup BOOLEAN GENERATED ALWAYS AS (owner_confirmed_pickup AND renter_confirmed_pickup) STORED,

  -- Return confirmations
  owner_confirmed_return BOOLEAN DEFAULT false,
  owner_confirmed_return_at TIMESTAMPTZ,
  renter_confirmed_return BOOLEAN DEFAULT false,
  renter_confirmed_return_at TIMESTAMPTZ,
  both_confirmed_return BOOLEAN GENERATED ALWAYS AS (owner_confirmed_return AND renter_confirmed_return) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Backend Services:**
```typescript
// File: apps/web/src/app/core/services/contract-signing.service.ts
// Effort: 2 days

@Injectable({ providedIn: 'root' })
export class ContractSigningService {
  // Generate contract PDF with terms
  async generateContractPDF(bookingId: string): Promise<string>;

  // Sign contract (multiple methods)
  async signContract(params: {
    contractId: string;
    method: 'checkbox' | 'typed_name' | 'drawn' | 'otp';
    signatureData?: string;         // SVG for drawn, name for typed
    otpCode?: string;                // For OTP verification
  }): Promise<void>;

  // Send OTP for signing
  async sendSigningOTP(contractId: string): Promise<void>;

  // Check if contract is fully signed
  async isContractFullySigned(contractId: string): Promise<boolean>;

  // Get signatures for contract
  async getContractSignatures(contractId: string): Promise<ContractSignature[]>;

  // Generate signed PDF with signatures
  async generateSignedPDF(contractId: string): Promise<string>;
}
```

**Frontend Components:**
```typescript
// File: apps/web/src/app/features/contracts/components/signature-pad/signature-pad.component.ts
// Effort: 2 days (using @angular/cdk or SignaturePad library)

@Component({
  selector: 'app-signature-pad',
  templateUrl: './signature-pad.component.html'
})
export class SignaturePadComponent {
  signatureMethod = signal<'checkbox' | 'typed_name' | 'drawn' | 'otp'>('checkbox');

  // For drawn signatures
  @ViewChild('signaturePad') signaturePad!: ElementRef<HTMLCanvasElement>;

  // For typed name
  typedName = signal('');

  // For OTP
  otpCode = signal('');
  otpSent = signal(false);

  async sendOTP(): Promise<void> {
    await this.contractService.sendSigningOTP(this.contractId);
    this.otpSent.set(true);
  }

  async submitSignature(): Promise<void> {
    const signatureData = this.getSignatureData();
    await this.contractService.signContract({
      contractId: this.contractId,
      method: this.signatureMethod(),
      signatureData,
      otpCode: this.signatureMethod() === 'otp' ? this.otpCode() : undefined
    });
  }

  private getSignatureData(): string | undefined {
    switch (this.signatureMethod()) {
      case 'drawn':
        return this.signaturePad.nativeElement.toDataURL();
      case 'typed_name':
        return this.typedName();
      default:
        return undefined;
    }
  }
}
```

**UI Pages:**
1. `/bookings/:id/contract` - Ver contrato antes de firmar
2. `/bookings/:id/contract/sign` - Firmar contrato
3. `/bookings/:id/contract/download` - Descargar PDF firmado

**Integration Points:**
- **Booking confirmation:** Requerir firma de contrato antes de confirmar booking
- **Pickup confirmation:** Ambas partes confirman que recibieron/entregaron auto
- **Return confirmation:** Ambas partes confirman devolución sin daños

**Testing:**
- Unit tests: SHA-256 hash generation, signature validation
- Integration tests: Owner signs → renter signs → contract marked as complete
- E2E test: Full signing flow with OTP

**Acceptance Criteria:**
- ✅ Locador y locatario firman contrato antes de confirmar booking
- ✅ 4 métodos de firma: checkbox, typed name, drawn, OTP
- ✅ Contratos firmados generan PDF con signatures visibles
- ✅ SHA-256 hash del contrato para inmutabilidad
- ✅ IP + device fingerprint capturados para evidencia legal
- ✅ Pickup/return requieren confirmación bilateral

**Risks & Mitigations:**
- ⚠️ **Risk:** Firmas no tienen validez legal → **Mitigation:** Disclaimer + consulta legal argentina
- ⚠️ **Risk:** Usuarios no firman → **Mitigation:** Bloquear booking hasta firma completa

---

#### 3.2 Volume Commission Tiers

**Priority:** 🟡 P1 - Atraer locadores grandes
**Effort:** 6 días (3 frontend + 2 backend + 1 DB)
**Owner:** Dev 2

**Database Migrations:**
```sql
-- File: supabase/migrations/20251202_create_commission_tiers.sql
-- Effort: 1 day

CREATE TABLE volume_commission_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,              -- "Bronze", "Silver", "Gold", "Platinum"

  min_cars_count INT NOT NULL CHECK (min_cars_count >= 0),
  max_cars_count INT,                   -- NULL = unlimited

  min_monthly_revenue_cents BIGINT NOT NULL DEFAULT 0,

  commission_rate NUMERIC(5,4) NOT NULL CHECK (commission_rate >= 0.05 AND commission_rate <= 0.20),

  benefits JSONB DEFAULT '[]'::jsonb,   -- ["Priority support", "Featured listings"]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,

  UNIQUE(tier_name)
);

-- Seed default tiers
INSERT INTO volume_commission_tiers (tier_name, min_cars_count, max_cars_count, commission_rate, benefits) VALUES
  ('Bronze', 0, 2, 0.15, '["Standard support"]'::jsonb),
  ('Silver', 3, 9, 0.12, '["Priority email support", "Monthly analytics report"]'::jsonb),
  ('Gold', 10, 24, 0.10, '["Priority phone support", "Featured in homepage", "Custom pricing rules"]'::jsonb),
  ('Platinum', 25, NULL, 0.08, '["Dedicated account manager", "API access", "White-label option"]'::jsonb);

-- Overrides por locador (admin can set custom rates)
CREATE TABLE owner_commission_overrides (
  owner_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  commission_tier_id UUID REFERENCES volume_commission_tiers(id),

  custom_rate NUMERIC(5,4) CHECK (custom_rate >= 0.05 AND custom_rate <= 0.20),

  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_until TIMESTAMPTZ,

  reason TEXT NOT NULL,                 -- "Partnership", "Promotion", "VIP"

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC: Get effective commission rate for owner
CREATE OR REPLACE FUNCTION get_owner_commission_rate(p_owner_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
  v_custom_rate NUMERIC;
  v_tier_rate NUMERIC;
  v_cars_count INT;
  v_monthly_revenue BIGINT;
BEGIN
  -- Check for manual override first
  SELECT custom_rate INTO v_custom_rate
  FROM owner_commission_overrides
  WHERE owner_id = p_owner_id
  AND (effective_until IS NULL OR effective_until > NOW())
  LIMIT 1;

  IF v_custom_rate IS NOT NULL THEN
    RETURN v_custom_rate;
  END IF;

  -- Count active cars
  SELECT COUNT(*) INTO v_cars_count
  FROM cars
  WHERE owner_id = p_owner_id AND status = 'active';

  -- Calculate last 30 days revenue
  SELECT COALESCE(SUM(total_amount_cents), 0) INTO v_monthly_revenue
  FROM bookings
  WHERE owner_id = p_owner_id
  AND status IN ('completed', 'in_progress')
  AND created_at > NOW() - INTERVAL '30 days';

  -- Find matching tier
  SELECT commission_rate INTO v_tier_rate
  FROM volume_commission_tiers
  WHERE is_active = true
  AND min_cars_count <= v_cars_count
  AND (max_cars_count IS NULL OR max_cars_count >= v_cars_count)
  AND min_monthly_revenue_cents <= v_monthly_revenue
  ORDER BY min_cars_count DESC
  LIMIT 1;

  RETURN COALESCE(v_tier_rate, 0.15);  -- Default 15%
END;
$$;
```

**Backend Services:**
```typescript
// File: apps/web/src/app/core/services/commission-tiers.service.ts
// Effort: 1 day

@Injectable({ providedIn: 'root' })
export class CommissionTiersService {
  // Get all tiers
  async getTiers(): Promise<CommissionTier[]>;

  // Get my current tier
  async getMyTier(): Promise<{
    tier: CommissionTier;
    cars_count: number;
    monthly_revenue_ars: number;
    next_tier: CommissionTier | null;
    cars_needed_for_next_tier: number;
  }>;

  // Admin: Set custom rate for owner
  async setCustomRate(ownerId: string, rate: number, reason: string): Promise<void>;

  // Get effective rate for owner
  async getOwnerRate(ownerId: string): Promise<number>;
}
```

**Frontend Components:**
```typescript
// File: apps/web/src/app/features/dashboard/owner/commission-tier-display/commission-tier-display.component.ts
// Effort: 2 days

@Component({
  selector: 'app-commission-tier-display',
  templateUrl: './commission-tier-display.component.html'
})
export class CommissionTierDisplayComponent implements OnInit {
  myTier = signal<CommissionTierInfo | null>(null);

  async ngOnInit(): Promise<void> {
    this.myTier.set(await this.commissionService.getMyTier());
  }

  // Progress to next tier
  progressToNextTier = computed(() => {
    const tier = this.myTier();
    if (!tier?.next_tier) return 100;

    return (tier.cars_count / (tier.cars_count + tier.cars_needed_for_next_tier)) * 100;
  });
}
```

**UI Pages:**
1. `/dashboard/owner/commission` - Ver tier actual + progress
2. `/pricing` - Public: Mostrar tiers de comisión (marketing)
3. `/admin/commission/overrides` - Admin: Set custom rates

**Integration Points:**
- **Booking completion:** Calcular comisión usando `get_owner_commission_rate()`
- **Split payment:** Distribuir según commission rate (85-92% locador)
- **Dashboard:** Mostrar tier badge + benefits

**Testing:**
- Unit tests: Tier calculation logic
- Integration tests: Owner adds car #3 → upgrades to Silver → next booking has 12% commission
- E2E test: Admin sets custom rate → owner sees override in dashboard

**Acceptance Criteria:**
- ✅ 4 tiers: Bronze (15%), Silver (12%), Gold (10%), Platinum (8%)
- ✅ Tier se calcula automáticamente según cars count + monthly revenue
- ✅ Admin puede set custom rates manualmente
- ✅ Locadores ven tier actual + progress to next tier
- ✅ Comisiones se aplican correctamente en split payments

**Risks & Mitigations:**
- ⚠️ **Risk:** Locadores game the system (ej: 10 autos fake) → **Mitigation:** Review manual + require active bookings
- ⚠️ **Risk:** Revenue drops → tier downgrade → frustración → **Mitigation:** Grace period de 60 días

---

### Sprint 4: Dispute Resolution + AI Verification (3 semanas)

(Continuará en documento completo...)

---

## 4. Phase 3: Operational Excellence

(Documentación completa de Sprints 5-6 disponible en sección completa del roadmap)

---

## 5. Team Structure & Roles

### Recommended Team (3 personas)

**Developer 1 - Full-Stack Lead**
- Focus: Complex features (inspections, disputes)
- Stack: Angular 18 + Supabase PostgreSQL
- Responsibilities:
  - Architecture decisions
  - Code reviews
  - Database schema design
  - Performance optimization

**Developer 2 - Full-Stack**
- Focus: UI/UX heavy features (pricing, insurance)
- Stack: Angular 18 + Tailwind CSS
- Responsibilities:
  - Component library
  - Form validations
  - Responsive design
  - E2E tests (Playwright)

**QA Engineer**
- Focus: Testing automation + manual QA
- Tools: Jasmine, Karma, Playwright
- Responsibilities:
  - Test plan creation
  - Automated test suite
  - Regression testing
  - Bug tracking (GitHub Issues)

### Optional Roles (Post-MVP)

- **DevOps Engineer:** CI/CD optimization, monitoring, alerts
- **Product Designer:** UX research, design system, prototyping
- **Backend Specialist:** Complex SQL, performance tuning, data migrations

---

## 6. Technical Stack & Tools

### Frontend
- **Framework:** Angular 18 (standalone components)
- **State:** Signals + RxJS
- **Styling:** Tailwind CSS 3.x
- **Forms:** Reactive Forms + Custom Validators
- **File Upload:** Cloudinary SDK
- **Maps:** Mapbox GL JS
- **PDF:** jsPDF or PDFMake
- **Signature:** signature_pad library

### Backend
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **Storage:** Supabase Storage (avatars, car photos, documents)
- **Edge Functions:** Deno (TypeScript)
- **Real-time:** Supabase Realtime (for notifications)

### Infrastructure
- **Hosting:** Cloudflare Pages
- **Workers:** Cloudflare Workers (webhooks)
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry (errors) + Cloudflare Analytics
- **Email:** SendGrid
- **SMS:** Twilio

### Development
- **IDE:** VSCode + Angular Language Service
- **Linting:** ESLint + Prettier
- **Testing:** Jasmine + Karma (unit), Playwright (E2E)
- **Git:** GitHub (private repo)
- **Project Management:** GitHub Projects

---

## 7. Risk Management

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Supabase downtime** | Low | High | Implement retry logic, cache critical data |
| **Storage costs exceed budget** | Medium | Medium | Image compression, CDN caching, size limits |
| **Performance degradation** | Medium | High | Database indexes, query optimization, lazy loading |
| **RLS policy bugs** | Medium | High | Extensive testing, audit logs, automated tests |

### Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Users don't complete inspections** | High | High | Mandatory flow, UX simplification, reminders |
| **Fake insurance policies** | Medium | Critical | Admin review, verification calls to insurers |
| **Legal issues with e-signatures** | Low | Critical | Legal consultation, disclaimer, hybrid approach |
| **Locadores reject volume tiers** | Low | Medium | Transparent communication, benefits education |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **DeRentas lowers commission** | Low | High | Focus on superior UX + features |
| **Regulatory changes (insurance)** | Medium | High | Legal monitoring, compliance team |
| **Low adoption rate** | Medium | Critical | Beta testing, iteration, marketing |

---

## 8. Success Metrics & KPIs

### MVP Launch Metrics (Sprint 3)

**Adoption:**
- 50+ active owners (publishing cars)
- 200+ active renters (registered + verified Level 2)
- 100+ completed bookings

**Quality:**
- 0% disputes from "undocumented damages" (inspections solve)
- <5% disputes overall
- 95%+ inspection completion rate
- 90%+ contract signing completion rate

**Financial:**
- Average commission: 14.5% (most in Bronze tier)
- FGO balance: $500k+ ARS
- Monthly GMV: $2M+ ARS

### Post-MVP Metrics (Sprint 6)

**Growth:**
- 200+ active owners
- 1000+ active renters
- 500+ completed bookings

**Quality:**
- <2% disputes overall
- 98%+ inspection completion
- 95%+ contract signing
- 4.5+ avg rating (owners and renters)

**Financial:**
- Average commission: 13.5% (20% in Silver+)
- FGO balance: $2M+ ARS
- Monthly GMV: $10M+ ARS

**Operational:**
- <24h dispute resolution time
- 95%+ insurance policy approval rate
- 90%+ Level 2 verification completion (AI-assisted)

---

## 9. Launch Checklist

### Pre-Launch (Sprint 2 completion)

- [ ] All P0 features implemented & tested
- [ ] Database migrations run on production
- [ ] RLS policies audited & tested
- [ ] Insurance system integrated with aseguradoras
- [ ] Legal review of contracts & terms
- [ ] Privacy policy & TOS updated
- [ ] GDPR compliance (data export/delete)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance audit (Lighthouse >90)
- [ ] Security audit (OWASP Top 10)
- [ ] Load testing (1000 concurrent users)
- [ ] Backup & disaster recovery plan
- [ ] Monitoring & alerting setup
- [ ] Customer support training

### Beta Launch (Sprint 3)

- [ ] 10-20 beta owners invited
- [ ] Beta feedback loop (weekly surveys)
- [ ] Bug tracking & triage process
- [ ] Daily standup + weekly retrospective
- [ ] Feature flags for gradual rollout
- [ ] A/B testing setup (inspection flow)
- [ ] Analytics events tracking

### Public Launch (Sprint 4)

- [ ] Marketing site updated
- [ ] App Store / Play Store published (if mobile)
- [ ] SEO optimization (meta tags, sitemap)
- [ ] Social media announcement
- [ ] Press release (tech media)
- [ ] Referral program launched
- [ ] Customer support 24/7 (or business hours)

---

## 10. Post-Launch Roadmap

### Q2 2026 (Sprints 7-10)

**Focus:** Scale & Optimize

- Multi-city expansion (Córdoba, Rosario, Mendoza)
- Mobile app (React Native or Flutter)
- Advanced analytics dashboard
- Automated pricing optimization (ML-based)
- Integration with Uber/Cabify APIs
- Fleet management for 25+ car owners

### Q3 2026 (Sprints 11-14)

**Focus:** Regional Expansion

- Multi-currency (USD, BRL)
- Cross-border rentals (Uruguay, Brasil)
- Multi-language (EN, PT)
- Partnership with car dealerships
- Insurance direct integration (API)

### Q4 2026 (Sprints 15-18)

**Focus:** Enterprise Features

- White-label platform for large fleets
- API for 3rd party integrations
- Advanced fraud detection (ML-based)
- Blockchain-based contracts (optional)
- EV-specific features (charging stations)

---

## 11. Budget Estimate

### Development Costs (9 semanas)

| Role | Rate (USD/month) | Months | Total |
|------|------------------|--------|-------|
| Developer 1 (Lead) | $6,000 | 2.25 | $13,500 |
| Developer 2 (Full-Stack) | $5,000 | 2.25 | $11,250 |
| QA Engineer | $3,000 | 2.25 | $6,750 |
| **Subtotal** | | | **$31,500** |

### Infrastructure Costs (Monthly)

| Service | Plan | Cost (USD/month) |
|---------|------|------------------|
| Supabase | Pro | $25 |
| Cloudflare Pages | Free | $0 |
| Cloudflare Workers | Paid (100k req/day) | $5 |
| Supabase Storage | 100GB | $10 |
| SendGrid | Essentials (50k emails) | $20 |
| Twilio | Pay-as-you-go (SMS) | $50 |
| Sentry | Team | $29 |
| **Subtotal** | | **$139/month** |

### One-Time Costs

| Item | Cost (USD) |
|------|------------|
| Legal review (contracts) | $2,000 |
| Design assets (logo, icons) | $500 |
| Domain + SSL | $50 |
| **Subtotal** | **$2,550** |

### Total Budget (MVP to Launch)

| Category | Amount (USD) |
|----------|--------------|
| Development (9 weeks) | $31,500 |
| Infrastructure (3 months) | $417 |
| One-time costs | $2,550 |
| **Total** | **$34,467** |
| **+ 20% buffer** | **$41,360** |

**Recommended Budget:** USD $45,000 (Q1 2026)

---

## 12. Next Steps (Immediate Actions)

### Week 1 (Nov 12-18)

1. **Kickoff Meeting**
   - Review roadmap with team
   - Assign Sprint 1 tasks
   - Setup GitHub Projects board
   - Create Slack/Discord channel

2. **Environment Setup**
   - Clone repository
   - Setup local development (Node.js, Angular CLI, Supabase CLI)
   - Configure `.env.local` with Supabase credentials
   - Run initial migrations

3. **Sprint 1 Planning**
   - Create GitHub Issues for each feature
   - Estimate effort (Fibonacci scale)
   - Assign owners (Dev 1 vs Dev 2)
   - Define acceptance criteria

### Week 2 (Nov 19-25)

4. **Start Development**
   - Dev 1: Vehicle Inspections (database + backend)
   - Dev 2: Rental Terms (database + backend)
   - QA: Test plan creation

5. **Daily Standups**
   - 15min sync every morning
   - Blockers → escalate immediately

### Week 3 (Nov 26-Dec 2)

6. **Sprint 1 Completion**
   - Code review (Dev 1 ↔ Dev 2)
   - Integration testing (QA)
   - Deploy to staging
   - Sprint retrospective

7. **Sprint 2 Planning**
   - Review Sprint 1 learnings
   - Adjust estimates if needed
   - Kickoff Sprint 2

---

## Appendix A: Database Schema Changes

### New Tables (Total: 18)

**Sprint 1:**
- `vehicle_inspections`
- `inspection_photos`
- `rental_terms_templates`
- `car_rental_terms`

**Sprint 2:**
- `seasonal_pricing_rules`
- `booking_insurance_addons`

**Sprint 3:**
- `contract_signatures`
- `bipartite_confirmations`
- `volume_commission_tiers`
- `owner_commission_overrides`

**Sprint 4:**
- `booking_disputes`
- `dispute_messages`

**Sprint 5:**
- `vehicle_maintenance_records`
- `maintenance_schedules`
- `booking_mileage_tracking`

**Sprint 6:**
- `promotion_codes`
- `promotion_usage`

---

## Appendix B: API Endpoints

### New Edge Functions (Total: 12)

**Sprint 1:**
- `POST /inspections/create`
- `POST /inspections/upload-photos`
- `GET /inspections/:id`
- `POST /terms/assign-to-car`

**Sprint 2:**
- `POST /pricing/create-seasonal-rule`
- `GET /pricing/calculate-with-rules`

**Sprint 3:**
- `POST /contracts/sign`
- `POST /contracts/send-otp`

**Sprint 4:**
- `POST /disputes/create`
- `POST /disputes/:id/message`

**Sprint 5:**
- `POST /maintenance/create-record`

**Sprint 6:**
- `POST /promotions/validate-code`

---

**Documento generado:** 2025-11-12
**Próxima revisión:** 2025-12-01 (after Sprint 1)

**Responsable:** Product Owner / Tech Lead
**Aprobación:** Stakeholders + Team

