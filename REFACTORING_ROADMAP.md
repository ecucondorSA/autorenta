# ROADMAP DE REFACTORIZACIÓN DETALLADA

## ACCIÓN INMEDIATA (SEMANA 1-2)

### 1. Crear Servicios Facade para Supabase Direct Access

```bash
# Crear nuevos servicios
apps/web/src/app/core/services/
├── domain/
│   ├── coverage-fund.service.ts (NEW)
│   ├── wallet-ledger.service.ts (NEW)  
│   ├── social-proof.service.ts (NEW)
│   ├── inspection-manager.service.ts (NEW)
│   └── user-location.service.ts (NEW)
```

**coverage-fund.service.ts** (Reemplaza acceso directo en dashboard)
```typescript
@Injectable({ providedIn: 'root' })
export class CoverageFundService {
  constructor(private supabase = injectSupabase()) {}

  getFund(): Observable<CoverageFund> {
    return from(
      this.supabase
        .from('coverage_fund')
        .select('*')
        .single()
    ).pipe(
      map(({ data }) => data as CoverageFund),
      shareReplay(1)
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
      shareReplay(1)
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
      shareReplay(1)
    );
  }

  private calculateStats(entries: any[]): FundStats {
    const collected = entries.filter(e => e.kind === 'franchise_fund');
    const disbursed = entries.filter(e => e.kind === 'franchise_user');
    
    return {
      total_franchises_collected: collected.length,
      total_franchises_disbursed: disbursed.length,
      total_ledger_entries: entries.length,
      avg_franchise_amount: this.calculateAverage(collected),
    };
  }
}
```

**social-proof.service.ts** (Reemplaza calculations en component)
```typescript
@Injectable({ providedIn: 'root' })
export class SocialProofService {
  constructor(private supabase = injectSupabase()) {}

  async getRecentBookingsCount(carId: string): Promise<number> {
    const thirtyDaysAgo = this.getDateDaysAgo(30);
    const { count } = await this.supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('car_id', carId)
      .in('status', ['confirmed', 'completed', 'in_progress'])
      .gte('created_at', thirtyDaysAgo.toISOString());
    return count ?? 0;
  }

  async getAvailableDaysThisMonth(carId: string): Promise<number> {
    // Extraído del componente - ahora reutilizable
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const { data: bookings } = await this.supabase
      .from('bookings')
      .select('start_at, end_at')
      .eq('car_id', carId)
      .in('status', ['confirmed', 'in_progress'])
      .gte('start_at', firstDay.toISOString())
      .lte('end_at', lastDay.toISOString());

    return this.calculateAvailableDays(bookings || [], lastDay.getDate());
  }

  calculatePopularityScore(car: Car): number {
    let score = 50;
    
    const rating = (car.rating_avg ?? 0) / 5 * 25;
    score += rating;
    
    const reviewCount = Math.min((car.rating_count ?? 0) / 10, 1) * 15;
    score += reviewCount;
    
    const price = this.parsePrice(car.price_per_day);
    if (price < 20) score += 10;
    else if (price < 30) score += 5;
    
    return Math.min(Math.round(score), 100);
  }

  generateIntelligentViewers(popularityScore: number): number {
    const baseViewers = Math.floor((popularityScore / 100) * 15);
    const randomFactor = 0.7 + Math.random() * 0.8;
    return Math.max(0, Math.round(baseViewers * randomFactor));
  }

  // Métodos privados...
  private getDateDaysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
```

### 2. Refactorizar `coverage-fund-dashboard.component.ts`

**Antes (410 líneas):**
```typescript
export class CoverageFundDashboardComponent implements OnInit {
  private readonly supabase = injectSupabase();
  readonly loading = signal(false);
  
  async loadFundData(): Promise<void> {
    const { data: fundData } = await this.supabase
      .from('coverage_fund')
      .select('*')
      .single();
    // ...
  }
}
```

**Después (100 líneas):**
```typescript
export class CoverageFundDashboardComponent {
  private fundService = inject(CoverageFundService);
  
  readonly fund = toSignal(this.fundService.getFund(), { 
    initialValue: null 
  });
  readonly stats = toSignal(this.fundService.getStatistics(), { 
    initialValue: null 
  });
  readonly recentActivity = toSignal(this.fundService.getRecentActivity(20), { 
    initialValue: [] 
  });
  
  // Todo el código de presentación
}
```

---

## FASE 1: SERVICIOS CRÍTICOS (SEMANA 2-3)

### Crear Servicios de Lógica de Negocio

**bonus-protector.service.ts**
```typescript
@Injectable({ providedIn: 'root' })
export class BonusProtectorService {
  private driver = inject(DriverProfileService);
  private wallet = inject(WalletService);

  getRecommendedLevel(driverClass: string): number {
    const levels: Record<string, number> = {
      'class_a': 1,
      'class_b': 2,
      'class_c': 3,
    };
    return levels[driverClass] ?? 0;
  }

  calculateSavings(level: number, claimType: 'minor' | 'moderate' | 'severe'): number {
    const baseCost = this.getBaseCostForClaim(claimType);
    const reduction = level * 0.25; // 25% por nivel
    return Math.round(baseCost * reduction);
  }

  validatePurchase(level: number): ValidationResult {
    const balance = this.wallet.getBalance().sync();
    const cost = this.getLevelCost(level);
    
    return {
      canPurchase: balance >= cost,
      reason: balance < cost ? 'insufficient_funds' : null,
    };
  }

  private getLevelCost(level: number): number {
    return level === 1 ? 1500 : level === 2 ? 2500 : 4000; // En centavos
  }
}
```

**franchise-calculator.service.ts**
```typescript
@Injectable({ providedIn: 'root' })
export class FranchiseCalculatorService {
  private riskMatrix = inject(RiskMatrixService);

  calculateFranchiseMatrix(
    carValue: number
  ): FranchiseMatrix {
    const bucket = this.determineBucket(carValue);
    const policy = this.riskMatrix.getPolicyForBucket(bucket);
    
    return {
      bucket,
      carValueRange: this.getValueRangeLabel(policy),
      standardFranchiseUsd: policy.standard_franchise,
      rolloverFranchiseUsd: policy.rollover_franchise,
    };
  }

  calculateHoldAmount(
    rolloverFranchiseUsd: number,
    exchangeRate: number
  ): { usd: number; ars: number } {
    const holdUsd = 0.35 * rolloverFranchiseUsd;
    return {
      usd: holdUsd,
      ars: Math.round(holdUsd * exchangeRate * 100),
    };
  }

  private determineBucket(value: number): 'economy' | 'standard' | 'premium' | 'luxury' {
    if (value < 10000) return 'economy';
    if (value < 30000) return 'standard';
    if (value < 60000) return 'premium';
    return 'luxury';
  }
}
```

---

## FASE 2: REDUCCIÓN DE MEGA COMPONENTES (SEMANA 3-4)

### Refactorizar `cars-map.component.ts` (926 → 300 líneas)

**Antes: Mega componente con 9 responsabilidades**

**Después: Componente de presentación lean**
```typescript
@Component({
  selector: 'app-cars-map',
  imports: [CommonModule],
  template: `
    <div #mapContainer></div>
    @if (loading()) { <app-skeleton /> }
    @if (error()) { <app-error [message]="error()" /> }
  `,
})
export class CarsMapComponent implements OnInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @Input() cars: CarMapLocation[] = [];
  @Input() selectedCarId: string | null = null;
  @Output() carSelected = new EventEmitter<string>();

  private mapService = inject(CarMapService);
  private distanceService = inject(CarDistanceService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngAfterViewInit() {
    this.mapService.initialize(this.mapContainer.nativeElement);
  }

  onCarSelected(carId: string) {
    this.carSelected.emit(carId);
  }
}
```

**Servicios Extraídos:**

1. `car-map.service.ts` - Manejo de Mapbox
2. `car-clustering.service.ts` - Lógica de clustering
3. `car-distance.service.ts` - Cálculos Haversine
4. `car-pricing-cache.service.ts` - Caché de precios

---

## FASE 3: COMPONENTES REUTILIZABLES (SEMANA 4-5)

### Crear Componentes Genéricos

**generic-confirm-modal.component.ts**
```typescript
@Component({
  selector: 'app-generic-confirm-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-modal #modal>
      <ion-header>
        <ion-title>{{ data().title }}</ion-title>
      </ion-header>
      <ion-content>
        <p>{{ data().message }}</p>
      </ion-content>
      <ion-footer>
        <ion-button (click)="cancel()">{{ data().cancelText }}</ion-button>
        <ion-button (click)="confirm()">{{ data().confirmText }}</ion-button>
      </ion-footer>
    </ion-modal>
  `,
})
export class GenericConfirmModalComponent {
  data = input<ConfirmModalData>({
    title: '',
    message: '',
    cancelText: 'Cancelar',
    confirmText: 'Confirmar',
  });
  
  confirmed = output<boolean>();

  confirm() {
    this.confirmed.emit(true);
  }
  
  cancel() {
    this.confirmed.emit(false);
  }
}
```

**Reutilización:**
```
payment-method-comparison-modal (561 líneas)
    ↓
generic-confirm-modal + specialized content

class-benefits-modal (583 líneas)
    ↓
generic-confirm-modal + benefits display

mp-onboarding-modal (561 líneas)
    ↓
generic-confirm-modal + form content
```

---

## FASE 4: UNIFICAR PATRONES (SEMANA 5)

### 1. Reemplazar `alert()` y `confirm()`

```typescript
// ❌ ANTES (en fgo-management.component.ts)
async uploadCheckIn(): Promise<void> {
  alert('Funcionalidad en desarrollo');
}

// ✅ DESPUÉS
async uploadCheckIn(): Promise<void> {
  this.toastr.info('Funcionalidad en desarrollo');
}
```

### 2. Eliminar Window Callbacks

```typescript
// ❌ ANTES (en inspection-uploader.component.ts)
interface WindowWithInspectionCallback extends Window {
  inspectionUploaderCallback?: (data: unknown) => void;
}

const win = window as WindowWithInspectionCallback;
if (win.inspectionUploaderCallback) {
  win.inspectionUploaderCallback(inspection);
}

// ✅ DESPUÉS
@Output() inspectionCompleted = new EventEmitter<BookingInspection>();
this.inspectionCompleted.emit(inspection);
```

### 3. Unificar a Signals + effect()

```typescript
// ❌ ANTES (mezcla signals + observables)
@Component({...})
export class SocialProofIndicatorsComponent {
  private refreshSubscription?: Subscription;
  readonly socialProof = signal(...);

  ngOnInit() {
    this.refreshSubscription = interval(45000).subscribe(() => {
      this.loadSocialProofData();
    });
  }
}

// ✅ DESPUÉS
@Component({...})
export class SocialProofIndicatorsComponent {
  private car = input<Car | null>(null);
  readonly socialProof = signal<SocialProofData | null>(null);

  constructor() {
    effect(() => {
      const car = this.car();
      if (car) {
        this.loadSocialProofData(car);
      }
    });
  }
}
```

---

## MÉTRICAS DE PROGRESO

### Antes de Refactorización
```
Componentes: 150+
Líneas totales: 16,626
Componentes >200 LOC: 34
Componentes >500 LOC: 8
Acceso directo Supabase: 6
Testabilidad: POBRE (50%)
Deuda técnica: ALTA
```

### Después de Refactorización (objetivo)
```
Componentes: 120
Líneas totales: 8,000-10,000
Componentes >200 LOC: 8
Componentes >500 LOC: 0
Acceso directo Supabase: 0
Testabilidad: EXCELENTE (95%)
Deuda técnica: BAJA
```

### Hitos
- [ ] SEMANA 1-2: Services para Supabase direct access
- [ ] SEMANA 2-3: Business logic services
- [ ] SEMANA 3-4: Refactor mega components
- [ ] SEMANA 4-5: Generic reusable components
- [ ] SEMANA 5: Unify patterns
- [ ] POST: Unit tests for all new services

---

## CHECKLIST DE VERIFICACIÓN

Para cada componente refactorizado:

- [ ] No hay acceso directo a `supabase`
- [ ] No hay `alert()` o `confirm()`
- [ ] Usa solo `signals` + `computed()` + `effect()`
- [ ] Tiene <3 responsabilidades principales
- [ ] Tiene <300 líneas (excepto templates complejos)
- [ ] Usa `@Input()` + `@Output()` en lugar de DI para datos
- [ ] Todos los métodos públicos testables
- [ ] Documentado con JSDoc para lógica compleja

