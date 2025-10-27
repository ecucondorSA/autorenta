# 🚨 AUDITORÍA COMPLETA: TODO LO HARDCODED

## ❌ CRÍTICO - SEGURIDAD

### 1. **SUPABASE KEYS EXPUESTAS** (10+ archivos)
```
./test-retry-function.sh
./execute-mp-table-sql.js
./apps/web/scripts/test-wallet-deposit.js
./apps/web/src/app/core/services/supabase-client.service.ts
./apps/web/src/environments/environment.ts
```

**RIESGO**: Service Role Key tiene acceso TOTAL a la DB
**ACCIÓN**: Mover TODAS las keys a `.env` y `.env.local`

---

## ❌ UBICACIONES HARDCODED

### 2. **Buenos Aires como default**
```typescript
// location-map-picker.component.ts:126
// Use initial coordinates or default to Buenos Aires center
```

**PROBLEMA**: Asume que todos los usuarios están en Buenos Aires
**SOLUCIÓN**: Usar geolocalización del navegador o IP

---

## ❌ URLS/APIs HARDCODED

### 3. **Unsplash URLs**
```typescript
// car-placeholder-images.ts
url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800'
url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800'
```

**PROBLEMA**: URLs externas hardcoded, pueden cambiar
**SOLUCIÓN**: Mover a config o usar CDN propio

---

## ❌ EMAILS HARDCODED

### 4. **Emails de soporte**
```typescript
// help-button.component.ts:78
href="mailto:soporte@autorentar.com"

// deposit-modal.component.ts:52
email: 'pagos@autorentar.com'
```

**PROBLEMA**: Cambiar email requiere rebuild
**SOLUCIÓN**: Mover a environment o config DB

---

## ❌ CONVERSIONES HARDCODED

### 5. **Tasas de conversión estimadas**
```typescript
// payments.service.ts:25-26
const amountUsd = booking.total_amount / 1000; // ❌ HARDCODED 1000
const amountArs = booking.total_amount * 1000; // ❌ HARDCODED 1000

// car-detail.page.ts:418
pricePerDayUsd = car.price_per_day / 1500; // ❌ HARDCODED 1500
```

**PROBLEMA**: Usa estimaciones en lugar de tasa real
**SOLUCIÓN**: SIEMPRE usar ExchangeRateService

---

## ❌ MARCAS/MODELOS HARDCODED

### 6. **Marcas de autos**
```typescript
// car-placeholder.util.ts
Toyota: { from: '#dc2626', to: '#991b1b' },
Honda: { from: '#dc2626', to: '#b91c1c' },
Chevrolet: { from: '#fbbf24', to: '#d97706' },
```

**PROBLEMA**: Agregar nueva marca requiere código
**SOLUCIÓN**: Mover a config JSON o DB

---

## ❌ IDs DE USUARIOS HARDCODED

### 7. **UUIDs para usuarios anónimos**
```typescript
// dynamic-pricing.service.ts:344
const userId = user?.id || '00000000-0000-0000-0000-000000000000';

// car-card.component.ts:156
const userId = user?.id || '00000000-0000-0000-0000-000000000000';
```

**PROBLEMA**: UUID "mágico" repetido en múltiples lugares
**SOLUCIÓN**: Constante global `ANONYMOUS_USER_ID`

---

## ✅ PLAN DE CORRECCIÓN

### FASE 1: SEGURIDAD (URGENTE)
1. ✅ Mover todas las Supabase keys a `.env`
2. ✅ Eliminar keys hardcodeadas de todos los archivos
3. ✅ Agregar `.env.example` con placeholders

### FASE 2: CONFIGURACIÓN
4. ✅ Crear `config/constants.ts` para constantes
5. ✅ Mover emails/teléfonos a `environment.ts`
6. ✅ Mover URLs externas a `environment.ts`

### FASE 3: DATOS DINÁMICOS
7. ✅ Eliminar conversiones hardcoded (usar FX service)
8. ✅ Mover ubicaciones default a config
9. ✅ Crear tabla `app_config` en DB para datos modificables

### FASE 4: REFACTORING
10. ✅ Crear constantes globales para UUIDs especiales
11. ✅ Mover marcas de autos a DB o JSON
12. ✅ Centralizar configuración en un solo lugar

---

## 📋 ARCHIVOS A MODIFICAR

### Prioridad CRÍTICA 🔴
- `apps/web/src/app/core/services/supabase-client.service.ts`
- `apps/web/src/environments/environment.ts`
- `test-retry-function.sh`
- `execute-mp-table-sql.js`
- Todos los scripts con SERVICE_ROLE_KEY

### Prioridad ALTA 🟠
- `apps/web/src/app/core/services/payments.service.ts`
- `apps/web/src/app/features/cars/detail/car-detail.page.ts`
- `apps/web/src/app/shared/components/help-button/`
- `apps/web/src/app/shared/components/deposit-modal/`

### Prioridad MEDIA 🟡
- `apps/web/src/app/shared/utils/car-placeholder.util.ts`
- `apps/web/src/app/shared/components/location-map-picker/`
- `apps/web/src/app/core/services/dynamic-pricing.service.ts`

---

## 🎯 RESULTADO ESPERADO

**ANTES**: 50+ instancias de valores hardcoded
**DESPUÉS**: 
- ✅ 0 keys hardcodeadas
- ✅ 0 URLs hardcodeadas
- ✅ 0 emails hardcodeados
- ✅ 0 conversiones hardcoded
- ✅ Todo en `.env`, `environment.ts` o DB

---

## 📝 PRÓXIMO PASO

Empezar con FASE 1 (SEGURIDAD) inmediatamente.
