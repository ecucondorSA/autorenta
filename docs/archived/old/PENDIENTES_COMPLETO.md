# 📋 LISTA COMPLETA DE PENDIENTES - AutoRenta

**Fecha:** 26 de Octubre 2025  
**Estado Actual:** 60% Completado (8/20 deficiencias)

---

## 🔴 ALTA PRIORIDAD (1 tarea - ~8-12h)

### 1. Sistema de Aprobación Manual de Reservas
**⏱️ Tiempo:** 8-12 horas  
**Prioridad:** 🔴 CRÍTICA  

**Problema:**
- Reservas se aprueban automáticamente al pagar
- Locador NO puede rechazar después del pago
- Sin flexibilidad vs Airbnb/Turo

**Tareas:**
- [ ] Añadir campos a tabla `cars`:
  ```sql
  ALTER TABLE cars ADD COLUMN instant_booking BOOLEAN DEFAULT true;
  ALTER TABLE cars ADD COLUMN require_approval BOOLEAN DEFAULT false;
  ALTER TABLE cars ADD COLUMN approval_timeout_hours INTEGER DEFAULT 24;
  ```
- [ ] Crear estado `pending_approval` en bookings
- [ ] Crear función RPC `approve_booking()`
- [ ] Crear función RPC `reject_booking()`
- [ ] Crear servicio: `bookings.service.ts`
  - `approveBooking(bookingId)`
  - `rejectBooking(bookingId, reason)`
- [ ] Crear página: `/bookings/pending-approval`
- [ ] Crear componente: `booking-approval-buttons`
- [ ] Añadir toggle en formulario de publicación
- [ ] Sistema de timeout (auto-cancel si no responde en 24h)
- [ ] Notificaciones a locador cuando hay reserva pendiente
- [ ] Notificaciones a locatario cuando se aprueba/rechaza
- [ ] Tests

**Archivos a Crear/Modificar:**
```
database/add-booking-approval.sql
apps/web/src/app/core/services/bookings.service.ts (modificar)
apps/web/src/app/features/bookings/pending-approval/ (nuevo)
apps/web/src/app/shared/components/booking-approval-buttons/ (nuevo)
apps/web/src/app/features/cars/publish/publish-car-v2.page.ts (modificar)
```

---

## �� MEDIA PRIORIDAD (7 tareas - ~40-50h)

### 2. Notificaciones de Mensajes Nuevos
**⏱️ Tiempo:** 6-8 horas  
**Prioridad:** 🟡 ALTA-MEDIA

**Problema:**
- Chat funciona pero sin notificaciones
- Usuario debe estar en la página para ver mensajes
- Competencia tiene email/push

**Tareas:**
- [ ] Crear tabla `message_notifications`
- [ ] Función RPC trigger al insertar mensaje
- [ ] Integración con servicio de email (SendGrid/Resend)
- [ ] Template de email "Nuevo mensaje"
- [ ] Badge con contador en navbar
- [ ] Notificación push (si existe PWA)
- [ ] Configuración de usuario (opt-in/out)
- [ ] Tests

**Archivos:**
```
database/add-message-notifications.sql
apps/web/src/app/core/services/notifications.service.ts (nuevo)
apps/web/src/app/shared/components/navbar/ (modificar - badge)
```

---

### 3. Chat Pre-Reserva
**⏱️ Tiempo:** 6 horas  
**Prioridad:** 🟡 MEDIA

**Problema:**
- Usuario no puede preguntar ANTES de reservar
- Backend ya soporta (`car_id`)
- Solo falta UI

**Tareas:**
- [ ] Botón "Preguntar al dueño" en car-detail
- [ ] Modal o página `/cars/:id/chat`
- [ ] Componente reutilizable de chat (car-chat)
- [ ] Listar conversaciones por auto
- [ ] Lógica: Si ya hay booking, redirigir a booking-chat
- [ ] Tests

**Archivos:**
```
apps/web/src/app/features/cars/detail/car-detail.page.html (modificar)
apps/web/src/app/shared/components/car-chat/ (nuevo)
apps/web/src/app/features/messages/car-messages/ (nuevo)
```

---

### 4. Vista de Todas las Conversaciones
**⏱️ Tiempo:** 8 horas  
**Prioridad:** 🟡 MEDIA

**Problema:**
- Chats solo accesibles desde cada reserva
- No hay vista consolidada
- Dificulta gestión para usuarios activos

**Tareas:**
- [ ] Crear página `/messages`
- [ ] Lista de conversaciones con:
  - Avatar del otro usuario
  - Último mensaje
  - Timestamp
  - Badge no leídos
- [ ] Click abre chat en sidebar o modal
- [ ] Filtros: Todos, No leídos, Por auto
- [ ] Búsqueda por nombre/auto
- [ ] Marcar como leído
- [ ] Tests

**Archivos:**
```
apps/web/src/app/features/messages/ (nuevo)
apps/web/src/app/features/messages/conversations-list/ (nuevo)
```

---

### 5. Dashboard de Métricas por Auto
**⏱️ Tiempo:** 4-6 horas  
**Prioridad:** 🟡 MEDIA

**Problema:**
- Locador no ve estadísticas de sus autos
- Útil para optimizar precios
- Competencia tiene analytics

**Tareas:**
- [ ] En my-cars, añadir tarjeta de métricas:
  - Total reservas
  - Ingresos (este mes, total)
  - Días rentados vs disponibles
  - Rating promedio
  - Tasa de ocupación
- [ ] Gráfico simple (opcional)
- [ ] Click en métricas abre detalle
- [ ] Vista detallada `/cars/:id/analytics`
- [ ] Tests

**Archivos:**
```
apps/web/src/app/features/cars/my-cars/my-cars.page.ts (modificar)
apps/web/src/app/shared/components/car-metrics-card/ (nuevo)
apps/web/src/app/features/cars/car-analytics/ (nuevo)
```

---

### 6. Completar Investigación Financiera
**⏱️ Tiempo:** 2-3 horas  
**Prioridad:** 🟡 MEDIA

**Pendiente:**
- [ ] Verificar flujo completo pago con tarjeta
- [ ] Documentar si usa Split Payment de MercadoPago
- [ ] Investigar seguros P2P (tablas, implementación)
- [ ] Documentar proceso de retiro de locadores
- [ ] Verificar si hay límites de retiro
- [ ] Actualizar ANALISIS_FLUJO_FINANCIERO.md al 100%

---

### 7. Feedback Visual AI Photo Enhancer
**⏱️ Tiempo:** 2 horas  
**Prioridad:** 🟡 MEDIA-BAJA

**Problema:**
- Usuario sube foto y no sabe si está procesando
- No hay indicador de error si falla
- UX incompleta

**Tareas:**
- [ ] Añadir estados al componente:
  - `uploading` - Progress bar
  - `processing` - "Mejorando foto con IA..."
  - `success` - Checkmark verde
  - `error` - Mensaje de error
- [ ] Spinner o skeleton loader
- [ ] Retry button si falla
- [ ] Tooltip explicando qué hace la IA

**Archivos:**
```
apps/web/src/app/features/cars/publish/publish-car-v2.page.ts (modificar)
apps/web/src/app/shared/components/photo-uploader/ (si existe, modificar)
```

---

### 8. Sistema de Marcado de "Leído" en Chat
**⏱️ Tiempo:** 4 horas  
**Prioridad:** 🟡 MEDIA-BAJA

**Problema:**
- No se sabe si el otro usuario leyó el mensaje
- Útil para coordinación

**Tareas:**
- [ ] Crear tabla `message_reads`
- [ ] Trigger automático al abrir chat
- [ ] Mostrar checkmark doble cuando leído
- [ ] Badge de mensajes no leídos en navbar
- [ ] Badge en lista de conversaciones
- [ ] Tests

**Archivos:**
```
database/add-message-reads.sql
apps/web/src/app/core/services/messages.service.ts (modificar)
apps/web/src/app/shared/components/booking-chat/ (modificar)
```

---

## 🟢 BAJA PRIORIDAD (4 tareas - ~15-20h)

### 9. Refactor Código Duplicado en Tarjetas
**⏱️ Tiempo:** 1-2 horas  
**Prioridad:** 🟢 BAJA

**Problema:**
- Código similar en car-card, booking-card, etc.
- Dificulta mantenimiento

**Tareas:**
- [ ] Identificar lógica común
- [ ] Crear componentes base reutilizables
- [ ] Extraer utilidades compartidas
- [ ] Refactorizar componentes existentes
- [ ] Tests

---

### 10. Acciones Rápidas en my-cars
**⏱️ Tiempo:** 2 horas  
**Prioridad:** 🟢 BAJA

**Problema:**
- Solo hay botones editar/eliminar
- Podrían ser más eficientes

**Tareas:**
- [ ] Crear menú dropdown "⋮"
- [ ] Acciones:
  - Ver detalle
  - Editar
  - Duplicar auto
  - Ver reservas
  - Ver métricas
  - Toggle disponibilidad (ya existe)
  - Eliminar
- [ ] Confirmar acciones críticas
- [ ] Tests

**Archivos:**
```
apps/web/src/app/features/cars/my-cars/my-cars.page.ts (modificar)
apps/web/src/app/shared/components/car-card/ (modificar)
```

---

### 11. Flujo de Reserva como Modal
**⏱️ Tiempo:** 3 horas  
**Prioridad:** 🟢 BAJA

**Problema:**
- Flujo requiere navegar a otra página
- Podría ser más fluido con modal

**Tareas:**
- [ ] Convertir booking-detail-payment a modal
- [ ] Mantener compatibilidad con ruta `/bookings/detail-payment/:id`
- [ ] Animaciones suaves
- [ ] Tests

---

### 12. Función "Duplicar Auto"
**⏱️ Tiempo:** 2 horas  
**Prioridad:** 🟢 BAJA

**Problema:**
- Locador con múltiples autos similares
- Debe llenar todo el formulario cada vez

**Tareas:**
- [ ] Botón "Duplicar" en my-cars
- [ ] Copia datos del auto (excepto fotos)
- [ ] Abre formulario pre-llenado
- [ ] Usuario modifica y publica
- [ ] Tests

**Archivos:**
```
apps/web/src/app/core/services/cars.service.ts (añadir duplicateCar())
apps/web/src/app/features/cars/my-cars/my-cars.page.ts (modificar)
```

---

## 🏗️ FEATURES GRANDES (3 tareas - ~20-30h)

### 13. Sistema de Check-in/Check-out Digital
**⏱️ Tiempo:** 8-12 horas  
**Prioridad:** 🟡 MEDIA (futuro)

**Descripción:**
Sistema completo para documentar inicio y fin del alquiler.

**Tareas:**
- [ ] Diseñar flujo UX
- [ ] Página `/bookings/:id/checkin`
- [ ] Página `/bookings/:id/checkout`
- [ ] Captura de fotos (exterior, interior, kilometraje)
- [ ] Firma digital de ambas partes
- [ ] Reporte de daños pre-existentes
- [ ] Reporte de daños al devolver
- [ ] Storage de fotos en Supabase
- [ ] Validación bilateral
- [ ] PDF generado automáticamente
- [ ] Tests

**Archivos:**
```
database/add-checkin-checkout.sql
apps/web/src/app/features/bookings/checkin/ (nuevo)
apps/web/src/app/features/bookings/checkout-inspection/ (nuevo)
apps/web/src/app/shared/components/photo-capture/ (nuevo)
apps/web/src/app/shared/components/signature-pad/ (nuevo)
```

---

### 14. Soporte para Archivos en Chat
**⏱️ Tiempo:** 8-12 horas  
**Prioridad:** 🟢 BAJA (futuro)

**Descripción:**
Permitir envío de imágenes/documentos en el chat.

**Tareas:**
- [ ] Añadir campo `attachment_url` a tabla messages
- [ ] Upload a Supabase Storage
- [ ] Validación de tipo/tamaño de archivo
- [ ] Preview de imágenes en chat
- [ ] Botón de descarga para documentos
- [ ] Compresión automática de imágenes
- [ ] Tests

---

### 15. Refactor Componente de Pago Grande
**⏱️ Tiempo:** 6-8 horas  
**Prioridad:** 🟢 BAJA (deuda técnica)

**Problema:**
- `booking-detail-payment.page.ts` es muy grande
- Dificulta mantenimiento

**Tareas:**
- [ ] Analizar componente actual
- [ ] Dividir en componentes más pequeños:
  - `payment-method-selector`
  - `payment-summary`
  - `payment-confirmation`
- [ ] Extraer lógica a servicios
- [ ] Mantener funcionalidad existente
- [ ] Tests de regresión

---

## 🧪 TESTING (2 tareas - ~6-8h)

### 16. Tests Playwright para Flujos Críticos
**⏱️ Tiempo:** 4-6 horas  
**Prioridad:** 🔴 ALTA

**Tareas:**
- [ ] Test E2E: Flujo completo de reserva (locatario)
- [ ] Test E2E: Publicar auto (locador)
- [ ] Test E2E: Chat entre usuarios
- [ ] Test: Flujo de pago con wallet
- [ ] Test: Flujo de pago con tarjeta
- [ ] Test: Cancelación de reserva
- [ ] Configurar CI/CD para tests

**Archivos:**
```
apps/web/e2e/flows/booking-flow.spec.ts (nuevo)
apps/web/e2e/flows/publish-car.spec.ts (nuevo)
apps/web/e2e/flows/messaging.spec.ts (nuevo)
```

---

### 17. Validación Manual Completa
**⏱️ Tiempo:** 2 horas  
**Prioridad:** 🔴 ALTA

**Checklist:**
- [ ] Probar cambios de hoy en desarrollo
- [ ] Flujo locatario completo
- [ ] Flujo locador completo
- [ ] Toggle disponibilidad
- [ ] Tasas de cambio dinámicas
- [ ] Campo value_usd en formulario
- [ ] Verificar cálculos de seguro
- [ ] Chat funciona correctamente
- [ ] Responsive en móvil

---

## 📚 DOCUMENTACIÓN (3 tareas - ~3-4h)

### 18. Guía de Usuario para Locadores
**⏱️ Tiempo:** 1-2 horas  
**Prioridad:** 🟡 MEDIA

**Tareas:**
- [ ] "Cómo publicar tu primer auto"
- [ ] "Cómo gestionar reservas"
- [ ] "Cómo usar el chat"
- [ ] "Cómo configurar precios"
- [ ] "Políticas de cancelación"
- [ ] Screenshots ilustrativos
- [ ] FAQs

**Archivo:**
```
GUIA_LOCADORES.md
```

---

### 19. Guía de Usuario para Locatarios
**⏱️ Tiempo:** 1 hora  
**Prioridad:** 🟡 MEDIA

**Tareas:**
- [ ] "Cómo hacer tu primera reserva"
- [ ] "Cómo usar el wallet"
- [ ] "Cómo contactar al dueño"
- [ ] "Qué hacer en caso de problema"
- [ ] FAQs

**Archivo:**
```
GUIA_LOCATARIOS.md
```

---

### 20. README Técnico Actualizado
**⏱️ Tiempo:** 1 hora  
**Prioridad:** 🟢 BAJA

**Tareas:**
- [ ] Arquitectura del proyecto
- [ ] Setup de desarrollo
- [ ] Variables de entorno
- [ ] Comandos útiles
- [ ] Estructura de carpetas
- [ ] Convenciones de código
- [ ] Cómo contribuir

**Archivo:**
```
apps/web/README.md (actualizar)
```

---

## 📊 RESUMEN POR CATEGORÍA

### Por Prioridad:
- 🔴 **ALTA:** 3 tareas (~18-22h)
- 🟡 **MEDIA:** 7 tareas (~40-50h)
- 🟢 **BAJA:** 7 tareas (~25-35h)
- 🏗️ **GRANDES:** 3 tareas (~20-30h)

**TOTAL:** 20 tareas, ~103-137 horas de trabajo

### Por Categoría:
- 🎯 **Features:** 11 tareas
- 🧪 **Testing:** 2 tareas
- 📚 **Documentación:** 3 tareas
- 🔧 **Refactoring:** 2 tareas
- 🔍 **Investigación:** 1 tarea
- 🏗️ **Grandes proyectos:** 3 tareas

---

## 🎯 ROADMAP SUGERIDO

### Sprint 1 (Próxima Semana) - 20h:
1. ✅ Testing manual (2h)
2. ✅ Aprobación manual reservas (12h)
3. ✅ Tests Playwright (6h)

### Sprint 2 (Semana 2) - 20h:
4. ✅ Notificaciones mensajes (8h)
5. ✅ Chat pre-reserva (6h)
6. ✅ Métricas por auto (4h)
7. ✅ Guía locadores (2h)

### Sprint 3 (Semana 3) - 20h:
8. ✅ Vista conversaciones (8h)
9. ✅ Marcado leído chat (4h)
10. ✅ Investigación financiera (3h)
11. ✅ Feedback AI Photo (2h)
12. ✅ Guía locatarios (1h)
13. ✅ Acciones rápidas (2h)

### Sprint 4 (Semana 4) - 20h:
14. ✅ Check-in/Check-out (12h)
15. ✅ Refactor código duplicado (2h)
16. ✅ Duplicar auto (2h)
17. ✅ Modal reserva (3h)
18. ✅ README técnico (1h)

### Backlog (Futuro):
19. ⏳ Soporte archivos chat (8-12h)
20. ⏳ Refactor componente pago (6-8h)

---

## 📈 PROGRESO ESPERADO

**Actual:** 60% (8/20 completadas)

```
Después Sprint 1: ███████████████░░░░░ 75% (+3 tareas)
Después Sprint 2: ██████████████████░░ 90% (+4 tareas)
Después Sprint 3: ████████████████████ 100% (+6 tareas)
```

---

## 💡 NOTAS IMPORTANTES

### Dependencias:
- **Aprobación manual** → Afecta notificaciones
- **Vista conversaciones** → Requiere marcado leído
- **Check-in/checkout** → Requiere storage configurado

### Quick Wins (Máximo Impacto, Mínimo Esfuerzo):
1. 🎯 Notificaciones mensajes (8h, alto impacto)
2. 🎯 Chat pre-reserva (6h, aumenta conversión)
3. 🎯 Métricas por auto (4h, valor para locadores)

### Deuda Técnica:
- Refactor código duplicado
- Refactor componente pago
- Tests automatizados completos

---

**Última actualización:** 26 de Octubre 2025  
**Próxima revisión:** Después de Sprint 1

