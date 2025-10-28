# SPEC: Car Name Display Fix en Booking Success Page

**Ticket ID**: FASE2-002  
**Prioridad**: P2 - IMPORTANTE  
**Estimación**: 1-2 horas  
**Responsable**: Copilot (implementación)  
**Creado**: 2025-10-28

---

## 🎯 Problema Actual

### Descripción
La función `getCarName()` en `booking-success.page.ts` siempre retorna el literal `"Vehículo"` en lugar de mostrar el nombre real del auto (`Brand Model Year`).

### Ubicación del Bug
- **Archivo**: `apps/web/src/app/features/bookings/booking-success/booking-success.page.ts`
- **Líneas**: 143-153
- **Método**: `getCarName()`

### Código Actual (PROBLEMÁTICO)
```typescript
getCarName(): string {
  const booking = this.booking();
  if (!booking) return 'Vehículo';  // ❌ Fallback 1

  // Car is now loaded with booking
  if (booking.car) {
    return `${booking.car.brand} ${booking.car.model} ${booking.car.year}`;
  }

  return 'Vehículo';  // ❌ Fallback 2 - Se ejecuta siempre
}
```

### Por Qué Falla

**Hipótesis 1**: `booking.car` es `undefined` o `null`
- La query no incluye `JOIN` con tabla `cars`
- O la propiedad no se llama `car` sino `cars` o `car_id`

**Hipótesis 2**: Booking no carga la relación `car`
- Supabase query no incluye `.select('*, car:cars(*)')`
- Se carga solo `car_id` pero no el objeto completo

**Hipótesis 3**: Timing issue
- `getCarName()` se ejecuta antes de que booking esté cargado
- Aunque hay loading state, el template puede renderizar prematuramente

### Impacto
- ❌ Success page muestra "Vehículo" en lugar del nombre real
- ❌ Mala UX (usuario no sabe qué auto reservó)
- ❌ Inconsistente con el resto de la app (otras páginas SÍ muestran el nombre)

### Evidencia
- **Documento original**: Menciona "pantalla de éxito nunca muestra datos del auto"
- **Línea específica**: 143-149 en booking-success.page.ts

---

## 🔍 Diagnóstico

### Step 1: Verificar Query de Booking
```bash
# Encontrar dónde se carga el booking
cd /home/edu/autorenta
grep -n "booking\$\|booking()" apps/web/src/app/features/bookings/booking-success/booking-success.page.ts
```

**Query esperada (CORRECTA)**:
```typescript
const { data } = await supabase
  .from('bookings')
  .select(`
    *,
    car:cars(
      id,
      brand,
      model,
      year,
      photos
    )
  `)
  .eq('id', bookingId)
  .single();
```

**Query problemática (SI ES ASÍ)**:
```typescript
const { data } = await supabase
  .from('bookings')
  .select('*')  // ❌ No incluye relación con cars
  .eq('id', bookingId)
  .single();
```

### Step 2: Verificar Interface de Booking
```typescript
// apps/web/src/app/core/models/booking.model.ts (o similar)

export interface Booking {
  id: string;
  car_id: string;  // ✅ Esto existe
  car?: Car;       // ❓ Esto puede estar faltando
  // ...
}

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  // ...
}
```

### Step 3: Verificar en Database
```sql
-- Ver estructura real de bookings
SELECT 
  b.id,
  b.car_id,
  c.brand,
  c.model,
  c.year
FROM bookings b
LEFT JOIN cars c ON c.id = b.car_id
LIMIT 1;
```

---

## ✅ Solución Propuesta

### Opción 1: Fix en Query (RECOMENDADO)

**Por qué**: Si el problema es que no se carga la relación `car`.

#### Paso 1: Encontrar el servicio que carga bookings
```bash
find apps/web/src -name "*booking*.service.ts" | grep -v node_modules
```

Probablemente:
- `apps/web/src/app/core/services/booking.service.ts`
- O método `loadBooking()` dentro de `booking-success.page.ts`

#### Paso 2: Modificar Query

**Antes**:
```typescript
async getBookingById(bookingId: string): Promise<Booking | null> {
  const { data, error } = await this.supabase
    .from('bookings')
    .select('*')  // ❌ No incluye car
    .eq('id', bookingId)
    .single();
    
  return data;
}
```

**Después**:
```typescript
async getBookingById(bookingId: string): Promise<Booking | null> {
  const { data, error } = await this.supabase
    .from('bookings')
    .select(`
      *,
      car:cars!inner(
        id,
        brand,
        model,
        year,
        photos,
        plate_number
      ),
      renter:users!bookings_renter_id_fkey(
        id,
        email,
        first_name,
        last_name
      )
    `)  // ✅ Incluye relaciones
    .eq('id', bookingId)
    .single();
    
  if (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
    
  return data;
}
```

**Notas**:
- `cars!inner` = INNER JOIN (solo si car existe)
- Si quieres LEFT JOIN: `cars` (sin `!inner`)
- `bookings_renter_id_fkey` = nombre de foreign key (verificar en DB)

### Opción 2: Fix en Template (Fallback)

Si por alguna razón no podemos arreglar la query, mejoramos el display:

**Antes**:
```html
<h2>{{ getCarName() }}</h2>
```

**Después**:
```html
<h2>
  <ng-container *ngIf="booking()?.car; else carPlaceholder">
    {{ booking().car.brand }} {{ booking().car.model }} {{ booking().car.year }}
  </ng-container>
  <ng-template #carPlaceholder>
    Vehículo (ID: {{ booking()?.car_id || 'N/A' }})
  </ng-template>
</h2>
```

### Opción 3: Cargar Car Separadamente

Si la query de booking es compleja y no queremos tocarla:

```typescript
async ngOnInit() {
  const bookingId = this.route.snapshot.params['id'];
  
  // Cargar booking
  this.booking.set(await this.bookingService.getBookingById(bookingId));
  
  // Cargar car separadamente si no viene en booking
  if (this.booking() && !this.booking().car) {
    const carId = this.booking().car_id;
    const car = await this.carService.getCarById(carId);
    
    // Agregar car al booking
    this.booking.update(b => ({ ...b, car }));
  }
}
```

**Desventaja**: 2 queries en lugar de 1 (menos eficiente)

---

## 🔧 Cambios Requeridos

### Archivos a Modificar

#### 1. Booking Service
**Archivo**: `apps/web/src/app/core/services/booking.service.ts`

```typescript
async getBookingById(bookingId: string): Promise<Booking | null> {
  const { data, error } = await this.supabase
    .from('bookings')
    .select(`
      *,
      car:cars!inner(
        id,
        brand,
        model,
        year,
        photos
      )
    `)
    .eq('id', bookingId)
    .single();
    
  if (error) {
    console.error('Error fetching booking with car:', error);
    return null;
  }
    
  return data;
}
```

#### 2. Booking Model (Type Safety)
**Archivo**: `apps/web/src/app/core/models/booking.model.ts`

```typescript
import { Car } from './car.model';

export interface Booking {
  id: string;
  car_id: string;
  car?: Car;  // ✅ Agregar si no existe
  renter_id: string;
  status: BookingStatus;
  // ... otros campos
}
```

#### 3. Booking Success Page (Defensive Check)
**Archivo**: `apps/web/src/app/features/bookings/booking-success/booking-success.page.ts`

```typescript
getCarName(): string {
  const booking = this.booking();
  
  // Defensive checks
  if (!booking) {
    console.warn('Booking not loaded');
    return 'Vehículo';
  }
  
  if (!booking.car) {
    console.error('Car data not loaded for booking:', booking.id);
    // Fallback: mostrar car_id si existe
    return booking.car_id ? `Vehículo (${booking.car_id.slice(0, 8)})` : 'Vehículo';
  }

  // Happy path
  return `${booking.car.brand} ${booking.car.model} ${booking.car.year}`;
}
```

**Mejoras**:
- ✅ Logs para debugging
- ✅ Fallback muestra car_id parcial (útil para soporte)
- ✅ No silencia errores

---

## 🧪 Tests Requeridos

### Unit Test - getCarName()
**Archivo**: `apps/web/src/app/features/bookings/booking-success/booking-success.page.spec.ts`

```typescript
describe('BookingSuccessPage - getCarName()', () => {
  let component: BookingSuccessPage;
  let fixture: ComponentFixture<BookingSuccessPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BookingSuccessPage],
      // ... setup
    });
    fixture = TestBed.createComponent(BookingSuccessPage);
    component = fixture.componentInstance;
  });

  it('should return car name when booking has car data', () => {
    component.booking.set({
      id: 'booking-1',
      car_id: 'car-1',
      car: {
        id: 'car-1',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023
      }
    } as Booking);

    const result = component.getCarName();

    expect(result).toBe('Toyota Corolla 2023');
  });

  it('should return fallback when booking is null', () => {
    component.booking.set(null);

    const result = component.getCarName();

    expect(result).toBe('Vehículo');
  });

  it('should return fallback when car is missing', () => {
    component.booking.set({
      id: 'booking-1',
      car_id: 'car-1',
      car: undefined
    } as Booking);

    const result = component.getCarName();

    expect(result).toContain('Vehículo');
  });
});
```

### Integration Test - BookingService
**Archivo**: `apps/web/src/app/core/services/booking.service.spec.ts`

```typescript
describe('BookingService - getBookingById with car', () => {
  let service: BookingService;
  let supabaseMock: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    supabaseMock = createSupabaseMock();
    service = new BookingService(supabaseMock);
  });

  it('should load booking with car data', async () => {
    const mockBooking = {
      id: 'booking-1',
      car_id: 'car-1',
      car: {
        id: 'car-1',
        brand: 'Honda',
        model: 'Civic',
        year: 2022
      }
    };

    supabaseMock.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ 
            data: mockBooking, 
            error: null 
          })
        })
      })
    });

    const result = await service.getBookingById('booking-1');

    expect(result.car).toBeDefined();
    expect(result.car.brand).toBe('Honda');
  });

  it('should include car in select query', async () => {
    await service.getBookingById('booking-1');

    expect(supabaseMock.from).toHaveBeenCalledWith('bookings');
    
    const selectCall = supabaseMock.from().select;
    expect(selectCall).toHaveBeenCalled();
    
    // Verificar que incluye car en select
    const selectArg = selectCall.mock.calls[0][0];
    expect(selectArg).toContain('car:cars');
  });
});
```

### E2E Test - Success Page
**Archivo**: `tests/renter/booking/booking-success.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('booking success page displays car name', async ({ page }) => {
  // Login como test renter
  await page.goto('/login');
  await page.fill('[name="email"]', 'test-renter@autorenta.com');
  await page.fill('[name="password"]', 'TestPassword123!');
  await page.click('button[type="submit"]');

  // Navegar a una booking existente (setup: crear booking de test)
  const bookingId = 'test-booking-123';  // Crear en beforeAll
  await page.goto(`/booking-success/${bookingId}`);

  // Esperar que cargue
  await page.waitForSelector('[data-testid="booking-success"]');

  // Verificar que muestra nombre del auto (NO "Vehículo")
  const carName = await page.locator('h2').first().textContent();
  
  expect(carName).not.toBe('Vehículo');
  expect(carName).toMatch(/\w+ \w+ \d{4}/);  // Pattern: Brand Model Year
  
  // Ejemplo: "Toyota Corolla 2023"
  console.log('Car name displayed:', carName);
});
```

---

## 📋 Rollout Plan

### Step 1: Verificar Query Actual
```bash
# 1. Buscar método que carga booking
cd /home/edu/autorenta
grep -rn "from('bookings')" apps/web/src --include="*.ts" | grep select

# 2. Verificar si incluye car
# Si NO incluye "car:cars", ese es el problema
```

### Step 2: Implementar Fix
```bash
# 1. Modificar booking.service.ts
# Agregar car:cars!inner() al select

# 2. Actualizar interface Booking si es necesario
# Agregar car?: Car;

# 3. Mejorar getCarName() con logs

# 4. Commit
git add apps/web/src/app/core/services/booking.service.ts
git add apps/web/src/app/core/models/booking.model.ts
git add apps/web/src/app/features/bookings/booking-success/booking-success.page.ts
git commit -m "fix: display actual car name in booking success page"
```

### Step 3: Testing Local
```bash
# 1. Iniciar app
cd apps/web
npm start

# 2. Crear booking de test
# Navegar a /booking-success/:id

# 3. Verificar en console del browser:
# - ¿Hay logs "Car data not loaded"?
# - ¿El h2 muestra marca/modelo/año?

# 4. Inspect en DevTools:
# console.log(this.booking())
# ¿Tiene propiedad "car" con datos?
```

### Step 4: Deploy
```bash
# CI debe pasar
gh pr create --title "Fix car name display on success page"
gh pr checks --watch
gh pr merge --squash
```

---

## 🔙 Rollback Plan

### Si el fix rompe algo:

**Síntoma**: Success page no carga (error 500)

**Causa probable**: Query incluye FK inválido

**Fix rápido**:
```typescript
// Cambiar !inner por left join
select(`
  *,
  car:cars(*)  // Sin !inner
`)
```

**Revert completo**:
```bash
git revert <commit-hash>
git push origin main
```

---

## 📊 Monitoring

### Verificación Post-Deploy
```sql
-- Confirmar que todos los bookings tienen car válido
SELECT 
  COUNT(*) as total_bookings,
  COUNT(c.id) as bookings_with_valid_car,
  COUNT(*) - COUNT(c.id) as orphaned_bookings
FROM bookings b
LEFT JOIN cars c ON c.id = b.car_id
WHERE b.created_at > NOW() - INTERVAL '7 days';

-- Si orphaned_bookings > 0, investigar
SELECT b.id, b.car_id, b.created_at
FROM bookings b
LEFT JOIN cars c ON c.id = b.car_id
WHERE c.id IS NULL;
```

### Logs a Monitorear
```typescript
// En Sentry/LogRocket
if (!booking.car) {
  Sentry.captureMessage('Booking missing car data', {
    level: 'warning',
    extra: { 
      bookingId: booking.id,
      carId: booking.car_id
    }
  });
}
```

---

## ✅ Definition of Done

- [ ] Query de booking incluye `car:cars(*)` en select
- [ ] Interface `Booking` tiene propiedad `car?: Car`
- [ ] `getCarName()` retorna nombre real (no "Vehículo")
- [ ] Logs agregados para debugging
- [ ] Unit tests pasan (getCarName con/sin car)
- [ ] Integration test pasa (BookingService.getBookingById)
- [ ] E2E test pasa (success page muestra nombre)
- [ ] PR aprobado
- [ ] Deployed a producción
- [ ] Smoke test: Crear booking → Ver success page → Nombre correcto
- [ ] No logs "Car data not loaded" en Sentry (24h post-deploy)

---

## 📚 Referencias

- **Booking Service**: `apps/web/src/app/core/services/booking.service.ts`
- **Success Page**: `apps/web/src/app/features/bookings/booking-success/booking-success.page.ts`
- **Models**: `apps/web/src/app/core/models/booking.model.ts`
- **Supabase Docs**: https://supabase.com/docs/guides/database/joins
- **Related**: SPEC_BOOKING_RISK_SNAPSHOT_FIX.md (otro fix en success page)

---

**Última Actualización**: 2025-10-28  
**Estado**: ⏳ PENDIENTE IMPLEMENTACIÓN  
**Blocker para**: UX completa de checkout (50% → 70%)
