# 🎨 Generador de Fotos con IA para Autos

Sistema automatizado para generar fotos de autos usando Cloudflare AI (FLUX.1-schnell).

## ✨ Características

- Genera 3 fotos por auto (vista 3/4 frontal, lateral, trasera)
- Usa Cloudflare AI Worker con FLUX.1-schnell para generación realista
- Sube automáticamente a Supabase Storage
- Registra las fotos en la base de datos
- Procesa solo autos que NO tienen fotos

## 🚀 Uso

### Generar fotos para 5 autos:
```bash
cd apps/web
npx tsx scripts/generate-photos-bulk.ts --method cloudflare-ai --limit 5
```

### Generar fotos para 10 autos:
```bash
cd apps/web
npx tsx scripts/generate-photos-bulk.ts --method cloudflare-ai --limit 10
```

### Generar fotos para TODOS los autos sin fotos:
```bash
cd apps/web
npx tsx scripts/generate-photos-bulk.ts --method cloudflare-ai --limit 100
```

## 📊 Salida del Script

El script muestra en tiempo real:
- ✅ Autos procesados exitosamente
- 🎨 Fotos generadas para cada ángulo
- ⚠️  Errores si ocurren
- 📊 Resumen final con estadísticas

## ⚙️ Configuración

El script usa automáticamente las variables de entorno de `.env.development.local`:
- `NG_APP_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 🔧 Cómo Funciona

1. Busca autos en la base de datos que NO tienen fotos
2. Para cada auto:
   - Genera 3 fotos con IA (3/4-front, side, rear)
   - Sube cada foto a Supabase Storage bucket `car-photos`
   - Registra las URLs en la tabla `car_photos`
3. Espera 2 segundos entre autos para no saturar la API

## 📸 Ángulos Generados

- **3/4-front**: Vista frontal-lateral (la más atractiva)
- **side**: Vista lateral completa
- **rear**: Vista trasera

## ⏱️ Tiempo Estimado

- Por auto: ~15-20 segundos (3 fotos)
- 5 autos: ~2 minutos
- 10 autos: ~4 minutos
- 20 autos: ~7 minutos

## �� Worker de Cloudflare AI

URL: `https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev`

Modelo: FLUX.1-schnell (4 pasos de inferencia, rápido y de alta calidad)

## 📝 Notas

- El script crea automáticamente el bucket `car-photos` si no existe
- Usa el service role key para bypass RLS policies
- Las fotos generadas son realistas y de alta calidad
- Cada foto tiene aproximadamente 512x512px en formato PNG
