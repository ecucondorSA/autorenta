# 📸 Documentación de Prompts para Generación de Fotos con IA

## 🎯 Resumen General

El sistema genera **3 fotos automáticas** con diferentes ángulos cuando el usuario hace clic en "Generar fotos AutorentA".

**Modelo usado:** FLUX.1-schnell (Cloudflare AI)
**Worker URL:** https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev
**Ubicación del código:** `/home/edu/autorenta/functions/workers/ai-car-generator/src/index.ts`

---

## 🔄 Flujo de Generación

### 1. Usuario hace clic en el botón

**Archivo:** `apps/web/src/app/features/cars/publish/publish-car-v2.page.ts`
**Línea:** 691-747

```typescript
async generateAIPhotos(): Promise<void> {
  // ...
  const enhancedPhotos = await this.aiPhotoEnhancer.generateCarPhotos({
    brand: brand.name,           // Ej: "Honda"
    model: model.name,           // Ej: "Civic"
    year: this.publishForm.get('year')?.value,    // Ej: 2024
    color: this.publishForm.get('color')?.value,  // Ej: "rojo"
    count: 3,                    // Generar 3 fotos
    method: 'cloudflare-ai',     // Usar Cloudflare AI
  });
  // ...
}
```

### 2. Se definen los ángulos automáticamente

**Archivo:** `apps/web/src/app/core/services/ai-photo-enhancer.service.ts`
**Línea:** 123-128

```typescript
const angles: Array<'front' | 'side' | 'rear' | '3/4-front' | 'interior'> =
  count === 1
    ? ['3/4-front']                      // Si es 1: solo 3/4 frontal
    : count === 2
      ? ['3/4-front', 'side']            // Si son 2: 3/4 frontal + lateral
      : ['3/4-front', 'side', 'interior']; // Si son 3: 3/4 frontal + lateral + interior
```

**Para el caso actual (count = 3), los ángulos son:**
1. `'3/4-front'` - Vista 3/4 frontal
2. `'side'` - Vista lateral
3. `'interior'` - Vista interior del tablero

### 3. Se envía request al Worker de Cloudflare

**Archivo:** `apps/web/src/app/core/services/cloudflare-ai.service.ts`
**Línea:** 45-67

```typescript
const response = await firstValueFrom(
  this.http.post<CloudflareAIResponse>(this.WORKER_URL, params)
);

// Ejemplo de params enviados:
{
  brand: "Honda",
  model: "Civic",
  year: 2024,
  color: "rojo",
  angle: "3/4-front",  // Se envía 3 veces con diferentes ángulos
  style: "showroom",
  num_steps: 4
}
```

---

## 🎨 Construcción del Prompt en el Worker

**Archivo:** `functions/workers/ai-car-generator/src/index.ts`
**Función:** `buildCarPrompt()` (línea 184-250)

### Estructura del Prompt

El prompt se construye en **6 partes**:

#### 1️⃣ Año, Marca y Modelo
```typescript
if (req.year) {
  parts.push(`${req.year} ${req.brand} ${req.model}`);
} else {
  parts.push(`${req.brand} ${req.model}`);
}
```

**Ejemplo:** `"2024 Honda Civic"`

---

#### 2️⃣ Color (si se especifica)
```typescript
if (req.color) {
  parts.push(`in ${req.color.toLowerCase()} color`);
}
```

**Ejemplo:** `"in rojo color"`

---

#### 3️⃣ Ángulo de la Cámara
```typescript
const anglePrompts = {
  'front': 'front view',
  'side': 'side profile view',
  'rear': 'rear view',
  '3/4-front': '3/4 front view',
  'interior': 'interior dashboard view',
};
const angle = req.angle || '3/4-front';
parts.push(anglePrompts[angle]);
```

**Ejemplos según ángulo:**
- **3/4-front:** `"3/4 front view"`
- **side:** `"side profile view"`
- **interior:** `"interior dashboard view"`

---

#### 4️⃣ Estilo y Ambiente
```typescript
const stylePrompts = {
  'showroom': 'in modern car showroom, professional studio lighting, reflective floor',
  'street': 'on urban street, natural daylight, city background',
  'studio': 'in photo studio, dramatic lighting, clean white background',
  'outdoor': 'in scenic outdoor location, golden hour lighting, natural environment',
};
const style = req.style || 'showroom';
parts.push(stylePrompts[style]);
```

**Actualmente siempre usa:** `"showroom"`

**Prompt generado:** `"in modern car showroom, professional studio lighting, reflective floor"`

---

#### 5️⃣ Calidad y Características Técnicas
```typescript
parts.push(
  'professional car photography',
  'high resolution',
  '8k quality',
  'ultra detailed',
  'sharp focus',
  'automotive magazine quality',
  'perfect composition'
);
```

---

#### 6️⃣ Negative Prompt (qué NO queremos)
```typescript
const negativeElements = [
  'blurry',
  'low quality',
  'distorted',
  'damaged',
  'cartoon',
  'illustration',
  'people',
  'text',
  'watermark',
];

const negativePrompt = negativeElements.join(', ');
return `${fullPrompt}. Avoid: ${negativePrompt}`;
```

---

## 📋 Ejemplos de Prompts Completos

### Ejemplo 1: Honda Civic 2024 Rojo - Vista 3/4 Frontal

**Input:**
```json
{
  "brand": "Honda",
  "model": "Civic",
  "year": 2024,
  "color": "rojo",
  "angle": "3/4-front",
  "style": "showroom",
  "num_steps": 4
}
```

**Prompt generado:**
```
2024 Honda Civic, in rojo color, 3/4 front view, in modern car showroom, professional studio lighting, reflective floor, professional car photography, high resolution, 8k quality, ultra detailed, sharp focus, automotive magazine quality, perfect composition. Avoid: blurry, low quality, distorted, damaged, cartoon, illustration, people, text, watermark
```

---

### Ejemplo 2: Honda Civic 2024 Rojo - Vista Lateral

**Input:**
```json
{
  "brand": "Honda",
  "model": "Civic",
  "year": 2024,
  "color": "rojo",
  "angle": "side",
  "style": "showroom",
  "num_steps": 4
}
```

**Prompt generado:**
```
2024 Honda Civic, in rojo color, side profile view, in modern car showroom, professional studio lighting, reflective floor, professional car photography, high resolution, 8k quality, ultra detailed, sharp focus, automotive magazine quality, perfect composition. Avoid: blurry, low quality, distorted, damaged, cartoon, illustration, people, text, watermark
```

---

### Ejemplo 3: Honda Civic 2024 Rojo - Vista Interior

**Input:**
```json
{
  "brand": "Honda",
  "model": "Civic",
  "year": 2024,
  "color": "rojo",
  "angle": "interior",
  "style": "showroom",
  "num_steps": 4
}
```

**Prompt generado:**
```
2024 Honda Civic, in rojo color, interior dashboard view, in modern car showroom, professional studio lighting, reflective floor, professional car photography, high resolution, 8k quality, ultra detailed, sharp focus, automotive magazine quality, perfect composition. Avoid: blurry, low quality, distorted, damaged, cartoon, illustration, people, text, watermark
```

---

## 🔧 Cómo Modificar los Prompts

### Opción 1: Cambiar los ángulos generados

**Archivo:** `apps/web/src/app/core/services/ai-photo-enhancer.service.ts`
**Línea:** 123-128

Actualmente genera:
```typescript
['3/4-front', 'side', 'interior']
```

Podrías cambiar a:
```typescript
['3/4-front', 'side', 'rear']  // Reemplazar interior por vista trasera
```

O:
```typescript
['front', '3/4-front', 'side']  // Reemplazar interior por vista frontal
```

---

### Opción 2: Cambiar el estilo del ambiente

**Archivo:** `functions/workers/ai-car-generator/src/index.ts`
**Línea:** 217

Actualmente usa `'showroom'` por defecto. Podrías cambiar a:

```typescript
const style = req.style || 'street';  // Cambiar a calle urbana
```

O permitir que el usuario lo seleccione desde el formulario.

---

### Opción 3: Agregar más detalles al prompt

**Archivo:** `functions/workers/ai-car-generator/src/index.ts`
**Línea:** 221-229

Podrías agregar más keywords:

```typescript
parts.push(
  'professional car photography',
  'high resolution',
  '8k quality',
  'ultra detailed',
  'sharp focus',
  'automotive magazine quality',
  'perfect composition',
  // AGREGAR NUEVAS KEYWORDS:
  'cinematic lighting',
  'HDR',
  'bokeh background',
  'professional color grading'
);
```

---

### Opción 4: Modificar el negative prompt

**Archivo:** `functions/workers/ai-car-generator/src/index.ts`
**Línea:** 232-242

Podrías agregar más elementos a evitar:

```typescript
const negativeElements = [
  'blurry',
  'low quality',
  'distorted',
  'damaged',
  'cartoon',
  'illustration',
  'people',
  'text',
  'watermark',
  // AGREGAR NUEVOS:
  'toy car',
  'miniature',
  'plastic',
  'fake',
  'rendering artifacts'
];
```

---

## ⚙️ Parámetros de Generación

### num_steps (Velocidad vs Calidad)

**Ubicación:** `apps/web/src/app/core/services/ai-photo-enhancer.service.ts`
**Línea:** 144

```typescript
num_steps: 4,  // Balance speed/quality
```

**Opciones:**
- `num_steps: 1` - Muy rápido (~1s), calidad baja
- `num_steps: 2` - Rápido (~1.5s), calidad aceptable
- `num_steps: 4` - **Balance ideal** (~2-3s), buena calidad ✅ ACTUAL
- `num_steps: 6` - Lento (~4-5s), mejor calidad
- `num_steps: 8` - Muy lento (~6-8s), máxima calidad

**Recomendación:** Mantener en 4 steps para buen balance.

---

## 📊 Diagrama de Flujo

```
Usuario hace clic en "Generar fotos AutorentA"
           ↓
Marca: Honda, Modelo: Civic, Año: 2024, Color: rojo
           ↓
Se definen 3 ángulos: ['3/4-front', 'side', 'interior']
           ↓
Para cada ángulo:
           ↓
  Se construye el prompt:
    - "2024 Honda Civic"
    - "in rojo color"
    - "{angle_prompt}"  (ej: "3/4 front view")
    - "in modern car showroom, professional studio lighting..."
    - "professional car photography, high resolution, 8k quality..."
    - "Avoid: blurry, low quality, distorted..."
           ↓
  Se envía al Worker de Cloudflare:
    POST https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev
           ↓
  Worker llama a FLUX.1-schnell:
    @cf/black-forest-labs/flux-1-schnell
           ↓
  IA genera imagen (2-3 segundos)
           ↓
  Worker retorna imagen en base64
           ↓
  Frontend convierte a Blob y muestra preview
           ↓
Se repite 3 veces (una por cada ángulo)
           ↓
Usuario ve 3 fotos generadas automáticamente
```

---

## 🎯 Resumen de Configuración Actual

| Parámetro | Valor Actual | Ubicación |
|-----------|--------------|-----------|
| **Cantidad de fotos** | 3 | `ai-photo-enhancer.service.ts:720` |
| **Ángulos** | `['3/4-front', 'side', 'interior']` | `ai-photo-enhancer.service.ts:128` |
| **Estilo** | `'showroom'` | `ai-photo-enhancer.service.ts:143` |
| **Steps** | `4` | `ai-photo-enhancer.service.ts:144` |
| **Modelo IA** | `@cf/black-forest-labs/flux-1-schnell` | `ai-car-generator/src/index.ts:87` |
| **Worker URL** | `https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev` | `cloudflare-ai.service.ts:40` |

---

## 🚀 Mejoras Sugeridas

### 1. Permitir al usuario elegir el estilo

Agregar un selector en el formulario de publicar auto:

```typescript
// En publish-car-v2.page.ts
<select>
  <option value="showroom">Showroom (profesional)</option>
  <option value="street">Calle urbana</option>
  <option value="outdoor">Exterior natural</option>
</select>
```

### 2. Permitir al usuario elegir los ángulos

Agregar checkboxes para que el usuario seleccione qué ángulos quiere:

```typescript
☑ Vista 3/4 frontal
☑ Vista lateral
☐ Vista trasera
☑ Vista interior
```

### 3. Agregar progreso visual

Mostrar barra de progreso mientras se generan las imágenes:

```
Generando imagen 1/3: Vista 3/4 frontal... ⏳
Generando imagen 2/3: Vista lateral... ⏳
Generando imagen 3/3: Vista interior... ⏳
```

### 4. Permitir regenerar imágenes individuales

Si al usuario no le gusta una foto, poder regenerarla sin tener que regenerar las 3:

```typescript
[🔄 Regenerar esta foto]
```

---

## 📝 Notas Importantes

1. **Performance:** Cada imagen tarda ~2-3 segundos en generarse. Con 3 imágenes, el total es ~6-9 segundos.

2. **Costos:** FLUX.1-schnell es el modelo más rápido y económico de Cloudflare AI. Es perfecto para este caso de uso.

3. **Calidad:** Con 4 steps se obtiene un excelente balance entre velocidad y calidad.

4. **Prompts en Español:** Actualmente los colores se pasan en español (ej: "rojo"). FLUX.1 entiende bien el español, pero si quieres mejor calidad, podrías traducir a inglés:
   - "rojo" → "red"
   - "azul" → "blue"
   - "negro" → "black"

5. **Worker desplegado:** El worker ya está en producción y funcionando correctamente.

---

**Última actualización:** 2025-10-23
**Modelo usado:** FLUX.1-schnell
**Worker URL:** https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev
