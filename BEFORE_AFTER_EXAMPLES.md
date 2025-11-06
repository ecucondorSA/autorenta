# EJEMPLOS ANTES/DESPUÉS DE REFACTORIZACIÓN

## TOP 3 COMPONENTES A REFACTORIZAR

---

## 1. CARS-MAP.COMPONENT.TS (926 líneas → 250 líneas)

### PROBLEMA
- 9 responsabilidades distintas
- Acceso directo a Supabase
- Mezcla Mapbox + clustering + pricing + distancia
- No testeable

### ANTES (926 líneas - CAOS)

```typescript
import { Component, OnChanges, signal, effect, inject } from '@angular/core';
import mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-cars-map',
  standalone: true,
  templateUrl: './cars-map.component.html',
})
export class CarsMapComponent implements OnChanges {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @Input() cars: CarMapLocation[] = [];
  @Input() selectedCarId: string | null = null;

  private readonly supabase = injectSupabase(); // ❌ ANTIPATRÓN
  private readonly carLocationsService = inject(CarLocationsService);
  private readonly pricingService = inject(DynamicPricingService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  private map: mapboxgl.Map | null = null;
  private carMarkersMap: Map<string, mapboxgl.Marker> = new Map();
  private pricingCache = new Map<string, any>();

  // ❌ MEZCLA DE RESPONSABILIDADES:
  
  // 1. Mapbox initialization
  ngAfterViewInit() {
    this.initializeMap();
  }

  private async initializeMap(): Promise<void> {
    mapboxgl.accessToken = environment.mapboxToken;
    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-65.1, -26.8],
      zoom: 10,
    });

    this.map.on('load', () => this.setupClusters());
    this.map.on('click', (e) => this.handleMapClick(e));
  }

  // 2. Clustering logic (50 líneas)
  private setupClusters(): void {
    if (this.cars.length < this.CLUSTER_THRESHOLD) {
      this.clusteringEnabled = false;
      this.addIndividualMarkers();
    } else {
      this.clusteringEnabled = true;
      this.setupMapboxClustering();
    }
  }

  private setupMapboxClustering(): void {
    this.map?.addSource('cars', {
      type: 'geojson',
      data: this.createGeoJSON(),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    this.map?.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'cars',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#51bbd6',
        'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30, 750, 40],
      },
    });
    // ... más capas
  }

  // 3. Pricing cache (40 líneas)
  private async loadPricingForCars(): Promise<void> {
    const carsToLoad = this.cars.filter((car) => !this.pricingCache.has(car.id));
    
    for (const car of carsToLoad) {
      try {
        const price = await firstValueFrom(
          this.pricingService.getDynamicPrice(car.id, { 
            checkInDate: new Date(),
            checkOutDate: new Date(Date.now() + 86400000),
          })
        );
        
        this.pricingCache.set(car.id, {
          price,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Error loading pricing:', error);
      }
    }
  }

  // 4. Distance calculations (Haversine - 30 líneas)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // 5. User location fetching (30 líneas) ❌ SUPABASE DIRECTO
  private async getUserLocation(): Promise<{ lat: number; lng: number } | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await this.supabase
        .from('profiles')
        .select('lat, lng')
        .eq('id', user.id)
        .single();

      return profile ? { lat: profile.lat, lng: profile.lng } : null;
    } catch (error) {
      return null;
    }
  }

  // 6. Marker management (50 líneas)
  private addIndividualMarkers(): void {
    for (const car of this.cars) {
      const marker = new mapboxgl.Marker()
        .setLngLat([car.lng, car.lat])
        .addTo(this.map!);

      const popup = new mapboxgl.Popup()
        .setHTML(this.createMarkerHTML(car));

      marker.setPopup(popup);
      this.carMarkersMap.set(car.id, marker);
    }
  }

  // 7. Navigation + filtering
  flyToCarLocation(carId: string): void {
    const car = this.cars.find((c) => c.id === carId);
    if (car && this.map) {
      this.map.flyTo({
        center: [car.lng, car.lat],
        zoom: 15,
        duration: 1000,
      });
    }
  }

  // 8. Effects (signal reactions)
  constructor() {
    effect(() => {
      if (this.selectedCarId) {
        this.flyToCarLocation(this.selectedCarId);
      }
    });
  }

  // 9. HTML generation
  private createMarkerHTML(car: CarMapLocation): string {
    const price = this.pricingCache.get(car.id)?.price ?? 'N/A';
    return `
      <div class="marker-popup">
        <h3>${car.title}</h3>
        <p>$${price}/día</p>
        <button (click)="selectCar('${car.id}')">Ver detalles</button>
      </div>
    `;
  }

  // ... 400 más líneas de lógica entrelazada
}
```

### DESPUÉS (250 líneas - LIMPIO)

```typescript
import { Component, Input, Output, EventEmitter, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cars-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #mapContainer class="map-container"></div>
    @if (loading()) {
      <app-skeleton class="absolute inset-0" />
    }
    @if (error()) {
      <app-error-banner [message]="error()!" />
    }
  `,
  styleUrl: './cars-map.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsMapComponent implements AfterViewInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  @Input() cars: CarMapLocation[] = [];
  @Input() selectedCarId: string | null = null;
  @Output() carSelected = new EventEmitter<string>();
  @Output() userLocationDetected = new EventEmitter<{ lat: number; lng: number }>();

  private mapService = inject(CarMapService);
  private clusteringService = inject(CarClusteringService);
  private distanceService = inject(CarDistanceService);
  private pricingService = inject(CarPricingService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  private async initializeMap(): Promise<void> {
    try {
      this.loading.set(true);
      
      // Mapbox initialization delegated to service
      await this.mapService.initialize({
        container: this.mapContainer.nativeElement,
        cars: this.cars,
      });

      // Setup clustering based on count
      if (this.cars.length >= 30) {
        this.clusteringService.setupClustering(this.cars);
      } else {
        this.mapService.addIndividualMarkers(this.cars);
      }

      // Load pricing data
      await this.pricingService.loadPricesForCars(this.cars);

      // Setup map interactions
      this.mapService.onMarkerClick.subscribe((carId) => {
        this.carSelected.emit(carId);
      });

      // Fly to selected car
      if (this.selectedCarId) {
        const car = this.cars.find((c) => c.id === this.selectedCarId);
        if (car) {
          this.mapService.flyTo(car);
        }
      }

      this.loading.set(false);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Error initializing map'
      );
      this.loading.set(false);
    }
  }
}
```

### SERVICIOS EXTRAÍDOS

**car-map.service.ts** (Mapbox management)
```typescript
@Injectable({ providedIn: 'root' })
export class CarMapService {
  private mapboxgl = inject(MapboxGlToken); // 🔑 Token management
  private map: mapboxgl.Map | null = null;

  async initialize(config: MapInitConfig): Promise<void> {
    this.map = new mapboxgl.Map(config);
    await new Promise((resolve) => this.map!.on('load', resolve));
  }

  addIndividualMarkers(cars: CarMapLocation[]): void {
    // Mapbox marker logic only
  }

  flyTo(car: CarMapLocation): void {
    // Fly animation only
  }
}
```

**car-clustering.service.ts** (Clustering logic)
**car-distance.service.ts** (Haversine calculations)
**car-pricing.service.ts** (Pricing cache + loading)

### BENEFICIOS DESPUÉS

- 926 → 250 líneas (73% reducción)
- 9 responsabilidades → 1 responsabilidad
- 100% testeable (sin Supabase mock)
- Services reutilizables en otros componentes
- Cambios a MapBox no afectan precios/distancia

---

## 2. COVERAGE-FUND-DASHBOARD.COMPONENT.TS (410 → 80 líneas)

### PROBLEMA
- Acceso directo a 3 tablas de Supabase
- No testeable
- Lógica de negocio mezclada con UI

### ANTES (410 líneas)

```typescript
export class CoverageFundDashboardComponent implements OnInit {
  private readonly supabase = injectSupabase(); // ❌ DIRECT ACCESS

  readonly fund = signal<CoverageFund | null>(null);
  readonly stats = signal<FundStats | null>(null);
  readonly recentActivity = signal<WalletLedgerEntry[]>([]);
  readonly loading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadFundData();
    await this.loadRecentActivity();
  }

  // ❌ ACCESO DIRECTO A TABLA 1
  async loadFundData(): Promise<void> {
    this.loading.set(true);
    try {
      const { data: fundData } = await this.supabase
        .from('coverage_fund')
        .select('*')
        .single();

      this.fund.set(fundData as CoverageFund);
      await this.loadStats();
    } finally {
      this.loading.set(false);
    }
  }

  // ❌ ACCESO DIRECTO A TABLA 2 + CÁLCULOS
  async loadStats(): Promise<void> {
    try {
      const { data } = await this.supabase
        .from('wallet_ledger')
        .select('kind, amount_cents')
        .in('kind', ['franchise_user', 'franchise_fund']);

      const entries = data || [];
      const collected = entries.filter((e) => e.kind === 'franchise_fund');
      const disbursed = entries.filter((e) => e.kind === 'franchise_user');

      this.stats.set({
        total_franchises_collected: collected.length,
        total_franchises_disbursed: disbursed.length,
        total_ledger_entries: entries.length,
        avg_franchise_amount: Math.round(
          collected.reduce((sum, e) => sum + e.amount_cents, 0) / collected.length
        ),
      });
    } catch (err) {
      // Silent error
    }
  }

  // ❌ ACCESO DIRECTO A TABLA 3
  async loadRecentActivity(): Promise<void> {
    this.loadingActivity.set(true);
    try {
      const { data } = await this.supabase
        .from('wallet_ledger')
        .select('*')
        .in('kind', ['franchise_user', 'franchise_fund'])
        .order('ts', { ascending: false })
        .limit(20);

      this.recentActivity.set(data || []);
    } finally {
      this.loadingActivity.set(false);
    }
  }

  // ... 200 líneas de template...
}
```

### DESPUÉS (80 líneas)

```typescript
@Component({
  selector: 'app-coverage-fund-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- 80 líneas de template puro -->
  `,
})
export class CoverageFundDashboardComponent {
  private fundService = inject(CoverageFundService);

  // ✅ DATOS COMO SIGNALS (toSignal)
  readonly fund = toSignal(this.fundService.getFund(), { initialValue: null });
  readonly stats = toSignal(this.fundService.getStatistics(), { initialValue: null });
  readonly recentActivity = toSignal(
    this.fundService.getRecentActivity(20),
    { initialValue: [] }
  );

  // Formato auxiliar
  formatAmount = (cents: number) => new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(cents / 100);

  formatDate = (timestamp: string) => new Date(timestamp)
    .toLocaleDateString('es-AR');
}
```

### SERVICIO EXTRAÍDO

**coverage-fund.service.ts**
```typescript
@Injectable({ providedIn: 'root' })
export class CoverageFundService {
  private supabase = injectSupabase();

  getFund(): Observable<CoverageFund> {
    return from(
      this.supabase
        .from('coverage_fund')
        .select('*')
        .single()
    ).pipe(
      map(({ data }) => data as CoverageFund),
      shareReplay(1),
    );
  }

  getStatistics(): Observable<FundStats> {
    return from(
      this.supabase
        .from('wallet_ledger')
        .select('kind, amount_cents')
        .in('kind', ['franchise_user', 'franchise_fund'])
    ).pipe(
      map(({ data }) => this.calculateStats(data || [])),
      shareReplay(1),
    );
  }

  getRecentActivity(limit = 20): Observable<WalletLedgerEntry[]> {
    return from(
      this.supabase
        .from('wallet_ledger')
        .select('*')
        .in('kind', ['franchise_user', 'franchise_fund'])
        .order('ts', { ascending: false })
        .limit(limit)
    ).pipe(
      map(({ data }) => data || []),
      shareReplay(1),
    );
  }

  private calculateStats(entries: any[]): FundStats {
    const collected = entries.filter((e) => e.kind === 'franchise_fund');
    const disbursed = entries.filter((e) => e.kind === 'franchise_user');
    const total = entries.length;

    return {
      total_franchises_collected: collected.length,
      total_franchises_disbursed: disbursed.length,
      total_ledger_entries: total,
      avg_franchise_amount:
        collected.length > 0
          ? Math.round(
              collected.reduce((sum, e) => sum + e.amount_cents, 0) / collected.length
            )
          : 0,
    };
  }
}
```

### BENEFICIOS DESPUÉS

- 410 → 80 líneas (80% reducción)
- Componente 100% testeable
- Servicio reutilizable (admin panel, stats page, etc.)
- Fácil de mockear en tests

---

## 3. BONUS-PROTECTOR-PURCHASE.COMPONENT.TS (787 → 200 líneas)

### PROBLEMA
- Lógica de recomendaciones en componente
- Cálculos de precios en componente
- Validaciones de negocio en componente
- Mezcla UI + lógica

### ANTES (fragmento de 787 líneas)

```typescript
export class BonusProtectorPurchaseComponent {
  private driver = inject(DriverProfileService);
  private wallet = inject(WalletService);

  // ❌ LÓGICA DE NEGOCIO EN COMPONENTE
  readonly recommendedLevel = computed(() => {
    const class_ = this.driver.driverClass();
    switch (class_) {
      case 'class_a': return 1;
      case 'class_b': return 2;
      case 'class_c': return 3;
      default: return 0;
    }
  });

  // ❌ CÁLCULOS DE AHORRO EN COMPONENTE
  readonly potentialSavings = computed(() => {
    const level = this.recommendedLevel();
    const baseCost = this.getBaseCostForClaim('moderate');
    const reduction = level * 0.25;
    return Math.round(baseCost * reduction);
  });

  // ❌ INFORMACIÓN DE COSTOS EN COMPONENTE (hardcoded)
  readonly levelPrices = {
    1: 1500, // $15 USD
    2: 2500, // $25 USD
    3: 4000, // $40 USD
  };

  // ❌ VALIDACIÓN EN COMPONENTE
  readonly canPurchase = computed(() => {
    const balance = this.wallet.getBalance()();
    const selectedLevel = this.selectedLevel();
    const cost = this.levelPrices[selectedLevel];
    return balance >= cost;
  });

  // ❌ PROCESAMIENTO DE COMPRA EN COMPONENTE
  async purchaseProtector(): Promise<void> {
    const balance = this.wallet.getBalance()();
    const cost = this.levelPrices[this.selectedLevel()];

    if (balance < cost) {
      this.error.set('Fondos insuficientes');
      return;
    }

    this.processing.set(true);
    try {
      const result = await firstValueFrom(
        this.wallet.deductFunds(cost, 'bonus_protector_purchase')
      );

      if (!result.ok) {
        throw new Error(result.error);
      }

      // Registrar compra
      const purchase = await firstValueFrom(
        this.bonusProtectorService.recordPurchase({
          user_id: user.id,
          level: this.selectedLevel(),
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        })
      );

      this.success.set(true);
    } catch (err) {
      this.error.set(err.message);
    } finally {
      this.processing.set(false);
    }
  }
}
```

### DESPUÉS (200 líneas)

```typescript
@Component({
  selector: 'app-bonus-protector-purchase',
  standalone: true,
  template: `
    <!-- UI layer only -->
    <ion-card>
      <ion-card-header>
        <ion-card-title>Protector de Bonus</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        @for (option of availableLevels(); track option.level) {
          <div class="option">
            <h3>Nivel {{ option.level }}</h3>
            <p class="price">${{ option.price }}</p>
            @if (option.isRecommended) {
              <ion-badge color="success">Recomendado</ion-badge>
            }
            <p class="savings">
              Ahorro potencial: ${{ option.potentialSavings }}
            </p>
            <ion-button 
              (click)="selectLevel(option.level)"
              [disabled]="!canPurchaseLevel(option.level)"
            >
              {{ canPurchaseLevel(option.level) ? 'Comprar' : 'Sin fondos' }}
            </ion-button>
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
})
export class BonusProtectorPurchaseComponent {
  // ✅ INYECTAR SERVICIO DE LÓGICA
  private protectorService = inject(BonusProtectorService);
  private driver = inject(DriverProfileService);

  readonly driverClass = computed(() => this.driver.driverClass());

  // ✅ OBTENER DATA DEL SERVICIO
  readonly availableLevels = computed(() => {
    const recommended = this.protectorService.getRecommendedLevel(this.driverClass());
    return this.protectorService.getAvailableLevels().map((level) => ({
      ...level,
      isRecommended: level.level === recommended,
      potentialSavings: this.protectorService.calculateSavings(level.level, 'moderate'),
    }));
  });

  // ✅ DELEGAR VALIDACIÓN AL SERVICIO
  canPurchaseLevel(level: number): boolean {
    return this.protectorService.canPurchase(level);
  }

  async selectLevel(level: number): Promise<void> {
    try {
      await this.protectorService.purchase(level);
      // Navegar, mostrar éxito, etc.
    } catch (err) {
      this.error.set(err.message);
    }
  }
}
```

### SERVICIO EXTRAÍDO

**bonus-protector.service.ts**
```typescript
@Injectable({ providedIn: 'root' })
export class BonusProtectorService {
  private wallet = inject(WalletService);
  private supabase = injectSupabase();

  private readonly LEVEL_PRICES = {
    1: 1500,  // USD 15
    2: 2500,  // USD 25
    3: 4000,  // USD 40
  };

  getRecommendedLevel(driverClass: string): number {
    const levels: Record<string, number> = {
      'class_a': 1,
      'class_b': 2,
      'class_c': 3,
    };
    return levels[driverClass] ?? 0;
  }

  getAvailableLevels(): ProtectorLevel[] {
    return [
      { level: 1, price: 15, coverage: 1 },
      { level: 2, price: 25, coverage: 2 },
      { level: 3, price: 40, coverage: 3 },
    ];
  }

  calculateSavings(level: number, claimType: 'minor' | 'moderate' | 'severe'): number {
    const baseCost = this.getBaseCostForClaim(claimType);
    const reduction = level * 0.25;
    return Math.round(baseCost * reduction);
  }

  canPurchase(level: number): boolean {
    const balance = this.wallet.getBalance().sync();
    const cost = this.LEVEL_PRICES[level as keyof typeof this.LEVEL_PRICES];
    return balance >= cost;
  }

  async purchase(level: number): Promise<void> {
    const cost = this.LEVEL_PRICES[level as keyof typeof this.LEVEL_PRICES];

    // Deduct funds
    await this.wallet.deductFunds(cost, 'bonus_protector_purchase');

    // Record purchase
    const { data: { user } } = await this.supabase.auth.getUser();
    await this.supabase.from('bonus_protectors').insert({
      user_id: user!.id,
      level,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
  }

  private getBaseCostForClaim(type: 'minor' | 'moderate' | 'severe'): number {
    const costs: Record<string, number> = {
      'minor': 50000,
      'moderate': 100000,
      'severe': 200000,
    };
    return costs[type];
  }
}
```

### BENEFICIOS DESPUÉS

- 787 → 200 líneas (75% reducción)
- Lógica 100% testeable y reutilizable
- Componente enfocado solo en UI
- Cambios a precios/recomendaciones no afectan otros componentes

---

## CONCLUSIÓN

### Patrón de Refactorización

```
MEGA COMPONENTE (800+ líneas)
        ↓
Identificar 3-5 responsabilidades
        ↓
EXTRAER SERVICIOS
- Acceso a datos
- Cálculos/transformaciones
- Validaciones
        ↓
REFACTOR COMPONENTE
- Solo presentación
- Inyectar servicios
- Usar signals/computed
        ↓
RESULTADO
- Componente <300 líneas
- 100% testeable
- Servicios reutilizables
```

### Checklist

- [ ] Identificar todas las responsabilidades
- [ ] Agrupar por categoría (UI, data, logic)
- [ ] Crear servicios para data + logic
- [ ] Inyectar servicios en componente
- [ ] Reemplazar métodos privados con service calls
- [ ] Usar `toSignal()` para observables
- [ ] Usar `computed()` para derivados
- [ ] Eliminar Supabase directo
- [ ] Test service methods
- [ ] Update component tests

---

**Nota**: Todos los ejemplos siguen las mejores prácticas de Angular 17 standalone con signals.

