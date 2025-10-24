# 🤖 AI Photo Generation - Setup Guide

## ✅ Implementado

Se ha agregado la funcionalidad de generación de fotos con IA para autos usando:
- **Stock Photos** de Unsplash (fotos reales de autos)
- **Background Removal** con ONNX Runtime (ya implementado)
- **Composición** de fondo profesional

## 📋 Configuración Requerida

### 1. Obtener Unsplash API Key (GRATIS)

1. Ve a: https://unsplash.com/developers
2. Click en "Register as a developer"
3. Crea una nueva aplicación
4. Copia tu **Access Key**

**Límites gratuitos:**
- 50 requests/hora
- Totalmente gratis para desarrollo

### 2. Configurar la API Key

Edita el archivo:
```
apps/web/src/app/core/services/stock-photos.service.ts
```

Línea 32, reemplaza:
```typescript
private readonly UNSPLASH_ACCESS_KEY = 'YOUR_UNSPLASH_ACCESS_KEY_HERE';
```

Por:
```typescript
private readonly UNSPLASH_ACCESS_KEY = 'TU_ACCESS_KEY_AQUÍ';
```

## 🚀 Cómo Funciona

### Flujo del Usuario:

1. Usuario completa formulario (marca, modelo, año, color)
2. Click en **"✨ Generar Fotos con IA"**
3. El sistema:
   - Busca fotos profesionales del auto en Unsplash
   - Descarga las 3 mejores fotos
   - Remueve el fondo con ONNX (modelo RMBG-1.4)
   - Agrega fondo profesional (showroom/white)
   - Muestra preview en la UI
4. Usuario puede:
   - ✅ Usar las fotos generadas
   - ✅ Agregar más fotos propias
   - ✅ Eliminar y regenerar

### Código de Ejemplo:

```typescript
// 1. Usuario selecciona marca y modelo
publishForm.patchValue({
  brand_id: 'toyota-uuid',
  model_id: 'corolla-uuid',
  year: 2024,
  color: 'Rojo'
});

// 2. Click en "Generar Fotos con IA"
await generateAIPhotos();

// 3. Sistema genera 3 fotos automáticamente
// Resultado: 3 fotos profesionales del Toyota Corolla 2024 rojo
```

## 📁 Archivos Creados/Modificados

### Nuevos Servicios:
1. **`stock-photos.service.ts`** - Integración con Unsplash API
2. **`ai-photo-enhancer.service.ts`** - Combina stock photos + background removal

### Modificaciones:
1. **`publish-car-v2.page.ts`** - Agregado botón y lógica de generación
   - Línea 9: Import del servicio
   - Línea 390: Inyección del servicio
   - Línea 403: Signal `isGeneratingAIPhotos`
   - Línea 669-724: Función `generateAIPhotos()`
   - Línea 294-306: Botón "Generar Fotos con IA" en template

## 🎨 UX Mejorado

**Antes:**
- Usuario debía sacar 3-10 fotos del auto
- Proceso lento y tedioso
- Calidad inconsistente

**Después:**
- Click en "Generar con IA"
- 3 fotos profesionales en 5-10 segundos
- Calidad profesional consistente
- Usuario puede publicar inmediatamente

## 🔧 Troubleshooting

### Error: "No se encontraron fotos"
**Causa:** Marca/modelo muy específico o raro
**Solución:** El servicio tiene fallback automático (busca solo por marca)

### Error: "Failed to download photo"
**Causa:** Problema de red o límite de Unsplash excedido
**Solución:**
- Verifica conexión a internet
- Espera 1 hora (límite: 50 requests/hora)

### Error: "Background removal failed"
**Causa:** Modelo ONNX no cargó
**Solución:** El sistema usa la foto original como fallback

### Fotos no se ven bien
**Causa:** Stock photo no coincide con marca/modelo
**Solución:** Usuario puede eliminar y regenerar, o subir fotos propias

## 🎯 Próximos Pasos (Opcional)

### Fase 2: Cloudflare AI Workers (Futuro)
Si quieres **generación verdadera** (no stock photos):

1. Crear Worker de generación:
```bash
cd functions/workers
npm create cloudflare@latest ai-car-generator
```

2. Usar FLUX.1-schnell:
```typescript
const image = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
  prompt: `${brand} ${model} ${year}, professional car photography`
});
```

**Ventajas:**
- Generación personalizada (color, ángulo, etc.)
- Más barato ($0.011/1000 imágenes)
- No depende de stock photos

**Desventajas:**
- Requiere Cloudflare AI Workers
- Imágenes generadas (no reales)

## 💰 Costos

| Solución | Costo | Límites |
|----------|-------|---------|
| **Unsplash API** (actual) | **GRATIS** | 50 requests/hora |
| **ONNX Background Removal** (actual) | **GRATIS** | Ilimitado (local) |
| Cloudflare AI Workers (futuro) | $0.011/1000 imgs | Según plan |

## ✅ Testing

Para probar la funcionalidad:

1. Ir a `/cars/publish`
2. Seleccionar marca: **Toyota**
3. Seleccionar modelo: **Corolla**
4. Click en **"✨ Generar Fotos con IA"**
5. Esperar 5-10 segundos
6. Verificar que aparecen 3 fotos

**Marcas/modelos recomendados para testing:**
- ✅ Toyota Corolla
- ✅ Honda Civic
- ✅ Ford Mustang
- ✅ Chevrolet Camaro
- ✅ BMW Serie 3

## 📝 Notas Importantes

1. **API Key de Unsplash es obligatoria** - Sin ella, la funcionalidad no funcionará
2. **Background removal es opcional** - Si falla, usa foto original
3. **Límite de 50 requests/hora** - Para producción, considera plan pago o Cloudflare AI
4. **Fotos son de stock** - NO son generadas, son fotos reales de Unsplash

## 🤝 Créditos

- **Unsplash** - Fotos de stock
- **ONNX Runtime Web** - Background removal
- **RMBG-1.4 Model** - Modelo de remoción de fondo

---

**Generado por:** Claude Code
**Fecha:** 2025-10-23
**Responsable:** Equipo AutoRent Dev
