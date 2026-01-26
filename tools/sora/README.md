# Sora 2 Video Generator

Generador automatizado de videos con Sora 2 usando Patchright (anti-detección).

## 📦 Instalación

```bash
# Instalar dependencias
pip install patchright aiofiles

# Instalar navegador Chromium para Patchright
python -m patchright install chromium
```

## 🔧 Configuración

Crear archivo `.env` o exportar variables:

```bash
export OPENAI_EMAIL="tu-email@example.com"
export OPENAI_PASSWORD="tu-password"
```

## 🚀 Uso

### Línea de Comandos

```bash
# Generar un video básico
python sora_generator.py -p "Un auto eléctrico moderno atravesando Buenos Aires"

# Con opciones personalizadas
python sora_generator.py \
  --prompt "Un BMW i4 blanco estacionado frente a un edificio moderno" \
  --duration 15 \
  --ratio "9:16" \
  --quality "4K" \
  --output mi_video.mp4

# Modo headless (sin ventana visible)
python sora_generator.py -p "..." --headless
```

### Uso Programático

```python
import asyncio
from sora_generator import SoraGenerator

async def generar_video():
    async with SoraGenerator(headless=False) as generator:
        # Login
        await generator.login("email", "password")
        
        # Generar con streaming de progreso
        async for update in generator.generate_video(
            prompt="Un Tesla Model 3 en movimiento por una autopista",
            duration=10,
            aspect_ratio="16:9"
        ):
            print(f"Estado: {update['status']} - {update.get('progress', '')}%")
            
            if update["status"] == "complete":
                path = await generator.download_video(update["video_url"])
                print(f"Video guardado: {path}")

asyncio.run(generar_video())
```

## 🎬 Integración con Marketing de AutoRenta

```python
# Ejemplo: Generar videos promocionales automáticamente

PROMPTS_MARKETING = [
    "Un joven argentino recibiendo las llaves de un auto con una sonrisa en Buenos Aires",
    "Una familia disfrutando un viaje en un SUV moderno por la Patagonia",
    "Close-up de la app AutoRenta mostrando un mapa con autos disponibles",
    "Time-lapse de un propietario ganando dinero mientras su auto no lo usa",
]

async def generar_contenido_marketing():
    async with SoraGenerator() as generator:
        for prompt in PROMPTS_MARKETING:
            async for update in generator.generate_video(prompt):
                if update["status"] == "complete":
                    # Descargar y subir a Supabase Storage
                    path = await generator.download_video(update["video_url"])
                    await upload_to_supabase(path)
```

## ⚙️ Opciones

| Opción | Descripción | Default |
|--------|-------------|---------|
| `--prompt, -p` | El prompt para generar el video | Requerido |
| `--output, -o` | Nombre del archivo de salida | Auto-generado |
| `--duration, -d` | Duración en segundos | 10 |
| `--ratio, -r` | Aspect ratio (16:9, 9:16, 1:1) | 16:9 |
| `--quality, -q` | Calidad (720p, 1080p, 4K) | 1080p |
| `--headless` | Ejecutar sin ventana visible | False |
| `--cookies` | Ruta al archivo de cookies | ./sora_cookies.json |

## 🔒 Anti-Detección

Este script usa Patchright con las siguientes medidas:

- ✅ `navigator.webdriver` desactivado
- ✅ User-Agent realista
- ✅ Viewport y locale configurados
- ✅ Escritura humana con delays aleatorios
- ✅ Persistencia de cookies para evitar re-login
- ✅ Argumentos de Chromium optimizados

## ⚠️ Notas

- OpenAI puede actualizar su UI, lo que podría requerir ajustes en los selectores
- Usa modo NO headless la primera vez para verificar el flujo
- Los límites de generación dependen de tu plan en OpenAI
