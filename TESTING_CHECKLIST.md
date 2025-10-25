# 🧪 TESTING CHECKLIST - AUTORENTA

**Fecha:** 2025-10-25  
**Versión:** 1.0 (Post Sprints 1-3 + Pooling)  
**Objetivo:** Validar todas las funcionalidades implementadas

---

## 🚀 PRE-REQUISITOS

### **Ambiente de Testing:**
```bash
# 1. Levantar servidor de desarrollo
cd /home/edu/autorenta/apps/web
npm run dev

# 2. Abrir navegador en modo incógnito
# URL: http://localhost:4200

# 3. Tener 2 usuarios de prueba:
# - Usuario Renter (alquila autos)
# - Usuario Owner (tiene autos)
```

### **Datos de Prueba Necesarios:**
- [ ] 2 cuentas de usuario registradas
- [ ] Al menos 1 auto publicado
- [ ] Tarjeta de prueba Stripe (4242 4242 4242 4242)
- [ ] Fechas futuras para reservas

---

## 📋 SPRINT 1: SISTEMA DE PAGOS

### **Test 1.1: Email Dinámico en Pagos**

**Objetivo:** Verificar que cualquier usuario puede pagar, no solo test users

**Pasos:**
1. [ ] Login con usuario real (NO test@autorenta.com)
2. [ ] Buscar un auto disponible
3. [ ] Crear una reserva
4. [ ] Ir a página de pago
5. [ ] Verificar que el email mostrado es el del usuario logueado
6. [ ] Completar proceso de pago

**Resultado Esperado:**
- ✅ Email del usuario real aparece en el formulario
- ✅ Pago se procesa correctamente
- ✅ NO aparece test@autorenta.com

**Verificar en Consola del Navegador:**
```javascript
// Buscar este log:
"🔍 [SUPABASE CLIENT] Inicializando con URL: https://obxvffplochgeiclibng.supabase.co"
```

---

### **Test 1.2: PaymentsService Centralizado**

**Objetivo:** Verificar que no hay código duplicado

**Pasos:**
1. [ ] Hacer pago desde "Booking Detail Payment"
2. [ ] Hacer pago desde "Payment Actions"
3. [ ] Verificar que ambos usan el mismo servicio

**Resultado Esperado:**
- ✅ Ambos flujos funcionan igual
- ✅ No hay diferencias en comportamiento
- ✅ Mensajes de error consistentes

---

### **Test 1.3: Retry Logic**

**Objetivo:** Verificar reintentos automáticos

**Pasos:**
1. [ ] Simular fallo de red (DevTools > Network > Offline)
2. [ ] Intentar pagar
3. [ ] Restaurar conexión después de 2 segundos
4. [ ] Ver si el sistema reintenta automáticamente

**Resultado Esperado:**
- ✅ Sistema reintenta hasta 3 veces
- ✅ Muestra mensaje de "Reintentando..."
- ✅ Eventualmente procesa el pago

**Verificar en Consola:**
```javascript
// Buscar logs como:
"⚠️ [PAYMENTS] Error, reintentando... (1/3)"
```

---

## 📋 SPRINT 2: DISPONIBILIDAD

### **Test 2.1: RPC Function - get_available_cars**

**Objetivo:** Solo mostrar autos disponibles

**Setup:**
1. [ ] Crear reserva para Auto A del 1-5 Nov
2. [ ] Confirmar la reserva

**Pasos:**
1. [ ] Buscar autos para fechas 3-7 Nov
2. [ ] Verificar que Auto A NO aparece
3. [ ] Buscar autos para fechas 10-15 Nov  
4. [ ] Verificar que Auto A SI aparece

**Resultado Esperado:**
- ✅ Auto A no aparece en búsqueda con overlap
- ✅ Auto A aparece en búsqueda sin overlap
- ✅ Query es rápida (<200ms)

**Verificar en Consola:**
```javascript
// Buscar log:
"✅ Cargados N autos disponibles para 2025-11-03 - 2025-11-07"
```

---

### **Test 2.2: Índices de Performance**

**Objetivo:** Verificar velocidad de búsqueda

**Pasos:**
1. [ ] Abrir DevTools > Network
2. [ ] Buscar autos con fechas
3. [ ] Medir tiempo de respuesta del query
4. [ ] Repetir 3 veces y promediar

**Resultado Esperado:**
- ✅ Primera búsqueda: <500ms
- ✅ Búsquedas siguientes: <150ms
- ✅ Promedio general: <200ms

**Comando SQL para verificar índices:**
```sql
-- Ejecutar en Supabase SQL Editor
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename IN ('bookings', 'cars')
  AND indexname LIKE 'idx_%';
```

---

### **Test 2.3: Prevención de Doble Reserva**

**Objetivo:** Verificar que doble reserva es imposible

**Setup:**
1. [ ] Usuario A hace login en navegador 1
2. [ ] Usuario B hace login en navegador 2 (incógnito)
3. [ ] Ambos buscan mismo auto para mismas fechas

**Pasos:**
1. [ ] Usuario A inicia reserva (NO completa pago)
2. [ ] Usuario B inicia reserva (NO completa pago)
3. [ ] Usuario A completa el pago PRIMERO
4. [ ] Usuario B intenta completar el pago DESPUÉS

**Resultado Esperado:**
- ✅ Usuario A: Pago exitoso
- ✅ Usuario B: Error "Auto no disponible"
- ✅ Solo 1 reserva creada en DB

**Verificar en DB:**
```sql
-- Contar reservas para ese auto en esas fechas
SELECT COUNT(*) 
FROM bookings 
WHERE car_id = 'AUTO_ID'
  AND status IN ('confirmed', 'pending')
  AND (start_at, end_at) OVERLAPS ('2025-11-01', '2025-11-05');
-- Debe retornar 1
```

---

### **Test 2.4: is_car_available RPC**

**Objetivo:** Verificar validación antes de crear reserva

**Pasos:**
1. [ ] Crear reserva confirmada para Auto X (1-5 Nov)
2. [ ] Intentar crear otra reserva para Auto X (3-7 Nov)
3. [ ] Verificar mensaje de error

**Resultado Esperado:**
- ✅ Error claro: "Auto no disponible para esas fechas"
- ✅ Reserva NO se crea
- ✅ Usuario puede elegir otras fechas

---

## 📋 SPRINT 3: MY BOOKINGS

### **Test 3.1: Cancelación de Reserva (Válida)**

**Objetivo:** Cancelar reserva con >24h de anticipación

**Setup:**
1. [ ] Crear reserva con inicio en 3 días

**Pasos:**
1. [ ] Ir a "My Bookings"
2. [ ] Click en "Cancelar" de la reserva
3. [ ] Confirmar cancelación
4. [ ] Verificar que estado cambia

**Resultado Esperado:**
- ✅ Modal de confirmación aparece
- ✅ Reserva cambia a estado "cancelled"
- ✅ Mensaje de éxito
- ✅ Lista se recarga automáticamente

**Verificar en DB:**
```sql
SELECT status, updated_at 
FROM bookings 
WHERE id = 'BOOKING_ID';
-- status debe ser 'cancelled'
```

---

### **Test 3.2: Cancelación Bloqueada (<24h)**

**Objetivo:** NO permitir cancelar con <24h

**Setup:**
1. [ ] Crear reserva con inicio en 12 horas
   (Puedes modificar start_at en DB para testing)

**Pasos:**
1. [ ] Ir a "My Bookings"
2. [ ] Click en "Cancelar"
3. [ ] Intentar confirmar

**Resultado Esperado:**
- ✅ Error: "Solo puedes cancelar con al menos 24 horas..."
- ✅ Reserva NO se cancela
- ✅ Estado permanece igual

---

### **Test 3.3: Contacto via WhatsApp**

**Objetivo:** Abrir WhatsApp con mensaje pre-rellenado

**Setup:**
1. [ ] Owner debe tener teléfono configurado en BD
   ```sql
   UPDATE users 
   SET phone = '+598XXXXXXXX' 
   WHERE id = 'OWNER_ID';
   ```

**Pasos:**
1. [ ] Ir a "My Bookings"
2. [ ] Click en "Contactar" de una reserva
3. [ ] Verificar que abre WhatsApp

**Resultado Esperado:**
- ✅ Abre WhatsApp Web en nueva pestaña
- ✅ Número correcto del propietario
- ✅ Mensaje pre-rellenado con info de reserva
- ✅ Mensaje incluye: nombre auto + fechas

**Formato del mensaje esperado:**
```
Hola! Te contacto por la reserva del [Nombre Auto] para [Fecha inicio - Fecha fin].
```

---

### **Test 3.4: Contacto sin Teléfono (Fallback)**

**Objetivo:** Mostrar email si no hay teléfono

**Setup:**
1. [ ] Owner sin teléfono en DB
   ```sql
   UPDATE users 
   SET phone = NULL 
   WHERE id = 'OWNER_ID';
   ```

**Pasos:**
1. [ ] Ir a "My Bookings"
2. [ ] Click en "Contactar"
3. [ ] Ver alert con email

**Resultado Esperado:**
- ✅ Alert muestra email del propietario
- ✅ Incluye nombre si está disponible
- ✅ NO intenta abrir WhatsApp

---

### **Test 3.5: Mapa de Ubicación**

**Objetivo:** Abrir Google Maps con coordenadas

**Setup:**
1. [ ] Auto debe tener coordenadas GPS
   ```sql
   UPDATE cars 
   SET location_lat = -34.9011, 
       location_lng = -56.1645 
   WHERE id = 'CAR_ID';
   ```

**Pasos:**
1. [ ] Ir a "My Bookings"
2. [ ] Click en "Ver ubicación"
3. [ ] Verificar que abre Google Maps

**Resultado Esperado:**
- ✅ Abre Google Maps en nueva pestaña
- ✅ Coordenadas correctas
- ✅ Marker visible en el mapa

---

### **Test 3.6: Mapa sin Coordenadas (Fallback)**

**Objetivo:** Mostrar mensaje si no hay GPS

**Setup:**
1. [ ] Auto sin coordenadas
   ```sql
   UPDATE cars 
   SET location_lat = NULL, 
       location_lng = NULL 
   WHERE id = 'CAR_ID';
   ```

**Pasos:**
1. [ ] Click en "Ver ubicación"
2. [ ] Ver alert con ciudad/provincia

**Resultado Esperado:**
- ✅ Alert muestra ciudad y provincia
- ✅ NO abre Google Maps
- ✅ Mensaje claro de "Coordenadas no disponibles"

---

## 📋 OPTIMIZACIÓN: CONNECTION POOLING

### **Test 4.1: Pooling Habilitado**

**Objetivo:** Verificar que pooling está activo

**Pasos:**
1. [ ] Abrir consola del navegador
2. [ ] Recargar página
3. [ ] Buscar logs de inicialización

**Resultado Esperado:**
```javascript
// Logs esperados en consola:
"🔍 [SUPABASE CLIENT] Inicializando con URL: https://..."
"🔌 [SUPABASE CLIENT] Connection Pooling: ENABLED (transaction mode)"
```

---

### **Test 4.2: Performance Mejorado**

**Objetivo:** Comparar velocidad de queries

**Pasos:**
1. [ ] Hacer 5 búsquedas seguidas de autos
2. [ ] Medir tiempo de cada una (Network tab)
3. [ ] Calcular promedio

**Resultado Esperado:**
- ✅ Primera query: <500ms
- ✅ Queries siguientes: <150ms
- ✅ No hay timeouts
- ✅ Conexiones se reutilizan

---

### **Test 4.3: Concurrencia**

**Objetivo:** Verificar múltiples usuarios simultáneos

**Setup:**
1. [ ] Abrir 5 pestañas con diferentes usuarios
2. [ ] Todos hacen búsquedas al mismo tiempo

**Pasos:**
1. [ ] En cada pestaña: buscar autos
2. [ ] Todas al mismo tiempo (F5 simultáneo)
3. [ ] Verificar que todas responden

**Resultado Esperado:**
- ✅ Todas las pestañas cargan correctamente
- ✅ No hay errores de conexión
- ✅ Tiempo de respuesta similar en todas

---

## 📋 TESTING DE REGRESIÓN

### **Test 5.1: Flujo Completo End-to-End**

**Objetivo:** Verificar que todo el flujo funciona

**Pasos:**
1. [ ] Login como renter
2. [ ] Buscar autos con fechas específicas
3. [ ] Seleccionar un auto disponible
4. [ ] Crear reserva
5. [ ] Autorizar tarjeta (hold)
6. [ ] Completar pago
7. [ ] Verificar en My Bookings
8. [ ] Contactar propietario
9. [ ] Ver ubicación en mapa
10. [ ] Cancelar reserva (si >24h)

**Resultado Esperado:**
- ✅ Todo el flujo sin errores
- ✅ Transiciones suaves
- ✅ Datos correctos en cada paso
- ✅ Estados actualizados en tiempo real

---

### **Test 5.2: Validaciones de Borde**

**Objetivo:** Probar casos límite

**Casos:**
1. [ ] **Reserva mismo día:** Inicio = hoy
2. [ ] **Reserva 1 año adelante:** Inicio = +365 días
3. [ ] **Cancelar exactamente 24h antes:** Debe permitir
4. [ ] **Cancelar 23h 59min antes:** Debe bloquear
5. [ ] **Auto sin fotos:** Debe mostrar placeholder
6. [ ] **Usuario sin email:** No debe poder reservar
7. [ ] **Precio = 0:** Debe bloquear

---

### **Test 5.3: Manejo de Errores**

**Objetivo:** Verificar mensajes claros de error

**Casos:**
1. [ ] **Sin conexión:** Mensaje de red
2. [ ] **Auto no disponible:** Mensaje específico
3. [ ] **Tarjeta inválida:** Mensaje de Stripe
4. [ ] **Sesión expirada:** Redirige a login
5. [ ] **Error de DB:** Mensaje genérico pero claro

---

## 📋 TESTING EN MÓVIL

### **Test 6.1: Responsive Design**

**Pasos:**
1. [ ] Abrir DevTools > Device Toolbar
2. [ ] Probar en iPhone SE (375px)
3. [ ] Probar en iPad (768px)
4. [ ] Probar en Desktop (1920px)

**Verificar:**
- [ ] Botones son tocables
- [ ] Texto legible
- [ ] Imágenes se adaptan
- [ ] No hay scroll horizontal
- [ ] Modals responsive

---

### **Test 6.2: WhatsApp en Móvil**

**Pasos:**
1. [ ] Abrir en móvil real o emulador
2. [ ] Click en "Contactar"
3. [ ] Verificar que abre app de WhatsApp

**Resultado Esperado:**
- ✅ Abre WhatsApp app (no web)
- ✅ Mensaje pre-rellenado
- ✅ Número correcto

---

## 📋 TESTING DE BASE DE DATOS

### **Test 7.1: Verificar Funciones RPC Existen**

```sql
-- Ejecutar en Supabase SQL Editor
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_available_cars', 'is_car_available');
```

**Resultado Esperado:**
```
 routine_name       | routine_type 
--------------------+--------------
 get_available_cars | FUNCTION
 is_car_available   | FUNCTION
(2 rows)
```

---

### **Test 7.2: Verificar Índices Existen**

```sql
-- Verificar índices de performance
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'bookings' 
  AND indexname LIKE 'idx_%';
```

**Resultado Esperado:**
```
        indexname              
-------------------------------
 idx_bookings_overlap
 idx_bookings_car_status_dates
```

---

### **Test 7.3: Test Manual de RPC**

```sql
-- Test get_available_cars
SELECT id, brand, model 
FROM get_available_cars(
  '2025-11-01T00:00:00Z'::timestamptz,
  '2025-11-05T00:00:00Z'::timestamptz,
  10,
  0
);
```

**Resultado Esperado:**
- ✅ Retorna solo autos sin reservas en esas fechas
- ✅ Query rápido (<100ms)

---

```sql
-- Test is_car_available
SELECT is_car_available(
  'AUTO_ID_AQUI'::uuid,
  '2025-11-01T00:00:00Z'::timestamptz,
  '2025-11-05T00:00:00Z'::timestamptz
);
```

**Resultado Esperado:**
- ✅ Retorna `true` si disponible
- ✅ Retorna `false` si ocupado

---

## 📋 TESTING DE SEGURIDAD

### **Test 8.1: RLS (Row Level Security)**

**Objetivo:** Verificar que usuarios solo ven sus datos

**Pasos:**
1. [ ] Login como Usuario A
2. [ ] Ver My Bookings
3. [ ] Login como Usuario B
4. [ ] Ver My Bookings

**Resultado Esperado:**
- ✅ Usuario A solo ve sus reservas
- ✅ Usuario B solo ve sus reservas
- ✅ No hay cross-contamination

---

### **Test 8.2: Autorización de Acciones**

**Casos:**
1. [ ] Usuario NO logueado: No puede reservar
2. [ ] Usuario A: NO puede cancelar reserva de Usuario B
3. [ ] Usuario sin tarjeta: NO puede completar pago

---

## 📋 CHECKLIST FINAL

### **Funcionalidades Core:**
- [ ] ✅ Pagos funcionan para todos los usuarios
- [ ] ✅ Email dinámico correcto
- [ ] ✅ Solo autos disponibles visibles
- [ ] ✅ Doble reserva imposible
- [ ] ✅ Cancelación con validación 24h
- [ ] ✅ WhatsApp contacto funcional
- [ ] ✅ Google Maps funcional
- [ ] ✅ Connection pooling activo

### **Performance:**
- [ ] ✅ Búsquedas <200ms
- [ ] ✅ Sin timeouts
- [ ] ✅ Soporta múltiples usuarios

### **UX:**
- [ ] ✅ Mensajes de error claros
- [ ] ✅ Loading states visibles
- [ ] ✅ Confirmaciones antes de acciones críticas
- [ ] ✅ Responsive en móvil

### **Seguridad:**
- [ ] ✅ RLS activo
- [ ] ✅ Validaciones en DB
- [ ] ✅ No hay SQL injection posible

---

## 🐛 REGISTRO DE BUGS ENCONTRADOS

**Usar este formato para reportar bugs:**

```
Bug #X: [Título corto]
Severidad: [Crítico/Alto/Medio/Bajo]
Pasos para reproducir:
1. ...
2. ...
3. ...

Resultado esperado: ...
Resultado actual: ...
Screenshot/Log: ...
```

---

## ✅ CRITERIOS DE ACEPTACIÓN

**El sistema está listo para producción si:**

- [ ] ✅ Todos los tests P0 pasan (Sprints 1-3)
- [ ] ✅ Al menos 90% de tests pasan
- [ ] ✅ No hay bugs críticos abiertos
- [ ] ✅ Performance dentro de rangos esperados
- [ ] ✅ Funciona en Chrome, Firefox, Safari
- [ ] ✅ Funciona en móvil iOS y Android

---

**Tiempo estimado para completar testing:** 2-3 horas

**Generado:** 2025-10-25 23:14 UTC  
**Versión:** 1.0
