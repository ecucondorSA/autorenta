# Análisis: Póliza de Ejemplo iúnigo - Aplicación a AutoRenta

**Fecha**: 2025-11-03  
**Fuente**: [Póliza de ejemplo iúnigo v3](https://content.gruposancristobal.com/iunigo/iunigo-poliza-ejemplo-v3.pdf)  
**Objetivo**: Identificar mejoras al sistema de seguros P2P de AutoRenta

---

## 📋 Resumen Ejecutivo

El PDF de iúnigo muestra la estructura real de una póliza de seguro de vehículos en Argentina. Esta información puede ayudar a:

1. ✅ **Validar estructura de datos** - Asegurar que nuestros campos coincidan con la realidad legal
2. ✅ **Mejorar UX de visualización** - Mostrar información de póliza de manera profesional
3. ✅ **Generar certificados digitales** - Crear documentos PDF similares para cada reserva
4. ✅ **Completar campos faltantes** - Agregar información que falta en nuestro schema actual
5. ✅ **Cumplimiento regulatorio** - Incluir información requerida por SSN

---

## 🔍 Campos Identificados en el PDF vs AutoRenta

### 1. Información Básica de Póliza

| Campo PDF | Campo AutoRenta | Estado | Notas |
|-----------|----------------|--------|-------|
| Número de póliza | `platform_policy_number` / `owner_policy_number` | ✅ Existe | |
| Número de endoso | ❌ No existe | ⚠️ **FALTANTE** | Muestra cantidad de modificaciones |
| Vigencia (fecha inicio) | `platform_contract_start` / `owner_policy_start` | ✅ Existe | |
| Vigencia (fecha fin) | `platform_contract_end` / `owner_policy_end` | ✅ Existe | |
| Tipo de póliza | `policy_type` | ✅ Existe | |
| Plan (Full, Más, Simple) | ❌ No existe | ⚠️ **FALTANTE** | Podría ser útil para usuarios |

**Recomendación**: Agregar campo `policy_plan` (enum: 'full', 'mas', 'simple') y `endorsement_number` (INTEGER).

### 2. Información del Vehículo

| Campo PDF | Campo AutoRenta | Estado | Notas |
|-----------|----------------|--------|-------|
| Marca y Modelo | `car.brand` / `car.model` | ✅ Existe | |
| Año | `car.year` | ✅ Existe | |
| Patente | `car.plate` | ✅ Existe | |
| Motor | ❌ No existe | ⚠️ **FALTANTE** | Número de motor |
| Chasis | ❌ No existe | ⚠️ **FALTANTE** | Número de chasis |
| Uso profesional | ❌ No existe | ⚠️ **FALTANTE** | PDF menciona "no se usa profesionalmente" |

**Recomendación**: Agregar campos `engine_number` y `chassis_number` a tabla `cars`. Campo `professional_use` ya existe implícitamente (no se permite Uber).

### 3. Valor Asegurado

| Campo PDF | Campo AutoRenta | Estado | Notas |
|-----------|----------------|--------|-------|
| Suma Asegurada | `value_usd` | ✅ Existe | PDF muestra en pesos argentinos |

**Nota**: AutoRenta usa USD, pero debería mostrar en ARS para usuarios argentinos.

### 4. Coberturas Detalladas

El PDF muestra coberturas con códigos de cláusula:

| Cobertura PDF | Código | AutoRenta Actual | Estado |
|---------------|--------|-----------------|--------|
| Responsabilidad Civil | SO-RC 5.1 | `liability_coverage_amount` | ✅ Existe |
| Daños Parciales | CA-CC11.1 | `own_damage_coverage` | ✅ Existe |
| Robo Total | - | `theft_coverage` | ✅ Existe |
| Incendio | - | `fire_coverage` | ✅ Existe |
| Robo de Autoparte | - | `misappropriation_coverage` | ✅ Existe |
| 0 Km | CA-CC11.1 | ❌ No existe | ⚠️ **FALTANTE** |

**Recomendación**: 
- Agregar campo `clause_code` (TEXT) a `insurance_policies` para referenciar cláusulas legales
- Agregar cobertura `zero_km_coverage` (BOOLEAN) para vehículos nuevos

### 5. Franquicia (Deductible)

| Campo PDF | Campo AutoRenta | Estado | Notas |
|-----------|----------------|--------|-------|
| Tipo de franquicia | `deductible_type` | ✅ Existe | |
| Monto franquicia | `deductible_fixed_amount` | ✅ Existe | |
| Porcentaje | `deductible_percentage` | ✅ Existe | |
| Monto mínimo | `deductible_min_amount` | ✅ Existe | |

**Nota**: PDF muestra franquicia solo para "daños parciales" (plan Full). Planes Más y Simple no tienen.

### 6. Plan de Pago

| Campo PDF | Campo AutoRenta | Estado | Notas |
|-----------|----------------|--------|-------|
| Medio de pago | - | ❌ No existe | PDF: MercadoPago |
| Frecuencia | - | ❌ No existe | PDF: Mensual |
| Cantidad de cuotas | - | ❌ No existe | PDF: 3 cuotas |
| Fechas de vencimiento | - | ❌ No existe | PDF: Tabla de cuotas |
| Valor de cuota | - | ❌ No existe | PDF: $2.131,54 |

**Recomendación**: Para pólizas propias (BYOI), sería útil guardar:
- `payment_method` (TEXT)
- `payment_frequency` (TEXT: 'monthly', 'quarterly', 'annual')
- `installment_count` (INTEGER)
- `installment_amount` (BIGINT)

### 7. Desglose de Costos

PDF muestra desglose detallado:
- Prima tarifa: $5.135,78
- Recargo Financiero (TEA 13,60%): $94,67
- Tasa SSN: $31,14
- Sellos (CABA/Provincia): $0,00
- IVA (21%): $1.090,00
- Otros impuestos: $83,05
- **Total**: $6.394,64

**AutoRenta actual**: Solo guarda `annual_premium` o `daily_premium`.

**Recomendación**: Agregar tabla `insurance_premium_breakdown`:

```sql
CREATE TABLE insurance_premium_breakdown (
  id UUID PRIMARY KEY,
  policy_id UUID REFERENCES insurance_policies(id),
  
  base_premium BIGINT NOT NULL, -- Prima tarifa
  financing_charge BIGINT DEFAULT 0, -- Recargo financiero
  financing_tea_rate NUMERIC(5,2), -- TEA anual
  ssn_tax BIGINT DEFAULT 0, -- Tasa SSN
  stamps_tax BIGINT DEFAULT 0, -- Sellos
  vat_rate NUMERIC(5,2) DEFAULT 21.00, -- IVA %
  vat_amount BIGINT DEFAULT 0, -- IVA en pesos
  other_taxes BIGINT DEFAULT 0,
  
  total_premium BIGINT NOT NULL, -- Total a pagar
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 8. Información Regulatoria

PDF incluye:
- ✅ Servicio de Atención al Asegurado (SAA)
- ✅ Responsable y Suplente del SAA
- ✅ Teléfono: 11.5171.4211
- ✅ Superintendencia de Seguros de la Nación (SSN)
- ✅ Resolución N° 38.708 (aprobación de póliza)
- ✅ Artículo 12° Ley de Seguros (plazo de reclamo)

**AutoRenta actual**: No guarda información regulatoria.

**Recomendación**: Agregar campos a `insurance_policies`:
- `regulatory_resolution` (TEXT) - Ej: "Resolución N° 38.708"
- `saa_responsible_name` (TEXT)
- `saa_responsible_phone` (TEXT)
- `saa_supplier_name` (TEXT)
- `saa_supplier_phone` (TEXT)
- `claim_deadline_days` (INTEGER DEFAULT 30) - Art. 12° Ley de Seguros

---

## 📄 Generación de Certificado Digital

### Estructura del PDF de iúnigo

El PDF muestra una estructura profesional que podemos replicar:

1. **Página 1 - Portada**:
   - Logo de la aseguradora
   - "¡Gracias por sumarte!"
   - Información básica de póliza
   - Datos del vehículo
   - Vigencia

2. **Página 2 - Coberturas**:
   - Lista de coberturas con códigos de cláusula
   - Límites de cobertura
   - Franquicias

3. **Página 3 - Costos**:
   - Desglose de costos
   - Plan de pago
   - Tabla de cuotas

4. **Página 4+ - Cláusulas y Exclusiones**:
   - Texto completo de cláusulas
   - Exclusiones
   - Información regulatoria

### Implementación Propuesta

**Archivo**: `apps/web/src/app/core/services/insurance-certificate.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class InsuranceCertificateService {
  /**
   * Genera PDF de certificado de cobertura para una reserva
   */
  async generateCertificatePDF(
    bookingId: string,
    coverageId: string
  ): Promise<Blob> {
    // 1. Obtener datos de cobertura
    const coverage = await this.getCoverageData(coverageId);
    
    // 2. Generar PDF usando jsPDF o PDFKit
    // 3. Incluir:
    //    - Logo de aseguradora
    //    - Datos del vehículo
    //    - Fechas de cobertura
    //    - Coberturas incluidas
    //    - Límites y franquicias
    //    - Información regulatoria
    
    return pdfBlob;
  }
}
```

**Biblioteca recomendada**: `jsPDF` o `pdfmake` (más fácil para layouts complejos).

---

## 🎨 Mejoras de UX

### 1. Visualización de Póliza en Detalle de Auto

**Archivo actual**: `apps/web/src/app/features/cars/detail/car-detail.page.html`

**Mejora propuesta**: Agregar sección "Información de Seguro" similar al PDF:

```html
<section class="insurance-info rounded-lg bg-accent-petrol/10 p-4">
  <h3 class="font-semibold mb-2">📋 Información de Seguro</h3>
  
  <div class="space-y-2">
    <div class="flex justify-between">
      <span class="text-sm text-gray-600">Tipo de cobertura:</span>
      <span class="font-medium">{{ insuranceSummary.policy_type === 'platform_floating' ? 'Seguro Flotante' : 'Seguro Propio' }}</span>
    </div>
    
    <div class="flex justify-between">
      <span class="text-sm text-gray-600">Aseguradora:</span>
      <span class="font-medium">{{ insuranceSummary.insurer_display_name }}</span>
    </div>
    
    <div class="flex justify-between">
      <span class="text-sm text-gray-600">Responsabilidad Civil:</span>
      <span class="font-medium">{{ formatCurrency(insuranceSummary.liability_coverage) }}</span>
    </div>
    
    <div class="flex justify-between">
      <span class="text-sm text-gray-600">Franquicia:</span>
      <span class="font-medium">{{ formatCurrency(insuranceSummary.deductible_amount) }}</span>
    </div>
    
    <!-- Botón para ver certificado completo -->
    <button 
      (click)="downloadCertificate()"
      class="mt-4 w-full btn btn-secondary">
      📄 Descargar Certificado de Cobertura
    </button>
  </div>
</section>
```

### 2. Badge de Plan de Seguro

Similar a cómo iúnigo muestra "Plan Full", "Plan Más", "Plan Simple":

```html
<span class="badge badge-insurance-{{ policy.plan }}">
  {{ policyPlanLabels[policy.plan] }}
</span>
```

### 3. Tooltip de Coberturas

Al hacer hover sobre cada cobertura, mostrar código de cláusula y detalles:

```html
<div class="coverage-item" [title]="getCoverageTooltip(coverage)">
  <span>{{ coverage.name }}</span>
  <span class="text-xs text-gray-500">({{ coverage.clause_code }})</span>
</div>
```

---

## 🔧 Cambios Técnicos Propuestos

### 1. Migración de Base de Datos

**Archivo**: `database/add-iunigo-policy-fields.sql`

```sql
-- Agregar campos faltantes a insurance_policies
ALTER TABLE insurance_policies
ADD COLUMN IF NOT EXISTS policy_plan TEXT CHECK (policy_plan IN ('full', 'mas', 'simple')),
ADD COLUMN IF NOT EXISTS endorsement_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS zero_km_coverage BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS clause_code TEXT, -- Ej: "SO-RC 5.1"
ADD COLUMN IF NOT EXISTS regulatory_resolution TEXT,
ADD COLUMN IF NOT EXISTS saa_responsible_name TEXT,
ADD COLUMN IF NOT EXISTS saa_responsible_phone TEXT,
ADD COLUMN IF NOT EXISTS saa_supplier_name TEXT,
ADD COLUMN IF NOT EXISTS saa_supplier_phone TEXT,
ADD COLUMN IF NOT EXISTS claim_deadline_days INTEGER DEFAULT 30;

-- Agregar campos a cars
ALTER TABLE cars
ADD COLUMN IF NOT EXISTS engine_number TEXT,
ADD COLUMN IF NOT EXISTS chassis_number TEXT;

-- Crear tabla de desglose de costos
CREATE TABLE IF NOT EXISTS insurance_premium_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES insurance_policies(id),
  
  base_premium BIGINT NOT NULL,
  financing_charge BIGINT DEFAULT 0,
  financing_tea_rate NUMERIC(5,2),
  ssn_tax BIGINT DEFAULT 0,
  stamps_tax BIGINT DEFAULT 0,
  vat_rate NUMERIC(5,2) DEFAULT 21.00,
  vat_amount BIGINT DEFAULT 0,
  other_taxes BIGINT DEFAULT 0,
  
  total_premium BIGINT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_premium_breakdown_policy ON insurance_premium_breakdown(policy_id);
```

### 2. Actualizar Modelos TypeScript

**Archivo**: `apps/web/src/app/core/models/insurance.model.ts`

```typescript
export type PolicyPlan = 'full' | 'mas' | 'simple';

export interface InsurancePolicy {
  // ... campos existentes ...
  
  // Nuevos campos
  policy_plan?: PolicyPlan;
  endorsement_number?: number;
  zero_km_coverage?: boolean;
  clause_code?: string;
  regulatory_resolution?: string;
  saa_responsible_name?: string;
  saa_responsible_phone?: string;
  saa_supplier_name?: string;
  saa_supplier_phone?: string;
  claim_deadline_days?: number;
}

export interface InsurancePremiumBreakdown {
  id: string;
  policy_id: string;
  
  base_premium: number;
  financing_charge: number;
  financing_tea_rate?: number;
  ssn_tax: number;
  stamps_tax: number;
  vat_rate: number;
  vat_amount: number;
  other_taxes: number;
  
  total_premium: number;
  
  created_at: string;
}

export const POLICY_PLAN_LABELS: Record<PolicyPlan, string> = {
  full: 'Plan Full (Contra Todo Riesgo)',
  mas: 'Plan Más',
  simple: 'Plan Simple',
};
```

---

## 📊 Priorización de Implementación

### Fase 1 (Alta Prioridad - Compliance)
1. ✅ Agregar campos regulatorios (`regulatory_resolution`, `saa_*`, `claim_deadline_days`)
2. ✅ Agregar `clause_code` para referencias legales
3. ✅ Agregar campos faltantes en `cars` (`engine_number`, `chassis_number`)

### Fase 2 (Media Prioridad - UX)
4. ✅ Agregar `policy_plan` para mostrar tipo de plan
5. ✅ Generar certificado PDF para cada reserva
6. ✅ Mejorar visualización de información de seguro en UI

### Fase 3 (Baja Prioridad - Detalle)
7. ✅ Tabla `insurance_premium_breakdown` para desglose completo
8. ✅ Cobertura 0 km para vehículos nuevos
9. ✅ Plan de pago para pólizas propias (BYOI)

---

## 🔗 Referencias

- **PDF Original**: [iúnigo Póliza Ejemplo v3](https://content.gruposancristobal.com/iunigo/iunigo-poliza-ejemplo-v3.pdf)
- **Sistema Actual**: `database/create-insurance-system.sql`
- **Modelos**: `apps/web/src/app/core/models/insurance.model.ts`
- **Servicio**: `apps/web/src/app/core/services/insurance.service.ts`

---

## ✅ Checklist de Implementación

- [ ] Crear migración SQL con campos faltantes
- [ ] Actualizar modelos TypeScript
- [ ] Actualizar `InsuranceService` para nuevos campos
- [ ] Crear `InsuranceCertificateService` para generar PDFs
- [ ] Agregar sección de información de seguro en `car-detail.page`
- [ ] Agregar tooltips de coberturas con códigos de cláusula
- [ ] Crear componente de badge de plan de seguro
- [ ] Agregar campos `engine_number` y `chassis_number` en formulario de publicación
- [ ] Documentar procesos regulatorios en docs

---

**Última actualización**: 2025-11-03  
**Autor**: Claude Code (análisis de PDF iúnigo)




