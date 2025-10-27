# 🎯 PRÓXIMOS PASOS - Debugging Price Calculation

## 📍 Situación Actual

Estás en la rama `main` ✅

Existe una rama de laboratorio `lab/debug-price-calculation` con logging extremadamente detallado desplegada en:
**https://lab-debug.autorenta-web.pages.dev**

## 🔬 Cómo Debuguear el Problema

### Paso 1: Abrir la URL de Debug
```bash
# Abrir en tu navegador:
https://lab-debug.autorenta-web.pages.dev
```

### Paso 2: Abrir DevTools Console
- Presiona `F12` o `Cmd+Option+I` (Mac)
- Ve a la pestaña "Console"
- Asegúrate de que esté configurado para mostrar todos los niveles de log

### Paso 3: Navegar a un Auto
```bash
# Por ejemplo:
https://lab-debug.autorenta-web.pages.dev/cars/e8644fdd-e8a3-4565-8c50-ebb779cf6ba3
```

### Paso 4: Seleccionar Fechas
1. Haz clic en el campo "Fecha inicio"
2. Selecciona una fecha (ej: 28 de octubre)
3. Observa los logs en la consola
4. Haz clic en el campo "Fecha fin"
5. Selecciona una fecha posterior (ej: 31 de octubre)
6. Observa los logs en la consola

### Paso 5: Analizar los Logs

Busca en la consola cualquiera de estos patrones:

#### ❌ Si hay ERROR:
```
❌ [totalPrice] FAILED - Missing required data: { reason: "..." }
```
El campo `reason` te dirá exactamente qué falta.

#### ❌ Posibles Razones de Fallo:

**A. "Invalid FROM date"**
```javascript
// Problema: El campo FROM no tiene un valor válido
// Buscar en logs:
🔍 [DateRangePicker] onFromChange called: { rawValue: ... }
// Ver si rawValue es null, "", o tiene formato incorrecto
```

**B. "Invalid TO date"**
```javascript
// Problema: El campo TO no tiene un valor válido
// Buscar en logs:
🔍 [DateRangePicker] onToChange called: { rawValue: ... }
// Ver si rawValue es null, "", o tiene formato incorrecto
```

**C. "Missing car"**
```javascript
// Problema: El auto no se cargó correctamente
// Buscar en logs:
✅ [CarDetail] Auto cargado exitosamente
🔍 [CarDetail] Car data FULL DUMP: { ... }
// Ver si price_per_day existe
```

**D. "Falsy value" o "NaN" o "Not positive"**
```javascript
// Problema: price_per_day no es válido
// Buscar en logs:
🔍 [totalPrice] Step 4 - Price conversion: {
  original: ...,
  converted: ...,
  isNaN: true/false
}
```

**E. "Date difference is not positive"**
```javascript
// Problema: Fecha TO es anterior o igual a fecha FROM
// Buscar en logs:
🔍 [totalPrice] Step 7 - Date diff calculation: {
  diff: 0 or negative
}
```

#### ✅ Si todo funciona:
```
✅ [totalPrice] SUCCESS - Calculation complete: {
  days: 3,
  pricePerDay: 75000,
  total: 225000,
  formula: "3 days × $75000 = $225000"
}
```

## 🛠️ Aplicar el Fix

### Una vez identificado el problema:

1. **Cambiar a la rama debug** (o crear una nueva desde main)
```bash
cd /home/edu/autorenta
git checkout lab/debug-price-calculation
# O crear nueva rama:
# git checkout -b fix/price-calculation main
```

2. **Aplicar el fix específico** según el problema encontrado

3. **Probar localmente**
```bash
pnpm run build
# Abrir dist/web/browser/index.html en navegador
```

4. **Commit y deploy**
```bash
git add -A
git commit -m "fix: [descripción del problema encontrado]"
git push
```

5. **Deploy a producción**
```bash
cd apps/web/dist/web/browser
CLOUDFLARE_ACCOUNT_ID=5b448192fe4b369642b68ad8f53a7603 npx wrangler pages deploy . --project-name=autorenta-web
```

## 🧹 Limpiar Después

### Una vez solucionado el problema:

```bash
# Volver a main
git checkout main

# Eliminar rama local
git branch -D lab/debug-price-calculation

# Eliminar rama remota
git push origin --delete lab/debug-price-calculation
```

## 📝 Documentación de Referencia

- **Reporte completo**: `PRICE_CALCULATION_DEBUG_REPORT.md`
- **Instrucciones detalladas**: Ver rama `lab/debug-price-calculation` → `DEBUG_INSTRUCTIONS.md`
- **Test de DB**: El auto tiene `price_per_day: 75000` (verificado ✅)

## 🆘 Si Necesitas Ayuda

Si los logs no son suficientes, puedes:

1. Agregar más logs en puntos específicos
2. Usar breakpoints en DevTools (Sources tab)
3. Verificar el valor de signals en runtime:
   ```javascript
   // En consola del navegador:
   $0 // Selecciona el elemento HTML
   ng.getComponent($0) // Obtiene el componente
   ng.getComponent($0).dateRange() // Ver valor del signal
   ng.getComponent($0).totalPrice() // Ver precio calculado
   ```

## 🎯 Objetivo Final

Identificar la causa exacta del error **"No se pudo calcular el precio"** y aplicar un fix quirúrgico sin afectar otra funcionalidad.

---

**Última actualización:** 2025-10-27T01:25:00Z
