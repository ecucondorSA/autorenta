# 🔍 INSTRUCCIONES DE DEBUGGING - Price Calculation

## URL de Testing
**https://lab-debug.autorenta-web.pages.dev**

## Pasos para Debuguear

1. **Abrir la consola del navegador** (F12 → Console tab)

2. **Navegar a la página de detalle de un auto**
   - Por ejemplo: https://lab-debug.autorenta-web.pages.dev/cars/e8644fdd-e8a3-4565-8c50-ebb779cf6ba3

3. **Observar los logs iniciales:**
   ```
   🔍 [CarDetail] === COMPONENT INITIALIZED ===
   ✅ [CarDetail] Auto cargado exitosamente
   🔍 [CarDetail] Car data FULL DUMP: { ... }
   🔍 [Effect] car changed: { ... }
   🔍 [Effect] dateRange changed: { ... }
   🔍 [Effect] totalPrice changed: { ... }
   ```

4. **Seleccionar fecha de inicio:**
   - Buscar en consola:
   ```
   🔍 [DateRangePicker] onFromChange called: { ... }
   🔍 [DateRangePicker] From value converted: { ... }
   🔍 [DateRangePicker] Emitting range: { ... }
   🔍 [CarDetail] onRangeChange called: { ... }
   🔍 [Effect] dateRange changed: { ... }
   🔍 [totalPrice] === COMPUTATION START ===
   ```

5. **Seleccionar fecha de fin:**
   - Buscar en consola:
   ```
   🔍 [DateRangePicker] onToChange called: { ... }
   🔍 [DateRangePicker] To value converted: { ... }
   🔍 [DateRangePicker] Emitting range: { ... }
   🔍 [CarDetail] onRangeChange called: { ... }
   🔍 [Effect] dateRange changed: { ... }
   🔍 [totalPrice] === COMPUTATION START ===
   ```

## ❌ Identificar el Problema

### Si falla en Step 1 (Got values):
```
🔍 [totalPrice] Step 1 - Got values: {
  range: { from: ..., to: ... },
  rangeFrom: ...,
  rangeTo: ...,
  car: { ... }
}
```
**Problema:** Valores no están llegando correctamente

### Si falla en Step 2 (Validation checks):
```
🔍 [totalPrice] Step 2 - Validation checks: {
  'range.from': ...,
  'range.from type': ...,
  'hasValidFrom': false/true,
  ...
}
```
**Problema:** Las fechas no pasan la validación

### Si falla en Step 4 (Price conversion):
```
🔍 [totalPrice] Step 4 - Price conversion: {
  original: ...,
  originalType: ...,
  converted: ...,
  isNaN: true/false
}
```
**Problema:** El precio no es válido

### Si falla en Step 7 (Date diff calculation):
```
🔍 [totalPrice] Step 7 - Date diff calculation: {
  diff: 0 or negative,
  ...
}
```
**Problema:** Las fechas están en orden incorrecto o son iguales

## ✅ Éxito
Si todo funciona, deberías ver:
```
✅ [totalPrice] SUCCESS - Calculation complete: {
  days: 3,
  pricePerDay: 75000,
  total: 225000,
  formula: "3 days × $75000 = $225000"
}
🔍 [totalPrice] === COMPUTATION END (SUCCESS) ===
🔍 [Effect] totalPrice changed: { total: 225000, isNull: false }
```

## 📊 Puntos Críticos a Verificar

1. **¿El auto tiene price_per_day?**
   - Buscar: `🔍 [CarDetail] Car data FULL DUMP:`
   - Verificar que `price_per_day` existe y es un número

2. **¿Las fechas se están emitiendo correctamente?**
   - Buscar: `🔍 [DateRangePicker] Emitting range:`
   - Verificar que `from` y `to` son strings no vacíos (ej: "2025-10-27")

3. **¿Las fechas están llegando al componente?**
   - Buscar: `🔍 [CarDetail] onRangeChange called:`
   - Verificar que `from` y `to` no son null ni strings vacíos

4. **¿El computed se está re-ejecutando?**
   - Buscar: `🔍 [totalPrice] === COMPUTATION START ===`
   - Debería aparecer cada vez que cambien las fechas

5. **¿Qué validación está fallando?**
   - Buscar líneas con `❌` o `FAILED`
   - Leer el `reason` que indica por qué falló

## 🎯 Soluciones Probables

### Si `hasValidFrom` o `hasValidTo` es false:
- El date picker está enviando strings vacíos o null
- **Solución:** Arreglar la conversión en el date picker

### Si `price_per_day` es null o NaN:
- La DB no tiene el precio o es un tipo incorrecto
- **Solución:** Actualizar la DB o el parsing

### Si `diff <= 0`:
- Las fechas están en orden incorrecto
- **Solución:** Validar el orden de fechas en el UI

### Si el computed no se ejecuta:
- Los signals no están triggering el computed
- **Solución:** Verificar que se usa `signal.set()` correctamente
