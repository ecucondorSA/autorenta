# 🚀 Plan de Mejora: Integración MercadoPago - AutoRenta

**Fecha:** 2025-11-03  
**Prioridad:** Alta  
**Estado:** 🔄 En progreso

---

## 📊 Estado Actual

### ✅ Lo que YA funciona bien:
- ✅ `first_name` y `last_name` en payer (implementado)
- ✅ `category_id` en items (implementado: `car_rental`)
- ✅ `id` en items (implementado: `booking_id`)
- ✅ `description` en items (implementado)
- ✅ Webhook + polling backup funcionando
- ✅ Preautorizaciones implementadas
- ✅ Sistema híbrido de pagos (tradicional + split opcional)

### ⚠️ Oportunidades de Mejora:

#### 1. **Campos de Payer Faltantes** (Pueden mejorar +15-20 puntos)
```typescript
// ❌ FALTA en ambas Edge Functions:
payer: {
  email: "...",
  first_name: "...",  // ✅ Ya implementado
  last_name: "...",   // ✅ Ya implementado
  // ❌ FALTA:
  phone: { area_code: "54", number: "..." },  // +5 puntos
  identification: { type: "DNI", number: "..." },  // +10 puntos
  address: { ... }  // +5 puntos (opcional)
}
```

#### 2. **Mejoras en Items** (Pueden mejorar +5-10 puntos)
```typescript
// ✅ Ya tienes:
items: [{
  id: "...",           // ✅ Implementado
  title: "...",        // ✅ Implementado
  description: "...",   // ✅ Implementado
  category_id: "...", // ✅ Implementado
  quantity: 1,         // ✅ Implementado
  unit_price: 100,     // ✅ Implementado
  currency_id: "ARS",  // ✅ Implementado
  // ❌ FALTA (opcionales pero mejoran calidad):
  picture_url: "...",  // +3 puntos (imagen del auto)
  // ✅ Ya tienes todo lo crítico
}]
```

#### 3. **Información Adicional de Contexto**
- ⚠️ Falta `statement_descriptor` más descriptivo
- ⚠️ Falta `external_reference` con más contexto (ya tienes booking_id, pero podrías agregar metadata)

---

## 🎯 Plan de Acción Priorizado

### **FASE 1: Mejoras Rápidas (2-3 horas)** 🔥

#### 1.1 Agregar `phone` al payer
**Impacto:** +5 puntos de calidad  
**Archivos a modificar:**
- `supabase/functions/mercadopago-create-preference/index.ts`
- `supabase/functions/mercadopago-create-booking-preference/index.ts`

**Cambios:**
```typescript
// Obtener phone del profile
const { data: profile } = await supabase
  .from('profiles')
  .select('phone')  // Agregar phone
  .eq('id', user_id)
  .single();

// En preferenceData.payer:
payer: {
  email: "...",
  first_name: firstName,
  last_name: lastName,
  phone: profile?.phone ? {
    area_code: profile.phone.substring(0, 2) || "54",  // Argentina: +54
    number: profile.phone.substring(2) || ""
  } : undefined,
}
```

#### 1.2 Agregar `identification` (DNI) al payer
**Impacto:** +10 puntos de calidad  
**Archivos a modificar:**
- `supabase/functions/mercadopago-create-preference/index.ts`
- `supabase/functions/mercadopago-create-booking-preference/index.ts`

**Cambios:**
```typescript
// Obtener DNI del profile (si existe campo)
const { data: profile } = await supabase
  .from('profiles')
  .select('dni, phone')  // Agregar dni
  .eq('id', user_id)
  .single();

// En preferenceData.payer:
payer: {
  // ... otros campos
  identification: profile?.dni ? {
    type: "DNI",  // Argentina usa DNI
    number: profile.dni.replace(/[^0-9]/g, '')  // Solo números
  } : undefined,
}
```

**Nota:** Si no tienes campo `dni` en `profiles`, necesitarás:
1. Agregar columna `dni` a tabla `profiles`
2. Obtener DNI durante onboarding/verificación

#### 1.3 Agregar `picture_url` a items (bookings)
**Impacto:** +3 puntos de calidad  
**Archivos a modificar:**
- `supabase/functions/mercadopago-create-booking-preference/index.ts`

**Cambios:**
```typescript
// Obtener primera foto del auto
const { data: carPhotos } = await supabase
  .from('car_photos')
  .select('url')
  .eq('car_id', booking.car_id)
  .order('position', { ascending: true })
  .limit(1)
  .single();

// En preferenceData.items:
items: [{
  // ... otros campos
  picture_url: carPhotos?.url || undefined,  // +3 puntos
}]
```

---

### **FASE 2: Mejoras de Infraestructura (1 semana)** 🏗️

#### 2.1 Recolectar DNI durante onboarding
**Impacto:** Mejora calidad de pagos +10 puntos  
**Prioridad:** Media

**Tareas:**
1. Agregar campo `dni` a tabla `profiles`
2. Agregar campo de DNI en formulario de registro/verificación
3. Validar formato de DNI argentino (8 dígitos)
4. Actualizar Edge Functions para usar DNI

#### 2.2 Mejorar manejo de errores de MercadoPago
**Impacto:** Mejor experiencia de usuario  
**Prioridad:** Media

**Tareas:**
1. Mapear códigos de error de MP a mensajes amigables
2. Agregar retry automático para errores temporales
3. Logging mejorado para debugging

#### 2.3 Dashboard de monitoreo de pagos
**Impacto:** Operaciones más eficientes  
**Prioridad:** Baja

**Tareas:**
1. Crear página de admin para ver pagos pendientes
2. Mostrar estadísticas de aprobación/rechazo
3. Alertas para pagos fallidos

---

### **FASE 3: Optimizaciones Avanzadas (2 semanas)** 🚀

#### 3.1 Implementar sistema de retiros automatizados
**Impacto:** Elimina proceso manual  
**Prioridad:** Alta

**Problema actual:** MercadoPago no tiene API pública para transferencias

**Solución propuesta:**
1. Integrar con proveedor alternativo (EBANX, Wise, etc.)
2. O mantener proceso manual documentado
3. Crear sistema de notificaciones para dueños cuando hay retiros pendientes

#### 3.2 Mejorar sistema de split payments
**Impacto:** Automatización completa  
**Prioridad:** Media

**Tareas:**
1. Mantener sistema híbrido actual (funciona bien)
2. Agregar incentivos para pagos con cuenta MP (descuento 5%)
3. UI para mostrar opciones de pago claramente

---

## 📋 Checklist de Implementación

### FASE 1 (Rápida - Prioridad Alta):
- [x] 1. Agregar campo `phone` a payer en ambas Edge Functions ✅ **COMPLETADO**
- [x] 2. Verificar si existe campo `dni` en tabla `profiles` ✅ **EXISTE** (también `gov_id_number`)
- [x] 3. Si NO existe: crear migración para agregar `dni` a `profiles` ✅ **NO NECESARIO** (ya existe)
- [x] 4. Agregar `identification` (DNI) a payer en ambas Edge Functions ✅ **COMPLETADO**
- [x] 5. Agregar `picture_url` a items en booking preference ✅ **COMPLETADO**
- [x] 6. Deploy Edge Functions a Supabase ✅ **COMPLETADO** (2025-11-03)
- [ ] 7. Testing con pagos reales en sandbox 🔄 **PENDIENTE**
- [ ] 8. Verificar puntaje de calidad mejorado (debería pasar de 31 a ~50+) 🔄 **PENDIENTE**

### FASE 2 (Media Prioridad):
- [ ] 8. Agregar campo DNI en formulario de registro
- [ ] 9. Validar formato de DNI argentino
- [ ] 10. Mejorar manejo de errores
- [ ] 11. Crear dashboard de monitoreo

### FASE 3 (Baja Prioridad):
- [ ] 12. Evaluar proveedores para retiros automatizados
- [ ] 13. Implementar sistema de retiros (si se encuentra solución)
- [ ] 14. Optimizar UI de split payments

---

## 🧪 Testing

### Después de cada cambio:
1. **Sandbox Testing:**
   ```bash
   # Usar tarjeta de prueba
   Número: 5031 7557 3453 0604
   CVV: 123
   Vencimiento: 11/25
   ```

2. **Verificar en MercadoPago Dashboard:**
   - Pago creado con todos los campos
   - Puntaje de calidad mejorado
   - Tasa de aprobación mejorada

3. **Verificar en Base de Datos:**
   - Transaction/Booking actualizado correctamente
   - Metadata guardada correctamente

---

## 📊 Métricas de Éxito

### Antes (Actual):
- Puntaje de calidad: **31/100**
- Tasa de aprobación: ~70-80% (estimado)

### Después (Objetivo):
- Puntaje de calidad: **50+/100** ✅
- Tasa de aprobación: **85-90%** ✅
- Reducción de pagos pendientes: **-50%** ✅

---

## 🔗 Referencias

- [Documentación MercadoPago - Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro)
- [Documentación MercadoPago - Mejores Prácticas](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/advanced-integration)
- [MCP Server MercadoPago](https://www.mercadopago.com.ar/developers/es/docs/mcp-server/overview)

---

## 💡 Notas Finales

1. **Split Payments:** Mantener sistema híbrido actual (tradicional + split opcional). No forzar split solo para mejorar calidad.

2. **DNI:** Es crítico para Argentina. Si no lo tienes, priorizar recolectarlo durante onboarding.

3. **Phone:** Fácil de implementar, buena mejora de calidad.

4. **Picture URL:** Mejora visual y calidad de integración.

---

**Última actualización:** 2025-11-03  
**Estado FASE 1:** ✅ **COMPLETADA** (Implementación + Deploy)  
**Próxima revisión:** Después de testing y verificación de puntaje de calidad

---

## ✅ Implementación Completada (2025-11-03)

### Cambios Realizados:

1. **mercadopago-create-preference/index.ts:**
   - ✅ Agregado `phone` al payer (formateo para Argentina)
   - ✅ Agregado `identification` (DNI) al payer
   - ✅ Actualizado SELECT para obtener `phone`, `dni`, `gov_id_number`, `gov_id_type`

2. **mercadopago-create-booking-preference/index.ts:**
   - ✅ Agregado `phone` al payer (formateo para Argentina)
   - ✅ Agregado `identification` (DNI) al payer
   - ✅ Agregado `picture_url` a items (primera foto del auto)
   - ✅ Actualizado SELECT para obtener campos necesarios
   - ✅ Query para obtener primera foto del auto

3. **Deploy:**
   - ✅ `mercadopago-create-preference` desplegado a Supabase
   - ✅ `mercadopago-create-booking-preference` desplegado a Supabase

### Próximos Pasos:
1. Realizar testing con usuario que tenga `phone` y `dni` configurados
2. Verificar en dashboard de MercadoPago que los campos se envían correctamente
3. Medir puntaje de calidad mejorado (objetivo: 50+/100)

