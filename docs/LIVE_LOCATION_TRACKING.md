## 🚗 **Sistema de Tracking en Tiempo Real - Guía Completa**

**Autor**: Claude Code
**Fecha**: 2025-11-12
**Status**: ✅ Listo para implementar

---

## 📋 **¿Qué es esto?**

Un sistema completo de tracking en tiempo real que permite al **locador** y al **locatario** verse mutuamente en un mapa durante la entrega/devolución del auto.

### **Casos de uso:**

1. **Check-In (Entrega del auto)**
   - Locador va a entregar el auto al locatario
   - Locatario puede ver en tiempo real dónde está el locador
   - ETA: "Llega en 8 minutos"

2. **Check-Out (Devolución del auto)**
   - Locatario va a devolver el auto al locador
   - Locador puede ver en tiempo real dónde está el locatario
   - Distancia restante: "A 2.5 km"

---

## 🏗️ **Arquitectura**

### **Componentes Creados:**

1. **Database Schema** ✅
   - `booking_location_tracking` table
   - Helper functions (start/stop/update tracking)
   - RLS policies
   - Real-time subscriptions

2. **Location Tracking Service** ✅
   - `location-tracking.service.ts`
   - Manejo de GPS
   - Actualización automática cada 3-5 segundos
   - Cálculo de distancia y ETA

3. **Componentes UI** (Pendiente de crear)
   - `live-tracking-map.component.ts`
   - Botones de "Compartir ubicación"
   - Vista del mapa con ambos usuarios

---

## 🚀 **Cómo Usar**

### **1. Aplicar Migración de DB**

```bash
# En Supabase Dashboard → SQL Editor
# Ejecutar: supabase/migrations/20251112_create_live_location_tracking.sql
```

### **2. En la Página de Check-In**

```typescript
// owner-check-in.page.ts
import { LocationTrackingService, TrackingSession } from '@core/services/location-tracking.service';

export class OwnerCheckInPage {
  private locationTracking = inject(LocationTrackingService);

  // Señales
  trackingSessions = signal<TrackingSession[]>([]);
  isSharing = signal(false);

  async startSharing() {
    const bookingId = this.booking()?.id;
    if (!bookingId) return;

    // Pedir permiso de ubicación
    const granted = await this.locationTracking.requestLocationPermission();
    if (!granted) {
      alert('Necesitas activar la ubicación para compartir tu posición');
      return;
    }

    // Iniciar tracking
    await this.locationTracking.startTracking(bookingId, 'check_in');
    this.isSharing.set(true);

    // Suscribirse a updates del locatario
    this.subscribeToOtherUserLocation(bookingId);
  }

  stopSharing() {
    this.locationTracking.stopTracking('arrived');
    this.isSharing.set(false);
  }

  private subscribeToOtherUserLocation(bookingId: string) {
    this.locationTracking.subscribeToLocationUpdates(bookingId, (sessions) => {
      this.trackingSessions.set(sessions);
    });
  }
}
```

### **3. En el Template (HTML)**

```html
<!-- owner-check-in.page.html -->

<!-- Botón para compartir ubicación -->
<div class="card-premium p-6 mb-6">
  <h3 class="text-lg font-bold mb-4">Compartir Ubicación</h3>

  <button
    *ngIf="!isSharing()"
    (click)="startSharing()"
    class="btn-primary w-full"
  >
    📍 Compartir mi ubicación
  </button>

  <button
    *ngIf="isSharing()"
    (click)="stopSharing()"
    class="btn-secondary w-full"
  >
    ⏸️ Dejar de compartir
  </button>

  <p class="text-sm text-text-secondary mt-2">
    El locatario podrá ver tu ubicación en tiempo real
  </p>
</div>

<!-- Mapa con ubicaciones -->
<div *ngIf="trackingSessions().length > 0" class="card-premium p-6">
  <h3 class="text-lg font-bold mb-4">Ubicaciones en Vivo</h3>

  <!-- Para cada persona compartiendo ubicación -->
  <div *ngFor="let session of trackingSessions()" class="mb-4">
    <div class="flex items-center gap-3 mb-2">
      <img
        [src]="session.user_photo || 'assets/default-avatar.png'"
        class="w-10 h-10 rounded-full"
      />
      <div>
        <p class="font-semibold">{{ session.user_name }}</p>
        <p class="text-sm text-text-secondary">
          {{ session.user_role === 'locador' ? 'Propietario' : 'Arrendatario' }}
        </p>
      </div>
      <div class="ml-auto text-right">
        <p class="text-sm font-medium text-cta-default">
          📍 Actualizado hace {{ getTimeSince(session.last_updated) }}
        </p>
        <p *ngIf="session.distance_remaining" class="text-xs text-text-secondary">
          A {{ (session.distance_remaining / 1000).toFixed(1) }} km
        </p>
      </div>
    </div>
  </div>

  <!-- Componente del mapa (crear después) -->
  <app-live-tracking-map
    [trackingSessions]="trackingSessions()"
    [destinationLat]="booking()?.pickup_latitude"
    [destinationLng]="booking()?.pickup_longitude"
  />
</div>
```

---

## 🗺️ **Crear el Componente del Mapa**

### **Reutilizar cars-map.component.ts**

Puedes extender el componente actual del mapa para mostrar múltiples markers:

```typescript
// live-tracking-map.component.ts
@Component({
  selector: 'app-live-tracking-map',
  template: `
    <app-cars-map
      [cars]="[]"
      [userLocation]="null"
      [showSearchRadius]="false"
      style="height: 400px; width: 100%;"
    />
  `
})
export class LiveTrackingMapComponent {
  @Input() trackingSessions: TrackingSession[] = [];
  @Input() destinationLat?: number;
  @Input() destinationLng?: number;

  // TODO: Agregar markers para cada tracking session
  // TODO: Agregar marker para el destino
  // TODO: Auto-zoom para mostrar todos los markers
}
```

**O crear uno nuevo más simple para tracking específico.**

---

## 📊 **Flujo Completo**

### **Escenario: Check-In (Entrega del auto)**

```
1. Locador abre "Check-In" para la reserva
   └─ Click en "Compartir mi ubicación"
   └─ Sistema pide permiso GPS
   └─ Comienza a enviar ubicación cada 3-5 segundos

2. Locatario abre "Check-In" para la misma reserva
   └─ Ve en el mapa: "Juan (Propietario) está a 3.2 km"
   └─ ETA: "Llega en 12 minutos"
   └─ Ve marker moviéndose en tiempo real

3. Locador llega al punto de encuentro
   └─ Click en "Llegué al destino"
   └─ Sistema marca tracking como 'arrived'
   └─ Ambos proceden con check-in
```

---

## 🔐 **Seguridad (RLS)**

### **Políticas Implementadas:**

✅ **Solo usuarios autenticados** pueden crear/actualizar tracking
✅ **Solo puedes actualizar tu propia ubicación**
✅ **Solo puedes ver ubicaciones de TUS bookings**
✅ **No puedes ver ubicaciones de bookings ajenos**

### **Ejemplo:**

```sql
-- Usuario A (locador) en booking #123
-- Usuario B (locatario) en booking #123
-- Usuario C (no relacionado)

-- ✅ Usuario A ve ubicación de Usuario B (mismo booking)
-- ✅ Usuario B ve ubicación de Usuario A (mismo booking)
-- ❌ Usuario C NO ve ubicaciones (no está en booking #123)
```

---

## ⚡ **Rendimiento**

### **Frecuencia de Actualización:**

- **GPS Watch**: Cada 3-5 segundos (automático)
- **DB Update**: Cada 3-5 segundos (cuando GPS cambia)
- **UI Refresh**: Cada 3 segundos (polling) o Real-time (Supabase)

### **Consumo de Datos:**

- ~10 KB/minuto por usuario compartiendo ubicación
- ~30 minutos de tracking = ~300 KB
- **Muy eficiente** ✅

### **Consumo de Batería:**

- GPS en modo "high accuracy"
- Se recomienda avisar al usuario
- Detener tracking cuando llegue al destino

---

## 🛠️ **Tareas Pendientes para Completar**

### **1. Componente del Mapa** (30 min)
- [ ] Crear `live-tracking-map.component.ts`
- [ ] Agregar markers para cada tracking session
- [ ] Marker especial para destino
- [ ] Auto-zoom para mostrar todo
- [ ] Actualización en tiempo real de markers

### **2. Integrar en Check-In/Check-Out** (1 hora)
- [ ] `owner-check-in.page.ts` - Botón compartir ubicación
- [ ] `check-in.page.ts` (locatario) - Ver ubicación del locador
- [ ] `owner-check-out.page.ts` - Ver ubicación del locatario
- [ ] `check-out.page.ts` (locatario) - Compartir ubicación

### **3. UI/UX Mejorado** (1 hora)
- [ ] Botón flotante "Compartir ubicación"
- [ ] Avatar del usuario en el marker
- [ ] Línea de ruta entre usuarios
- [ ] Notificación cuando la otra persona está cerca (<500m)
- [ ] Botón "Llamar" si tarda mucho

### **4. Testing** (30 min)
- [ ] Probar con 2 usuarios reales
- [ ] Verificar permisos GPS
- [ ] Verificar RLS policies
- [ ] Probar desconexión/reconexión

---

## 📱 **Demo de Uso**

### **Vista del Locador (compartiendo):**

```
┌─────────────────────────────────────┐
│  Check-In del Auto                  │
├─────────────────────────────────────┤
│                                     │
│  [✓] Compartiendo ubicación         │
│  ⏸️  Dejar de compartir             │
│                                     │
│  El locatario puede verte           │
│  Última actualización: hace 2 seg   │
│                                     │
├─────────────────────────────────────┤
│           🗺️ MAPA                  │
│                                     │
│    📍 Tú (Locador)                 │
│          |                          │
│          | 3.2 km                   │
│          |                          │
│    🎯 Destino (Punto de encuentro) │
│                                     │
│    👤 Pedro (Locatario)            │
│       esperando en destino          │
│                                     │
└─────────────────────────────────────┘
```

### **Vista del Locatario (viendo):**

```
┌─────────────────────────────────────┐
│  Check-In del Auto                  │
├─────────────────────────────────────┤
│                                     │
│  Juan (Propietario) viene en camino│
│                                     │
│  📍 A 3.2 km de distancia          │
│  ⏱️  ETA: 12 minutos               │
│  🚗 Velocidad: 45 km/h             │
│                                     │
├─────────────────────────────────────┤
│           🗺️ MAPA                  │
│                                     │
│    📍 Juan (Locador)               │
│       → moviéndose                  │
│          |                          │
│          | 3.2 km                   │
│          |                          │
│    👤 Tú (Locatario)               │
│       🎯 en punto de encuentro      │
│                                     │
│  [📞 Llamar a Juan]                │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎯 **Próximos Pasos**

1. **Aplicar migración de DB** (5 min)
   ```bash
   # En Supabase Dashboard → SQL Editor
   ```

2. **Crear componente de mapa de tracking** (30 min)
   - Puede ser una variación de `cars-map.component`
   - O un componente nuevo más simple

3. **Integrar en páginas de check-in/check-out** (1 hora)
   - Agregar botones
   - Suscribirse a updates
   - Mostrar mapa

4. **Testing con 2 dispositivos** (30 min)
   - Verificar que funcione en producción
   - Ajustar frecuencia de updates si es necesario

---

## 💡 **Tips de Implementación**

### **Para el Marker del Usuario:**

```typescript
// Usar avatar del usuario en el marker
const markerElement = document.createElement('div');
markerElement.innerHTML = `
  <div class="live-marker">
    <img src="${session.user_photo}" class="avatar" />
    <div class="pulse-ring"></div>
  </div>
`;
```

### **Para la Línea de Ruta:**

```typescript
// Dibujar línea entre usuarios
map.addSource('route-line', {
  type: 'geojson',
  data: {
    type: 'LineString',
    coordinates: [
      [locadorLon, locadorLat],
      [locatarioLon, locatarioLat]
    ]
  }
});
```

### **Para Notificaciones:**

```typescript
// Avisar cuando esté cerca
if (distance < 500) {
  showNotification('Juan está a menos de 500m');
}
```

---

## 📚 **Recursos**

- **Servicio**: `apps/web/src/app/core/services/location-tracking.service.ts`
- **Migración DB**: `supabase/migrations/20251112_create_live_location_tracking.sql`
- **Geolocation API**: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime

---

**¿Necesitas ayuda para implementar alguna parte específica?**

Solo dime:
- "Crea el componente del mapa"
- "Integralo en check-in page"
- "Agrega notificaciones"

¡Y lo implemento! 🚀
