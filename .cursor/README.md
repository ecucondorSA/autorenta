# Cursor Configuration - AutoRenta

Este directorio contiene la configuración automática para Cursor IDE.

## Archivos de Configuración

### 1. `runtime-config.json`
Configuración de Runtime para Cloud Agents:
- **Install Script**: `npm run install`
- **Start Script**: `npm run dev`
- **Default Terminals**: (vacío)

Cursor debería detectar automáticamente este archivo.

### 2. `secrets-config.json`
Referencia de todos los secrets necesarios:
- `NG_APP_SUPABASE_URL`: URL del proyecto Supabase
- `NG_APP_SUPABASE_ANON_KEY`: Clave anónima de Supabase
- `NG_APP_MAPBOX_ACCESS_TOKEN`: Token de Mapbox (requerido)
- `NG_APP_PAYPAL_CLIENT_ID`: Client ID de PayPal (opcional)

### 3. `.env.local` (en raíz del proyecto)
Variables de entorno que Cursor puede leer automáticamente.

## Configuración Automática

### Opción 1: Variables de Entorno (Recomendado)
Cursor puede leer automáticamente desde `.env.local`:
```bash
# El archivo .env.local ya está configurado
# Cursor debería detectarlo automáticamente
```

### Opción 2: Secrets en Cursor UI
Si las variables de entorno no se detectan automáticamente:
1. Abre la sección "Secrets" en Cursor
2. Ejecuta: `./tools/show-cursor-config.sh`
3. Copia cada secret y pégalo en la interfaz

## Scripts Útiles

- `./tools/show-cursor-config.sh` - Muestra todos los valores para copiar/pegar
- `./tools/configure-cursor-auto.sh` - Regenera la configuración
- `./tools/setup-cursor-env-auto.sh` - Configura .env.local

## Verificación

Para verificar que todo está configurado:
```bash
./tools/show-cursor-config.sh
```

## Notas

- Los archivos `.env.local` y `.cursor/` están en `.gitignore`
- Los secrets nunca se commitean al repositorio
- Cursor puede requerir reinicio para detectar cambios en `.env.local`


