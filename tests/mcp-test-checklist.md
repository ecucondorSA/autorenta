# Checklist de Tests con State-Aware MCP

Este documento define los tests que utilizarán el sistema MCP (Model Context Protocol) para testing state-aware en AutoRenta.

## 🎯 Objetivo

Validar que todos los flujos críticos de la aplicación funcionen correctamente utilizando MCP para:
- Preparar estados de base de datos específicos
- Verificar cambios en la base de datos después de acciones del usuario
- Analizar la estructura de tests y componentes
- Mantener trazabilidad entre UI y estado del backend

---

## 📋 Tests Planificados

**Total: 6 archivos de test | 18 tests individuales**

---

### 1. Flujo de Búsqueda y Filtros
**Archivo**: `tests/renter/02-search-filters.spec.ts`
**Total de tests en este archivo: 4 tests**

#### Estado Actual
- [x] Archivo creado
- [x] Integración MCP implementada
- [ ] Todos los tests completados

#### Herramientas MCP Utilizadas
- `reset_test_state` - Para cargar fixture `search_results`
- `verify_db_record` - Para validar datos en DB

#### Tests Individuales

##### Test 1: "should load and display cars from fixture"
- [ ] **Setup MCP**: Cargar fixture `search_results` con 10+ autos
- [ ] **UI**: Navegar a catálogo
- [ ] **Verify**: Validar que se muestren todos los autos
- [ ] **MCP Verify**: Confirmar cantidad de autos en tabla `cars`

##### Test 2: "should filter cars by category (SUV, Sedan)"
- [ ] **Setup MCP**: Fixture con autos de múltiples categorías
- [ ] **UI**: Aplicar filtro de categoría "SUV"
- [ ] **Verify**: Solo se muestran SUVs
- [ ] **MCP Verify**: Validar que DB tiene autos SUV disponibles
- [ ] **UI**: Cambiar a "Sedan"
- [ ] **Verify**: Solo se muestran Sedans

##### Test 3: "should filter cars by price range"
- [ ] **Setup MCP**: Fixture con autos de diferentes precios ($20-$100/día)
- [ ] **UI**: Aplicar filtro de precio $30-$60
- [ ] **Verify**: Resultados dentro del rango
- [ ] **MCP Verify**: Confirmar precios en DB coinciden

##### Test 4: "should apply multiple filters simultaneously"
- [ ] **Setup MCP**: Fixture con datos variados
- [ ] **UI**: Aplicar categoría "SUV" + precio $40-$80
- [ ] **Verify**: Resultados cumplen ambos criterios
- [ ] **MCP Verify**: Validar intersección de datos en DB

---

### 2. Flujo Completo de Reserva
**Archivo**: `tests/renter/03-booking-flow.spec.ts`
**Total de tests en este archivo: 2 tests** (flujo end-to-end)

#### Estado Actual
- [x] Archivo creado
- [x] Integración MCP básica
- [ ] Verificaciones completas implementadas

#### Herramientas MCP Utilizadas
- `reset_test_state` - Estado inicial limpio
- `verify_db_record` - Validar booking en cada paso

#### Tests Individuales

##### Test 1: "should complete full booking flow from search to pending"
- [ ] **Setup MCP**: Cargar fixture `booking_flow` con autos disponibles
- [ ] **MCP Verify**: Confirmar auto disponible en DB
- [ ] **UI**: Buscar y seleccionar auto
- [ ] **UI**: Configurar fechas de reserva
- [ ] **MCP Verify**: No hay conflictos en `car_blocked_dates`
- [ ] **UI**: Completar formulario de reserva
- [ ] **MCP Verify**: Booking creado con estado `pending`
- [ ] **MCP Verify**: Campos correctos: `car_id`, `renter_id`, `start_date`, `end_date`, `total_price`

##### Test 2: "should confirm booking and block dates after payment"
- [ ] **Setup MCP**: Crear booking en estado `pending`
- [ ] **UI**: Navegar a checkout
- [ ] **UI**: Procesar pago (simulado)
- [ ] **MCP Verify**: Estado cambiado a `confirmed`
- [ ] **MCP Verify**: Fechas insertadas en `car_blocked_dates`
- [ ] **MCP Verify**: `booking_id` vinculado correctamente
- [ ] **UI**: Verificar que auto no aparece disponible para esas fechas

---

### 3. Flujo de Checkout
**Archivo**: `tests/renter/04-checkout-flow.spec.ts`
**Total de tests en este archivo: 3 tests**

#### Estado Actual
- [ ] Archivo por crear
- [ ] Integración MCP por implementar

#### Herramientas MCP Utilizadas
- `reset_test_state` - Crear booking pre-existente
- `verify_db_record` - Validar estados de pago

#### Tests Individuales

##### Test 1: "should load checkout with pre-existing pending booking"
- [ ] **Setup MCP**: Crear booking en estado `pending` con fixture `checkout_ready`
- [ ] **MCP Verify**: Booking existe en DB
- [ ] **UI**: Navegar a `/checkout/:booking_id`
- [ ] **Verify**: Datos del auto se muestran correctamente
- [ ] **Verify**: Fechas y precio total correctos

##### Test 2: "should process payment and update booking status"
- [ ] **Setup MCP**: Booking en estado `pending`
- [ ] **UI**: Ingresar información de pago
- [ ] **UI**: Confirmar pago
- [ ] **MCP Verify**: Estado actualizado a `confirmed` en DB
- [ ] **MCP Verify**: Timestamp de `confirmed_at` registrado

##### Test 3: "should handle payment failure gracefully"
- [ ] **Setup MCP**: Booking en estado `pending`
- [ ] **UI**: Simular fallo de pago
- [ ] **Verify**: Mensaje de error mostrado
- [ ] **MCP Verify**: Estado permanece `pending`
- [ ] **Verify**: Usuario puede reintentar

---

### 4. Gestión de Disponibilidad (Owner)
**Archivo**: `tests/owner/01-availability-management.spec.ts`
**Total de tests en este archivo: 3 tests**

#### Estado Actual
- [ ] Archivo por crear
- [ ] Integración MCP por implementar

#### Herramientas MCP Utilizadas
- `reset_test_state` - Crear auto con bookings
- `verify_db_record` - Validar fechas bloqueadas

#### Tests Individuales

##### Test 1: "should display calendar with existing bookings"
- [ ] **Setup MCP**: Auto con 2 bookings confirmados en fixture
- [ ] **MCP Verify**: Bookings existen en DB
- [ ] **UI**: Navegar a calendario de disponibilidad
- [ ] **Verify**: Fechas de bookings marcadas como bloqueadas
- [ ] **MCP Verify**: Validar contra `car_blocked_dates`

##### Test 2: "should manually block dates"
- [ ] **Setup MCP**: Auto sin bloqueos manuales
- [ ] **UI**: Seleccionar rango de fechas en calendario
- [ ] **UI**: Guardar bloqueo manual
- [ ] **MCP Verify**: Registro insertado en `car_blocked_dates`
- [ ] **MCP Verify**: Campo `booking_id` es NULL (bloqueo manual)
- [ ] **Verify**: Fechas aparecen bloqueadas en UI

##### Test 3: "should unblock manually blocked dates"
- [ ] **Setup MCP**: Auto con bloqueos manuales y de bookings
- [ ] **UI**: Seleccionar fechas bloqueadas manualmente
- [ ] **UI**: Eliminar bloqueo
- [ ] **MCP Verify**: Registro eliminado de DB
- [ ] **Verify**: Fechas aparecen disponibles en UI
- [ ] **UI**: Intentar desbloquear fechas con booking
- [ ] **Verify**: Acción bloqueada/advertencia mostrada

---

### 5. Autenticación y Autorización
**Archivo**: `tests/auth/01-authentication-flow.spec.ts`
**Total de tests en este archivo: 3 tests**

#### Estado Actual
- [x] Setup de auth global implementado
- [ ] Tests específicos por crear

#### Herramientas MCP Utilizadas
- `verify_db_record` - Validar sesiones en Supabase
- `reset_test_state` - Limpiar sesiones previas

#### Tests Individuales

##### Test 1: "should login successfully and create session"
- [ ] **Setup MCP**: Limpiar sesiones existentes
- [ ] **UI**: Navegar a login
- [ ] **UI**: Ingresar credenciales válidas
- [ ] **UI**: Submit login
- [ ] **Verify**: Redirección a dashboard
- [ ] **MCP Verify**: Sesión creada en tabla `auth.sessions`
- [ ] **Verify**: Token guardado en localStorage

##### Test 2: "should persist session after page reload"
- [ ] **Setup**: Sesión activa del test anterior
- [ ] **UI**: Recargar página
- [ ] **Verify**: Usuario sigue autenticado
- [ ] **MCP Verify**: Token válido en DB
- [ ] **Verify**: No se solicita login nuevamente

##### Test 3: "should logout and clear session"
- [ ] **Setup**: Sesión activa
- [ ] **UI**: Click en logout
- [ ] **MCP Verify**: Sesión eliminada/invalidada en DB
- [ ] **Verify**: localStorage limpiado
- [ ] **Verify**: Redirección a página pública
- [ ] **UI**: Intentar acceder a ruta protegida
- [ ] **Verify**: Redirección a login

---

### 6. Búsqueda con Geolocalización
**Archivo**: `tests/renter/05-geo-search.spec.ts`
**Total de tests en este archivo: 3 tests**

#### Estado Actual
- [ ] Archivo por crear
- [ ] Integración MCP por implementar

#### Herramientas MCP Utilizadas
- `reset_test_state` - Cargar autos con coordenadas
- `verify_db_record` - Validar ubicaciones

#### Tests Individuales

##### Test 1: "should show nearby cars based on user location"
- [ ] **Setup MCP**: Fixture con autos en diferentes ubicaciones (lat/lng)
- [ ] **MCP Verify**: Coordenadas guardadas en DB
- [ ] **UI**: Simular geolocalización del usuario (ej: -34.603722, -58.381592)
- [ ] **UI**: Buscar autos cercanos
- [ ] **Verify**: Autos ordenados por distancia
- [ ] **Verify**: Distancia calculada y mostrada

##### Test 2: "should filter by distance radius (5km, 10km, 25km)"
- [ ] **Setup MCP**: Autos a diferentes distancias del usuario
- [ ] **UI**: Aplicar filtro de 5km
- [ ] **Verify**: Solo autos dentro de 5km
- [ ] **MCP Verify**: Validar coordenadas en DB
- [ ] **UI**: Cambiar a 10km
- [ ] **Verify**: Más resultados aparecen
- [ ] **UI**: Cambiar a 25km
- [ ] **Verify**: Todos los autos cercanos visibles

##### Test 3: "should combine geo-search with other filters"
- [ ] **Setup MCP**: Autos variados (ubicación, categoría, precio)
- [ ] **UI**: Aplicar filtro de 10km + categoría "SUV" + precio $30-$60
- [ ] **Verify**: Resultados cumplen todos los criterios
- [ ] **MCP Verify**: Validar datos combinados en DB

---

## 🔧 Herramientas MCP Disponibles

### Gestión de Estado
- **`reset_test_state`**: Carga fixtures predefinidos en la base de datos
- **`verify_db_record`**: Verifica que un registro exista con valores específicos

### Análisis de Código
- **`analyze_test_structure`**: Analiza estructura de archivos de test
- **`search_component`**: Busca componentes en el código
- **`find_method_definition`**: Encuentra definición de métodos

---

## 📊 Fixtures Necesarios

### `search_results.json`
```json
{
  "cars": [
    { "category": "SUV", "price_per_day": 50, "available": true },
    { "category": "Sedan", "price_per_day": 35, "available": true },
    { "category": "Truck", "price_per_day": 75, "available": true }
  ]
}
```

### `booking_flow.json`
```json
{
  "cars": [{ "id": "test-car-1", "available": true }],
  "bookings": []
}
```

### `checkout_ready.json`
```json
{
  "bookings": [{
    "id": "test-booking-1",
    "status": "pending",
    "car_id": "test-car-1",
    "total_price": 150
  }]
}
```

---

## ✅ Criterios de Éxito

Para cada test:
1. ✅ Utiliza al menos una herramienta MCP
2. ✅ Verifica estado de DB antes y después de acciones
3. ✅ Tiene fixture asociado bien definido
4. ✅ Documenta bloques de test claramente
5. ✅ Pasa consistentemente (no flaky)
6. ✅ Tiempo de ejecución < 30 segundos

---

## 🚀 Próximos Pasos

1. [ ] Completar implementación de `02-search-filters.spec.ts`
2. [ ] Agregar verificaciones MCP a `03-booking-flow.spec.ts` (B3 y B4)
3. [ ] Crear fixtures para todos los tests planificados
4. [ ] Implementar `04-checkout-flow.spec.ts`
5. [ ] Documentar patrones comunes de uso de MCP
6. [ ] Crear guía de troubleshooting para tests MCP

---

## 📝 Notas

- Todos los tests deben usar el fixture `McpTestClient` de Playwright
- Las verificaciones de DB deben ser específicas (tabla, id, campos esperados)
- Cada fixture debe dejar la DB en estado limpio y predecible
- Considerar agregar timeouts apropiados para operaciones de DB
