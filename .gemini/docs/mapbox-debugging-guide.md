# 🔍 Verificación de Variables de Entorno en el Navegador

## Problema
Después de reiniciar el servidor, el error persiste. Necesitamos verificar si el navegador está cargando correctamente el archivo `env.js`.

## ✅ Pasos de Verificación

### 1. Hard Refresh en el Navegador
**IMPORTANTE**: Presiona `Ctrl + Shift + R` (o `Cmd + Shift + R` en Mac) para forzar un **hard refresh** que recargue todos los archivos sin caché.

### 2. Verificar en DevTools Console

Abre la consola del navegador (F12 → Console) y ejecuta:

```javascript
// 1. Verificar que window.__env existe
console.log('window.__env:', window.__env);

// 2. Verificar específicamente el token de Mapbox
console.log('Mapbox Token:', window.__env?.NG_APP_MAPBOX_ACCESS_TOKEN);

// 3. Verificar que environment.ts lo leyó correctamente
// (Solo si puedes acceder al objeto environment)
console.log('Token cargado en environment:', environment?.mapboxAccessToken);

// 4. Verificar que el archivo env.js se cargó
fetch('/env.js').then(r => r.text()).then(t => console.log('env.js content:', t));
```

### 3. Debugging del Archivo env.js

Si `window.__env` es `undefined` o está vacío:

1. **Verificar que el archivo existe**: Abre `http://localhost:4200/env.js` directamente en el navegador
2. **Verificar en Network Tab**:
   - Abre DevTools → Network
   - Filtra por `env.js`
   - Recarga la página
   - Verifica que el archivo se carga con status `200`

### 4. Logging del Script de Carga

El script en `index.html` (líneas 132-158) debería mostrar warnings si falla. Busca en la consola:
- `Failed to load env.js: ...` ← Error al cargar
- `env.js returned status: ...` ← Status HTTP diferente de 200

## 🔧 Solución si window.__env está vacío

Si el archivo `env.js` no se está cargando correctamente en desarrollo, actualiza el script de carga en `index.html` para agregear más debugging:

```html
<script>
  if (!window.__env) {
    (function () {
      var isCapacitor = window.Capacitor !== undefined ||
                        (window.location.protocol === 'https:' && window.location.hostname === 'localhost');

      try {
        var xhr = new XMLHttpRequest();
        var envPath = isCapacitor ? '/env.js' : '/env.js?v=' + Date.now();
        console.log('[ENV] Loading environment from:', envPath);
        xhr.open('GET', envPath, false); // Synchronous
        xhr.timeout = 5000;
        xhr.send();
        console.log('[ENV] XHR status:', xhr.status);
        console.log('[ENV] XHR response:', xhr.responseText.substring(0, 100));
        if (xhr.status === 200 && xhr.responseText) {
          eval(xhr.responseText);
          console.log('[ENV] ✅ Loaded window.__env:', window.__env);
        } else {
          console.warn('[ENV] ❌ env.js returned status:', xhr.status);
        }
      } catch (e) {
        console.error('[ENV] ❌ Failed to load env.js:', e);
        window.__env = window.__env || {};
      }
    })();
  }
</script>
```

## 📝 Valores Esperados

Si todo está correcto, deberías ver en la consola:

```javascript
window.__env: {
  NG_APP_SUPABASE_URL: "https://pisqjmoklivzpwufhscx.supabase.co",
  NG_APP_MAPBOX_ACCESS_TOKEN: "pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6ImNtaXltdHhqMDBoNGQzZXEwNW9idDBhMDUifQ.rY_vmPzdGQiUksrSMuXrhg",
  // ... más variables
}
```

## 🚀 Si nada funciona: Fallback directo

Como última opción, podemos hardcodear el token directamente en `environment.development.ts`:

```typescript
import { buildEnvironment } from './environment.base';

export const environment = buildEnvironment({
  production: false,
  mapboxAccessToken: 'pk.eyJ1IjoiZWN1Y29uZG9yIiwiYSI6ImNtaXltdHhqMDBoNGQzZXEwNW9idDBhMDUifQ.rY_vmPzdGQiUksrSMuXrhg', // Hardcoded para desarrollo
});
```

**NOTA**: Esta es una solución temporal solo para desarrollo. NO commitear esto a Git.

---

**Siguiente Paso**: Ejecuta las verificaciones en la consola del navegador y reporte qué aparece.
