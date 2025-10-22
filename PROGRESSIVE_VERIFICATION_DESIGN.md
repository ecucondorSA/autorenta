# 🔐 Sistema de Verificación Progresiva - AutoRenta

## 📋 Resumen Ejecutivo

Sistema de verificación de identidad en **3 niveles progresivos** que solicita información mínima al inicio y escala según el riesgo financiero y la actividad del usuario.

**Ventajas**:
- ✅ No asusta usuarios nuevos (onboarding suave)
- ✅ Cumple requisitos de seguridad cuando importa
- ✅ Reduce fricción en exploración inicial
- ✅ Aplica IA solo cuando hay dinero/riesgo real
- ✅ Mejora tasa de conversión signup → primera transacción

---

## 🎯 Los 3 Niveles de Verificación

### 🟢 Level 1: EXPLORADOR (Registro básico)
**Objetivo**: Permitir explorar la plataforma sin comprometer seguridad
**Verificaciones requeridas**:
- ✅ Email verificado (código 6 dígitos)
- ✅ Teléfono verificado (SMS/WhatsApp)

**Lo que PUEDE hacer**:
- ✅ Ver catálogo completo de autos
- ✅ Filtrar búsquedas
- ✅ Ver perfiles de propietarios
- ✅ Ver precios y disponibilidad
- ✅ Agregar autos a favoritos
- ✅ Contactar soporte

**Lo que NO puede hacer**:
- ❌ Publicar auto
- ❌ Hacer reserva
- ❌ Depositar dinero
- ❌ Ver información sensible de contacto

**UI Badge**: 🔵 "Nivel Básico - Explorá la plataforma"

---

### 🟡 Level 2: PARTICIPANTE (DNI básico)
**Objetivo**: Permitir transacciones de bajo riesgo (<$50,000 ARS)
**Verificaciones requeridas**:
- ✅ Level 1 completado
- ✅ DNI/Pasaporte (foto frente + dorso)
- ✅ Validación automática básica:
  - OCR para extraer datos (nombre, número, fecha nacimiento)
  - Detección de documento falso (bordes, hologramas)
  - **NO se requiere selfie ni liveness**

**Verificaciones adicionales según ROL**:

#### 🚗 **Para LOCATARIOS (renters)**:
- ✅ **Licencia de conducir vigente** (Ley 24.449, art. 14 - Argentina)
  - Foto frontal de licencia
  - OCR automático: nombre, vencimiento, categoría
  - Validación: `expiry_date >= CURRENT_DATE`
  - **Válida en Mercosur**: AR, UY, BR, PY, CL
  - **Bloqueo automático** si vencida

#### 🏠 **Para LOCADORES (owners)**:
- ✅ **Cédula Verde** (si es dueño del vehículo)
  - Foto de cédula verde
  - OCR: patente, nombre titular
  - Validación: coincidencia con datos del auto

- ✅ **Cédula Azul o autorización notarial** (si NO es dueño)
  - Foto de cédula azul o documento notarial
  - Validación: autorización vigente
  - **Política Autorentar**: Sin esto, publicación bloqueada

**Lo que PUEDE hacer**:
- ✅ Todo de Level 1
- ✅ **Publicar auto** (hasta 1 auto, requiere cédula verde/azul)
- ✅ **Hacer reservas** (<7 días, <$50k ARS, **requiere licencia vigente**)
- ✅ Depositar hasta $100,000 ARS en wallet
- ✅ Retirar hasta $50,000 ARS por mes
- ✅ Ver teléfono de contacto en reservas confirmadas

**Lo que NO puede hacer**:
- ❌ Publicar más de 1 auto
- ❌ Reservas largas (>7 días)
- ❌ Transacciones >$50k ARS
- ❌ Retirar >$50k/mes
- ❌ **Reservar con licencia vencida**
- ❌ **Publicar auto sin cédula válida**

**UI Badge**: 🟡 "Verificado Básico - Listo para alquilar"

**Validación IA (Cloudflare AI Workers)**:
```typescript
// Edge Function: verify-document-basic
- OCR con Tesseract.js o Cloudflare AI
- Detección de bordes/hologramas con CV (OpenCV.js)
- Comparación con formato DNI argentino
- Score de confianza: >70% = aprobado, <70% = revisión manual

// Edge Function: verify-driver-license
- OCR de licencia de conducir
- Extracción: nombre, número, vencimiento, categoría
- Validación fecha: expiry >= CURRENT_DATE
- Validación país: Mercosur (AR, UY, BR, PY, CL)

// Edge Function: verify-vehicle-ownership
- OCR de cédula verde/azul
- Extracción: patente, nombre titular
- Validación coincidencia con datos del auto
- Check: is_owner determina si requiere cédula verde o azul
```

---

### 🟢 Level 3: VERIFICADO FULL (DNI + Selfie + IA)
**Objetivo**: Máxima seguridad para transacciones grandes
**Verificaciones requeridas**:
- ✅ Level 2 completado
- ✅ Selfie con documento en mano
- ✅ Validación IA avanzada:
  - **Face matching** (selfie vs foto DNI)
  - **Liveness detection** (video corto o múltiples ángulos)
  - **Análisis de metadata** (EXIF de imágenes)
  - **Revisión manual** si score <90%

**Lo que PUEDE hacer**:
- ✅ Todo de Level 1 y 2
- ✅ Publicar autos ilimitados
- ✅ Reservas sin límite de duración
- ✅ Transacciones sin límite de monto
- ✅ Retirar sin límite mensual
- ✅ Acceso a seguros premium
- ✅ Prioridad en soporte

**UI Badge**: 🟢 "Verificado Full - Sin límites"

**Validación IA (Cloudflare AI + Third-party)**:
```typescript
// Edge Function: verify-identity-full
- Face matching con Cloudflare AI Workers (face-detection)
- Liveness detection con MediaPipe (Google)
- Metadata analysis (detect photoshop, edición)
- Human review queue si confidence <90%
```

---

## 🗄️ Schema de Base de Datos

### Nueva tabla: `user_identity_levels`

```sql
CREATE TABLE public.user_identity_levels (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Nivel actual
  current_level INT NOT NULL CHECK (current_level IN (1, 2, 3)) DEFAULT 1,

  -- Level 1: Email + Phone
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  phone_number TEXT,

  -- Level 2: DNI básico
  document_type TEXT CHECK (document_type IN ('DNI', 'PASAPORTE', 'LC', 'LE')),
  document_number TEXT,
  document_front_url TEXT,
  document_back_url TEXT,
  document_verified_at TIMESTAMPTZ,
  document_ai_score NUMERIC(5,2), -- 0-100
  document_ai_metadata JSONB,

  -- Level 3: Selfie + IA avanzada
  selfie_url TEXT,
  selfie_verified_at TIMESTAMPTZ,
  face_match_score NUMERIC(5,2), -- 0-100
  liveness_score NUMERIC(5,2), -- 0-100
  manual_review_required BOOLEAN DEFAULT false,
  manual_reviewed_by UUID REFERENCES public.profiles(id),
  manual_reviewed_at TIMESTAMPTZ,
  manual_review_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_identity_levels_current_level ON public.user_identity_levels(current_level);
CREATE INDEX idx_identity_levels_manual_review ON public.user_identity_levels(manual_review_required) WHERE manual_review_required = true;
```

### Modificar tabla existente: `user_verifications`

```sql
-- Agregar campo de nivel requerido
ALTER TABLE public.user_verifications
  ADD COLUMN required_level INT CHECK (required_level IN (1, 2, 3)) DEFAULT 2;

-- Índice para queries de acceso
CREATE INDEX idx_verifications_required_level ON public.user_verifications(required_level);
```

---

## 🚀 Migración de Datos Existentes

```sql
-- Migrar usuarios actuales al nuevo sistema
INSERT INTO public.user_identity_levels (user_id, current_level, email_verified_at, phone_verified_at)
SELECT
  p.id,
  CASE
    WHEN p.is_email_verified AND p.is_phone_verified THEN 2 -- Asumir level 2 si ya está verificado
    WHEN p.is_email_verified OR p.is_phone_verified THEN 1
    ELSE 1
  END as current_level,
  CASE WHEN p.is_email_verified THEN now() ELSE NULL END,
  CASE WHEN p.is_phone_verified THEN now() ELSE NULL END
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;
```

---

## 🔒 Guards y Validaciones

### Angular Guard: `VerificationLevelGuard`

```typescript
export const verificationLevelGuard = (requiredLevel: 1 | 2 | 3): CanMatchFn => {
  return async (route, segments) => {
    const verificationService = inject(VerificationLevelService);
    const router = inject(Router);

    const currentLevel = await verificationService.getCurrentLevel();

    if (currentLevel >= requiredLevel) {
      return true;
    }

    // Redirigir a página de upgrade con contexto
    return router.createUrlTree(['/verification/upgrade'], {
      queryParams: {
        required: requiredLevel,
        current: currentLevel,
        returnUrl: segments.join('/')
      }
    });
  };
};
```

### Uso en Rutas

```typescript
{
  path: 'cars/publish',
  loadComponent: () => import('./publish-car.page'),
  canMatch: [verificationLevelGuard(2)] // Level 2 requerido
},
{
  path: 'wallet/withdraw',
  loadComponent: () => import('./withdraw.page'),
  canMatch: [verificationLevelGuard(2)]
},
{
  path: 'cars/publish-fleet', // Publicar múltiples autos
  loadComponent: () => import('./publish-fleet.page'),
  canMatch: [verificationLevelGuard(3)] // Level 3 requerido
}
```

---

## 🎨 UI/UX del Sistema

### Página: `/verification/upgrade`

**Pantalla de upgrade progresivo**:

```
┌─────────────────────────────────────────────┐
│  🔐 Verificá tu identidad                   │
│                                             │
│  Para [ACCIÓN] necesitás verificación       │
│  de nivel [REQUIRED_LEVEL]                  │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🟢 Level 1: EXPLORADOR          ✅  │   │
│  │ Email + Teléfono                    │   │
│  │ Completado el 18/10/2025            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🟡 Level 2: PARTICIPANTE        ⏳  │   │
│  │ DNI/Pasaporte + Validación IA       │   │
│  │                                     │   │
│  │ [Subir Documento Frente]            │   │
│  │ [Subir Documento Dorso]             │   │
│  │                                     │   │
│  │ Beneficios:                         │   │
│  │ • Publicar 1 auto                   │   │
│  │ • Reservas hasta $50k ARS           │   │
│  │ • Retiros hasta $50k/mes            │   │
│  │                                     │   │
│  │      [Subir Documentos] ➡️          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🟢 Level 3: VERIFICADO FULL     🔒  │   │
│  │ Selfie + IA Avanzada                │   │
│  │ (Desbloqueado al completar Level 2) │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Volver]                                   │
└─────────────────────────────────────────────┘
```

### Badge Component Mejorado

```typescript
getVerificationBadge(level: number): {
  icon: string;
  text: string;
  class: string;
  action?: string;
} {
  switch (level) {
    case 1:
      return {
        icon: '🔵',
        text: 'Nivel Básico',
        class: 'bg-blue-100 text-blue-800',
        action: 'Click para subir de nivel'
      };
    case 2:
      return {
        icon: '🟡',
        text: 'Verificado Básico',
        class: 'bg-yellow-100 text-yellow-800',
        action: 'Click para verificación completa'
      };
    case 3:
      return {
        icon: '🟢',
        text: 'Verificado Full',
        class: 'bg-green-100 text-green-800'
      };
    default:
      return {
        icon: '⚪',
        text: 'Sin Verificar',
        class: 'bg-gray-100 text-gray-800',
        action: 'Click para empezar verificación'
      };
  }
}
```

---

## 🤖 Validación con IA

### Edge Function: `verify-document-level2`

**Stack**: Cloudflare Workers + AI Binding

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { documentFrontUrl, documentBackUrl, userId } = await request.json();

    // 1. Download images from Supabase Storage
    const frontImage = await fetch(documentFrontUrl).then(r => r.arrayBuffer());
    const backImage = await fetch(documentBackUrl).then(r => r.arrayBuffer());

    // 2. OCR con Cloudflare AI
    const ocrFront = await env.AI.run('@cf/tesseract/ocr', {
      image: Array.from(new Uint8Array(frontImage))
    });

    // 3. Extraer datos del DNI argentino
    const extractedData = extractDNIData(ocrFront.text);

    // 4. Detección de documento falso (básico)
    const isFake = await detectFakeDocument(frontImage, backImage);

    // 5. Calcular score
    const score = calculateScore({
      ocrConfidence: ocrFront.confidence,
      dataExtracted: !!extractedData.documentNumber,
      isFake
    });

    // 6. Guardar en DB
    if (score >= 70) {
      await updateUserLevel(userId, {
        level: 2,
        documentNumber: extractedData.documentNumber,
        documentType: 'DNI',
        aiScore: score,
        verifiedAt: new Date().toISOString()
      });

      return Response.json({ success: true, level: 2, score });
    } else {
      // Marcar para revisión manual
      await flagForManualReview(userId, { score, reason: 'Low confidence' });
      return Response.json({ success: false, requiresReview: true, score });
    }
  }
};

function extractDNIData(text: string): {
  documentNumber?: string;
  fullName?: string;
  birthDate?: string;
} {
  // Regex para DNI argentino (8 dígitos)
  const dniMatch = text.match(/\b(\d{1,2}\.\d{3}\.\d{3}|\d{8})\b/);

  // Más lógica de extracción...

  return {
    documentNumber: dniMatch?.[1].replace(/\./g, ''),
    // ...
  };
}

function calculateScore(data: {
  ocrConfidence: number;
  dataExtracted: boolean;
  isFake: boolean;
}): number {
  let score = 0;

  score += data.ocrConfidence * 0.4; // 40% peso OCR
  score += data.dataExtracted ? 40 : 0; // 40% datos extraídos
  score += !data.isFake ? 20 : 0; // 20% no fake

  return Math.min(100, score);
}
```

### Edge Function: `verify-identity-level3`

**Stack**: Cloudflare Workers + Face Detection AI + MediaPipe

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { selfieUrl, documentFrontUrl, userId } = await request.json();

    // 1. Face detection en selfie
    const selfieImage = await fetch(selfieUrl).then(r => r.arrayBuffer());
    const faceDetection = await env.AI.run('@cf/microsoft/resnet-50', {
      image: Array.from(new Uint8Array(selfieImage))
    });

    // 2. Extraer cara del DNI
    const documentImage = await fetch(documentFrontUrl).then(r => r.arrayBuffer());
    const dniFace = await extractFaceFromDNI(documentImage);

    // 3. Face matching
    const matchScore = await compareFaces(faceDetection, dniFace);

    // 4. Liveness detection (placeholder - requiere video o múltiples ángulos)
    const livenessScore = 85; // TODO: Implementar real liveness

    // 5. Validación final
    const finalScore = (matchScore * 0.7) + (livenessScore * 0.3);

    if (finalScore >= 90) {
      await updateUserLevel(userId, {
        level: 3,
        faceMatchScore: matchScore,
        livenessScore,
        verifiedAt: new Date().toISOString()
      });

      return Response.json({ success: true, level: 3, score: finalScore });
    } else if (finalScore >= 70) {
      // Requiere revisión manual
      await flagForManualReview(userId, {
        score: finalScore,
        reason: 'Medium confidence - needs human review'
      });

      return Response.json({
        success: false,
        requiresReview: true,
        score: finalScore
      });
    } else {
      return Response.json({
        success: false,
        error: 'Face matching failed',
        score: finalScore
      });
    }
  }
};
```

---

## 📊 Límites por Nivel

| Acción | Level 1 | Level 2 | Level 3 |
|--------|---------|---------|---------|
| **Ver catálogo** | ✅ Sí | ✅ Sí | ✅ Sí |
| **Publicar autos** | ❌ No | ✅ 1 auto | ✅ Ilimitado |
| **Hacer reserva** | ❌ No | ✅ <7 días, <$50k | ✅ Sin límite |
| **Depositar wallet** | ❌ No | ✅ Hasta $100k | ✅ Sin límite |
| **Retirar wallet** | ❌ No | ✅ $50k/mes | ✅ Sin límite |
| **Duración reserva** | ❌ No | ✅ Máx 7 días | ✅ Sin límite |
| **Seguros premium** | ❌ No | ❌ No | ✅ Sí |
| **Soporte prioritario** | ❌ No | ❌ No | ✅ Sí |

---

## 🚦 RPC Functions para Validación

### `check_user_level_access`

```sql
CREATE OR REPLACE FUNCTION public.check_user_level_access(
  p_user_id UUID,
  p_required_level INT,
  p_action TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_level INT;
  v_result JSONB;
BEGIN
  -- Get current level
  SELECT current_level INTO v_current_level
  FROM public.user_identity_levels
  WHERE user_id = p_user_id;

  -- If no record, assume level 1
  IF v_current_level IS NULL THEN
    v_current_level := 1;
  END IF;

  -- Check access
  IF v_current_level >= p_required_level THEN
    v_result := jsonb_build_object(
      'allowed', true,
      'current_level', v_current_level,
      'required_level', p_required_level
    );
  ELSE
    v_result := jsonb_build_object(
      'allowed', false,
      'current_level', v_current_level,
      'required_level', p_required_level,
      'action', p_action,
      'upgrade_url', '/verification/upgrade?required=' || p_required_level
    );
  END IF;

  RETURN v_result;
END;
$$;
```

### Uso desde Frontend

```typescript
async canPublishCar(): Promise<boolean> {
  const { data } = await this.supabase.rpc('check_user_level_access', {
    p_user_id: this.currentUserId,
    p_required_level: 2,
    p_action: 'publish_car'
  });

  if (!data.allowed) {
    // Mostrar modal o redirigir
    this.router.navigate([data.upgrade_url]);
    return false;
  }

  return true;
}
```

---

## 📈 Roadmap de Implementación

### Fase 1: Database Schema (Semana 1)
- [x] Crear tabla `user_identity_levels`
- [x] Migrar datos existentes
- [x] Crear RPC functions de validación
- [x] Tests de integración DB

### Fase 2: Backend Services (Semana 2)
- [ ] Edge Function `verify-document-level2` (OCR básico)
- [ ] Edge Function `verify-identity-level3` (Face matching)
- [ ] Queue de revisión manual (Supabase + email notifications)
- [ ] Tests de Edge Functions

### Fase 3: Frontend Services (Semana 3)
- [ ] `VerificationLevelService` (Angular)
- [ ] `VerificationLevelGuard` (route guards)
- [ ] Actualizar `VerificationBadgeComponent`
- [ ] Tests unitarios

### Fase 4: UI/UX (Semana 4)
- [ ] Página `/verification/upgrade`
- [ ] Componente de upload de documentos
- [ ] Modal de progreso de verificación
- [ ] Animaciones y feedback visual
- [ ] Tests E2E con Playwright

### Fase 5: Admin Dashboard (Semana 5)
- [ ] Panel de revisión manual
- [ ] Estadísticas de verificación
- [ ] Logs de validaciones IA
- [ ] Herramientas de moderación

### Fase 6: Monitoreo y Optimización (Ongoing)
- [ ] Cloudflare Analytics para Edge Functions
- [ ] A/B testing de flujos de verificación
- [ ] Optimización de tasas de aprobación IA
- [ ] Feedback loop para mejorar modelos

---

## 🎯 Métricas de Éxito

| Métrica | Objetivo | Actual | Status |
|---------|----------|--------|--------|
| **Tasa signup → Level 1** | >95% | TBD | 🔄 |
| **Tasa Level 1 → Level 2** | >60% | TBD | 🔄 |
| **Tasa Level 2 → Level 3** | >30% | TBD | 🔄 |
| **Tiempo Level 1 → Level 2** | <5 min | TBD | 🔄 |
| **Accuracy IA Level 2** | >85% | TBD | 🔄 |
| **Accuracy IA Level 3** | >95% | TBD | 🔄 |
| **Tasa revisión manual** | <15% | TBD | 🔄 |
| **Tiempo revisión manual** | <24h | TBD | 🔄 |

---

## 💰 Costos Estimados

### Cloudflare AI Workers (Free Tier)
- **10,000 requests/day** gratis
- **Estimado Level 2**: ~200 validaciones/día → $0/mes
- **Estimado Level 3**: ~50 validaciones/día → $0/mes

### Cloudflare Workers (Paid - $5/mo)
- **10M requests/mes**
- **128MB RAM por worker**
- **Suficiente para MVP** (estimado <100k requests/mes)

### Supabase Storage
- **1GB gratis**
- **Documentos + Selfies**: ~2MB por usuario
- **Estimado 500 usuarios**: ~1GB → $0/mes
- **Después 1GB**: $0.021/GB/mes

### Total Estimado MVP (0-500 usuarios)
- **$0-5/mes** (solo si pasamos free tier de Workers)

---

## 🔐 Seguridad y Compliance

### GDPR Compliance
- ✅ Consentimiento explícito para cada nivel
- ✅ Derecho al olvido (eliminación de imágenes)
- ✅ Portabilidad de datos
- ✅ Encriptación en tránsito y reposo

### Almacenamiento Seguro
```typescript
// Supabase Storage con RLS
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Service role can read all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'identity-documents' AND
  auth.role() = 'service_role'
);

CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'identity-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Encriptación de Datos Sensibles
```typescript
// Encriptar número de documento antes de guardar
import { encrypt, decrypt } from '@/lib/encryption';

const encryptedDocNumber = encrypt(documentNumber, env.ENCRYPTION_KEY);

await supabase
  .from('user_identity_levels')
  .update({ document_number: encryptedDocNumber })
  .eq('user_id', userId);
```

---

## 📚 Referencias

- **Cloudflare AI Docs**: https://developers.cloudflare.com/workers-ai/
- **Tesseract OCR**: https://github.com/tesseract-ocr/tesseract
- **MediaPipe Face Detection**: https://google.github.io/mediapipe/solutions/face_detection
- **DNI Argentino Specs**: https://www.argentina.gob.ar/interior/dni
- **GDPR Compliance**: https://gdpr.eu/

---

**Última actualización**: 2025-10-22
**Autor**: Claude Code + Eduardo (AutoRenta Team)
**Status**: 🚧 En diseño - Pendiente aprobación
