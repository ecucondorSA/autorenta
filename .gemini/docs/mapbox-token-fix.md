# 🔧 Solución al Error de Mapbox Token

## Problema
El error "Token de Mapbox inválido o expirado" se debe a que Angular no está cargando correctamente las variables de entorno desde `.env.local`.

## ✅ Solución Implementada

### 1. Script mejorado `start-with-env.mjs`
El script ahora:
- Carga variables desde `/home/edu/autorenta/.env.local` (raíz del proyecto)
- Carga variables desde `apps/web/.env.development.local` (local - sobrescribe raíz)
- Soporta pasar `--configuration` como argumento

### 2. Nuevo comando `pnpm dev`
```bash
cd /home/edu/autorenta/apps/web
pnpm dev
```

Este comando:
1. Carga las variables de entorno desde `.env.local`
2. Inicia Angular con configuración `development-low-spec`
3. Muestra mensajes de confirmación de carga de env

### 3. Variables cargadas desde `.env.local`
```
NG_APP_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6ImNtaXltdHhqMDBoNGQzZXEwNW9idDBhMDUifQ.rY_vmPzdGQiUksrSMuXrhg
```

## 🚀 Cómo usar

### Desarrollo (recomendado)
```bash
cd /home/edu/autorenta/apps/web
pnpm dev
```

### Alternativa con pnpm workspace
```bash
cd /home/edu/autorenta
pnpm --filter autorentar-web dev
```

## ✅ Verificación

Después de reiniciar el servidor con `pnpm dev`, verás:
```
📦 Loading environment from /home/edu/autorenta/.env.local
```

Y el componente `cars-map` debería cargar correctamente sin mostrar el error de token.

## 🔍 Debugging

Si aún ves el error, verifica:

1. **Variable en environment.ts**:
```typescript
// En apps/web/src/environments/environment.base.ts
mapboxAccessToken: resolve('NG_APP_MAPBOX_ACCESS_TOKEN', defaults.mapboxAccessToken)
```

2. **Consola del navegador**:
```javascript
// En DevTools Console
console.log((await import('/main.js')).default.mapboxAccessToken)
```

3. **Process env en runtime**:
```bash
# En el terminal donde corre pnpm dev
echo $NG_APP_MAPBOX_ACCESS_TOKEN
```

## 📝 Otros comandos disponibles

- `pnpm start`: Inicia con configuración development (con logs)
- `pnpm start:no-hmr`: Sin Hot Module Replacement
- `cd /home/edu/autorenta/apps/web && ./start-dev.sh`: Script bash alternativo

---

**Fecha**: 2026-01-14
**Estado**: ✅ Resuelto
**Archivos modificados**:
- `apps/web/scripts/env/start-with-env.mjs`
- `apps/web/package.json`
- `apps/web/start-dev.sh` (nuevo)
