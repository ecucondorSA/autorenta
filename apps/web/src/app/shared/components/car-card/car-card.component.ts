import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, Output, EventEmitter, computed, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Car } from '../../../core/models';
import { MoneyPipe } from '../../pipes/money.pipe';
import { getCarImageUrl } from '../../utils/car-placeholder.util';
import { DynamicPricingService } from '../../../core/services/dynamic-pricing.service';
import { RealtimePricingService } from '../../../core/services/realtime-pricing.service';
import { injectSupabase } from '../../../core/services/supabase-client.service';

@Component({
  selector: 'app-car-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MoneyPipe, TranslateModule, NgOptimizedImage],
  templateUrl: './car-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarCardComponent implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly pricingService = inject(DynamicPricingService);
  private readonly realtimePricing = inject(RealtimePricingService);
  private readonly supabase = injectSupabase();
  
  private unsubscribeRealtime?: () => void;

  private readonly _car = signal<Car | undefined>(undefined);
  private readonly _selected = signal<boolean>(false);
  private readonly _distance = signal<string | undefined>(undefined);
  private readonly _isComparing = signal<boolean>(false);
  private readonly _compareDisabled = signal<boolean>(false);

  @Output() compareToggle = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  private readonly _showOwnerActions = signal<boolean>(false);

  // Dynamic pricing signals
  readonly dynamicPrice = signal<number | null>(null);
  readonly priceLoading = signal<boolean>(false);
  readonly priceSurgeIcon = signal<string>('');

  // Computed display price: use dynamic if available, fallback to static
  readonly displayPrice = computed(() => {
    const dynamic = this.dynamicPrice();
    const car = this._car();
    return dynamic !== null ? dynamic : (car?.price_per_day ?? 0);
  });

  readonly showPriceLoader = computed(() => {
    return this.priceLoading() && this.dynamicPrice() === null;
  });

  @Input()
  set showOwnerActions(value: boolean) {
    this._showOwnerActions.set(value);
  }

  get showOwnerActions(): boolean {
    return this._showOwnerActions();
  }

  @Input({ required: true })
  set car(value: Car) {
    console.log('🚗 [CarCard] Setter called:', {
      id: value?.id,
      title: value?.title,
      region_id: value?.region_id,
      price: value?.price_per_day,
      hasRegionId: !!value?.region_id
    });
    
    this._car.set(value);
    // Load dynamic price when car changes
    if (value?.region_id) {
      console.log('✅ [CarCard] Has region_id, loading dynamic price...');
      void this.loadDynamicPrice();
    } else {
      console.warn('❌ [CarCard] NO region_id - using static price for:', value?.title);
    }
  }

  get car(): Car {
    return this._car()!;
  }

  ngOnInit(): void {
    // Load dynamic price on init if car already set
    if (this.car?.region_id) {
      void this.loadDynamicPrice();
      
      // 🔴 REALTIME POOLING: Suscribirse a updates de pricing
      this.subscribeToRealtimePricing();
    }
  }

  ngOnDestroy(): void {
    // 🧹 Cleanup: desuscribirse de realtime
    this.unsubscribeRealtime?.();
  }
  
  /**
   * 🔴 ECUCONDOR08122023 PATTERN: WebSocket Pooling
   * Suscribirse a cambios en tiempo real de:
   * - Exchange rates (Binance)
   * - Demand snapshots (surge pricing)
   * - Special events
   */
  private subscribeToRealtimePricing(): void {
    const car = this._car();
    if (!car || !car.region_id) return;
    
    // Suscribirse a TODO (exchange rates + demand + events)
    this.unsubscribeRealtime = this.realtimePricing.subscribeToAllPricingUpdates({
      onExchangeRateUpdate: () => {
        console.log('💱 Exchange rate updated, recalculating price for car:', car.id);
        void this.loadDynamicPrice();
      },
      onDemandUpdate: (regionId) => {
        // Solo recalcular si es nuestra región
        if (regionId === car.region_id) {
          console.log('📈 Demand updated for region:', regionId);
          void this.loadDynamicPrice();
        }
      },
      onEventUpdate: () => {
        console.log('🎉 Special event updated, recalculating price');
        void this.loadDynamicPrice();
      },
    });
  }

  private async loadDynamicPrice(): Promise<void> {
    const car = this._car();
    
    console.log('🔍 [CarCard] Loading dynamic price for:', {
      carId: car?.id,
      carTitle: car?.title,
      regionId: car?.region_id,
      staticPrice: car?.price_per_day
    });
    
    if (!car || !car.region_id) {
      console.warn('⚠️  [CarCard] Skipping - no car or region_id');
      return;
    }

    this.priceLoading.set(true);
    this.cdr.markForCheck();

    try {
      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';
      
      console.log('📞 [CarCard] Calling RPC directly...', {
        regionId: car.region_id,
        userId
      });
      
      // Call RPC directly bypassing the problematic service
      const { data, error } = await this.supabase.rpc('calculate_dynamic_price', {
        p_region_id: car.region_id,
        p_user_id: userId,
        p_rental_start: new Date().toISOString(),
        p_rental_hours: 24
      });

      if (error) {
        console.error('❌ [CarCard] RPC Error:', error);
        throw error;
      }

      console.log('✅ [CarCard] RPC Response:', data);

      if (data && data.total_price) {
        const dynamicPricePerDay = data.total_price;
        this.dynamicPrice.set(dynamicPricePerDay);
        console.log(`💰 [CarCard] Dynamic price set: $${dynamicPricePerDay} (was $${car.price_per_day})`);
        
        // Set surge indicator if there's significant price change
        if (data.surge_active || dynamicPricePerDay > car.price_per_day * 1.2) {
          this.priceSurgeIcon.set('🔥');
        }
        
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('❌ [CarCard] Failed to load dynamic price:', error);
      // Fallback: keep using static price
    } finally {
      this.priceLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  @Input()
  set selected(value: boolean) {
    this._selected.set(value);
  }

  get selected(): boolean {
    return this._selected();
  }

  @Input()
  set distance(value: string | undefined) {
    this._distance.set(value);
    // Trigger change detection when distance updates (important for OnPush strategy)
    this.cdr.markForCheck();
  }

  get distance(): string | undefined {
    return this._distance();
  }

  @Input()
  set isComparing(value: boolean) {
    this._isComparing.set(value);
  }

  get isComparing(): boolean {
    return this._isComparing();
  }

  @Input()
  set compareDisabled(value: boolean) {
    this._compareDisabled.set(value);
  }

  get compareDisabled(): boolean {
    return this._compareDisabled();
  }

  readonly firstPhoto = computed(() => this._car()?.photos?.[0] ?? null);

  onCompareToggle(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.compareDisabled || this.isComparing) {
      this.compareToggle.emit(this.car.id);
    }
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.edit.emit(this.car.id);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.delete.emit(this.car.id);
  }

  readonly displayImage = computed(() => {
    const car = this._car();
    if (!car) return null;

    const photos = car.photos || car.car_photos;
    const url = getCarImageUrl(photos, {
      brand: car.brand || car.brand_name,
      model: car.model || car.model_name,
      year: car.year,
      id: car.id,
    });

    return { url, alt: car.title };
  });

  readonly topFeatures = computed(() => {
    const car = this._car();
    if (!car?.features) return [];

    // Mapeo de features a labels en español
    const featureLabels: Record<string, string> = {
      ac: 'Aire acondicionado',
      bluetooth: 'Bluetooth',
      gps: 'GPS',
      usb: 'USB',
      abs: 'ABS',
      airbag: 'Airbag',
      backup_camera: 'Cámara trasera',
      parking_sensors: 'Sensores de estacionamiento',
      cruise_control: 'Control crucero',
      leather_seats: 'Asientos de cuero',
      sunroof: 'Techo solar',
      aux_input: 'Entrada auxiliar',
    };

    // Filtrar features activas y obtener top 3
    const activeFeatures = Object.entries(car.features)
      .filter(([_, value]) => value === true)
      .map(([key]) => featureLabels[key] || key)
      .slice(0, 3);

    return activeFeatures;
  });
}
