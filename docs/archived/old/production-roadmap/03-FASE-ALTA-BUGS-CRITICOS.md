# 🐛 Fase 03: Bugs Críticos y Correcciones de Flujo

**Prioridad:** 🟠 ALTA  
**Duración estimada:** 5 días  
**Dependencias:** Fase 01 (Seguridad) ✅  
**Bloqueante para:** Fase 04 (Testing Real)

---

## 📋 Índice

1. [Objetivo](#objetivo)
2. [Problemas Identificados](#problemas-identificados)
3. [Plan de Corrección](#plan-de-corrección)
4. [Implementación Detallada](#implementación-detallada)
5. [Testing y Validación](#testing-y-validación)
6. [Criterios de Aceptación](#criterios-de-aceptación)

---

## 🎯 Objetivo

Corregir bugs críticos que impiden el funcionamiento operativo completo de la plataforma, especialmente:
- Flujos de checkout incompletos
- Inconsistencias en base de datos
- Errores en pantallas de éxito/confirmación
- Problemas de geocodificación

**Meta:** Sistema operativo sin bugs críticos conocidos.

---

## 🐛 Problemas Identificados

### 1. Bug Crítico: Tabla `booking_risk_snapshots` (Plural vs Singular)

**Severidad:** 🔴 BLOCKER  
**Archivo:** `apps/web/src/app/core/services/risk.service.ts`

**Problema:**
```typescript
// Línea 114-139
async getRiskSnapshot(bookingId: string) {
  const { data } = await this.supabase
    .from('booking_risk_snapshots')  // ❌ PLURAL (no existe)
    .select('*')
    .eq('booking_id', bookingId)
}
```

Pero la tabla real es:
```sql
CREATE TABLE booking_risk_snapshot (  -- ✅ SINGULAR
  id uuid PRIMARY KEY,
  booking_id uuid REFERENCES bookings(id),
  ...
);
```

**Impacto:**
- ❌ Query falla en producción
- ❌ Usuario no puede ver confirmación
- ❌ Booking queda en estado inconsistente

**Solución:**
```typescript
// Corrección
async getRiskSnapshot(bookingId: string) {
  const { data, error } = await this.supabase
    .from('booking_risk_snapshot')  // ✅ SINGULAR
    .select('*')
    .eq('booking_id', bookingId)
    .single();
  
  if (error) {
    console.error('Error fetching risk snapshot:', error);
    return null;
  }
  
  return data;
}
```

---

### 2. Bug Crítico: Pantalla de Éxito Muestra Datos Genéricos

**Severidad:** 🟡 IMPORTANTE  
**Archivo:** `apps/web/src/app/pages/booking-success/booking-success.page.ts`

**Problema:**
```typescript
// Línea 143-149
getCarName(): string {
  return 'Vehículo';  // ❌ HARDCODED
}
```

**Impacto:**
- ❌ Usuario no ve datos del auto que reservó
- ❌ Mala experiencia de usuario
- ❌ No puede verificar reserva correcta

**Solución:**
```typescript
// apps/web/src/app/pages/booking-success/booking-success.page.ts

interface BookingSuccessData {
  bookingId: string;
  car: {
    id: string;
    brand: string;
    model: string;
    year: number;
    licensePlate: string;
    primaryPhotoUrl?: string;
  };
  dates: {
    startDate: string;
    endDate: string;
  };
  pricing: {
    totalAmount: number;
    dailyRate: number;
    days: number;
  };
}

export class BookingSuccessPage implements OnInit {
  bookingData: BookingSuccessData | null = null;
  loading = true;
  
  constructor(
    private route: ActivatedRoute,
    private bookingService: BookingService,
    private carService: CarService
  ) {}
  
  async ngOnInit() {
    const bookingId = this.route.snapshot.queryParams['bookingId'];
    
    if (!bookingId) {
      console.error('No booking ID provided');
      this.loading = false;
      return;
    }
    
    try {
      // Fetch booking details
      const booking = await this.bookingService.getBookingById(bookingId);
      
      if (!booking) {
        throw new Error('Booking not found');
      }
      
      // Fetch car details
      const car = await this.carService.getCarById(booking.carId);
      
      this.bookingData = {
        bookingId: booking.id,
        car: {
          id: car.id,
          brand: car.brand,
          model: car.model,
          year: car.year,
          licensePlate: car.licensePlate,
          primaryPhotoUrl: car.photos?.[0]?.url
        },
        dates: {
          startDate: booking.startDate,
          endDate: booking.endDate
        },
        pricing: {
          totalAmount: booking.totalAmount,
          dailyRate: booking.dailyRate,
          days: booking.numberOfDays
        }
      };
      
    } catch (error) {
      console.error('Error loading booking details:', error);
    } finally {
      this.loading = false;
    }
  }
  
  getCarName(): string {
    if (!this.bookingData?.car) {
      return 'Vehículo';
    }
    
    const { brand, model, year } = this.bookingData.car;
    return `${brand} ${model} ${year}`;
  }
  
  getCarImage(): string {
    return this.bookingData?.car.primaryPhotoUrl || '/assets/images/car-placeholder.png';
  }
}
```

**Template actualizado:**
```html
<!-- booking-success.page.html -->
<ion-content *ngIf="!loading">
  <div class="success-container">
    <ion-icon name="checkmark-circle" color="success"></ion-icon>
    <h1>¡Reserva Confirmada!</h1>
    
    <ion-card *ngIf="bookingData">
      <img [src]="getCarImage()" [alt]="getCarName()" />
      
      <ion-card-header>
        <ion-card-title>{{ getCarName() }}</ion-card-title>
        <ion-card-subtitle>
          {{ bookingData.car.licensePlate }}
        </ion-card-subtitle>
      </ion-card-header>
      
      <ion-card-content>
        <div class="booking-details">
          <div class="detail-row">
            <span class="label">Código de reserva:</span>
            <span class="value">{{ bookingData.bookingId | slice:0:8 }}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Desde:</span>
            <span class="value">{{ bookingData.dates.startDate | date:'dd/MM/yyyy' }}</span>
          </div>
          
          <div class="detail-row">
            <span class="label">Hasta:</span>
            <span class="value">{{ bookingData.dates.endDate | date:'dd/MM/yyyy' }}</span>
          </div>
          
          <div class="detail-row total">
            <span class="label">Total:</span>
            <span class="value">ARS {{ bookingData.pricing.totalAmount | number:'1.2-2' }}</span>
          </div>
        </div>
        
        <ion-button expand="block" [routerLink]="['/my-bookings']">
          Ver mis reservas
        </ion-button>
      </ion-card-content>
    </ion-card>
    
    <div *ngIf="!bookingData" class="error-message">
      <p>No pudimos cargar los detalles de tu reserva.</p>
      <p>Por favor, revisa tu email para la confirmación.</p>
    </div>
  </div>
</ion-content>

<ion-content *ngIf="loading">
  <div class="loading-container">
    <ion-spinner name="crescent"></ion-spinner>
    <p>Cargando detalles de tu reserva...</p>
  </div>
</ion-content>
```

---

### 3. Bug Crítico: Estado del Auto Después de Onboarding Incompleto

**Severidad:** 🔴 CRÍTICO  
**Archivo:** `apps/web/src/app/pages/owner/publish-car-v2.page.ts`

**Problema:**
```typescript
// Línea 1540-1563
async onSubmit() {
  // Actualiza auto a 'active' ANTES de verificar MP onboarding
  await this.carService.updateCar(this.carId, {
    status: 'active'  // ❌ Prematuro
  });
  
  // Si el locador cierra el popup de MP onboarding,
  // el auto queda 'active' pero SIN cuenta MP vinculada
}
```

**Impacto:**
- ❌ Auto publicado sin medio de cobro
- ❌ Reservas generadas pero dinero en wallet de plataforma
- ❌ Split payment no funciona
- ❌ Locador no cobra

**Solución:**
```typescript
// apps/web/src/app/pages/owner/publish-car-v2.page.ts

async onSubmit() {
  try {
    // 1. Validar que todos los datos estén completos
    if (!this.validateCarData()) {
      throw new Error('Datos del auto incompletos');
    }
    
    // 2. Guardar auto como 'pending_verification'
    const updatedCar = await this.carService.updateCar(this.carId, {
      ...this.carForm.value,
      status: 'pending_verification',
      lastUpdated: new Date().toISOString()
    });
    
    // 3. Verificar estado de MercadoPago del locador
    const mpStatus = await this.checkMercadoPagoStatus();
    
    if (!mpStatus.isOnboarded) {
      // 4a. Iniciar onboarding de MP
      const onboardingUrl = await this.initiateMercadoPagoOnboarding();
      
      // Abrir popup y esperar resultado
      const result = await this.openMercadoPagoPopup(onboardingUrl);
      
      if (!result.completed) {
        // Usuario cerró el popup
        this.showToast('Debes completar la vinculación con MercadoPago para publicar tu auto');
        return;
      }
      
      // Verificar que el onboarding se completó
      const verified = await this.verifyMercadoPagoOnboarding();
      
      if (!verified) {
        throw new Error('No se pudo verificar la vinculación con MercadoPago');
      }
    }
    
    // 5. AHORA SÍ, actualizar a 'active'
    await this.carService.updateCar(this.carId, {
      status: 'active',
      publishedAt: new Date().toISOString()
    });
    
    this.showToast('¡Auto publicado exitosamente!');
    this.router.navigate(['/owner/my-cars']);
    
  } catch (error) {
    console.error('Error publishing car:', error);
    
    // Revertir a draft si hubo error
    await this.carService.updateCar(this.carId, {
      status: 'draft'
    });
    
    this.showToast('Error al publicar el auto. Intenta nuevamente.');
  }
}

async checkMercadoPagoStatus(): Promise<{ isOnboarded: boolean; accountId?: string }> {
  const { data: profile } = await this.supabase
    .from('user_profiles')
    .select('mercadopago_account_id, mercadopago_onboarding_status')
    .eq('user_id', this.userId)
    .single();
  
  return {
    isOnboarded: profile?.mercadopago_onboarding_status === 'completed',
    accountId: profile?.mercadopago_account_id
  };
}

async initiateMercadoPagoOnboarding(): Promise<string> {
  const response = await this.http.post<{ url: string }>(
    `${environment.apiUrl}/mp/onboarding/start`,
    { userId: this.userId }
  ).toPromise();
  
  return response.url;
}

async openMercadoPagoPopup(url: string): Promise<{ completed: boolean }> {
  return new Promise((resolve) => {
    const popup = window.open(url, 'MPOnboarding', 'width=600,height=800');
    
    const checkInterval = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkInterval);
        resolve({ completed: false });
      }
    }, 500);
    
    // Listener para mensaje de éxito desde MP
    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === 'MP_ONBOARDING_SUCCESS') {
        clearInterval(checkInterval);
        popup?.close();
        window.removeEventListener('message', messageHandler);
        resolve({ completed: true });
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Timeout de 10 minutos
    setTimeout(() => {
      clearInterval(checkInterval);
      popup?.close();
      window.removeEventListener('message', messageHandler);
      resolve({ completed: false });
    }, 600000);
  });
}

async verifyMercadoPagoOnboarding(): Promise<boolean> {
  // Recheck estado después del onboarding
  const status = await this.checkMercadoPagoStatus();
  return status.isOnboarded;
}
```

---

### 4. Bug: Mapbox Token Obligatorio Sin Fallback

**Severidad:** 🟡 IMPORTANTE  
**Archivos:** Múltiples componentes con geocodificación

**Problema:**
- Sin `NG_APP_MAPBOX_ACCESS_TOKEN` la app crashea
- No hay geocodificación alternativa
- Publicación de autos falla

**Solución:**

**1. Servicio de Geocodificación con Fallback:**
```typescript
// apps/web/src/app/core/services/geocoding.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private mapboxToken = environment.mapboxAccessToken;
  
  constructor(private http: HttpClient) {}
  
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    // Intento 1: Mapbox (si token disponible)
    if (this.mapboxToken && this.mapboxToken !== 'your-mapbox-token-here') {
      try {
        return await this.geocodeWithMapbox(address);
      } catch (error) {
        console.warn('Mapbox geocoding failed, trying fallback:', error);
      }
    }
    
    // Intento 2: Nominatim (OpenStreetMap - gratuito)
    try {
      return await this.geocodeWithNominatim(address);
    } catch (error) {
      console.error('All geocoding methods failed:', error);
      return null;
    }
  }
  
  private async geocodeWithMapbox(address: string): Promise<GeocodeResult> {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.mapboxToken}&country=AR&limit=1`;
    
    const response = await this.http.get<any>(url).toPromise();
    
    if (!response.features || response.features.length === 0) {
      throw new Error('No results from Mapbox');
    }
    
    const feature = response.features[0];
    
    return {
      longitude: feature.center[0],
      latitude: feature.center[1],
      formattedAddress: feature.place_name
    };
  }
  
  private async geocodeWithNominatim(address: string): Promise<GeocodeResult> {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}, Argentina&format=json&limit=1`;
    
    const response = await this.http.get<any[]>(url, {
      headers: {
        'User-Agent': 'AutoRenta/1.0'
      }
    }).toPromise();
    
    if (!response || response.length === 0) {
      throw new Error('No results from Nominatim');
    }
    
    const result = response[0];
    
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      formattedAddress: result.display_name
    };
  }
  
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (this.mapboxToken && this.mapboxToken !== 'your-mapbox-token-here') {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${this.mapboxToken}`;
        const response = await this.http.get<any>(url).toPromise();
        return response.features?.[0]?.place_name || null;
      } catch (error) {
        console.warn('Mapbox reverse geocoding failed');
      }
    }
    
    // Fallback a Nominatim
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const response = await this.http.get<any>(url, {
        headers: { 'User-Agent': 'AutoRenta/1.0' }
      }).toPromise();
      return response.display_name || null;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return null;
    }
  }
}
```

**2. Actualizar Componentes:**
```typescript
// Reemplazar llamadas directas a Mapbox con GeocodingService

constructor(
  private geocodingService: GeocodingService
) {}

async onAddressSelected(address: string) {
  const result = await this.geocodingService.geocodeAddress(address);
  
  if (!result) {
    this.showToast('No pudimos encontrar esa dirección. Intenta con más detalles.');
    return;
  }
  
  this.carForm.patchValue({
    address: result.formattedAddress,
    latitude: result.latitude,
    longitude: result.longitude
  });
}
```

---

## 📝 Plan de Corrección

### Día 1-2: Bugs Críticos de Base de Datos

**Tareas:**
- [ ] Auditar todas las queries a Supabase
- [ ] Corregir nombre de tabla `booking_risk_snapshots` → `booking_risk_snapshot`
- [ ] Verificar consistencia de todas las tablas en `risk.service.ts`
- [ ] Agregar manejo de errores en todas las queries
- [ ] Testing de flujo completo de booking

**Archivos a modificar:**
- `apps/web/src/app/core/services/risk.service.ts`
- `apps/web/src/app/pages/renter/checkout/*.ts`

---

### Día 2-3: Pantalla de Éxito y Confirmación

**Tareas:**
- [ ] Implementar `BookingSuccessPage` completo
- [ ] Crear servicio para obtener datos de booking
- [ ] Diseñar template con datos reales del auto
- [ ] Agregar loading states
- [ ] Agregar manejo de errores
- [ ] Testing de diferentes escenarios

**Archivos a modificar:**
- `apps/web/src/app/pages/booking-success/booking-success.page.ts`
- `apps/web/src/app/pages/booking-success/booking-success.page.html`
- `apps/web/src/app/pages/booking-success/booking-success.page.scss`
- `apps/web/src/app/core/services/booking.service.ts`

---

### Día 3-4: Flujo de Publicación con MercadoPago

**Tareas:**
- [ ] Implementar validación de MP onboarding antes de activar auto
- [ ] Crear popup handler para MP onboarding
- [ ] Agregar verificación post-onboarding
- [ ] Implementar rollback si onboarding falla
- [ ] Actualizar estados de auto correctamente
- [ ] Testing completo del flujo

**Archivos a modificar:**
- `apps/web/src/app/pages/owner/publish-car-v2.page.ts`
- `apps/web/src/app/core/services/mercadopago.service.ts`
- Crear: `apps/web/src/app/core/services/mp-onboarding.service.ts`

---

### Día 4-5: Geocodificación con Fallback

**Tareas:**
- [ ] Crear `GeocodingService` con múltiples providers
- [ ] Implementar Mapbox como primario
- [ ] Implementar Nominatim como fallback
- [ ] Actualizar todos los componentes que usan geocoding
- [ ] Testing sin token de Mapbox
- [ ] Testing con token inválido
- [ ] Documentar rate limits

**Archivos a modificar:**
- Crear: `apps/web/src/app/core/services/geocoding.service.ts`
- `apps/web/src/app/pages/owner/publish-car-v2.page.ts`
- `apps/web/src/app/shared/components/address-autocomplete/*`

---

## 🧪 Testing y Validación

### Tests Automatizados

```typescript
// risk.service.spec.ts
describe('RiskService', () => {
  it('should use correct table name (singular)', async () => {
    const snapshot = await service.getRiskSnapshot('booking-id');
    expect(mockSupabase.from).toHaveBeenCalledWith('booking_risk_snapshot');
  });
  
  it('should handle missing snapshot gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } })
        })
      })
    });
    
    const result = await service.getRiskSnapshot('non-existent');
    expect(result).toBeNull();
  });
});

// booking-success.page.spec.ts
describe('BookingSuccessPage', () => {
  it('should load booking details on init', async () => {
    spyOn(bookingService, 'getBookingById').and.returnValue(Promise.resolve(mockBooking));
    spyOn(carService, 'getCarById').and.returnValue(Promise.resolve(mockCar));
    
    await component.ngOnInit();
    
    expect(component.bookingData).toBeDefined();
    expect(component.getCarName()).toBe('Toyota Corolla 2023');
  });
  
  it('should show error message if booking not found', async () => {
    spyOn(bookingService, 'getBookingById').and.returnValue(Promise.resolve(null));
    
    await component.ngOnInit();
    
    expect(component.bookingData).toBeNull();
    expect(component.loading).toBe(false);
  });
});

// publish-car-v2.page.spec.ts
describe('PublishCarV2Page - MP Onboarding', () => {
  it('should not activate car if MP onboarding incomplete', async () => {
    spyOn(component, 'checkMercadoPagoStatus').and.returnValue(
      Promise.resolve({ isOnboarded: false })
    );
    spyOn(component, 'openMercadoPagoPopup').and.returnValue(
      Promise.resolve({ completed: false })
    );
    
    await component.onSubmit();
    
    const car = await carService.getCar(carId);
    expect(car.status).not.toBe('active');
  });
  
  it('should activate car only after successful MP onboarding', async () => {
    spyOn(component, 'checkMercadoPagoStatus').and.returnValue(
      Promise.resolve({ isOnboarded: false })
    );
    spyOn(component, 'openMercadoPagoPopup').and.returnValue(
      Promise.resolve({ completed: true })
    );
    spyOn(component, 'verifyMercadoPagoOnboarding').and.returnValue(
      Promise.resolve(true)
    );
    
    await component.onSubmit();
    
    const car = await carService.getCar(carId);
    expect(car.status).toBe('active');
  });
});

// geocoding.service.spec.ts
describe('GeocodingService', () => {
  it('should use Mapbox when token available', async () => {
    spyOn(http, 'get').and.returnValue(of(mockMapboxResponse));
    
    const result = await service.geocodeAddress('Av. Corrientes 1234, Buenos Aires');
    
    expect(result).toBeDefined();
    expect(http.get).toHaveBeenCalledWith(jasmine.stringContaining('mapbox'));
  });
  
  it('should fallback to Nominatim when Mapbox fails', async () => {
    spyOn(http, 'get')
      .and.returnValues(
        throwError('Mapbox error'),
        of([mockNominatimResponse])
      );
    
    const result = await service.geocodeAddress('Av. Corrientes 1234, Buenos Aires');
    
    expect(result).toBeDefined();
    expect(http.get).toHaveBeenCalledWith(jasmine.stringContaining('nominatim'));
  });
  
  it('should return null when all methods fail', async () => {
    spyOn(http, 'get').and.returnValue(throwError('Network error'));
    
    const result = await service.geocodeAddress('Invalid address');
    
    expect(result).toBeNull();
  });
});
```

### Tests Manuales

**Checklist de Validación:**

#### Flujo de Reserva Completo
- [ ] Crear booking nuevo
- [ ] Verificar que risk snapshot se guarda correctamente
- [ ] Completar pago
- [ ] Verificar redirección a success page
- [ ] Verificar que se muestran datos reales del auto
- [ ] Verificar que se muestra código de reserva
- [ ] Verificar que email de confirmación se envía

#### Flujo de Publicación
- [ ] Crear auto nuevo como locador
- [ ] Completar formulario sin cuenta MP
- [ ] Verificar que pide onboarding de MP
- [ ] Cerrar popup de MP intencionalmente
- [ ] Verificar que auto NO queda activo
- [ ] Completar onboarding de MP exitosamente
- [ ] Verificar que auto queda activo
- [ ] Verificar que split payment está configurado

#### Geocodificación
- [ ] Publicar auto sin token de Mapbox
- [ ] Verificar que usa Nominatim
- [ ] Verificar que dirección se geocodifica correctamente
- [ ] Verificar que coordenadas son correctas
- [ ] Verificar que auto aparece en mapa

---

## ✅ Criterios de Aceptación

### Fase 03 Completa Cuando:

1. **Cero Errores Críticos en Consola**
   - ✅ No hay queries a tablas inexistentes
   - ✅ No hay referencias undefined
   - ✅ Todos los errores están manejados

2. **Flujo de Reserva Completo**
   - ✅ Usuario puede reservar de principio a fin
   - ✅ Pantalla de éxito muestra datos reales
   - ✅ Email de confirmación se envía
   - ✅ Booking queda en estado consistente

3. **Flujo de Publicación Seguro**
   - ✅ Auto no se activa sin cuenta MP
   - ✅ Onboarding de MP es obligatorio
   - ✅ Estado de auto es consistente
   - ✅ Split payment configurado correctamente

4. **Geocodificación Resiliente**
   - ✅ Funciona sin token de Mapbox
   - ✅ Fallback a Nominatim funciona
   - ✅ Errores manejados gracefully
   - ✅ UX no se degrada

5. **Tests Pasando**
   - ✅ Unit tests: 100% coverage de fixes
   - ✅ E2E tests: flujos críticos validados
   - ✅ Manual testing: todos los escenarios OK

---

## 📊 Métricas de Éxito

**Pre-Fase 03:**
- ❌ Bugs críticos conocidos: 4
- ❌ Flujos bloqueados: 2
- ❌ Test coverage bugs: 0%

**Post-Fase 03:**
- ✅ Bugs críticos conocidos: 0
- ✅ Flujos bloqueados: 0
- ✅ Test coverage bugs: 100%

---

## 🔄 Siguiente Fase

Una vez completada Fase 03, proceder a:

**→ Fase 04: Testing Real en Sandbox MercadoPago**

- Testing de pagos reales (no simulados)
- Validación de splits automáticos
- Verificación de webhooks
- Testing de refunds

---

## 📚 Referencias

- **Documento Fase 02:** Split Payment (dependencia para validar)
- **Supabase Schema:** `supabase/migrations/`
- **MercadoPago Docs:** https://www.mercadopago.com.ar/developers/
- **Nominatim API:** https://nominatim.org/release-docs/develop/api/Overview/

---

**Última actualización:** 2025-10-28  
**Autor:** Copilot CLI  
**Estado:** 🟠 Pendiente de implementación
