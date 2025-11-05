# 📋 Tests E2E Pendientes - AutoRenta

Este documento lista todos los tests E2E que faltan implementar para tener cobertura completa del flujo de usuario en AutoRenta.

## 📊 Estado Actual

### ✅ Tests Implementados

1. **`tests/e2e/complete-booking-flow.spec.ts`** - Flujo completo de alquiler (Parcial)
   - ✅ Login con storageState (fallback a manual)
   - ✅ Búsqueda y selección de auto
   - ✅ Selección de fechas
   - ✅ Click en "Solicitar reserva"
   - ⚠️ **Pendiente**: Completar flujo hasta post-checkout (actualmente falla en la creación de reserva)
   - ⚠️ **Pendiente**: Configuración de método de pago (wallet)
   - ⚠️ **Pendiente**: Proceso de pago completo
   - ⚠️ **Pendiente**: Verificación de página de éxito
   - ⚠️ **Pendiente**: Verificación de booking creado en base de datos

2. **`tests/visitor/04-map-interaction.spec.ts`** - Interacciones con el mapa
   - ✅ Navegación desde marker del mapa
   - ✅ Navegación desde imagen del popup
   - ✅ Sincronización carousel-mapa

---

## 🚧 Tests Pendientes por Prioridad

### 🔴 P0 - CRÍTICOS (Flujos Core de Negocio)

#### 1. **Flujo Completo de Alquiler (Completar)**
**Archivo**: `tests/e2e/complete-booking-flow.spec.ts`

**Estado**: Parcialmente implementado, necesita completarse

**Tareas pendientes**:
- [ ] Arreglar creación de reserva (actualmente falla con error desconocido)
- [ ] Implementar paso de configuración de método de pago
- [ ] Implementar flujo de pago con wallet
- [ ] Implementar flujo de pago con tarjeta (MercadoPago)
- [ ] Verificar redirección a página de éxito
- [ ] Verificar que el booking se creó en la base de datos
- [ ] Verificar que el estado del booking es correcto
- [ ] Verificar que se creó el payment_intent asociado
- [ ] Verificar que se descontó el monto del wallet (si aplica)
- [ ] Verificar email de confirmación (si está implementado)

**Estimación**: 4-6 horas

---

#### 2. **Flujo de Publicación de Auto**
**Archivo**: `tests/e2e/car-publish-flow.spec.ts` (NUEVO)

**Descripción**: Test completo desde login de owner hasta publicación exitosa de auto

**Pasos a implementar**:
- [ ] Login como owner (test-owner@autorenta.com)
- [ ] Navegar a /cars/publish
- [ ] Llenar formulario de publicación:
  - [ ] Seleccionar marca y modelo
  - [ ] Año, precio por día
  - [ ] Ubicación (ciudad)
  - [ ] Descripción
  - [ ] Subir fotos (mínimo 1, máximo 10)
- [ ] Enviar formulario
- [ ] Verificar que el auto se creó en estado "pending"
- [ ] Verificar que aparece en "Mis autos"
- [ ] Verificar que no aparece en búsqueda pública (pendiente de aprobación)

**Estimación**: 3-4 horas

---

#### 3. **Flujo de Aprobación de Auto (Admin)**
**Archivo**: `tests/e2e/admin-approve-car.spec.ts` (NUEVO)

**Descripción**: Test del flujo de aprobación de autos por admin

**Pasos a implementar**:
- [ ] Login como admin (test-admin@autorenta.com)
- [ ] Navegar a /admin
- [ ] Verificar lista de autos pendientes
- [ ] Seleccionar auto pendiente
- [ ] Verificar detalles del auto
- [ ] Aprobar auto
- [ ] Verificar que cambió a estado "active"
- [ ] Verificar que aparece en búsqueda pública

**Estimación**: 2-3 horas

---

#### 4. **Flujo de Wallet - Depósito**
**Archivo**: `tests/e2e/wallet-deposit-flow.spec.ts` (NUEVO)

**Descripción**: Test completo de depósito en wallet

**Pasos a implementar**:
- [ ] Login como renter
- [ ] Navegar a /wallet
- [ ] Verificar balance inicial
- [ ] Click en "Depositar"
- [ ] Ingresar monto
- [ ] Seleccionar método de pago
- [ ] Redirigir a MercadoPago (sandbox)
- [ ] Completar pago con tarjeta de prueba
- [ ] Verificar redirección de vuelta
- [ ] Verificar que el balance se actualizó
- [ ] Verificar que se creó la transacción en wallet_transactions
- [ ] Verificar estado de la transacción

**Estimación**: 4-5 horas

---

#### 5. **Flujo de Wallet - Retiro**
**Archivo**: `tests/e2e/wallet-withdraw-flow.spec.ts` (NUEVO)

**Descripción**: Test de retiro de fondos del wallet

**Pasos a implementar**:
- [ ] Login como renter con wallet con fondos
- [ ] Navegar a /wallet
- [ ] Click en "Retirar"
- [ ] Ingresar monto (verificar validaciones: mínimo, máximo, fondos disponibles)
- [ ] Seleccionar método de retiro
- [ ] Confirmar retiro
- [ ] Verificar que se creó la transacción
- [ ] Verificar que el balance se descontó
- [ ] Verificar estado "pending" de la transacción

**Estimación**: 3-4 horas

---

### 🟡 P1 - IMPORTANTES (Flujos de Usuario Frecuentes)

#### 6. **Flujo de Cancelación de Reserva**
**Archivo**: `tests/e2e/booking-cancellation-flow.spec.ts` (NUEVO)

**Descripción**: Test de cancelación de reserva por parte del renter

**Pasos a implementar**:
- [ ] Login como renter
- [ ] Crear reserva (o usar reserva existente)
- [ ] Navegar a /bookings
- [ ] Seleccionar reserva activa
- [ ] Click en "Cancelar"
- [ ] Confirmar cancelación
- [ ] Verificar que el estado cambió a "cancelled"
- [ ] Verificar que se reembolsó el monto (si aplica)
- [ ] Verificar que el auto está disponible nuevamente

**Estimación**: 3-4 horas

---

#### 7. **Flujo de Búsqueda y Filtros**
**Archivo**: `tests/e2e/car-search-filters.spec.ts` (NUEVO)

**Descripción**: Test de búsqueda y filtrado de autos

**Pasos a implementar**:
- [ ] Navegar a /cars (sin login)
- [ ] Verificar que se muestran autos
- [ ] Aplicar filtro de ciudad
- [ ] Aplicar filtro de precio (rango)
- [ ] Aplicar filtro de fecha (disponibilidad)
- [ ] Aplicar filtro de marca/modelo
- [ ] Verificar que los resultados se filtran correctamente
- [ ] Verificar que el mapa se actualiza con los filtros
- [ ] Limpiar filtros
- [ ] Verificar que se muestran todos los autos nuevamente

**Estimación**: 3-4 horas

---

#### 8. **Flujo de Perfil de Usuario**
**Archivo**: `tests/e2e/user-profile-flow.spec.ts` (NUEVO)

**Descripción**: Test de edición de perfil de usuario

**Pasos a implementar**:
- [ ] Login como renter
- [ ] Navegar a /profile
- [ ] Verificar información actual
- [ ] Editar nombre completo
- [ ] Editar teléfono
- [ ] Subir avatar
- [ ] Guardar cambios
- [ ] Verificar que se actualizó correctamente
- [ ] Verificar que el avatar se muestra en el header

**Estimación**: 2-3 horas

---

#### 9. **Flujo de Verificación de Documentos**
**Archivo**: `tests/e2e/document-verification-flow.spec.ts` (NUEVO)

**Descripción**: Test de subida y verificación de documentos

**Pasos a implementar**:
- [ ] Login como renter
- [ ] Navegar a /profile o /verification
- [ ] Subir documento de identidad
- [ ] Subir comprobante de domicilio
- [ ] Verificar que se muestran como "pendientes"
- [ ] Login como admin
- [ ] Aprobar documentos
- [ ] Verificar que el estado cambió a "verified"
- [ ] Verificar badge de verificación en perfil

**Estimación**: 3-4 horas

---

### 🟢 P2 - NICE TO HAVE (Mejoras y Edge Cases)

#### 10. **Test de Autenticación Completo**
**Archivo**: `tests/e2e/auth-complete-flow.spec.ts` (NUEVO)

**Descripción**: Test completo de autenticación (registro, login, logout, recuperación)

**Pasos a implementar**:
- [ ] Registro de nuevo usuario
- [ ] Verificación de email (si aplica)
- [ ] Login con credenciales correctas
- [ ] Login con credenciales incorrectas
- [ ] Logout
- [ ] Recuperación de contraseña
- [ ] Cambio de contraseña

**Estimación**: 3-4 horas

---

#### 11. **Test de Responsive Design**
**Archivo**: `tests/e2e/responsive-design.spec.ts` (NUEVO)

**Descripción**: Verificar que la aplicación funciona en diferentes tamaños de pantalla

**Pasos a implementar**:
- [ ] Test en mobile (375px)
- [ ] Test en tablet (768px)
- [ ] Test en desktop (1920px)
- [ ] Verificar navegación móvil
- [ ] Verificar que el mapa se adapta
- [ ] Verificar que los formularios son usables

**Estimación**: 2-3 horas

---

#### 12. **Test de Performance**
**Archivo**: `tests/e2e/performance.spec.ts` (NUEVO)

**Descripción**: Verificar tiempos de carga y performance

**Pasos a implementar**:
- [ ] Medir tiempo de carga inicial
- [ ] Medir tiempo de carga de mapa
- [ ] Medir tiempo de carga de lista de autos
- [ ] Verificar que no hay memory leaks
- [ ] Verificar Web Vitals

**Estimación**: 2-3 horas

---

#### 13. **Test de Edge Cases**
**Archivo**: `tests/e2e/edge-cases.spec.ts` (NUEVO)

**Descripción**: Test de casos límite y validaciones

**Pasos a implementar**:
- [ ] Intentar reservar auto sin fechas
- [ ] Intentar reservar auto con fechas inválidas (pasado)
- [ ] Intentar reservar auto sin fondos suficientes
- [ ] Intentar publicar auto sin fotos
- [ ] Intentar depositar monto inválido (negativo, cero, muy grande)
- [ ] Intentar retirar más de lo disponible

**Estimación**: 3-4 horas

---

#### 14. **Test de Integración con MercadoPago**
**Archivo**: `tests/e2e/mercadopago-integration.spec.ts` (NUEVO)

**Descripción**: Test completo de integración con MercadoPago (sandbox)

**Pasos a implementar**:
- [ ] Crear preferencia de pago
- [ ] Redirigir a MercadoPago
- [ ] Completar pago con tarjeta de prueba aprobada
- [ ] Completar pago con tarjeta rechazada
- [ ] Verificar webhook (si se puede simular)
- [ ] Verificar actualización de estado en BD

**Estimación**: 4-5 horas

---

#### 15. **Test de Notificaciones**
**Archivo**: `tests/e2e/notifications-flow.spec.ts` (NUEVO)

**Descripción**: Test de sistema de notificaciones (si está implementado)

**Pasos a implementar**:
- [ ] Verificar notificaciones de nueva reserva (owner)
- [ ] Verificar notificaciones de reserva confirmada (renter)
- [ ] Verificar notificaciones de pago recibido
- [ ] Verificar notificaciones de cancelación

**Estimación**: 2-3 horas

---

## 📝 Notas de Implementación

### Configuración Requerida

1. **Usuarios de Prueba**:
   - ✅ `test-renter@autorenta.com` - Renter (existe)
   - ⚠️ `test-owner@autorenta.com` - Owner (verificar si existe)
   - ⚠️ `test-admin@autorenta.com` - Admin (verificar si existe)

2. **StorageState**:
   - ✅ `tests/.auth/renter.json` - Creado
   - ❌ `tests/.auth/owner.json` - Pendiente
   - ❌ `tests/.auth/admin.json` - Pendiente

3. **Datos de Prueba**:
   - Autos publicados y aprobados
   - Wallet con fondos para tests de pago
   - Reservas de prueba para tests de cancelación

### Problemas Conocidos

1. **`complete-booking-flow.spec.ts`**:
   - Error al crear reserva (investigar mensaje de error específico)
   - La sesión se pierde durante el flujo (mejorar manejo de storageState)

2. **Autenticación**:
   - El `user-menu` no se detecta consistentemente
   - Necesita mejor manejo de storageState

### Mejoras Sugeridas

1. **Helpers y Utilities**:
   - Crear `tests/helpers/booking-helpers.ts` para funciones comunes
   - Crear `tests/helpers/wallet-helpers.ts` para operaciones de wallet
   - Crear `tests/helpers/auth-helpers.ts` para autenticación

2. **Fixtures**:
   - Mejorar `tests/fixtures/auth.setup.ts` para detectar autenticación correctamente
   - Crear fixtures para datos de prueba (autos, reservas, etc.)

3. **Page Objects**:
   - Considerar usar Page Object Model para mejor mantenibilidad
   - Crear `tests/pages/BookingPage.ts`, `WalletPage.ts`, etc.

---

## 📊 Resumen de Estimación

| Prioridad | Tests | Horas Estimadas |
|-----------|-------|-----------------|
| P0 (Críticos) | 5 | 16-22 horas |
| P1 (Importantes) | 4 | 11-14 horas |
| P2 (Nice to Have) | 6 | 16-22 horas |
| **TOTAL** | **15** | **43-58 horas** |

---

## 🎯 Próximos Pasos Recomendados

1. **Completar `complete-booking-flow.spec.ts`** (P0)
   - Investigar y arreglar el error al crear reserva
   - Implementar flujo de pago completo
   - Verificar integración end-to-end

2. **Crear `car-publish-flow.spec.ts`** (P0)
   - Implementar flujo básico de publicación
   - Verificar creación en BD

3. **Crear `wallet-deposit-flow.spec.ts`** (P0)
   - Implementar flujo de depósito
   - Verificar integración con MercadoPago sandbox

4. **Mejorar infraestructura de tests**
   - Crear helpers comunes
   - Mejorar storageState setup
   - Documentar mejor los selectores

---

**Última actualización**: 2025-11-03  
**Mantenedor**: Equipo de Desarrollo AutoRenta

