# Solución - Sentry Issue #610: Storage Limit Exceeded

## 🔴 Problema Identificado

**Error:** "The object exceeded the maximum allowed size"
**Impacto:** Usuarios no pueden subir fotos/videos de inspecciones y documentos
**Prioridad:** CRÍTICA

---

## 🔍 Análisis de Causa Raíz

### Problema #1: Inspection Photos sin Compresión (CRÍTICO)
**Archivo:** `shared/components/inspection-uploader/inspection-uploader.component.ts`

**Líneas 172-177:**
```typescript
// ❌ Upload DIRECTO sin compresión
const { error: uploadError } = await supabase.storage
  .from('car-images')
  .upload(filePath, file, {  // Sube archivo original
    cacheControl: '3600',
    upsert: false,
  });
```

**Problema:**
- Valida límite de 2MB pero NO comprime
- Fotos de cámaras modernas (12-48MP) fácilmente superan 2MB
- Usuarios rechazan fotos válidas o las comprimen manualmente (mala UX)
- 8-12 fotos por inspección × 2MB = 16-24MB por inspección

**Impacto Estimado:**
```
1 booking = 2 inspecciones (check-in + check-out)
1 inspección = 8-12 fotos × 2MB = 16-24MB
1 booking = 32-48MB solo en fotos de inspección

1000 bookings/mes = 32-48GB/mes
```

### Problema #2: Video Recording con Bitrate Muy Alto
**Archivo:** `shared/components/video-inspection-recorder/video-inspection-recorder.component.ts`

**Líneas 287-290:**
```typescript
this.mediaRecorder = new MediaRecorder(this.stream!, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 2500000,  // ❌ 2.5 Mbps - DEMASIADO ALTO
});
```

**Problema:**
- Bitrate de 2.5 Mbps genera archivos enormes
- Video de 90 segundos mínimo = ~28MB
- Video de 5 minutos = ~94MB
- No hay límite de duración en UI

**Referencia:** El servicio `VideoDamageDetectionService` tiene límite de 500MB pero es DEMASIADO ALTO para uso real.

**Impacto Estimado:**
```
1 booking = 2 videos (check-in + check-out)
Duración promedio: 3 minutos
1 video @ 2.5 Mbps × 180s = ~56MB
1 booking = 112MB solo en videos

1000 bookings/mes = 112GB/mes
```

### Problema #3: Límites Inconsistentes

| Componente | Límite Actual | Compresión | Bucket |
|------------|---------------|------------|--------|
| Inspection Photos | 2MB | ❌ NO | `car-images` |
| Evidence Uploader | 10MB | ✅ SI (→ 1MB) | `documents` |
| DNI/License | 2MB | ❌ NO | `documents` |
| File Upload Service | 50MB | ✅ SI (→ 1MB) | Variable |
| Video Recorder | 500MB | ❌ NO | GCP (no Supabase) |

### Problema #4: Supabase Storage Limits

**Límites de Supabase:**
- Free tier: 1GB total
- Pro tier: 100GB total
- File size limit: 50MB por archivo (default)
- Overage: $0.10 per GB (si auto-scaling habilitado)

**Si no hay auto-scaling:** Al llegar al límite, TODOS los uploads fallan.

---

## ✅ Solución Propuesta

### Fix #1: Comprimir Inspection Photos (PRIORIDAD ALTA)

Modificar `inspection-uploader.component.ts` para usar `FileUploadService`:

**Cambios:**
```typescript
// ANTES (líneas 134-143)
for (const file of files) {
  const photo = await this.uploadPhoto(file);  // ❌ Upload directo
  if (photo) {
    this.photos.update((p) => [...p, photo]);
  }
}

// DESPUÉS
for (const file of files) {
  const photo = await this.uploadPhotoWithCompression(file);  // ✅ Con compresión
  if (photo) {
    this.photos.update((p) => [...p, photo]);
  }
}

// Nueva función
private async uploadPhotoWithCompression(file: File): Promise<InspectionPhoto | null> {
  try {
    // Comprimir imagen antes de subir (target: 1MB)
    const compressedFile = await this.fileUploadService.compressImage(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
    });

    // Luego upload normal
    return await this.uploadPhoto(compressedFile);
  } catch {
    return null;
  }
}
```

**Beneficios:**
- ✅ Reduce tamaño de fotos en 70-90%
- ✅ Acepta fotos de alta resolución (sin rechazar por tamaño)
- ✅ Mejora UX (usuarios no tienen que comprimir manualmente)
- ✅ Reduce uso de storage: 16-24MB → 3-5MB por inspección

**Impacto en Storage:**
```
ANTES: 32-48MB por booking (fotos)
DESPUÉS: 6-10MB por booking (fotos)
AHORRO: 75-80%
```

### Fix #2: Reducir Bitrate de Video (PRIORIDAD MEDIA)

Modificar `video-inspection-recorder.component.ts`:

**Cambios en líneas 287-290:**
```typescript
// ANTES
this.mediaRecorder = new MediaRecorder(this.stream!, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 2500000,  // ❌ 2.5 Mbps
});

// DESPUÉS
this.mediaRecorder = new MediaRecorder(this.stream!, {
  mimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 750000,  // ✅ 750 kbps (suficiente para inspecciones)
});
```

**Justificación del Bitrate:**
- 750 kbps = calidad suficiente para detectar daños en 1080p
- YouTube recomienda 500-1000 kbps para 480p
- Inspecciones no requieren calidad de cine

**Impacto:**
```
Video de 3 minutos:
ANTES: 2.5 Mbps × 180s = ~56MB
DESPUÉS: 750 kbps × 180s = ~17MB
AHORRO: 70%

Video de 90 segundos (mínimo):
ANTES: ~28MB
DESPUÉS: ~8.4MB
AHORRO: 70%
```

**Beneficios:**
- ✅ Reduce uso de storage en 70%
- ✅ Upload más rápido (mejor UX en conexiones lentas)
- ✅ Calidad sigue siendo excelente para inspecciones
- ✅ Menos probabilidad de exceder límites de GCP

### Fix #3: Agregar Validación de Tamaño con Mensajes Claros

Agregar validación antes de upload en `video-inspection-recorder.component.ts`:

**Líneas 320-327 (processRecording):**
```typescript
private async processRecording() {
  const blob = new Blob(this.recordedChunks, { type: 'video/webm' });

  // ✅ NUEVO: Validar tamaño antes de crear File
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB (Supabase limit)
  if (blob.size > MAX_VIDEO_SIZE) {
    this.recorderError.emit(
      `El video (${(blob.size / 1024 / 1024).toFixed(1)}MB) supera el límite de 50MB. ` +
      `Por favor, grabe un video más corto.`
    );
    return;
  }

  const file = new File([blob], `inspection_${Date.now()}.webm`, { type: 'video/webm' });

  if (this.recordingDuration() < 90) {
    this.recorderError.emit('El video debe durar al menos 90 segundos');
    return;
  }

  // ... resto del código
}
```

**Beneficios:**
- ✅ Previene uploads que fallarán
- ✅ Mensaje claro al usuario sobre el problema
- ✅ Usuario sabe exactamente qué hacer (grabar video más corto)

### Fix #4: Mejorar Error Handling de Storage

Crear una función centralizada para manejar errores de storage:

**Nuevo archivo:** `core/utils/storage-error-handler.util.ts`

```typescript
export interface StorageErrorInfo {
  userMessage: string;
  technicalError: string;
  canRetry: boolean;
  suggestedAction: string;
}

export function handleStorageError(error: unknown): StorageErrorInfo {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Storage limit exceeded
  if (errorMessage.includes('exceeded') || errorMessage.includes('quota')) {
    return {
      userMessage: 'El archivo es demasiado grande para subir. Por favor, intente con un archivo más pequeño.',
      technicalError: errorMessage,
      canRetry: false,
      suggestedAction: 'Comprima el archivo o reduzca su tamaño antes de subir.',
    };
  }

  // Bucket capacity reached
  if (errorMessage.includes('capacity') || errorMessage.includes('storage full')) {
    return {
      userMessage: 'El almacenamiento está temporalmente lleno. Por favor, contacte soporte.',
      technicalError: errorMessage,
      canRetry: false,
      suggestedAction: 'Contacte al equipo de soporte para aumentar la capacidad de almacenamiento.',
    };
  }

  // Network/timeout errors
  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return {
      userMessage: 'Error de conexión. Por favor, verifique su internet e intente nuevamente.',
      technicalError: errorMessage,
      canRetry: true,
      suggestedAction: 'Reintente el upload con mejor conexión a internet.',
    };
  }

  // Generic error
  return {
    userMessage: 'Error al subir archivo. Por favor, intente nuevamente.',
    technicalError: errorMessage,
    canRetry: true,
    suggestedAction: 'Reintente la operación. Si el problema persiste, contacte soporte.',
  };
}
```

**Uso en componentes:**
```typescript
catch (error) {
  const errorInfo = handleStorageError(error);
  this.error.set(errorInfo.userMessage);

  // Log para Sentry con contexto
  this.loggerService.error('Storage upload failed', {
    technicalError: errorInfo.technicalError,
    canRetry: errorInfo.canRetry,
    suggestedAction: errorInfo.suggestedAction,
    fileSize: file.size,
    fileType: file.type,
  });
}
```

### Fix #5: Agregar Límite de Duración al Video Recorder (OPCIONAL)

Para prevenir videos excesivamente largos:

**UI Change en líneas 69-86:**
```typescript
@if (isRecording()) {
  <ion-button
    expand="block"
    [color]="recordingDuration() >= 300 ? 'danger' : 'success'"
    [disabled]="recordingDuration() < 90"
    (click)="stopRecording()"
  >
    <ion-icon slot="start" name="stop-circle"></ion-icon>
    @if (recordingDuration() >= 300) {
      Debe finalizar (máx. 5min)
    } @else {
      Finalizar (mín. 90s)
    }
  </ion-button>
}

<!-- Agregar warning a los 4 minutos -->
@if (recordingDuration() >= 240 && recordingDuration() < 300) {
  <div class="duration-warning">
    <ion-icon name="timer" color="warning"></ion-icon>
    <span>Video casi en límite máximo (5 min)</span>
  </div>
}
```

**Auto-stop en línea 306:**
```typescript
this.recordingTimer = setInterval(() => {
  const duration = this.recordingDuration() + 1;
  this.recordingDuration.set(duration);
  this.updateGuide(duration);
  this.checkQuality();

  // ✅ Auto-stop a los 5 minutos
  if (duration >= 300) {
    this.stopRecording();
    this.qualityWarning.set('Video detenido automáticamente (máx. 5 min)');
  }
}, 1000);
```

---

## 📊 Impacto Estimado de las Soluciones

### Storage Usage por Booking

| Item | Antes | Después | Ahorro |
|------|-------|---------|--------|
| Inspection Photos (16 fotos) | 32MB | 8MB | 75% |
| Videos (2 videos de 3min) | 112MB | 34MB | 70% |
| **Total por booking** | **144MB** | **42MB** | **71%** |

### Storage Usage Mensual (1000 bookings)

| Métrica | Antes | Después | Ahorro |
|---------|-------|---------|--------|
| Storage usado | 144GB/mes | 42GB/mes | 102GB/mes |
| Costo (overage @ $0.10/GB) | $14.40/mes | $4.20/mes | $10.20/mes |

### Beneficios Adicionales

1. **Uploads más rápidos:**
   - Inspección completa: 144MB → 42MB = 3.4× más rápido
   - Mejor UX en conexiones lentas/móviles

2. **Menos errores de upload:**
   - Menos probabilidad de timeout
   - Menos colisiones con límites de bucket

3. **Mejor experiencia de usuario:**
   - No rechazo de fotos válidas
   - Mensajes de error claros
   - Progreso visible en compresión

---

## 🚀 Plan de Implementación

### Fase 1: Fixes Críticos (Prioridad ALTA)
1. ✅ **Comprimir inspection photos** (Fix #1)
2. ✅ **Reducir bitrate de video** (Fix #2)
3. ✅ **Validación de tamaño con mensajes claros** (Fix #3)

**Tiempo estimado:** 4-6 horas
**Impacto:** Reduce 71% del storage usage

### Fase 2: Mejoras de Infraestructura (Prioridad MEDIA)
4. ✅ **Error handling centralizado** (Fix #4)
5. ✅ **Límite de duración en video** (Fix #5)

**Tiempo estimado:** 2-3 horas
**Impacto:** Mejor UX, menos errors en Sentry

### Fase 3: Monitoreo y Optimización (Prioridad BAJA)
6. Dashboard de storage usage en Supabase
7. Cron job para limpiar videos antiguos (>90 días)
8. Analytics de tamaños de archivos promedio

**Tiempo estimado:** 4-6 horas

---

## 🧪 Testing Plan

### Test Cases para Inspection Photos

| Test | Input | Expected Output |
|------|-------|-----------------|
| Foto pequeña (500KB) | Foto 500KB | Comprimida a ~300KB, upload exitoso |
| Foto mediana (1.5MB) | Foto 1.5MB | Comprimida a ~800KB, upload exitoso |
| Foto grande (3MB) | Foto 3MB | Comprimida a ~1MB, upload exitoso |
| Foto muy grande (10MB) | Foto 10MB | Comprimida a ~1MB, upload exitoso |
| 12 fotos en batch | 12 fotos × 2MB | Todas comprimidas y subidas exitosamente |

### Test Cases para Video Recording

| Test | Input | Expected Output |
|------|-------|-----------------|
| Video corto (90s) | Video 90s @ 750kbps | ~8.4MB, upload exitoso |
| Video medio (3min) | Video 180s @ 750kbps | ~17MB, upload exitoso |
| Video largo (5min) | Video 300s @ 750kbps | ~28MB, upload exitoso |
| Video muy largo (intentar >5min) | Grabar >5min | Auto-stop a 5min con warning |

### Test Cases para Error Handling

| Test | Simulated Error | Expected User Message |
|------|-----------------|----------------------|
| File too large | Subir archivo 60MB | "El archivo es demasiado grande..." |
| Storage full | Bucket quota exceeded | "Almacenamiento temporalmente lleno..." |
| Network timeout | Desconectar durante upload | "Error de conexión. Verifique su internet..." |

---

## 📝 Checklist de Deployment

### Pre-deployment
- [ ] Crear backup de buckets `car-images` y `documents`
- [ ] Verificar límites actuales de Supabase Storage
- [ ] Confirmar que `browser-image-compression` está instalado
- [ ] Tests locales pasando

### Deployment
- [ ] Merge PR con fixes #1, #2, #3
- [ ] Deploy a staging
- [ ] Smoke tests en staging:
  - [ ] Upload de fotos de inspección (compresión funcionando)
  - [ ] Grabación de video (bitrate reducido)
  - [ ] Mensajes de error claros en caso de falla
- [ ] Deploy a producción
- [ ] Monitorear Sentry por 24 horas

### Post-deployment
- [ ] Verificar reducción de errores #610 en Sentry
- [ ] Monitorear usage de Supabase Storage
- [ ] Feedback de usuarios (¿uploads más rápidos?)
- [ ] Analytics de tamaños promedio de archivos

---

## 🔄 Rollback Plan (Si algo sale mal)

```bash
# Revertir cambios si hay problemas críticos
git revert <commit-hash-fix-610>

# Restaurar buckets desde backup si necesario
supabase storage restore --bucket car-images --from-backup <backup-id>
```

**Indicadores de necesidad de rollback:**
- Aumento de errores de upload (>5% más que baseline)
- Usuarios reportando fotos/videos con calidad muy baja
- Problemas de performance en compresión (app se congela)

---

## 📚 Referencias

- [Supabase Storage Limits](https://supabase.com/docs/guides/storage/limits)
- [browser-image-compression](https://www.npmjs.com/package/browser-image-compression)
- [MediaRecorder Bitrate Guide](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/videoBitsPerSecond)
- [YouTube Recommended Bitrates](https://support.google.com/youtube/answer/1722171)

---

**Autor:** Claude Sonnet 4.5
**Fecha:** 2026-01-26
**Issue Sentry:** #610
**Prioridad:** 🔴 CRÍTICA
**Estado:** ✅ SOLUCIÓN PROPUESTA - PENDIENTE DE IMPLEMENTACIÓN
