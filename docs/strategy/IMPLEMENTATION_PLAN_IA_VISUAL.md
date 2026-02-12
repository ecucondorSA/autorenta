# Plan de Implementación: 9 Features de IA Visual para Autorenta

## Resumen Ejecutivo

Este documento detalla la implementación de 9 nuevas funcionalidades de IA visual para Autorenta, organizadas por prioridad y complejidad.

| # | Feature | Prioridad | Esfuerzo | Modelo IA |
|---|---------|-----------|----------|-----------|
| 1 | Reconocimiento de marca/modelo | Alta | 2-3 días | Gemini 2.5 Flash |
| 2 | Validación de calidad de fotos | Alta | 2 días | Gemini 2.5 Flash |
| 3 | Detección de placas expuestas | Alta | 1-2 días | Gemini 2.5 Flash |
| 4 | Verificación documentos vehiculares | Alta | 3 días | Gemini + OCR |
| 5 | Análisis de condición cosmética | Media | 3-4 días | Gemini 2.5 Flash |
| 6 | Detección avanzada de daños | Media | 4-5 días | Gemini 2.5 Flash |
| 7 | Anti-fraude avanzado | Baja | 5-7 días | Gemini + Vision API |
| 8 | Validación EXIF | Baja | 2 días | JavaScript nativo |
| 9 | Reportes visuales automáticos | Baja | 4-5 días | Gemini + Canvas |

---

## Feature 1: Reconocimiento de Marca/Modelo

### Objetivo
Auto-completar marca/modelo al subir fotos del vehículo y validar que las fotos coincidan con el vehículo registrado.

### Arquitectura

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│ PublishCarV2    │────▶│ recognize-vehicle    │────▶│ Gemini 2.5  │
│ Page            │     │ Edge Function        │     │ Flash       │
└─────────────────┘     └──────────────────────┘     └─────────────┘
        │                        │
        ▼                        ▼
┌─────────────────┐     ┌──────────────────────┐
│ VehicleRecogni- │     │ vehicle_recognition  │
│ tionService     │     │ _logs (tabla)        │
└─────────────────┘     └──────────────────────┘
```

### Edge Function: `recognize-vehicle`

**Ubicación:** `/supabase/functions/recognize-vehicle/index.ts`

```typescript
// Tipos
interface RecognizeVehicleRequest {
  image_url?: string;
  image_base64?: string;
  validate_against?: {
    brand: string;
    model: string;
    year?: number;
    color?: string;
  };
}

interface RecognizeVehicleResponse {
  success: boolean;
  vehicle: {
    brand: string;
    model: string;
    year_range: [number, number]; // ej: [2018, 2022]
    color: string;
    body_type: 'sedan' | 'suv' | 'hatchback' | 'pickup' | 'van' | 'coupe' | 'convertible';
    confidence: number; // 0-100
  };
  validation?: {
    matches: boolean;
    brand_match: boolean;
    model_match: boolean;
    color_match: boolean;
    discrepancies: string[];
  };
  suggestions: Array<{
    brand: string;
    model: string;
    confidence: number;
  }>;
  error?: string;
}
```

**Prompt Gemini:**
```
Eres un experto en identificación de vehículos. Analiza esta imagen y determina:

1. MARCA del vehículo (ej: Toyota, Ford, Chevrolet, Volkswagen, etc.)
2. MODELO específico (ej: Corolla, F-150, Cruze, Golf)
3. RANGO DE AÑOS probable (ej: 2018-2022)
4. COLOR principal del vehículo
5. TIPO DE CARROCERÍA (sedan, suv, hatchback, pickup, van, coupe, convertible)

Si hay múltiples vehículos, analiza el que ocupa mayor área de la imagen.
Si no puedes identificar con certeza, proporciona las 3 opciones más probables.

Responde SOLO en JSON:
{
  "brand": "string",
  "model": "string",
  "year_range": [min, max],
  "color": "string",
  "body_type": "string",
  "confidence": 0-100,
  "alternatives": [{"brand": "", "model": "", "confidence": 0}]
}
```

### Frontend Service: `VehicleRecognitionService`

**Ubicación:** `/apps/web/src/app/core/services/ai/vehicle-recognition.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class VehicleRecognitionService {
  private readonly supabase = inject(SupabaseClientService).getClient();

  readonly isProcessing = signal(false);
  readonly lastResult = signal<RecognizeVehicleResponse | null>(null);
  readonly error = signal<string | null>(null);

  async recognizeFromImage(imageUrl: string): Promise<RecognizeVehicleResponse> {
    this.isProcessing.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.functions.invoke(
        'recognize-vehicle',
        { body: { image_url: imageUrl } }
      );

      if (error) throw error;
      this.lastResult.set(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error reconociendo vehículo';
      this.error.set(message);
      throw err;
    } finally {
      this.isProcessing.set(false);
    }
  }

  async validateVehicle(
    imageUrl: string,
    expected: { brand: string; model: string; color?: string }
  ): Promise<{ matches: boolean; discrepancies: string[] }> {
    const result = await this.recognizeFromImage(imageUrl);
    // Validar coincidencia...
  }
}
```

### Integración en PublishCarV2

```typescript
// En el método de upload de fotos
async onPhotoUploaded(photoUrl: string, index: number) {
  // Solo analizar la primera foto
  if (index !== 0) return;

  const recognition = await this.vehicleRecognition.recognizeFromImage(photoUrl);

  if (recognition.success && recognition.vehicle.confidence > 80) {
    // Auto-completar campos si están vacíos
    if (!this.form.get('brand')?.value) {
      this.form.patchValue({ brand: recognition.vehicle.brand });
    }
    if (!this.form.get('model')?.value) {
      this.form.patchValue({ model: recognition.vehicle.model });
    }
    // Mostrar sugerencia de año
    this.yearSuggestion.set(recognition.vehicle.year_range);
  }
}

// Validación antes de publicar
async validatePhotosMatchVehicle() {
  const brand = this.form.get('brand')?.value;
  const model = this.form.get('model')?.value;

  for (const photo of this.photos()) {
    const validation = await this.vehicleRecognition.validateVehicle(
      photo.url,
      { brand, model }
    );

    if (!validation.matches) {
      this.warnings.push(`Foto ${photo.index}: ${validation.discrepancies.join(', ')}`);
    }
  }
}
```

### Base de Datos

```sql
-- Migración: 20250111_vehicle_recognition_logs.sql
CREATE TABLE vehicle_recognition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID REFERENCES cars(id),
  image_url TEXT NOT NULL,
  recognized_brand TEXT,
  recognized_model TEXT,
  recognized_year_range INT4RANGE,
  recognized_color TEXT,
  confidence SMALLINT CHECK (confidence BETWEEN 0 AND 100),
  validation_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para búsquedas
CREATE INDEX idx_vehicle_recognition_car ON vehicle_recognition_logs(car_id);

-- RLS
ALTER TABLE vehicle_recognition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own car recognition logs"
  ON vehicle_recognition_logs FOR SELECT
  USING (car_id IN (SELECT id FROM cars WHERE owner_id = auth.uid()));
```

---

## Feature 2: Validación de Calidad de Fotos

### Objetivo
Detectar fotos borrosas, mal encuadradas, con ángulos faltantes, o de baja calidad antes de permitir publicación.

### Edge Function: `validate-photo-quality`

**Ubicación:** `/supabase/functions/validate-photo-quality/index.ts`

```typescript
interface PhotoQualityRequest {
  image_url: string;
  expected_subject: 'vehicle_exterior' | 'vehicle_interior' | 'document' | 'damage';
  position?: 'front' | 'rear' | 'left' | 'right' | 'interior' | 'dashboard' | 'trunk';
}

interface PhotoQualityResponse {
  success: boolean;
  quality: {
    score: number; // 0-100
    is_acceptable: boolean; // score >= 70
    issues: PhotoIssue[];
  };
  content: {
    matches_subject: boolean;
    detected_subject: string;
    area_coverage: number; // % del frame ocupado por el sujeto
    position_detected?: string;
  };
  recommendations: string[];
}

interface PhotoIssue {
  type: 'blur' | 'dark' | 'overexposed' | 'cropped' | 'wrong_subject' | 'obstruction' | 'reflection';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: { x: number; y: number; w: number; h: number }; // área afectada
}
```

**Prompt Gemini:**
```
Eres un sistema de control de calidad de imágenes para una plataforma de alquiler de autos.

Analiza esta imagen que debería mostrar: {expected_subject}
Posición esperada: {position}

Evalúa los siguientes aspectos:

1. NITIDEZ: ¿La imagen está enfocada? Detecta blur por movimiento o desenfoque.
2. ILUMINACIÓN: ¿Hay suficiente luz? ¿Hay sobreexposición o subexposición?
3. ENCUADRE: ¿El sujeto principal ocupa suficiente área? ¿Está centrado?
4. OBSTRUCCIONES: ¿Hay objetos bloqueando la vista del vehículo?
5. REFLEJOS: ¿Hay reflejos que impidan ver claramente?
6. CONTENIDO: ¿La imagen muestra lo que se espera?

Responde SOLO en JSON:
{
  "quality_score": 0-100,
  "issues": [
    {"type": "blur|dark|overexposed|cropped|wrong_subject|obstruction|reflection", "severity": "low|medium|high", "description": "..."}
  ],
  "subject_match": true/false,
  "detected_subject": "descripción de lo que se ve",
  "area_coverage_percent": 0-100,
  "detected_position": "front|rear|left|right|interior|...",
  "recommendations": ["sugerencia 1", "sugerencia 2"]
}
```

### Frontend Service: `PhotoQualityService`

```typescript
@Injectable({ providedIn: 'root' })
export class PhotoQualityService {
  private readonly supabase = inject(SupabaseClientService).getClient();

  readonly validatingPhoto = signal<number | null>(null); // índice de foto
  readonly results = signal<Map<number, PhotoQualityResponse>>(new Map());

  async validatePhoto(
    imageUrl: string,
    subject: 'vehicle_exterior' | 'vehicle_interior',
    position?: string
  ): Promise<PhotoQualityResponse> {
    const { data, error } = await this.supabase.functions.invoke(
      'validate-photo-quality',
      { body: { image_url: imageUrl, expected_subject: subject, position } }
    );

    if (error) throw error;
    return data;
  }

  async validateAllPhotos(photos: { url: string; position?: string }[]): Promise<{
    allValid: boolean;
    results: PhotoQualityResponse[];
    blocking: PhotoQualityResponse[];
  }> {
    const results = await Promise.all(
      photos.map(p => this.validatePhoto(p.url, 'vehicle_exterior', p.position))
    );

    const blocking = results.filter(r => !r.quality.is_acceptable);

    return {
      allValid: blocking.length === 0,
      results,
      blocking
    };
  }
}
```

### Integración UI

```typescript
// Componente de preview de foto
@Component({
  template: `
    <div class="photo-preview" [class.has-issues]="hasIssues()">
      <img [src]="photo.url" />

      @if (validating()) {
        <div class="overlay">
          <ion-spinner></ion-spinner>
          <span>Validando calidad...</span>
        </div>
      }

      @if (result()?.quality.issues.length) {
        <div class="issues-badge" [class.warning]="isWarning()" [class.error]="isError()">
          <ion-icon [name]="isError() ? 'alert-circle' : 'warning'"></ion-icon>
          {{ result()!.quality.issues.length }} problemas
        </div>

        <ul class="issues-list">
          @for (issue of result()!.quality.issues; track issue.type) {
            <li [class]="issue.severity">
              {{ issue.description }}
            </li>
          }
        </ul>

        <div class="recommendations">
          @for (rec of result()!.recommendations; track rec) {
            <p>{{ rec }}</p>
          }
        </div>
      }
    </div>
  `
})
export class PhotoPreviewComponent {
  photo = input.required<{ url: string; position?: string }>();

  private readonly qualityService = inject(PhotoQualityService);

  readonly validating = signal(false);
  readonly result = signal<PhotoQualityResponse | null>(null);

  async ngOnInit() {
    this.validating.set(true);
    try {
      const result = await this.qualityService.validatePhoto(
        this.photo().url,
        'vehicle_exterior',
        this.photo().position
      );
      this.result.set(result);
    } finally {
      this.validating.set(false);
    }
  }

  isWarning = computed(() => {
    const score = this.result()?.quality.score ?? 100;
    return score >= 50 && score < 70;
  });

  isError = computed(() => {
    const score = this.result()?.quality.score ?? 100;
    return score < 50;
  });
}
```

---

## Feature 3: Detección de Placas Expuestas

### Objetivo
Detectar y difuminar automáticamente placas de licencia visibles en fotos para proteger privacidad.

### Edge Function: `detect-license-plates`

**Ubicación:** `/supabase/functions/detect-license-plates/index.ts`

```typescript
interface DetectPlatesRequest {
  image_url: string;
  auto_blur?: boolean; // Si true, retorna imagen con placas difuminadas
}

interface DetectPlatesResponse {
  success: boolean;
  plates_detected: number;
  plates: Array<{
    text: string; // Texto OCR de la placa (parcialmente oculto: "ABC-***")
    confidence: number;
    bounding_box: { x: number; y: number; width: number; height: number };
    country?: 'AR' | 'EC' | 'BR' | 'CL' | 'CO' | 'unknown';
  }>;
  blurred_image_url?: string; // Si auto_blur=true
  warning: boolean; // true si hay placas visibles
}
```

**Prompt Gemini:**
```
Analiza esta imagen y detecta TODAS las placas de licencia/patentes de vehículos visibles.

Para cada placa detectada, proporciona:
1. El texto visible (usa *** para ocultar dígitos por privacidad, ej: "ABC-***")
2. La ubicación en la imagen (bounding box como porcentaje del ancho/alto)
3. El país probable según el formato de la placa

Formatos conocidos:
- Argentina: ABC 123 o AB 123 CD
- Ecuador: ABC-1234
- Brasil: ABC-1D23 (Mercosur) o ABC-1234
- Chile: BBBB-12
- Colombia: ABC-123

Responde SOLO en JSON:
{
  "plates_count": número,
  "plates": [
    {
      "text_masked": "ABC-***",
      "bounding_box": {"x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100},
      "country": "AR|EC|BR|CL|CO|unknown",
      "confidence": 0-100
    }
  ]
}
```

### Procesamiento de Blur (Server-side)

```typescript
// En la Edge Function, después de detectar placas:
import { createCanvas, loadImage } from 'https://deno.land/x/canvas/mod.ts';

async function blurPlates(imageUrl: string, plates: Plate[]): Promise<string> {
  const image = await loadImage(imageUrl);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  // Dibujar imagen original
  ctx.drawImage(image, 0, 0);

  for (const plate of plates) {
    const x = (plate.bounding_box.x / 100) * image.width;
    const y = (plate.bounding_box.y / 100) * image.height;
    const w = (plate.bounding_box.width / 100) * image.width;
    const h = (plate.bounding_box.height / 100) * image.height;

    // Extraer región de la placa
    const plateData = ctx.getImageData(x, y, w, h);

    // Aplicar blur gaussiano
    const blurred = applyGaussianBlur(plateData, 15);

    // Dibujar región difuminada
    ctx.putImageData(blurred, x, y);
  }

  // Subir imagen procesada a Storage
  const blob = await canvas.toBlob('image/jpeg', 0.9);
  const path = `processed/${crypto.randomUUID()}.jpg`;
  await supabase.storage.from('car-images').upload(path, blob);

  return supabase.storage.from('car-images').getPublicUrl(path).data.publicUrl;
}
```

### Frontend Service: `PlateDetectionService`

```typescript
@Injectable({ providedIn: 'root' })
export class PlateDetectionService {
  private readonly supabase = inject(SupabaseClientService).getClient();

  async detectAndBlur(imageUrl: string): Promise<{
    hasPlates: boolean;
    originalUrl: string;
    blurredUrl?: string;
    platesCount: number;
  }> {
    const { data, error } = await this.supabase.functions.invoke(
      'detect-license-plates',
      { body: { image_url: imageUrl, auto_blur: true } }
    );

    if (error) throw error;

    return {
      hasPlates: data.plates_detected > 0,
      originalUrl: imageUrl,
      blurredUrl: data.blurred_image_url,
      platesCount: data.plates_detected
    };
  }
}
```

### Flujo de Uso

```typescript
// En PublishCarV2 - después de subir cada foto
async processUploadedPhoto(file: File): Promise<ProcessedPhoto> {
  // 1. Subir foto original
  const originalUrl = await this.uploadPhoto(file);

  // 2. Detectar placas
  const plateResult = await this.plateDetection.detectAndBlur(originalUrl);

  if (plateResult.hasPlates) {
    // Mostrar advertencia
    this.toastService.warning(
      `Se detectó ${plateResult.platesCount} placa(s) visible(s). ` +
      'Se difuminará automáticamente para proteger tu privacidad.'
    );

    // Usar versión difuminada
    return {
      url: plateResult.blurredUrl!,
      originalUrl: originalUrl, // Guardar referencia
      hadPlates: true
    };
  }

  return { url: originalUrl, hadPlates: false };
}
```

---

## Feature 4: Verificación Automática de Documentos Vehiculares

### Objetivo
Validar automáticamente documentos del vehículo (cédula verde, VTV, seguro), detectar vencimientos y datos faltantes.

### Edge Function: `verify-vehicle-document`

**Ubicación:** `/supabase/functions/verify-vehicle-document/index.ts`

```typescript
interface VerifyVehicleDocRequest {
  image_url: string;
  document_type: 'green_card' | 'blue_card' | 'vtv' | 'insurance' | 'title';
  country: 'AR' | 'EC' | 'BR' | 'CL' | 'CO';
  expected_plate?: string; // Para validar que coincida
  expected_owner?: string; // Para validar titularidad
}

interface VerifyVehicleDocResponse {
  success: boolean;
  document: {
    type: string;
    is_valid: boolean;
    is_expired: boolean;
    days_until_expiry?: number;
    extracted_data: {
      plate?: string;
      owner_name?: string;
      vehicle_brand?: string;
      vehicle_model?: string;
      vehicle_year?: number;
      chassis_number?: string;
      engine_number?: string;
      issue_date?: string;
      expiry_date?: string;
      // Específicos VTV
      vtv_result?: 'approved' | 'conditional' | 'rejected';
      // Específicos Seguro
      policy_number?: string;
      coverage_type?: string;
      insurer?: string;
    };
    confidence: number;
  };
  validation: {
    is_legible: boolean;
    plate_matches?: boolean;
    owner_matches?: boolean;
    all_fields_present: boolean;
    missing_fields: string[];
  };
  fraud_check: {
    is_suspicious: boolean;
    indicators: string[];
    recommendation: 'approve' | 'manual_review' | 'reject';
  };
  warnings: string[];
}
```

**Prompts por tipo de documento:**

```typescript
const PROMPTS = {
  green_card: {
    AR: `Analiza esta CÉDULA VERDE (Título del Automotor) de Argentina.

    Extrae los siguientes campos:
    - Dominio/Patente (formato: ABC123 o AB123CD)
    - Titular (nombre completo)
    - Marca y Modelo del vehículo
    - Año de fabricación
    - Número de motor
    - Número de chasis
    - Fecha de emisión

    Verifica:
    - ¿El documento es legible?
    - ¿Tiene todos los campos requeridos?
    - ¿Hay signos de alteración o falsificación?
    - ¿Los hologramas/sellos son visibles?

    Responde en JSON...`,

    EC: `Analiza esta MATRÍCULA VEHICULAR de Ecuador...`
  },

  vtv: {
    AR: `Analiza este certificado de VTV (Verificación Técnica Vehicular) de Argentina.

    Extrae:
    - Dominio/Patente
    - Resultado: APROBADO / CONDICIONAL / RECHAZADO
    - Fecha de vencimiento
    - Número de oblea
    - Planta verificadora

    IMPORTANTE: Verifica si está VENCIDO comparando la fecha de vencimiento.

    Responde en JSON...`
  },

  insurance: {
    AR: `Analiza esta PÓLIZA DE SEGURO automotor de Argentina.

    Extrae:
    - Compañía aseguradora
    - Número de póliza
    - Dominio/Patente asegurado
    - Tipo de cobertura (RC, Terceros Completo, Todo Riesgo)
    - Vigencia desde/hasta
    - Tomador/Asegurado

    IMPORTANTE: Verifica si la póliza está VIGENTE.

    Responde en JSON...`
  }
};
```

### Frontend Service: `VehicleDocumentVerificationService`

```typescript
@Injectable({ providedIn: 'root' })
export class VehicleDocumentVerificationService {
  private readonly supabase = inject(SupabaseClientService).getClient();

  readonly verificationStatus = signal<Map<string, VerifyVehicleDocResponse>>(new Map());

  async verifyDocument(
    imageUrl: string,
    type: 'green_card' | 'vtv' | 'insurance',
    options?: { expectedPlate?: string; expectedOwner?: string }
  ): Promise<VerifyVehicleDocResponse> {
    const { data, error } = await this.supabase.functions.invoke(
      'verify-vehicle-document',
      {
        body: {
          image_url: imageUrl,
          document_type: type,
          country: 'AR', // O detectar del usuario
          expected_plate: options?.expectedPlate,
          expected_owner: options?.expectedOwner
        }
      }
    );

    if (error) throw error;

    // Guardar resultado
    this.verificationStatus.update(map => {
      map.set(type, data);
      return new Map(map);
    });

    return data;
  }

  async verifyAllDocuments(
    documents: Array<{ type: string; url: string }>,
    vehicle: { plate: string; owner: string }
  ): Promise<{
    allValid: boolean;
    expired: string[];
    missing: string[];
    suspicious: string[];
  }> {
    const results = await Promise.all(
      documents.map(d => this.verifyDocument(d.url, d.type as any, {
        expectedPlate: vehicle.plate,
        expectedOwner: vehicle.owner
      }))
    );

    return {
      allValid: results.every(r => r.document.is_valid && !r.document.is_expired),
      expired: results.filter(r => r.document.is_expired).map(r => r.document.type),
      missing: results.flatMap(r => r.validation.missing_fields),
      suspicious: results.filter(r => r.fraud_check.is_suspicious).map(r => r.document.type)
    };
  }
}
```

### Base de Datos

```sql
-- Agregar campos de verificación IA a vehicle_documents
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS ai_verified_at TIMESTAMPTZ;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS ai_verification_result JSONB;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS ai_expiry_date DATE;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS ai_extracted_plate TEXT;
ALTER TABLE vehicle_documents ADD COLUMN IF NOT EXISTS ai_fraud_score SMALLINT;

-- Índice para documentos próximos a vencer
CREATE INDEX idx_vehicle_docs_expiry ON vehicle_documents(ai_expiry_date)
WHERE ai_expiry_date IS NOT NULL;

-- Función para notificar documentos por vencer
CREATE OR REPLACE FUNCTION notify_expiring_documents()
RETURNS void AS $$
BEGIN
  -- Notificar documentos que vencen en 30 días
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    c.owner_id,
    'document_expiring',
    'Documento próximo a vencer',
    format('Tu %s vence en %s días', vd.document_type,
           (vd.ai_expiry_date - CURRENT_DATE)),
    jsonb_build_object('car_id', c.id, 'document_type', vd.document_type)
  FROM vehicle_documents vd
  JOIN cars c ON c.id = vd.car_id
  WHERE vd.ai_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = c.owner_id
        AND n.type = 'document_expiring'
        AND n.data->>'car_id' = c.id::text
        AND n.data->>'document_type' = vd.document_type
        AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
    );
END;
$$ LANGUAGE plpgsql;
```

---

## Feature 5: Análisis de Condición Cosmética

### Objetivo
Generar un score de condición (1-5 estrellas) basado en análisis visual del estado del vehículo.

### Edge Function: `analyze-vehicle-condition`

**Ubicación:** `/supabase/functions/analyze-vehicle-condition/index.ts`

```typescript
interface AnalyzeConditionRequest {
  image_urls: string[]; // Múltiples fotos del vehículo
  vehicle_info?: {
    year: number;
    brand: string;
    model: string;
    declared_km?: number;
  };
}

interface AnalyzeConditionResponse {
  success: boolean;
  condition: {
    overall_score: number; // 1.0 - 5.0
    stars: 1 | 2 | 3 | 4 | 5; // Redondeado
    category: 'excellent' | 'very_good' | 'good' | 'fair' | 'poor';
    description: string;
  };
  breakdown: {
    exterior: {
      score: number;
      paint_condition: 'excellent' | 'good' | 'fair' | 'poor';
      visible_damage: boolean;
      rust_detected: boolean;
      notes: string[];
    };
    interior?: {
      score: number;
      cleanliness: 'excellent' | 'good' | 'fair' | 'poor';
      wear_level: 'minimal' | 'normal' | 'heavy';
      notes: string[];
    };
    wheels: {
      score: number;
      tire_condition: 'excellent' | 'good' | 'fair' | 'poor';
      rim_condition: 'excellent' | 'good' | 'fair' | 'poor';
      notes: string[];
    };
  };
  issues_found: Array<{
    category: string;
    description: string;
    severity: 'cosmetic' | 'minor' | 'moderate' | 'major';
    estimated_repair_cost?: { min: number; max: number; currency: 'USD' };
    location?: string;
  }>;
  recommendations: string[];
  age_adjusted_score?: number; // Score ajustado por antigüedad del vehículo
}
```

**Prompt Gemini:**
```
Eres un tasador profesional de vehículos usados. Analiza estas {N} imágenes del vehículo y evalúa su condición general.

Información del vehículo:
- Año: {year}
- Marca: {brand}
- Modelo: {model}
- Kilometraje declarado: {km} km

CRITERIOS DE EVALUACIÓN:

EXTERIOR (40% del score):
- Estado de la pintura (brillo, descoloramiento, rayones)
- Abolladuras o golpes visibles
- Óxido o corrosión
- Estado de parabrisas y vidrios
- Faros y luces

INTERIOR (30% del score):
- Limpieza general
- Estado de asientos (manchas, roturas, desgaste)
- Tablero y controles
- Alfombras y tapizado

RUEDAS (15% del score):
- Profundidad de neumáticos (visual)
- Estado de aros/llantas
- Desgaste uniforme

COHERENCIA CON EDAD (15% del score):
- ¿El desgaste es coherente con el año del vehículo?
- ¿El kilometraje declarado coincide con el desgaste visible?

ESCALA DE PUNTUACIÓN:
5 estrellas (4.5-5.0): Excelente - Como nuevo, sin defectos visibles
4 estrellas (3.5-4.4): Muy bueno - Mínimos signos de uso normal
3 estrellas (2.5-3.4): Bueno - Uso normal, algunos defectos menores
2 estrellas (1.5-2.4): Regular - Desgaste notable, necesita atención
1 estrella (1.0-1.4): Malo - Daños significativos, necesita reparación

Responde SOLO en JSON con la estructura especificada.
```

### Frontend Service: `VehicleConditionService`

```typescript
@Injectable({ providedIn: 'root' })
export class VehicleConditionService {
  private readonly supabase = inject(SupabaseClientService).getClient();

  readonly analyzing = signal(false);
  readonly conditionResult = signal<AnalyzeConditionResponse | null>(null);

  async analyzeCondition(
    imageUrls: string[],
    vehicleInfo?: { year: number; brand: string; model: string; km?: number }
  ): Promise<AnalyzeConditionResponse> {
    if (imageUrls.length < 3) {
      throw new Error('Se requieren al menos 3 fotos para analizar la condición');
    }

    this.analyzing.set(true);

    try {
      const { data, error } = await this.supabase.functions.invoke(
        'analyze-vehicle-condition',
        {
          body: {
            image_urls: imageUrls,
            vehicle_info: vehicleInfo
          }
        }
      );

      if (error) throw error;
      this.conditionResult.set(data);
      return data;
    } finally {
      this.analyzing.set(false);
    }
  }
}
```

### Componente de Visualización

```typescript
@Component({
  selector: 'app-condition-badge',
  template: `
    <div class="condition-badge" [class]="condition().category">
      <div class="stars">
        @for (star of starsArray(); track $index) {
          <ion-icon
            [name]="star === 'full' ? 'star' : star === 'half' ? 'star-half' : 'star-outline'"
            [class.filled]="star !== 'empty'"
          ></ion-icon>
        }
      </div>
      <span class="score">{{ condition().overall_score.toFixed(1) }}</span>
      <span class="label">{{ categoryLabel() }}</span>
    </div>

    @if (showBreakdown()) {
      <div class="breakdown">
        <div class="breakdown-item">
          <span>Exterior</span>
          <ion-progress-bar [value]="breakdown().exterior.score / 5"></ion-progress-bar>
        </div>
        <div class="breakdown-item">
          <span>Interior</span>
          <ion-progress-bar [value]="(breakdown().interior?.score ?? 0) / 5"></ion-progress-bar>
        </div>
        <div class="breakdown-item">
          <span>Ruedas</span>
          <ion-progress-bar [value]="breakdown().wheels.score / 5"></ion-progress-bar>
        </div>
      </div>
    }
  `
})
export class ConditionBadgeComponent {
  condition = input.required<AnalyzeConditionResponse['condition']>();
  breakdown = input.required<AnalyzeConditionResponse['breakdown']>();
  showBreakdown = input(false);

  starsArray = computed(() => {
    const score = this.condition().overall_score;
    const stars: ('full' | 'half' | 'empty')[] = [];

    for (let i = 1; i <= 5; i++) {
      if (score >= i) stars.push('full');
      else if (score >= i - 0.5) stars.push('half');
      else stars.push('empty');
    }

    return stars;
  });

  categoryLabel = computed(() => {
    const labels = {
      excellent: 'Excelente',
      very_good: 'Muy Bueno',
      good: 'Bueno',
      fair: 'Regular',
      poor: 'Necesita Atención'
    };
    return labels[this.condition().category];
  });
}
```

### Integración en Publicación

```typescript
// PublishCarV2Page
async onAllPhotosUploaded() {
  const photoUrls = this.photos().map(p => p.url);

  // Analizar condición automáticamente
  const condition = await this.conditionService.analyzeCondition(
    photoUrls,
    {
      year: this.form.get('year')?.value,
      brand: this.form.get('brand')?.value,
      model: this.form.get('model')?.value,
      km: this.form.get('kilometers')?.value
    }
  );

  // Guardar score en el formulario
  this.form.patchValue({
    condition_score: condition.condition.overall_score,
    condition_category: condition.condition.category
  });

  // Mostrar resultado al usuario
  if (condition.issues_found.length > 0) {
    this.showConditionModal(condition);
  }
}
```

### Base de Datos

```sql
-- Agregar campos de condición a cars
ALTER TABLE cars ADD COLUMN IF NOT EXISTS condition_score DECIMAL(2,1);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS condition_category TEXT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS condition_analysis JSONB;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS condition_analyzed_at TIMESTAMPTZ;

-- Índice para búsqueda por condición
CREATE INDEX idx_cars_condition ON cars(condition_score DESC)
WHERE condition_score IS NOT NULL;

-- Función para pricing dinámico basado en condición
CREATE OR REPLACE FUNCTION calculate_suggested_price(
  base_price DECIMAL,
  condition_score DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  -- Ajuste: ±20% basado en condición
  -- Score 5.0 = +10%, Score 3.0 = 0%, Score 1.0 = -10%
  RETURN base_price * (1 + ((condition_score - 3) * 0.05));
END;
$$ LANGUAGE plpgsql;
```

---

## Feature 6: Detección Avanzada de Daños

### Objetivo
Mejorar la detección de daños existente con:
- Análisis frame-by-frame de videos
- Detección de grietas en parabrisas
- Estado de neumáticos
- Daños interiores
- Timeline de daños

### Edge Function: `analyze-damage-advanced`

**Ubicación:** `/supabase/functions/analyze-damage-advanced/index.ts`

```typescript
interface AdvancedDamageRequest {
  frames: Array<{
    url: string;
    timestamp_ms: number;
    area?: string;
  }>;
  booking_id: string;
  stage: 'check_in' | 'check_out';
  previous_damages?: DamageRecord[]; // Daños conocidos previamente
  compare_with_stage?: 'check_in'; // Para check_out, comparar con check_in
}

interface AdvancedDamageResponse {
  success: boolean;
  analysis: {
    total_frames_analyzed: number;
    areas_covered: string[];
    areas_missing: string[];
    coverage_score: number; // % de áreas cubiertas
  };
  damages: Array<{
    id: string;
    type: DamageType;
    severity: 'cosmetic' | 'minor' | 'moderate' | 'severe';
    location: {
      area: string;
      description: string;
      frame_index: number;
    };
    dimensions?: {
      length_cm?: number;
      width_cm?: number;
      depth_mm?: number;
    };
    is_new: boolean; // true si no existía en previous_damages
    confidence: number;
    estimated_repair: {
      min_usd: number;
      max_usd: number;
      repair_type: 'touch_up' | 'paint' | 'replace' | 'mechanical';
    };
    evidence: {
      frame_url: string;
      bounding_box: BoundingBox;
    };
  }>;
  special_checks: {
    windshield: {
      analyzed: boolean;
      cracks_detected: boolean;
      crack_details?: Array<{
        type: 'chip' | 'crack' | 'star' | 'bullseye';
        size_cm: number;
        location: 'driver_view' | 'passenger' | 'edge';
        repairable: boolean;
      }>;
    };
    tires: {
      analyzed: boolean;
      issues: Array<{
        position: 'front_left' | 'front_right' | 'rear_left' | 'rear_right';
        tread_depth: 'good' | 'fair' | 'low' | 'critical';
        visible_damage: boolean;
        notes: string;
      }>;
    };
    interior: {
      analyzed: boolean;
      issues: Array<{
        item: 'seat' | 'dashboard' | 'carpet' | 'headliner' | 'door_panel';
        damage_type: 'stain' | 'tear' | 'burn' | 'scratch' | 'crack';
        severity: string;
        notes: string;
      }>;
    };
  };
  timeline?: Array<{
    damage_id: string;
    first_seen: 'check_in' | 'check_out';
    likely_cause: string;
  }>;
  summary: string;
}

type DamageType =
  | 'scratch' | 'dent' | 'crack' | 'chip'
  | 'rust' | 'paint_damage' | 'broken_part'
  | 'tire_damage' | 'interior_damage' | 'glass_damage';
```

**Prompt especializado para parabrisas:**
```
ANÁLISIS DE PARABRISAS

Examina cuidadosamente el parabrisas/vidrios del vehículo en esta imagen.

Detecta CUALQUIER tipo de daño en el vidrio:

1. CHIPS (impactos pequeños < 3cm):
   - Tipo: bullseye (ojo de buey), star (estrella), half-moon (media luna)
   - ¿Está en el campo de visión del conductor?

2. GRIETAS:
   - Longitud estimada en cm
   - ¿Se origina desde un chip?
   - ¿Llega hasta el borde del vidrio?

3. RAYADURAS:
   - Profundidad: superficial vs profunda
   - ¿Afecta visibilidad?

CRITERIO DE REPARABILIDAD:
- Chip < 2cm y fuera de zona del conductor: REPARABLE
- Grieta < 15cm que no llega al borde: POSIBLEMENTE REPARABLE
- Cualquier daño en zona del conductor o grieta > 15cm: REQUIERE REEMPLAZO

Responde en JSON con el formato especificado.
```

### Comparación Timeline

```typescript
// En el servicio frontend
async compareCheckInCheckOut(
  bookingId: string
): Promise<{
  newDamages: Damage[];
  existingDamages: Damage[];
  timeline: TimelineEvent[];
}> {
  // Obtener análisis de check-in
  const checkInAnalysis = await this.getAnalysis(bookingId, 'check_in');

  // Obtener análisis de check-out
  const checkOutAnalysis = await this.getAnalysis(bookingId, 'check_out');

  // Comparar y detectar nuevos daños
  const newDamages = checkOutAnalysis.damages.filter(d => d.is_new);
  const existingDamages = checkOutAnalysis.damages.filter(d => !d.is_new);

  // Generar timeline
  const timeline = this.generateTimeline(checkInAnalysis, checkOutAnalysis);

  return { newDamages, existingDamages, timeline };
}

private generateTimeline(checkIn: Analysis, checkOut: Analysis): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Agregar daños de check-in
  for (const damage of checkIn.damages) {
    events.push({
      damage_id: damage.id,
      timestamp: 'check_in',
      type: 'existing',
      description: `Daño existente: ${damage.type} en ${damage.location.area}`
    });
  }

  // Agregar daños nuevos de check-out
  for (const damage of checkOut.damages.filter(d => d.is_new)) {
    events.push({
      damage_id: damage.id,
      timestamp: 'check_out',
      type: 'new',
      description: `Nuevo daño detectado: ${damage.type} en ${damage.location.area}`,
      likely_cause: this.inferCause(damage)
    });
  }

  return events;
}
```

### UI para Comparación

```typescript
@Component({
  selector: 'app-damage-comparison',
  template: `
    <div class="comparison-view">
      <!-- Vista lado a lado -->
      <div class="images-container">
        <div class="image-panel check-in">
          <h4>Check-in</h4>
          <img [src]="checkInImage()" />
          @for (damage of existingDamages(); track damage.id) {
            <div
              class="damage-marker existing"
              [style.left.%]="damage.evidence.bounding_box.x"
              [style.top.%]="damage.evidence.bounding_box.y"
            >
              <ion-icon name="alert-circle"></ion-icon>
            </div>
          }
        </div>

        <div class="image-panel check-out">
          <h4>Check-out</h4>
          <img [src]="checkOutImage()" />
          @for (damage of newDamages(); track damage.id) {
            <div
              class="damage-marker new"
              [style.left.%]="damage.evidence.bounding_box.x"
              [style.top.%]="damage.evidence.bounding_box.y"
            >
              <ion-icon name="warning" color="danger"></ion-icon>
            </div>
          }
        </div>
      </div>

      <!-- Timeline -->
      <div class="timeline">
        @for (event of timeline(); track event.damage_id) {
          <div class="timeline-event" [class]="event.type">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <span class="time">{{ event.timestamp }}</span>
              <p>{{ event.description }}</p>
              @if (event.likely_cause) {
                <small>Causa probable: {{ event.likely_cause }}</small>
              }
            </div>
          </div>
        }
      </div>

      <!-- Resumen de costos -->
      <div class="cost-summary">
        <h4>Resumen de Daños Nuevos</h4>
        <table>
          <thead>
            <tr>
              <th>Daño</th>
              <th>Severidad</th>
              <th>Costo Est.</th>
            </tr>
          </thead>
          <tbody>
            @for (damage of newDamages(); track damage.id) {
              <tr>
                <td>{{ damage.type | damageTypeLabel }}</td>
                <td>{{ damage.severity }}</td>
                <td>{{ damage.estimated_repair.min_usd | currency }}-{{ damage.estimated_repair.max_usd | currency }}</td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2"><strong>Total Estimado</strong></td>
              <td><strong>{{ totalCost() | currency }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `
})
export class DamageComparisonComponent {
  bookingId = input.required<string>();

  private readonly damageService = inject(AdvancedDamageService);

  readonly comparison = toSignal(
    toObservable(this.bookingId).pipe(
      switchMap(id => this.damageService.compareCheckInCheckOut(id))
    )
  );

  newDamages = computed(() => this.comparison()?.newDamages ?? []);
  existingDamages = computed(() => this.comparison()?.existingDamages ?? []);
  timeline = computed(() => this.comparison()?.timeline ?? []);

  totalCost = computed(() => {
    return this.newDamages().reduce((sum, d) => {
      return sum + (d.estimated_repair.min_usd + d.estimated_repair.max_usd) / 2;
    }, 0);
  });
}
```

---

## Feature 7: Anti-Fraude Avanzado

### Objetivo
Detectar intentos de fraude:
- Autos clonados/repintados
- Fotos de otros vehículos
- Inconsistencias en documentos
- Patrones sospechosos

### Edge Function: `fraud-detection`

**Ubicación:** `/supabase/functions/fraud-detection/index.ts`

```typescript
interface FraudDetectionRequest {
  car_id: string;
  check_type: 'full' | 'photos' | 'documents' | 'history';
  data: {
    photos?: string[];
    documents?: Array<{ type: string; url: string }>;
    declared_info?: {
      plate: string;
      brand: string;
      model: string;
      year: number;
      color: string;
      chassis?: string;
    };
  };
}

interface FraudDetectionResponse {
  success: boolean;
  risk_score: number; // 0-100, mayor = más riesgo
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  checks: {
    photo_consistency: {
      passed: boolean;
      issues: Array<{
        type: 'different_vehicle' | 'edited_image' | 'stock_photo' | 'duplicate';
        description: string;
        evidence: string;
        confidence: number;
      }>;
    };
    document_authenticity: {
      passed: boolean;
      issues: Array<{
        document: string;
        type: 'tampering' | 'expired' | 'mismatch' | 'fake';
        description: string;
        confidence: number;
      }>;
    };
    data_consistency: {
      passed: boolean;
      issues: Array<{
        field: string;
        declared: string;
        detected: string;
        type: 'mismatch';
      }>;
    };
    history_check: {
      passed: boolean;
      issues: Array<{
        type: 'duplicate_listing' | 'banned_user' | 'reported_vehicle';
        description: string;
      }>;
    };
  };
  recommendation: 'approve' | 'manual_review' | 'reject';
  manual_review_reasons?: string[];
  auto_reject_reasons?: string[];
}
```

**Checks implementados:**

```typescript
// 1. Consistencia de fotos
async function checkPhotoConsistency(photos: string[]): Promise<CheckResult> {
  const checks = [];

  // Verificar que todas las fotos sean del mismo vehículo
  for (let i = 1; i < photos.length; i++) {
    const comparison = await compareVehicles(photos[0], photos[i]);
    if (!comparison.sameVehicle) {
      checks.push({
        type: 'different_vehicle',
        description: `Foto ${i + 1} parece ser de un vehículo diferente`,
        confidence: comparison.confidence
      });
    }
  }

  // Detectar fotos de stock/internet
  for (const photo of photos) {
    const isStock = await detectStockPhoto(photo);
    if (isStock.detected) {
      checks.push({
        type: 'stock_photo',
        description: 'Esta imagen parece ser de internet/stock',
        evidence: isStock.source,
        confidence: isStock.confidence
      });
    }
  }

  // Detectar edición/photoshop
  for (const photo of photos) {
    const isEdited = await detectImageManipulation(photo);
    if (isEdited.detected) {
      checks.push({
        type: 'edited_image',
        description: 'Esta imagen muestra signos de edición digital',
        evidence: isEdited.indicators.join(', '),
        confidence: isEdited.confidence
      });
    }
  }

  return {
    passed: checks.length === 0,
    issues: checks
  };
}

// 2. Autenticidad de documentos
async function checkDocumentAuthenticity(documents: Document[]): Promise<CheckResult> {
  const checks = [];

  for (const doc of documents) {
    // Analizar con Gemini Vision
    const analysis = await analyzeDocument(doc);

    // Verificar manipulación
    if (analysis.tampering.detected) {
      checks.push({
        document: doc.type,
        type: 'tampering',
        description: analysis.tampering.description,
        confidence: analysis.tampering.confidence
      });
    }

    // Verificar que no esté vencido
    if (analysis.expiry_date && new Date(analysis.expiry_date) < new Date()) {
      checks.push({
        document: doc.type,
        type: 'expired',
        description: `Documento vencido el ${analysis.expiry_date}`,
        confidence: 100
      });
    }
  }

  return {
    passed: checks.filter(c => c.type !== 'expired').length === 0,
    issues: checks
  };
}

// 3. Consistencia de datos
async function checkDataConsistency(
  declared: DeclaredInfo,
  photos: string[],
  documents: Document[]
): Promise<CheckResult> {
  const checks = [];

  // Reconocer vehículo en fotos
  const recognized = await recognizeVehicle(photos[0]);

  // Comparar marca
  if (recognized.brand.toLowerCase() !== declared.brand.toLowerCase()) {
    checks.push({
      field: 'brand',
      declared: declared.brand,
      detected: recognized.brand,
      type: 'mismatch'
    });
  }

  // Comparar modelo
  if (!recognized.model.toLowerCase().includes(declared.model.toLowerCase())) {
    checks.push({
      field: 'model',
      declared: declared.model,
      detected: recognized.model,
      type: 'mismatch'
    });
  }

  // Comparar color
  if (recognized.color.toLowerCase() !== declared.color.toLowerCase()) {
    checks.push({
      field: 'color',
      declared: declared.color,
      detected: recognized.color,
      type: 'mismatch'
    });
  }

  // Comparar patente en documentos vs fotos (si visible)
  // ...

  return {
    passed: checks.length === 0,
    issues: checks
  };
}

// 4. Verificación de historial
async function checkHistory(
  plate: string,
  ownerId: string
): Promise<CheckResult> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const checks = [];

  // Verificar listados duplicados
  const { data: existingCars } = await supabase
    .from('cars')
    .select('id, owner_id')
    .eq('plate', plate)
    .neq('owner_id', ownerId);

  if (existingCars?.length > 0) {
    checks.push({
      type: 'duplicate_listing',
      description: 'Este vehículo ya está registrado por otro usuario'
    });
  }

  // Verificar usuario baneado
  const { data: user } = await supabase
    .from('users')
    .select('is_banned, ban_reason')
    .eq('id', ownerId)
    .single();

  if (user?.is_banned) {
    checks.push({
      type: 'banned_user',
      description: `Usuario baneado: ${user.ban_reason}`
    });
  }

  // Verificar vehículo reportado
  const { data: reports } = await supabase
    .from('vehicle_reports')
    .select('report_type, description')
    .eq('plate', plate)
    .eq('status', 'verified');

  if (reports?.length > 0) {
    checks.push({
      type: 'reported_vehicle',
      description: `Vehículo reportado: ${reports[0].report_type}`
    });
  }

  return {
    passed: checks.length === 0,
    issues: checks
  };
}
```

### Scoring de Riesgo

```typescript
function calculateRiskScore(checks: AllChecks): number {
  let score = 0;
  const weights = {
    photo_consistency: 30,
    document_authenticity: 35,
    data_consistency: 20,
    history_check: 15
  };

  // Photo consistency
  if (!checks.photo_consistency.passed) {
    const severity = checks.photo_consistency.issues.reduce((max, issue) => {
      const severities = { different_vehicle: 100, stock_photo: 90, edited_image: 70, duplicate: 50 };
      return Math.max(max, severities[issue.type] || 50);
    }, 0);
    score += (weights.photo_consistency * severity) / 100;
  }

  // Document authenticity
  if (!checks.document_authenticity.passed) {
    const severity = checks.document_authenticity.issues.reduce((max, issue) => {
      const severities = { fake: 100, tampering: 90, mismatch: 70, expired: 40 };
      return Math.max(max, severities[issue.type] || 50);
    }, 0);
    score += (weights.document_authenticity * severity) / 100;
  }

  // Data consistency
  if (!checks.data_consistency.passed) {
    score += weights.data_consistency * (checks.data_consistency.issues.length / 5);
  }

  // History check
  if (!checks.history_check.passed) {
    const severity = checks.history_check.issues.reduce((max, issue) => {
      const severities = { banned_user: 100, reported_vehicle: 90, duplicate_listing: 70 };
      return Math.max(max, severities[issue.type] || 50);
    }, 0);
    score += (weights.history_check * severity) / 100;
  }

  return Math.min(100, Math.round(score));
}

function getRiskLevel(score: number): string {
  if (score < 20) return 'low';
  if (score < 50) return 'medium';
  if (score < 80) return 'high';
  return 'critical';
}

function getRecommendation(score: number, checks: AllChecks): string {
  // Auto-reject si hay issues críticos
  if (checks.history_check.issues.some(i => i.type === 'banned_user')) {
    return 'reject';
  }
  if (checks.photo_consistency.issues.some(i => i.type === 'different_vehicle' && i.confidence > 90)) {
    return 'reject';
  }

  // Manual review para riesgo alto
  if (score >= 50) return 'manual_review';

  // Aprobar si riesgo bajo
  return 'approve';
}
```

### Integración en Flujo de Publicación

```typescript
// Hook después de completar el formulario de publicación
async validateBeforePublish(carData: CarFormData): Promise<ValidationResult> {
  const fraudCheck = await this.fraudDetection.check({
    check_type: 'full',
    data: {
      photos: carData.photos.map(p => p.url),
      documents: carData.documents,
      declared_info: {
        plate: carData.plate,
        brand: carData.brand,
        model: carData.model,
        year: carData.year,
        color: carData.color
      }
    }
  });

  if (fraudCheck.recommendation === 'reject') {
    return {
      canPublish: false,
      message: 'No se puede publicar este vehículo.',
      reasons: fraudCheck.auto_reject_reasons
    };
  }

  if (fraudCheck.recommendation === 'manual_review') {
    return {
      canPublish: true,
      requiresReview: true,
      message: 'Tu publicación será revisada antes de ser visible.',
      reasons: fraudCheck.manual_review_reasons
    };
  }

  return { canPublish: true, requiresReview: false };
}
```

---

## Feature 8: Validación EXIF

### Objetivo
Extraer y validar metadatos EXIF de fotos para verificar ubicación y fecha.

### Implementación (Frontend - sin Edge Function)

```typescript
// /apps/web/src/app/core/services/validation/exif-validation.service.ts

import ExifReader from 'exifreader';

@Injectable({ providedIn: 'root' })
export class ExifValidationService {

  async extractExif(file: File): Promise<ExifData | null> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const tags = ExifReader.load(arrayBuffer);

      return {
        datetime: this.parseDateTime(tags),
        location: this.parseLocation(tags),
        device: this.parseDevice(tags),
        isEdited: this.detectEditing(tags)
      };
    } catch {
      return null; // No EXIF data
    }
  }

  private parseDateTime(tags: ExifReader.Tags): Date | null {
    const dateStr = tags['DateTimeOriginal']?.description
                 || tags['DateTime']?.description;

    if (!dateStr) return null;

    // Formato EXIF: "2024:01:15 14:30:00"
    const [date, time] = dateStr.split(' ');
    const [year, month, day] = date.split(':').map(Number);
    const [hour, min, sec] = time.split(':').map(Number);

    return new Date(year, month - 1, day, hour, min, sec);
  }

  private parseLocation(tags: ExifReader.Tags): GeoLocation | null {
    const lat = tags['GPSLatitude'];
    const lon = tags['GPSLongitude'];
    const latRef = tags['GPSLatitudeRef']?.value;
    const lonRef = tags['GPSLongitudeRef']?.value;

    if (!lat || !lon) return null;

    let latitude = this.convertDMSToDecimal(lat.value);
    let longitude = this.convertDMSToDecimal(lon.value);

    if (latRef === 'S') latitude *= -1;
    if (lonRef === 'W') longitude *= -1;

    return { latitude, longitude };
  }

  private convertDMSToDecimal(dms: number[][]): number {
    const [degrees, minutes, seconds] = dms.map(([n, d]) => n / d);
    return degrees + minutes / 60 + seconds / 3600;
  }

  private parseDevice(tags: ExifReader.Tags): DeviceInfo {
    return {
      make: tags['Make']?.description || null,
      model: tags['Model']?.description || null,
      software: tags['Software']?.description || null
    };
  }

  private detectEditing(tags: ExifReader.Tags): EditingIndicators {
    const software = tags['Software']?.description?.toLowerCase() || '';

    return {
      editedWithPhotoshop: software.includes('photoshop'),
      editedWithLightroom: software.includes('lightroom'),
      hasEditHistory: !!tags['HistoryWhen'],
      softwareUsed: tags['Software']?.description || null
    };
  }

  async validatePhoto(
    file: File,
    expected: {
      location?: { lat: number; lon: number; radiusKm: number };
      dateRange?: { from: Date; to: Date };
    }
  ): Promise<ExifValidationResult> {
    const exif = await this.extractExif(file);

    if (!exif) {
      return {
        hasExif: false,
        warnings: ['La foto no contiene metadatos EXIF']
      };
    }

    const warnings: string[] = [];
    const errors: string[] = [];

    // Validar ubicación
    if (expected.location && exif.location) {
      const distance = this.calculateDistance(
        exif.location,
        { latitude: expected.location.lat, longitude: expected.location.lon }
      );

      if (distance > expected.location.radiusKm) {
        warnings.push(
          `La foto fue tomada a ${distance.toFixed(1)}km del lugar esperado`
        );
      }
    }

    // Validar fecha
    if (expected.dateRange && exif.datetime) {
      if (exif.datetime < expected.dateRange.from || exif.datetime > expected.dateRange.to) {
        warnings.push(
          `La foto fue tomada el ${exif.datetime.toLocaleDateString()}, fuera del rango esperado`
        );
      }
    }

    // Detectar edición
    if (exif.isEdited.editedWithPhotoshop || exif.isEdited.editedWithLightroom) {
      warnings.push(
        `La foto fue editada con ${exif.isEdited.softwareUsed}`
      );
    }

    return {
      hasExif: true,
      exif,
      warnings,
      errors,
      isValid: errors.length === 0
    };
  }

  private calculateDistance(p1: GeoLocation, p2: GeoLocation): number {
    // Fórmula de Haversine
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(p2.latitude - p1.latitude);
    const dLon = this.toRad(p2.longitude - p1.longitude);

    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(this.toRad(p1.latitude)) *
              Math.cos(this.toRad(p2.latitude)) *
              Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

// Tipos
interface ExifData {
  datetime: Date | null;
  location: GeoLocation | null;
  device: DeviceInfo;
  isEdited: EditingIndicators;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
}

interface DeviceInfo {
  make: string | null;
  model: string | null;
  software: string | null;
}

interface EditingIndicators {
  editedWithPhotoshop: boolean;
  editedWithLightroom: boolean;
  hasEditHistory: boolean;
  softwareUsed: string | null;
}

interface ExifValidationResult {
  hasExif: boolean;
  exif?: ExifData;
  warnings: string[];
  errors: string[];
  isValid?: boolean;
}
```

### Uso en Inspecciones

```typescript
// Durante el check-in/check-out
async validateInspectionPhotos(
  photos: File[],
  booking: Booking
): Promise<ValidationResult> {
  const results = await Promise.all(
    photos.map(photo => this.exifValidation.validatePhoto(photo, {
      location: {
        lat: booking.pickup_location.lat,
        lon: booking.pickup_location.lon,
        radiusKm: 5 // 5km de tolerancia
      },
      dateRange: {
        from: new Date(booking.start_date),
        to: new Date(booking.end_date)
      }
    }))
  );

  const allWarnings = results.flatMap(r => r.warnings);
  const photosWithIssues = results.filter(r => r.warnings.length > 0);

  if (photosWithIssues.length > 0) {
    // Mostrar advertencias pero permitir continuar
    await this.showWarningDialog({
      title: 'Advertencias en fotos',
      message: 'Algunas fotos tienen metadatos inconsistentes:',
      warnings: allWarnings
    });
  }

  return {
    valid: true,
    warnings: allWarnings
  };
}
```

### Dependencia

```bash
pnpm add exifreader
```

---

## Feature 9: Reportes Visuales Automáticos

### Objetivo
Generar PDFs con fotos anotadas de daños, timeline visual y comparativas antes/después.

### Edge Function: `generate-visual-report`

**Ubicación:** `/supabase/functions/generate-visual-report/index.ts`

```typescript
interface GenerateReportRequest {
  booking_id: string;
  report_type: 'inspection' | 'damage' | 'comparison' | 'full';
  include: {
    vehicle_info: boolean;
    check_in_photos: boolean;
    check_out_photos: boolean;
    damage_annotations: boolean;
    timeline: boolean;
    cost_breakdown: boolean;
    signatures?: boolean;
  };
  language: 'es' | 'en';
}

interface GenerateReportResponse {
  success: boolean;
  report_url: string;
  report_id: string;
  pages: number;
  generated_at: string;
}
```

### Implementación con jsPDF + Canvas

```typescript
// /supabase/functions/generate-visual-report/index.ts

import { jsPDF } from 'jspdf';
import { createCanvas, loadImage } from 'canvas';

async function generateReport(
  data: ReportData,
  options: GenerateReportRequest
): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header
  addHeader(doc, data.booking);

  // Información del vehículo
  if (options.include.vehicle_info) {
    addVehicleInfo(doc, data.car);
  }

  // Fotos de check-in
  if (options.include.check_in_photos) {
    doc.addPage();
    addSection(doc, 'Inspección de Entrada');
    await addPhotosWithAnnotations(doc, data.checkInPhotos, data.checkInDamages);
  }

  // Fotos de check-out
  if (options.include.check_out_photos) {
    doc.addPage();
    addSection(doc, 'Inspección de Salida');
    await addPhotosWithAnnotations(doc, data.checkOutPhotos, data.checkOutDamages);
  }

  // Comparación de daños
  if (options.include.damage_annotations && data.newDamages.length > 0) {
    doc.addPage();
    addSection(doc, 'Daños Detectados');
    await addDamageComparison(doc, data);
  }

  // Timeline
  if (options.include.timeline) {
    doc.addPage();
    addSection(doc, 'Línea de Tiempo');
    addTimeline(doc, data.timeline);
  }

  // Desglose de costos
  if (options.include.cost_breakdown) {
    addCostBreakdown(doc, data.newDamages);
  }

  // Footer con fecha y número de reporte
  addFooter(doc, data.reportId);

  return doc.output('arraybuffer');
}

async function addPhotosWithAnnotations(
  doc: jsPDF,
  photos: Photo[],
  damages: Damage[]
): Promise<void> {
  let y = 50;
  const photoWidth = 80;
  const photoHeight = 60;

  for (let i = 0; i < photos.length; i += 2) {
    // Cargar y anotar foto izquierda
    const leftPhoto = await annotatePhoto(photos[i], damages);
    doc.addImage(leftPhoto, 'JPEG', 15, y, photoWidth, photoHeight);
    doc.setFontSize(8);
    doc.text(photos[i].area || `Foto ${i + 1}`, 15, y + photoHeight + 5);

    // Cargar y anotar foto derecha (si existe)
    if (photos[i + 1]) {
      const rightPhoto = await annotatePhoto(photos[i + 1], damages);
      doc.addImage(rightPhoto, 'JPEG', 110, y, photoWidth, photoHeight);
      doc.text(photos[i + 1].area || `Foto ${i + 2}`, 110, y + photoHeight + 5);
    }

    y += photoHeight + 15;

    // Nueva página si es necesario
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  }
}

async function annotatePhoto(
  photo: Photo,
  damages: Damage[]
): Promise<string> {
  const image = await loadImage(photo.url);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  // Dibujar imagen
  ctx.drawImage(image, 0, 0);

  // Filtrar daños de esta foto
  const relevantDamages = damages.filter(d => d.evidence.frame_url === photo.url);

  for (const damage of relevantDamages) {
    const box = damage.evidence.bounding_box;
    const x = (box.x / 100) * image.width;
    const y = (box.y / 100) * image.height;
    const w = (box.width / 100) * image.width;
    const h = (box.height / 100) * image.height;

    // Dibujar rectángulo rojo
    ctx.strokeStyle = damage.is_new ? '#FF0000' : '#FFA500';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Etiqueta
    ctx.fillStyle = damage.is_new ? '#FF0000' : '#FFA500';
    ctx.fillRect(x, y - 25, 100, 25);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial';
    ctx.fillText(damage.type, x + 5, y - 8);
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

function addDamageComparison(doc: jsPDF, data: ReportData): void {
  let y = 50;

  for (const damage of data.newDamages) {
    // Encabezado del daño
    doc.setFontSize(12);
    doc.setTextColor(200, 0, 0);
    doc.text(`DAÑO NUEVO: ${damage.type.toUpperCase()}`, 15, y);

    // Detalles
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    y += 8;
    doc.text(`Ubicación: ${damage.location.area}`, 15, y);
    y += 5;
    doc.text(`Severidad: ${damage.severity}`, 15, y);
    y += 5;
    doc.text(`Costo estimado: $${damage.estimated_repair.min_usd}-${damage.estimated_repair.max_usd}`, 15, y);

    // Imágenes comparativas (si las hay)
    // ...

    y += 30;

    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  }
}

function addTimeline(doc: jsPDF, timeline: TimelineEvent[]): void {
  let y = 50;
  const lineX = 30;

  for (let i = 0; i < timeline.length; i++) {
    const event = timeline[i];

    // Línea vertical
    if (i < timeline.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(lineX, y + 5, lineX, y + 30);
    }

    // Círculo
    doc.setFillColor(event.type === 'new' ? 255 : 100, event.type === 'new' ? 0 : 100, 0);
    doc.circle(lineX, y + 5, 4, 'F');

    // Texto
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(event.timestamp, 40, y);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(event.description, 40, y + 6);

    y += 30;
  }
}

function addCostBreakdown(doc: jsPDF, damages: Damage[]): void {
  doc.addPage();
  addSection(doc, 'Desglose de Costos');

  let y = 50;
  let total = 0;

  // Encabezados de tabla
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Daño', 15, y);
  doc.text('Severidad', 80, y);
  doc.text('Costo Est.', 140, y);

  y += 8;
  doc.line(15, y, 195, y);
  y += 5;

  // Filas
  doc.setTextColor(0, 0, 0);
  for (const damage of damages) {
    doc.text(damage.type, 15, y);
    doc.text(damage.severity, 80, y);

    const avgCost = (damage.estimated_repair.min_usd + damage.estimated_repair.max_usd) / 2;
    doc.text(`$${avgCost.toFixed(2)}`, 140, y);

    total += avgCost;
    y += 7;
  }

  // Total
  y += 5;
  doc.line(15, y, 195, y);
  y += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL ESTIMADO:', 80, y);
  doc.text(`$${total.toFixed(2)}`, 140, y);
}
```

### Frontend Service

```typescript
@Injectable({ providedIn: 'root' })
export class VisualReportService {
  private readonly supabase = inject(SupabaseClientService).getClient();

  readonly generating = signal(false);

  async generateReport(
    bookingId: string,
    type: 'inspection' | 'damage' | 'full' = 'full'
  ): Promise<{ url: string; reportId: string }> {
    this.generating.set(true);

    try {
      const { data, error } = await this.supabase.functions.invoke(
        'generate-visual-report',
        {
          body: {
            booking_id: bookingId,
            report_type: type,
            include: {
              vehicle_info: true,
              check_in_photos: true,
              check_out_photos: true,
              damage_annotations: true,
              timeline: true,
              cost_breakdown: type === 'damage' || type === 'full'
            },
            language: 'es'
          }
        }
      );

      if (error) throw error;

      return {
        url: data.report_url,
        reportId: data.report_id
      };
    } finally {
      this.generating.set(false);
    }
  }

  async downloadReport(reportUrl: string, filename: string): Promise<void> {
    const response = await fetch(reportUrl);
    const blob = await response.blob();

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    URL.revokeObjectURL(link.href);
  }
}
```

### UI para Generar Reportes

```typescript
@Component({
  selector: 'app-generate-report-button',
  template: `
    <ion-button
      [disabled]="generating()"
      (click)="generate()"
    >
      @if (generating()) {
        <ion-spinner name="crescent"></ion-spinner>
        Generando...
      } @else {
        <ion-icon name="document-text" slot="start"></ion-icon>
        Generar Reporte
      }
    </ion-button>

    @if (reportUrl()) {
      <div class="report-actions">
        <ion-button fill="outline" (click)="download()">
          <ion-icon name="download" slot="start"></ion-icon>
          Descargar PDF
        </ion-button>
        <ion-button fill="outline" (click)="share()">
          <ion-icon name="share" slot="start"></ion-icon>
          Compartir
        </ion-button>
      </div>
    }
  `
})
export class GenerateReportButtonComponent {
  bookingId = input.required<string>();

  private readonly reportService = inject(VisualReportService);

  readonly generating = this.reportService.generating;
  readonly reportUrl = signal<string | null>(null);

  async generate() {
    const result = await this.reportService.generateReport(this.bookingId());
    this.reportUrl.set(result.url);
  }

  async download() {
    const url = this.reportUrl();
    if (url) {
      await this.reportService.downloadReport(
        url,
        `reporte-inspeccion-${this.bookingId()}.pdf`
      );
    }
  }

  async share() {
    const url = this.reportUrl();
    if (url && navigator.share) {
      await navigator.share({
        title: 'Reporte de Inspección',
        text: 'Reporte de inspección vehicular',
        url
      });
    }
  }
}
```

---

## Resumen de Implementación

### Dependencias a Agregar

```bash
# Frontend
pnpm add exifreader jspdf

# Edge Functions (Deno)
# (canvas ya está disponible en Deno)
```

### Variables de Entorno Nuevas

```bash
# Ninguna nueva requerida - usa las existentes:
# GEMINI_API_KEY
# GOOGLE_SERVICE_ACCOUNT
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

### Migraciones de BD Requeridas

1. `20250111_vehicle_recognition_logs.sql`
2. `20250111_vehicle_docs_ai_fields.sql`
3. `20250111_cars_condition_fields.sql`
4. `20250111_fraud_detection_logs.sql`
5. `20250111_visual_reports.sql`

### Orden de Implementación Recomendado

1. **Feature 2: Validación de calidad** (base para otras)
2. **Feature 3: Detección de placas** (privacidad)
3. **Feature 1: Reconocimiento marca/modelo** (UX)
4. **Feature 4: Verificación documentos** (compliance)
5. **Feature 5: Condición cosmética** (pricing)
6. **Feature 8: Validación EXIF** (anti-fraude)
7. **Feature 6: Detección avanzada daños** (mejora existente)
8. **Feature 7: Anti-fraude** (seguridad)
9. **Feature 9: Reportes visuales** (documentación)

---

## Próximos Pasos

1. Revisar y aprobar este plan
2. Crear tickets/issues para cada feature
3. Implementar en orden de prioridad
4. Testing con imágenes reales
5. Ajustar prompts de Gemini según resultados
6. Deploy gradual (feature flags)
