# Diseño: Flujo Integrado de Reserva con Tour Guiado

**Fecha:** 2025-10-24  
**Objetivo:** Acompañar al usuario desde "Mis Reservas" hasta recoger el auto

---

## 🎯 Flujo Completo del Usuario

```
1. Mis Reservas → 2. Ver Detalle → 3. Pagar → 4. Instrucciones → 5. Chat → 6. Recoger Auto
```

---

## 📋 Estados de una Reserva

```typescript
enum BookingStatus {
  'pending'      // → Necesita pagar
  'confirmed'    // → Pagada, esperando pickup
  'in_progress'  // → Auto recogido, en uso
  'completed'    // → Auto devuelto
  'cancelled'    // → Cancelada
  'expired'      // → Venció sin confirmar
}
```

---

## 🎨 Diseño por Estado

### Estado 1: `pending` - Pendiente de Pago

**Vista en "Mis Reservas":**
```
┌─────────────────────────────────────────┐
│ 🚗 Toyota Corolla 2022                  │
│ 📅 24-28 Oct • 4 días                   │
│                                         │
│ ⚠️ Acción requerida                     │
│ Falta completar el pago                 │
│                                         │
│ $1,200 USD • $2,060,000 ARS            │
│                                         │
│ [Completar Pago →]  [Cancelar]         │
└─────────────────────────────────────────┘
```

**Tour Steps:**
```
Step 1: "Tu reserva está pendiente"
→ "Necesitas completar el pago para confirmarla"

Step 2: Click en "Completar Pago"
→ Te lleva a /booking-detail-payment/:id

Step 3: En página de pago
→ Tour guía por: modalidad de garantía, coberturas, autorización
```

---

### Estado 2: `confirmed` - Pagada, Esperando Pickup

**Vista en "Mis Reservas":**
```
┌─────────────────────────────────────────┐
│ ✅ Reserva Confirmada                    │
│ 🚗 Toyota Corolla 2022                  │
│ 📅 24-28 Oct • Inicia en 2 días        │
│                                         │
│ 📍 Pickup: Montevideo, 18 de Julio     │
│ ⏰ Hora: 24 Oct, 10:00 AM               │
│                                         │
│ 📋 Próximos pasos:                      │
│ 1. Coordinar con anfitrión              │
│ 2. Presentarte con DNI y licencia      │
│ 3. Inspeccionar el vehículo            │
│                                         │
│ [Ver Instrucciones] [Chatear] [Ver Mapa]│
└─────────────────────────────────────────┘
```

**Secciones Nuevas:**

#### A) Instrucciones de Pickup
```
┌─────────────────────────────────────────┐
│ 📋 Instrucciones para Recoger           │
├─────────────────────────────────────────┤
│ 1️⃣ Documentos Requeridos                │
│ • DNI o Pasaporte vigente              │
│ • Licencia de conducir válida          │
│ • Tarjeta preautorizada                │
│                                         │
│ 2️⃣ Lugar de Encuentro                   │
│ 📍 Av. 18 de Julio 1234, Montevideo    │
│ [Ver en Mapa →]                         │
│                                         │
│ 3️⃣ Contacto del Anfitrión               │
│ 👤 Juan Pérez                           │
│ 📞 +598 99 123 456                      │
│ [Llamar] [WhatsApp] [Chat]             │
│                                         │
│ 4️⃣ Checklist de Inspección              │
│ □ Verificar kilometraje                │
│ □ Revisar exterior (daños previos)     │
│ □ Revisar interior (limpieza)          │
│ □ Probar luces y limpiaparabrisas      │
│ □ Verificar nivel de combustible       │
│ □ Tomar fotos del vehículo             │
│                                         │
│ [✓ Marcar como Recogido]               │
└─────────────────────────────────────────┘
```

#### B) Chat Integrado
```
┌─────────────────────────────────────────┐
│ 💬 Chat con Juan (Anfitrión)            │
├─────────────────────────────────────────┤
│                                         │
│ Juan: Hola! Nos vemos mañana a las 10  │
│ Tú:   Perfecto, ahí estaré 👍          │
│                                         │
│ [Escribir mensaje...]         [Enviar] │
└─────────────────────────────────────────┘
```

#### C) Mapa Integrado
```
┌─────────────────────────────────────────┐
│ 🗺️ Ubicación de Pickup                  │
├─────────────────────────────────────────┤
│ [Mapa con pin en la ubicación]         │
│                                         │
│ 📍 Av. 18 de Julio 1234                │
│ 🚶 A 500m de ti                         │
│                                         │
│ [Cómo llegar] [Compartir ubicación]    │
└─────────────────────────────────────────┘
```

---

### Estado 3: `in_progress` - Auto en Uso

**Vista en "Mis Reservas":**
```
┌─────────────────────────────────────────┐
│ 🚙 En viaje                             │
│ 🚗 Toyota Corolla 2022                  │
│ 📅 24-28 Oct • Quedan 2 días           │
│                                         │
│ ⏰ Devolución: 28 Oct, 10:00 AM         │
│ 📍 Mismo lugar de pickup                │
│                                         │
│ 🛡️ Cobertura: Premium                   │
│ 📞 Asistencia 24/7: 0800-AUTO          │
│                                         │
│ [Reportar Problema] [Chat] [Extender]  │
└─────────────────────────────────────────┘
```

**Secciones Nuevas:**

#### A) Asistencia en Ruta
```
┌─────────────────────────────────────────┐
│ 🆘 ¿Necesitas ayuda?                    │
├─────────────────────────────────────────┤
│ • Accidente o daño                      │
│ • Problema mecánico                     │
│ • Robo o pérdida de llaves             │
│ • Consulta sobre el vehículo           │
│                                         │
│ 📞 0800-AUTO-HELP (24/7)               │
│ [Llamar Ahora]                          │
└─────────────────────────────────────────┘
```

#### B) Checklist de Devolución
```
┌─────────────────────────────────────────┐
│ 📋 Preparando la Devolución             │
├─────────────────────────────────────────┤
│ Antes de devolver:                      │
│ ✓ Tanque lleno (nivel inicial)         │
│ ✓ Interior limpio                       │
│ ✓ Todos los accesorios presentes       │
│ ✓ Fotos del estado final                │
│                                         │
│ [Ver Instrucciones Completas]           │
└─────────────────────────────────────────┘
```

---

### Estado 4: `completed` - Completada

**Vista en "Mis Reservas":**
```
┌─────────────────────────────────────────┐
│ ✅ Viaje Completado                      │
│ 🚗 Toyota Corolla 2022                  │
│ 📅 24-28 Oct • Hace 2 días              │
│                                         │
│ ⭐ Califica tu experiencia               │
│ [⭐⭐⭐⭐⭐]                                │
│                                         │
│ 💰 Estado del depósito:                 │
│ ✅ Liberado - Sin cargos adicionales    │
│                                         │
│ [Dejar Reseña] [Reservar de Nuevo]     │
└─────────────────────────────────────────┘
```

---

## 🎭 Tour Steps por Estado

### Tour: "pending" → "confirmed"

```typescript
const tourPendingToConfirmed: TourStepConfig[] = [
  {
    id: 'pending-payment-required',
    text: '⚠️ Tu reserva necesita confirmación. Completá el pago para asegurar tu vehículo.',
    position: 'top',
    selector: '[data-tour-step="booking-card-pending"]',
    buttons: [
      { text: 'Entendido', action: 'next' },
      { text: 'Completar ahora', action: () => router.navigate(['/booking-detail-payment', bookingId]) }
    ]
  },
  {
    id: 'payment-page-intro',
    text: '💳 Elegí tu modalidad de garantía y cobertura. Solo te tomará 2 minutos.',
    position: 'top',
    selector: '[data-tour-step="payment-mode"]',
  },
  {
    id: 'authorize-card',
    text: '🔐 Autorizá tu tarjeta. Es un hold temporal, no un cargo real.',
    position: 'right',
    selector: '[data-tour-step="card-hold-panel"]',
  },
  {
    id: 'confirm-booking',
    text: '✅ Revisá el resumen y confirmá tu reserva.',
    position: 'bottom',
    selector: '[data-tour-step="confirm-booking-btn"]',
  }
];
```

### Tour: "confirmed" → "in_progress"

```typescript
const tourConfirmedToPickup: TourStepConfig[] = [
  {
    id: 'confirmed-success',
    text: '🎉 ¡Reserva confirmada! Ahora preparate para recoger el auto.',
    position: 'top',
    selector: '[data-tour-step="booking-card-confirmed"]',
  },
  {
    id: 'view-instructions',
    text: '📋 Acá encontrás todas las instrucciones para el día del pickup.',
    position: 'left',
    selector: '[data-tour-step="instructions-button"]',
  },
  {
    id: 'chat-with-host',
    text: '💬 Coordiná detalles directamente con el anfitrión.',
    position: 'left',
    selector: '[data-tour-step="chat-button"]',
  },
  {
    id: 'pickup-location',
    text: '📍 Verificá la ubicación exacta y cómo llegar.',
    position: 'top',
    selector: '[data-tour-step="map-button"]',
  },
  {
    id: 'checklist-reminder',
    text: '📝 No olvides traer: DNI, Licencia de conducir y la tarjeta preautorizada.',
    position: 'center',
  }
];
```

### Tour: "in_progress" → "completed"

```typescript
const tourInProgressToReturn: TourStepConfig[] = [
  {
    id: 'trip-in-progress',
    text: '🚙 Disfrutá tu viaje. Recordá devolver el auto a tiempo.',
    position: 'top',
    selector: '[data-tour-step="booking-card-in-progress"]',
  },
  {
    id: 'assistance-available',
    text: '🆘 Si necesitás ayuda, tenés asistencia 24/7.',
    position: 'left',
    selector: '[data-tour-step="assistance-button"]',
  },
  {
    id: 'return-checklist',
    text: '📋 Antes de devolver, revisá el checklist de devolución.',
    position: 'right',
    selector: '[data-tour-step="return-checklist"]',
  }
];
```

---

## 🏗️ Estructura de Archivos

```
src/app/features/bookings/
├── my-bookings/
│   ├── my-bookings.page.ts
│   ├── my-bookings.page.html
│   └── components/
│       ├── booking-card.component.ts          (Nuevo)
│       ├── booking-instructions.component.ts  (Nuevo)
│       ├── booking-checklist.component.ts     (Nuevo)
│       └── booking-location-map.component.ts  (Nuevo)
├── booking-detail/
│   └── booking-detail.page.ts
└── booking-detail-payment/
    └── booking-detail-payment.page.ts

src/app/core/services/
└── tour.service.ts (Extender con nuevos tours)

src/app/shared/components/
└── booking-chat/
    └── booking-chat.component.ts (Ya existe)
```

---

## 🎯 Implementación por Fases

### Fase 1: Mejorar "Mis Reservas" (1-2 días)
- [x] Tarjetas de reserva con estados visuales
- [ ] Botones de acción por estado
- [ ] Tour integrado

### Fase 2: Agregar Instrucciones (1 día)
- [ ] Componente de instrucciones
- [ ] Checklist de pickup
- [ ] Checklist de devolución

### Fase 3: Integrar Chat y Mapa (1 día)
- [ ] Chat rápido desde tarjeta
- [ ] Mapa con ubicación
- [ ] Contacto directo con anfitrión

### Fase 4: Tour Completo (1 día)
- [ ] Tours contextuales por estado
- [ ] Auto-inicio según estado
- [ ] Recordatorios inteligentes

---

## 📊 Métricas de Éxito

- **Conversión Pago:** % de pending → confirmed
- **Satisfacción Pickup:** Rating del proceso de recogida
- **Uso de Tour:** % usuarios que completan tour
- **Tiempo a Pickup:** Días desde confirmed hasta in_progress
- **Problemas Reportados:** Incidencias durante el viaje

---

## 🔗 Navegación Propuesta

```
/my-bookings
  → Ver reserva pending
    → [Completar Pago] → /booking-detail-payment/:id
      → Pago exitoso → Volver a /my-bookings
        → Ver reserva confirmed
          → [Ver Instrucciones] → Modal con checklist
          → [Chat] → Modal o sidebar con chat
          → [Ver Mapa] → Modal con mapa
            → [Marcar como Recogido] → Estado in_progress
              → Durante el viaje → Acceso a asistencia
                → [Devolver Auto] → Estado completed
                  → [Dejar Reseña] → Rating del viaje
```

---

**Próximo paso:** ¿Empezamos con Fase 1 (mejorar "Mis Reservas") o prefieres otra fase primero?
