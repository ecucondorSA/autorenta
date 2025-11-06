# 🔍 Mejoras UI de Verificación - Análisis y Propuesta

## 📋 Situación Actual

### UI Actual (profile-expanded.page.html lines 393-626)

**Problemas identificados**:

1. **❌ No menciona cédula digital**
   - Línea 347: "Subí la documentación del vehículo (cédula verde)"
   - Solo menciona cédula verde física
   - NO informa que cédula digital es GRATIS

2. **❌ No contempla cédula azul**
   - No hay opción para conductores autorizados (no dueños)
   - El diseño Mercosur 2025 require cédula azul O autorización notarial

3. **❌ DNI tiene más peso que licencia**
   - Línea 337: DNI es el primer paso del checklist owner
   - Línea 347: Cédula verde segundo
   - **ERROR**: Para locadores, la cédula verde/azul es MÁS CRÍTICA que el DNI

4. **❌ No valida licencia como obligatoria para locatarios**
   - Línea 296: "Subí tu licencia de conducir"
   - No menciona Ley 24.449 art. 14 (obligatorio Argentina)
   - No menciona que es válida en Mercosur

5. **❌ No menciona Carta Verde**
   - No existe campo para Carta Verde (seguro Mercosur)
   - Es OBLIGATORIO para viajes internacionales

6. **❌ No explica la diferencia entre locador dueño vs autorizado**
   - Flujo único para todos los locadores
   - No diferencia entre:
     - Dueño del vehículo (necesita cédula verde)
     - Conductor autorizado (necesita cédula azul + autorización)

---

## ✅ Propuesta de Mejora (Basada en Mercosur 2025)

### 1. **Checklist Locatario (Conductor)**

```html
<div class="mb-6 rounded-lg border p-4">
  <h4>🚗 Conductor (Locatario)</h4>
  <p class="text-xs mb-4">
    <strong>Requisito legal (Ley 24.449, art. 14):</strong> Licencia de conducir vigente obligatoria para circular en Argentina y Mercosur.
  </p>

  <ul class="space-y-4">
    <!-- Paso 1: Licencia OBLIGATORIA -->
    <li>
      <p class="font-semibold">📄 Licencia de conducir vigente (OBLIGATORIO)</p>
      <p class="text-xs text-charcoal-medium">
        Subí foto clara del frente. La IA extraerá: nombre, vencimiento, categoría.
      </p>
      <p class="text-xs text-red-600" *ngIf="licenciaVencida">
        ⚠️ BLOQUEADO: Tu licencia venció. Renovála antes de reservar.
      </p>
      <span class="badge">{{ licenseStatus }}</span>
    </li>

    <!-- Paso 2: Selfie (recomendado) -->
    <li>
      <p class="font-semibold">📷 Selfie con licencia (recomendado)</p>
      <p class="text-xs text-charcoal-medium">
        Acelera la verificación automática por IA.
      </p>
      <span class="badge">{{ selfieStatus }}</span>
    </li>

    <!-- Paso 3: Validación IA -->
    <li>
      <p class="font-semibold">🤖 Validación automática</p>
      <p class="text-xs text-charcoal-medium">
        Verificamos: autenticidad, vigencia, categoría mínima B1.
      </p>
      <span class="badge">{{ aiValidationStatus }}</span>
    </li>
  </ul>
</div>
```

---

### 2. **Checklist Locador (Dueño o Autorizado)**

**Flujo diferenciado:**

```html
<div class="mb-6 rounded-lg border p-4">
  <h4>🚘 Locador (Dueño del vehículo)</h4>
  <p class="text-xs mb-4">
    <strong>Pregunta clave:</strong> ¿Sos el dueño del vehículo que querés publicar?
  </p>

  <!-- Pregunta: Dueño o Autorizado -->
  <div class="mb-4">
    <label class="flex items-center gap-2">
      <input type="radio" name="owner_type" value="owner" />
      <span>Sí, soy el titular de la cédula verde</span>
    </label>
    <label class="flex items-center gap-2">
      <input type="radio" name="owner_type" value="authorized" />
      <span>No, soy conductor autorizado (tengo cédula azul)</span>
    </label>
  </div>

  <!-- FLUJO A: Dueño del vehículo -->
  <div *ngIf="ownerType === 'owner'">
    <h5 class="text-sm font-semibold mb-2">Flujo: Dueño del vehículo</h5>

    <ul class="space-y-4">
      <!-- Paso 1: Cédula del vehículo (CRÍTICO) -->
      <li>
        <p class="font-semibold">📄 Documentación del vehículo (CRÍTICO)</p>
        <p class="text-xs text-charcoal-medium mb-2">
          Validamos: <strong>patente, titular, vigencia</strong>
        </p>

        <!-- OPCIÓN DIGITAL O FÍSICA -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Opción A: Digital (recomendado) -->
          <button class="p-3 border-2 border-accent-petrol rounded-lg bg-accent-petrol/5">
            <p class="text-xs font-semibold">🆕 Cédula Digital</p>
            <p class="text-xs text-charcoal-medium">✅ GRATIS</p>
            <p class="text-xs text-charcoal-medium">✅ Instantáneo</p>
            <p class="text-xs text-charcoal-medium">✅ Habilitar terceros gratis</p>
          </button>

          <!-- Opción B: Física (también válido) -->
          <button class="p-3 border-2 border-pearl-gray rounded-lg hover:border-accent-petrol">
            <p class="text-xs font-semibold">📄 Cédula Física</p>
            <p class="text-xs text-charcoal-medium">• Ya la tenés</p>
            <p class="text-xs text-charcoal-medium">• Subir foto frente + dorso</p>
          </button>
        </div>

        <p class="text-xs text-ash-gray mt-2">
          💡 <strong>Ambas opciones tienen la misma validez legal</strong> (Disposición 343/2024 DNRPA)
        </p>
      </li>

      <!-- Paso 2: DNI (secundario) -->
      <li>
        <p class="font-semibold">📄 DNI / Pasaporte</p>
        <p class="text-xs text-charcoal-medium">
          Frente y dorso. Validamos que coincida con el titular de la cédula.
        </p>
        <span class="badge">{{ dniStatus }}</span>
      </li>

      <!-- Paso 3: Carta Verde (si viajes Mercosur) -->
      <li>
        <p class="font-semibold">🌎 Carta Verde (si permitís viajes Mercosur)</p>
        <p class="text-xs text-charcoal-medium">
          Seguro obligatorio para cruzar fronteras (AR, UY, BR, PY, CL).
          Generalmente incluido gratis en tu seguro.
        </p>
        <span class="badge">{{ cartaVerdeStatus }}</span>
      </li>

      <!-- Paso 4: Validación IA -->
      <li>
        <p class="font-semibold">🤖 Validación automática</p>
        <p class="text-xs text-charcoal-medium">
          Verificamos coherencia: patente, titular, vigencia VTV, seguro.
        </p>
        <span class="badge">{{ aiValidationStatus }}</span>
      </li>
    </ul>
  </div>

  <!-- FLUJO B: Conductor Autorizado -->
  <div *ngIf="ownerType === 'authorized'">
    <h5 class="text-sm font-semibold mb-2">Flujo: Conductor autorizado</h5>

    <ul class="space-y-4">
      <!-- Paso 1: Cédula Azul (CRÍTICO) -->
      <li>
        <p class="font-semibold">📄 Cédula Azul o Autorización Notarial (CRÍTICO)</p>
        <p class="text-xs text-charcoal-medium">
          Demuestra que el dueño te autorizó a usar el vehículo.
        </p>

        <div class="mt-2 grid grid-cols-2 gap-3">
          <!-- Opción A: Cédula Azul Digital -->
          <button class="p-3 border-2 rounded-lg">
            <p class="text-xs font-semibold">🆕 Cédula Azul Digital</p>
            <p class="text-xs">Gratis desde Mi Argentina</p>
          </button>

          <!-- Opción B: Autorización Notarial -->
          <button class="p-3 border-2 rounded-lg">
            <p class="text-xs font-semibold">⚖️ Autorización Notarial</p>
            <p class="text-xs">ARS 35.000-50.000</p>
            <p class="text-xs text-accent-petrol">Autorentar puede gestionarla</p>
          </button>
        </div>

        <span class="badge mt-2">{{ cedulaAzulStatus }}</span>
      </li>

      <!-- Paso 2: DNI -->
      <li>
        <p class="font-semibold">📄 Tu DNI / Pasaporte</p>
        <p class="text-xs text-charcoal-medium">
          Para validar que sos el conductor autorizado en la cédula azul.
        </p>
        <span class="badge">{{ dniStatus }}</span>
      </li>

      <!-- Paso 3: Carta Verde (si viajes Mercosur) -->
      <li>
        <p class="font-semibold">🌎 Carta Verde (si permitís viajes Mercosur)</p>
        <p class="text-xs text-charcoal-medium">
          Debe incluir tu nombre como conductor autorizado.
        </p>
        <span class="badge">{{ cartaVerdeStatus }}</span>
      </li>

      <!-- Paso 4: Validación IA -->
      <li>
        <p class="font-semibold">🤖 Validación automática</p>
        <p class="text-xs text-charcoal-medium">
          Verificamos que estés autorizado y los documentos coincidan.
        </p>
        <span class="badge">{{ aiValidationStatus }}</span>
      </li>
    </ul>
  </div>
</div>
```

---

## 📊 Comparación: Antes vs Después

| Aspecto | **Antes (actual)** | **Después (Mercosur 2025)** |
|---------|-------------------|----------------------------|
| **Cédula vehículo** | Solo "cédula verde" | **Digital O Física** (ambas válidas) |
| **Cédula azul** | ❌ No contemplada | ✅ Opción para autorizados |
| **Licencia conductor** | Opcional | ✅ **OBLIGATORIA** (Ley 24.449) |
| **Carta Verde** | ❌ No existe | ✅ Obligatoria para viajes Mercosur |
| **Prioridad DNI** | 1er paso (locador) | 2do paso (después de cédula vehículo) |
| **Diferencia dueño/autorizado** | ❌ No diferencia | ✅ Flujos separados |
| **Información legal** | Genérica | ✅ Cita leyes y disposiciones |
| **Educación usuario** | Mínima | ✅ Explica opciones GRATIS vs pagadas |

---

## 🎯 Cambios Específicos en el Código

### A. Actualizar `createOwnerChecklist()` (profile-expanded.page.ts:326)

**ANTES**:
```typescript
private createOwnerChecklist(): VerificationChecklistItem[] {
  // ...
  return [
    {
      id: 'owner_gov_id',
      label: 'Subí tu documento personal (DNI / Pasaporte)',
      // ...
    },
    {
      id: 'owner_vehicle_doc',
      label: 'Subí la documentación del vehículo (cédula verde)',
      // ...
    },
  ];
}
```

**DESPUÉS**:
```typescript
private createOwnerChecklist(): VerificationChecklistItem[] {
  const verification = this.ownerVerification();
  const missingDocs = verification?.missing_docs ?? [];
  const profile = this.profile();

  const isOwner = profile?.is_vehicle_owner ?? true; // Nuevo campo en perfil

  const vehicleStatus = this.getDocumentStatusForKinds([
    'vehicle_registration',
    'vehicle_registration_digital', // Nuevo: cédula digital
  ]);
  const blueCardStatus = this.getDocumentStatusForKinds('vehicle_blue_card'); // Nuevo: cédula azul
  const cartaVerdeStatus = this.getDocumentStatusForKinds('green_card_insurance'); // Nuevo: Carta Verde
  const govIdStatus = this.getDocumentStatusForKinds(['gov_id_front', 'gov_id_back']);

  const baseChecklist: VerificationChecklistItem[] = [
    // PRIORIDAD 1: Documentación del vehículo (CRÍTICO)
    {
      id: 'owner_vehicle_doc',
      label: isOwner
        ? '📄 Documentación del vehículo (cédula digital O física)'
        : '📄 Cédula Azul o Autorización Notarial',
      description: isOwner
        ? '✅ Digital GRATIS (Mi Argentina) O física. Ambas válidas (Disposición 343/2024 DNRPA). Validamos: patente, titular, vigencia.'
        : 'Demuestra que el dueño te autorizó. Opciones: Cédula Azul digital (gratis) o Autorización Notarial (ARS 35k-50k).',
      statusType: 'document',
      status: isOwner ? vehicleStatus.status : blueCardStatus.status,
      completed: isOwner ? vehicleStatus.completed : blueCardStatus.completed,
      missingKey: 'cedula_auto',
      notes: isOwner ? vehicleStatus.notes : blueCardStatus.notes,
    },

    // PRIORIDAD 2: DNI (para validar coincidencia con cédula)
    {
      id: 'owner_gov_id',
      label: '📄 DNI / Pasaporte',
      description: 'Frente y dorso. Validamos que coincida con el titular de la cédula.',
      statusType: 'document',
      status: govIdStatus.status,
      completed: govIdStatus.completed,
      missingKey: 'dni',
      notes: govIdStatus.notes,
    },

    // PRIORIDAD 3: Carta Verde (solo si permite viajes Mercosur)
    {
      id: 'owner_green_card',
      label: '🌎 Carta Verde (si permitís viajes Mercosur)',
      description: 'Seguro obligatorio para fronteras (AR→UY, BR, PY, CL). Generalmente incluido gratis en tu seguro.',
      statusType: 'document',
      status: cartaVerdeStatus.status,
      completed: cartaVerdeStatus.completed,
      missingKey: 'carta_verde',
      notes: cartaVerdeStatus.notes ?? 'Opcional si no permitís viajes internacionales',
    },

    // VALIDACIÓN IA (último paso)
    {
      id: 'owner_ai_review',
      label: '🤖 Validación automática',
      description: 'Verificamos coherencia: patente, titular/autorizado, vigencia VTV, seguro.',
      statusType: 'verification',
      status: verification?.status ?? 'PENDIENTE',
      completed: verification?.status === 'VERIFICADO',
      missingKey: missingDocs.find((doc) =>
        ['dni', 'cedula_auto', 'cedula_azul'].includes(doc),
      ),
      notes: verification?.notes ?? null,
    },
  ];

  return baseChecklist;
}
```

---

### B. Actualizar `createDriverChecklist()` (profile-expanded.page.ts:286)

**ANTES**:
```typescript
{
  id: 'driver_license_upload',
  label: 'Subí tu licencia de conducir',
  description: 'Foto clara donde se lean tu nombre y la fecha de vencimiento.',
  // ...
}
```

**DESPUÉS**:
```typescript
{
  id: 'driver_license_upload',
  label: '📄 Licencia de conducir vigente (OBLIGATORIO)',
  description: '⚖️ Requisito legal (Ley 24.449, art. 14): Obligatoria para circular en Argentina y Mercosur. Foto clara del frente. La IA extrae: nombre, vencimiento, categoría.',
  statusType: 'document',
  status: licenseStatus.status,
  completed: licenseStatus.completed,
  missingKey: 'licencia',
  notes: licenseStatus.notes ?? null,
  // NUEVO: Validación de vencimiento
  isBlocking: isLicenseExpired(this.profile()?.driver_license_expiry),
  blockingMessage: 'BLOQUEADO: Tu licencia venció. Renovála antes de reservar.',
}
```

---

### C. Actualizar `documentKinds` (profile-expanded.page.ts:187)

**ANTES**:
```typescript
readonly documentKinds: { value: DocumentKind; label: string }[] = [
  { value: 'gov_id_front', label: 'DNI/CI - Frente' },
  { value: 'gov_id_back', label: 'DNI/CI - Dorso' },
  { value: 'driver_license', label: 'Licencia de conducir' },
  { value: 'vehicle_registration', label: 'Cédula verde / Documento del vehículo' },
  { value: 'vehicle_insurance', label: 'Seguro del vehículo (opcional)' },
  { value: 'utility_bill', label: 'Factura de servicios' },
  { value: 'selfie', label: 'Selfie de verificación' },
];
```

**DESPUÉS**:
```typescript
readonly documentKinds: { value: DocumentKind; label: string; description?: string }[] = [
  // CONDUCTOR
  {
    value: 'driver_license',
    label: 'Licencia de conducir (OBLIGATORIO)',
    description: 'Ley 24.449 art. 14 - Válida en Mercosur'
  },
  {
    value: 'selfie',
    label: 'Selfie con licencia (recomendado)',
    description: 'Acelera verificación IA'
  },

  // LOCADOR: DNI
  { value: 'gov_id_front', label: 'DNI/Pasaporte - Frente' },
  { value: 'gov_id_back', label: 'DNI/Pasaporte - Dorso' },

  // LOCADOR: Vehículo
  {
    value: 'vehicle_registration',
    label: 'Cédula Verde (física)',
    description: 'Frente y dorso legibles'
  },
  {
    value: 'vehicle_registration_digital',
    label: '🆕 Cédula Digital (GRATIS)',
    description: 'PDF con firma DNRPA desde Mi Argentina'
  },
  {
    value: 'vehicle_blue_card',
    label: 'Cédula Azul (si NO sos dueño)',
    description: 'Demuestra autorización del titular'
  },
  {
    value: 'green_card_insurance',
    label: '🌎 Carta Verde (viajes Mercosur)',
    description: 'Obligatorio para cruzar fronteras'
  },
  {
    value: 'vehicle_insurance',
    label: 'Seguro del vehículo (opcional)'
  },

  // OTROS
  { value: 'utility_bill', label: 'Factura de servicios' },
];
```

---

### D. Agregar nuevo campo en UserProfile model

**Archivo**: `apps/web/src/app/core/models/user.model.ts`

```typescript
export interface UserProfile {
  // ... existing fields

  // NUEVO: Para diferenciar dueño vs autorizado
  is_vehicle_owner?: boolean; // true = tiene cédula verde, false = tiene azul/autorización

  // NUEVO: Campos de cédula digital
  vehicle_registration_type?: 'green_physical' | 'green_digital' | 'blue_physical' | 'blue_digital' | 'notarial';
  vehicle_registration_digital_url?: string; // URL del PDF con firma DNRPA

  // NUEVO: Carta Verde
  green_card_insurance_url?: string;
  green_card_insurance_expiry?: string; // ISO date
  green_card_insurance_countries?: string[]; // ['AR', 'UY', 'BR', 'PY', 'CL']

  // EXISTENTE: Licencia
  driver_license_expiry?: string; // ISO date
}
```

---

### E. Agregar nuevos DocumentKind types

**Archivo**: `apps/web/src/app/core/models/document.model.ts`

```typescript
export type DocumentKind =
  | 'gov_id_front'
  | 'gov_id_back'
  | 'driver_license'
  | 'vehicle_registration'           // Cédula verde física
  | 'vehicle_registration_digital'   // NUEVO: Cédula digital (PDF DNRPA)
  | 'vehicle_blue_card'              // NUEVO: Cédula azul
  | 'vehicle_insurance'
  | 'green_card_insurance'           // NUEVO: Carta Verde
  | 'utility_bill'
  | 'selfie';
```

---

## 🚀 Implementación por Fases

### Fase 1: Cambios Mínimos (Quick Win)
**Tiempo**: 2-3 horas

1. ✅ Actualizar textos del checklist:
   - Añadir "(OBLIGATORIO)" a licencia conductor
   - Cambiar "cédula verde" → "cédula digital O física"
   - Agregar descripción con Ley 24.449

2. ✅ Reordenar prioridades en checklist locador:
   - Paso 1: Cédula vehículo (antes estaba 2do)
   - Paso 2: DNI (antes estaba 1ro)

3. ✅ Agregar nota informativa:
   - "💡 Cédula digital es GRATIS vs ARS 1.220 física"
   - Link a tutorial Mi Argentina

---

### Fase 2: Nuevos Campos (Medium)
**Tiempo**: 1-2 días

1. ✅ Agregar `DocumentKind` nuevos:
   - `vehicle_registration_digital`
   - `vehicle_blue_card`
   - `green_card_insurance`

2. ✅ Actualizar `documentKinds` array con labels nuevos

3. ✅ Actualizar checklist con validación de Carta Verde

---

### Fase 3: Flujos Diferenciados (Complex)
**Tiempo**: 3-5 días

1. ✅ Agregar campo `is_vehicle_owner` en UserProfile
2. ✅ Crear flujo diferenciado:
   - Dueño (cédula verde/digital)
   - Autorizado (cédula azul + autorización notarial)
3. ✅ Implementar validación de licencia vencida (bloqueo)
4. ✅ Agregar servicio de autorización notarial (monetización)

---

## 📝 Checklist de Validación

Antes de considerar completado:

- [ ] Textos actualizados con terminología correcta (digital/física)
- [ ] Menciona leyes (Ley 24.449, Disposición 343/2024)
- [ ] Prioridad correcta: Cédula vehículo > DNI
- [ ] Licencia marcada como OBLIGATORIA
- [ ] Carta Verde agregada como opcional
- [ ] Diferencia entre dueño y autorizado
- [ ] Informa costo GRATIS de cédula digital
- [ ] Link a tutorial Mi Argentina
- [ ] Validación de licencia vencida (bloqueo)
- [ ] Servicio notarial como opción premium

---

**Status**: 📋 Documento de propuesta completo
**Próximo paso**: Implementar Fase 1 (cambios mínimos) para quick win
