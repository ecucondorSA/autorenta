# 🚀 Cloudflare AI Setup - Car Image Generation with FLUX.1

## ✅ Implementación y Deployment Completados

Se ha creado y **desplegado en producción** un **Cloudflare Worker** que genera imágenes de autos desde cero usando **FLUX.1-schnell**, el modelo de generación de imágenes más rápido de Cloudflare AI.

**🌐 Worker URL:** `https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev`
**⚡ Performance:** ~1.7s por imagen con 4 steps
**✅ Status:** Deployed and operational (2025-10-23)

---

## 📦 Archivos Creados

### Cloudflare Worker:
```
functions/workers/ai-car-generator/
├── src/
│   └── index.ts          # Worker principal con FLUX.1
├── wrangler.toml          # Configuración de Cloudflare
├── package.json           # Dependencias
└── tsconfig.json          # TypeScript config
```

### Servicios Angular:
```
apps/web/src/app/core/services/
├── cloudflare-ai.service.ts       # Cliente del worker
└── ai-photo-enhancer.service.ts   # Actualizado con soporte dual
```

---

## 🎯 Características

### Worker (FLUX.1-schnell):
- ✅ Genera imágenes de **512x512** en **2-5 segundos**
- ✅ Múltiples ángulos: front, side, 3/4-front, interior, rear
- ✅ Múltiples estilos: showroom, street, studio, outdoor
- ✅ Prompts optimizados para fotográfia automotriz
- ✅ CORS habilitado para Angular
- ✅ Retorna imágenes en base64 (PNG)

### Angular Service:
- ✅ Soporte dual: Stock Photos (rápido) + Cloudflare AI (generación real)
- ✅ Selector de método en UI
- ✅ Fallback automático si worker no disponible
- ✅ Generación de múltiples ángulos en paralelo

---

## 🚀 Deploy del Worker

### Paso 1: Instalar dependencias

```bash
cd functions/workers/ai-car-generator
npm install
```

### Paso 2: Login a Cloudflare

```bash
npx wrangler login
```

Se abrirá tu navegador para autenticar.

### Paso 3: Deploy

```bash
npm run deploy
```

**Output esperado:**
```
✨  Built successfully, built project size is 3 KiB.
✨  Successfully published your script to
 https://autorent-ai-car-generator.YOUR_SUBDOMAIN.workers.dev
```

### Paso 4: Copiar URL del Worker

✅ **URL del Worker Desplegado:**
```
https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev
```

### Paso 5: Actualizar Angular

✅ **COMPLETADO** - Angular service ya actualizado en línea 40 con la URL del worker desplegado.

---

## 🧪 Testing del Worker

### Test Local (antes del deploy):

```bash
cd functions/workers/ai-car-generator
npm run dev
```

Worker estará en: `http://localhost:8787`

**Test con curl:**
```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "Toyota",
    "model": "Corolla",
    "year": 2024,
    "color": "rojo",
    "angle": "3/4-front",
    "style": "showroom",
    "num_steps": 4
  }'
```

**Output esperado:**
```json
{
  "success": true,
  "image": "iVBORw0KGgoAAAANSUhEUgAA...", // Base64 muy largo
  "metadata": {
    "prompt": "2024 Toyota Corolla in rojo color, 3/4 front view...",
    "model": "@cf/black-forest-labs/flux-1-schnell",
    "steps": 4,
    "duration_ms": 2847
  }
}
```

### Test en Producción (después del deploy):

✅ **Worker Desplegado y Funcionando**

```bash
curl -X POST https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "Honda",
    "model": "Civic",
    "angle": "side"
  }'
```

**Resultado de Test Real:**
- ✅ Worker responde correctamente
- ✅ Genera imágenes con FLUX.1-schnell
- ✅ Tiempo de generación: ~1.7-2.8 segundos con 4 steps
- ✅ CORS habilitado correctamente
- ✅ Prompts optimizados funcionando

---

## 💻 Uso desde Angular

### Opción 1: Stock Photos (Default, Rápido)

```typescript
// En publish-car-v2.page.ts
const photos = await this.aiPhotoEnhancer.generateCarPhotos({
  brand: 'Toyota',
  model: 'Corolla',
  year: 2024,
  color: 'Rojo',
  count: 3,
  method: 'stock-photos' // Default
});
```

**Resultado:** 3 fotos reales de stock en ~5-10 segundos

### Opción 2: Cloudflare AI (Generación Real)

```typescript
// En publish-car-v2.page.ts
const photos = await this.aiPhotoEnhancer.generateCarPhotos({
  brand: 'Toyota',
  model: 'Corolla',
  year: 2024,
  color: 'Rojo',
  count: 3,
  method: 'cloudflare-ai' // Generación con FLUX.1
});
```

**Resultado:** 3 imágenes generadas con IA en ~6-15 segundos

---

## 🎨 Parámetros del Worker

### Request Body:

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `brand` | string | ✅ Sí | - | Marca del auto (ej: "Toyota") |
| `model` | string | ✅ Sí | - | Modelo (ej: "Corolla") |
| `year` | number | ❌ No | - | Año (ej: 2024) |
| `color` | string | ❌ No | - | Color (ej: "rojo", "silver") |
| `angle` | string | ❌ No | `'3/4-front'` | Ángulo de cámara |
| `style` | string | ❌ No | `'showroom'` | Estilo/ambiente |
| `num_steps` | number | ❌ No | `4` | Steps de generación (1-8) |

### Angles disponibles:
- `'front'` - Vista frontal
- `'side'` - Perfil lateral
- `'rear'` - Vista trasera
- `'3/4-front'` - ¾ frontal (recomendado)
- `'interior'` - Interior/tablero

### Styles disponibles:
- `'showroom'` - Sala de exhibición (recomendado)
- `'street'` - Calle urbana
- `'studio'` - Estudio fotográfico
- `'outdoor'` - Exterior/paisaje

### Num Steps (Balance speed/quality):
- `1` - Ultra rápido (~1s), baja calidad
- `4` - **Recomendado** (~2-3s), buena calidad
- `8` - Máxima calidad (~5-7s)

---

## 💰 Costos

### Cloudflare Workers AI Pricing:

| Tier | Precio | Imágenes/mes | Costo por 1000 imgs |
|------|--------|--------------|---------------------|
| **Free** | $0 | 10,000 | **$0** |
| **Paid** | $5 base + usage | Ilimitadas | $0.011 |

### Escenarios:

**MVP (Free tier):**
```
100 autos publicados/mes × 3 fotos = 300 imágenes
Costo: $0 (dentro del free tier de 10,000)
```

**Producción (1000 autos/mes):**
```
1,000 autos × 3 fotos = 3,000 imágenes
Costo: $5 base + (3,000/1,000 × $0.011) = $5.033/mes
```

**Comparación:**
- DALL-E 3: $0.040/imagen = $120/mes para 3000 imgs
- Midjourney: $10-30/mes con límites
- **Cloudflare FLUX**: $5.033/mes ilimitado ✅

---

## 🔧 Configuración Avanzada

### Cambiar Modelo:

Cloudflare AI soporta otros modelos. Edita `src/index.ts` línea 78:

```typescript
// FLUX.1-schnell (actual, más rápido)
'@cf/black-forest-labs/flux-1-schnell'

// Alternativas:
'@cf/stabilityai/stable-diffusion-xl-base-1.0'  // Más lento, mejor calidad
'@cf/lykon/dreamshaper-8-lcm'                   // Estilo artístico
```

### Ajustar Timeout:

Edita `wrangler.toml` línea 12:

```toml
[limits]
cpu_ms = 30000  # 30 segundos (aumentar si usas 8 steps)
```

### Logs en Tiempo Real:

```bash
cd functions/workers/ai-car-generator
npm run tail
```

Verás logs en vivo cuando el worker reciba requests.

---

## 🐛 Troubleshooting

### Error: "AI binding not found"

**Causa:** Worker no tiene binding AI configurado

**Solución:**
```toml
# Verificar wrangler.toml tiene:
[ai]
binding = "AI"
```

### Error: "CORS policy blocked"

**Causa:** Frontend en dominio diferente

**Solución:** El worker ya tiene CORS habilitado en líneas 33-37. Verifica que el frontend use la URL correcta.

### Error: "Request timeout"

**Causa:** num_steps muy alto o worker sobrecargado

**Solución:** Reducir `num_steps` a 4 o menos.

### Imagen generada no se parece al auto

**Causa:** Prompt no lo suficientemente específico

**Solución:** Agregar más detalles en `buildCarPrompt()` función (línea 117).

---

## 📊 Monitoring

### Ver uso de Workers AI:

1. Dashboard de Cloudflare: https://dash.cloudflare.com
2. Workers & Pages → AI
3. Ver:
   - Requests totales
   - Duración promedio
   - Errores
   - Costos

### Logs:

```bash
# En tiempo real
wrangler tail

# Ver logs pasados
wrangler tail --format json > logs.json
```

---

## 🎯 Roadmap

### Fase 1 (Actual): Stock Photos + FLUX.1
- ✅ Stock photos para MVP
- ✅ Cloudflare Worker con FLUX.1
- ✅ Selector dual en UI

### Fase 2 (Próximo mes):
- [ ] UI mejorado con selector de método
- [ ] Preview de prompts antes de generar
- [ ] Sistema de caché (guardar imágenes generadas)
- [ ] Regeneración con ajustes (color, ángulo)

### Fase 3 (Futuro):
- [ ] Upscaling con Cloudflare AI
- [ ] Inpainting (editar partes de la imagen)
- [ ] Background replacement (cambiar fondo)
- [ ] Batch generation (generar 10+ fotos a la vez)

---

## ✅ Checklist de Deploy

- [x] Worker instalado: `cd functions/workers/ai-car-generator && npm install`
- [x] Worker desplegado: `npm run deploy`
- [x] URL copiada del output
- [x] URL actualizada en `cloudflare-ai.service.ts` línea 40
- [x] Test producción: curl a URL desplegada ✅ 1.7s generation time
- [ ] Test desde Angular: Click en "Generar Fotos con IA" (método Cloudflare AI)
- [ ] Verificar imágenes generadas en UI
- [ ] Monitoreo configurado: `wrangler tail` (opcional)

---

## 📝 Notas Importantes

1. **Free Tier:** 10,000 imágenes/mes gratis (suficiente para MVP)
2. **Performance:** ~2-5 segundos por imagen con num_steps=4
3. **Calidad:** Mejor que stock photos para autos específicos
4. **Limitación:** 512x512 resolución (puede upscalarse después)
5. **Alternativa:** Stock photos sigue disponible (más rápido para testing)

---

## 🔗 Links Útiles

- **Cloudflare AI Docs:** https://developers.cloudflare.com/workers-ai/
- **FLUX.1 Model:** https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/
- **Pricing:** https://developers.cloudflare.com/workers-ai/platform/pricing/

---

**Creado por:** Claude Code
**Fecha:** 2025-10-23
**Worker:** autorent-ai-car-generator
**Modelo:** FLUX.1-schnell
