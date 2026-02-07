import { CommonModule, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DynamicPricingService } from '@core/services/payments/dynamic-pricing.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { RealtimePricingService } from '@core/services/payments/realtime-pricing.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { UrgentRentalService } from '@core/services/bookings/urgent-rental.service';
import { CurrencyService } from '@core/services/payments/currency.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Car } from '../../../core/models';
import { getCarImageUrl } from '../../utils/car-placeholder.util';

@Component({
  selector: 'app-car-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, NgOptimizedImage],
  templateUrl: './car-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarCardComponent implements OnInit, OnDestroy {
  private readonly logger = inject(LoggerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly pricingService = inject(DynamicPricingService);
  private readonly realtimePricing = inject(RealtimePricingService);
  private readonly urgentRentalService = inject(UrgentRentalService);
  protected readonly currencyService = inject(CurrencyService); // Exposed to template
  private readonly supabase = injectSupabase();

  protected readonly Math = Math;

  private unsubscribeRealtime?: () => void;

  private readonly _car = signal<Car | undefined>(undefined);
  private readonly _selected = signal<boolean>(false);
  private readonly _distance = signal<string | undefined>(undefined);
  private readonly _isComparing = signal<boolean>(false);
  private readonly _compareDisabled = signal<boolean>(false);
  private readonly _showOwnerActions = signal<boolean>(false);
  protected readonly _priority = signal<boolean>(false);
  private readonly _urgentMode = signal<boolean>(false);
  private readonly _isMapVariant = signal<boolean>(false);

  readonly hourlyPrice = signal<number | null>(null);
  readonly urgentAvailability = signal<{
    available: boolean;
    distance?: number;
    eta?: number;
  } | null>(null);

  @Output() compareToggle = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  @Output() toggleAvailability = new EventEmitter<{ id: string; status: string }>();

  readonly dynamicPrice = signal<number | null>(null);
  readonly priceLoading = signal<boolean>(false);
  readonly priceSurgeIcon = signal<string>('');

  readonly displayPrice = computed(() => {
    const dynamic = this.dynamicPrice();
    const car = this._car();
    const rawPrice = dynamic !== null ? dynamic : (car?.price_per_day ?? 0);

    // Dollar First Strategy: Normalize to USD
    if (car?.currency === 'ARS') {
      const rates = this.currencyService.exchangeRates();
      // Fallback to a safe default if rates are not loaded yet to avoid 0/Infinity issues
      // ideally we should show a loader, but for now we fallback or wait
      const rate = rates ? rates.binance : undefined;

      if (rate && rate > 0) {
        return rawPrice / rate;
      } else {
        // If we don't have a rate yet, we might return null or the raw price (risky)
        // or return 0 to trigger "Consultar precio"
        return 0;
      }
    }

    return rawPrice;
  });

  readonly hasValidPrice = computed(() => {
    const price = this.displayPrice();
    return Number.isFinite(price) && price > 0;
  });

  readonly displayTitle = computed(() => {
    const car = this._car();
    if (!car) return 'Próximamente';
    if (car.title && car.title.trim().length > 0) return car.title.trim();

    const parts = [
      car.brand || car.brand_name || '',
      car.model || car.model_name || '',
      car.year || '',
    ]
      .map((p) => String(p).trim())
      .filter(Boolean);

    const fallback = parts.join(' ').trim();
    return fallback || 'Próximamente';
  });

  /**
   * Verifica si el auto tiene un título real definido
   * Usado para mostrar badge "Sin título" a owners
   */
  readonly hasRealTitle = computed(() => {
    const car = this._car();
    if (!car) return false;

    // Check if title exists and is not empty
    if (car.title && car.title.trim().length > 0) return true;

    // Check if we can build a fallback from brand/model/year
    const parts = [
      car.brand || car.brand_name || '',
      car.model || car.model_name || '',
      car.year || '',
    ]
      .map((p) => String(p).trim())
      .filter(Boolean);

    return parts.length > 0;
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
    this.logger.debug('🚗 [CarCard] Car set:', {
      id: value?.id,
      title: value?.title,
      region_id: value?.region_id,
      price: value?.price_per_day,
      hasRegionId: !!value?.region_id,
    });

    this._car.set(value);

    if (value?.region_id) {
      void this.loadDynamicPrice();
    } else {
      // Silently use static price when region_id is missing
      this.logger.debug('[CarCard] No region_id, using static price', { carId: value?.id });
      this.dynamicPrice.set(null);
    }
  }

  get car(): Car {
    return this._car()!;
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

  @Input()
  set priority(value: boolean) {
    this._priority.set(value);
  }

  get priority(): boolean {
    return this._priority();
  }

  @Input()
  set urgentMode(value: boolean) {
    this._urgentMode.set(value);
    if (value && this.car) {
      void this.loadUrgentModeData();
    }
  }

  get urgentMode(): boolean {
    return this._urgentMode();
  }

  @Input()
  set mapVariant(value: boolean) {
    this._isMapVariant.set(value);
  }

  get mapVariant(): boolean {
    return this._isMapVariant();
  }

  readonly firstPhoto = computed(() => this._car()?.photos?.[0] ?? null);

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

    return { url, alt: car.title || `${car.brand || car.brand_name || ''} ${car.model || car.model_name || ''} ${car.year || ''}`.trim() || 'Auto' };
  });

  /**
   * Verifica si el auto tiene fotos reales (no placeholder)
   * Usado para mostrar badge "Sin foto" a owners
   */
  readonly hasRealPhotos = computed(() => {
    const car = this._car();
    if (!car) return false;

    const photos = car.photos || car.car_photos;
    return photos && photos.length > 0 && photos[0]?.url;
  });

  /**
   * Verifica si una URL es una imagen Base64
   * NgOptimizedImage no soporta Base64, así que debemos usar src normal
   */
  protected isBase64Image(url: string): boolean {
    return url.startsWith('data:image');
  }

  /**
   * Verifica si el auto tiene Instant Booking habilitado
   */
  readonly isOwnerVerified = computed(() => {
    const car = this._car();
    if (!car?.owner) return true; // Default to verified if no owner data (avoid false grey)
    return (
      car.owner.email_verified === true &&
      car.owner.id_verified === true
    );
  });

  readonly hasInstantBooking = computed(() => {
    const car = this._car();
    if (!car) return false;
    // Check for instant_booking_enabled which may come from extended car data
    return 'instant_booking_enabled' in car && car.instant_booking_enabled === true;
  });

  readonly topFeatures = computed(() => {
    const car = this._car();
    if (!car?.features) return [];

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

    const activeFeatures = Object.entries(car.features)
      .filter(([_, value]) => value === true)
      .map(([key]) => featureLabels[key] || key)
      .slice(0, 3);

    return activeFeatures;
  });

  ngOnInit(): void {
    if (this.car?.region_id) {
      void this.loadDynamicPrice();
      this.subscribeToRealtimePricing();
    }
    if (this._urgentMode()) {
      void this.loadUrgentModeData();
    }
  }

  ngOnDestroy(): void {
    this.unsubscribeRealtime?.();
  }

  private subscribeToRealtimePricing(): void {
    const car = this._car();
    if (!car || !car.region_id) return;

    this.unsubscribeRealtime = this.realtimePricing.subscribeToAllPricingUpdates({
      onExchangeRateUpdate: () => {
        void this.loadDynamicPrice();
      },
      onDemandUpdate: (regionId) => {
        if (regionId === car.region_id) {
          void this.loadDynamicPrice();
        }
      },
      onEventUpdate: () => {
        void this.loadDynamicPrice();
      },
    });
  }

  private async loadDynamicPrice(): Promise<void> {
    const car = this._car();

    this.logger.debug('💰 [CarCard] Loading dynamic price for:', {
      carId: car?.id,
      carTitle: car?.title,
      regionId: car?.region_id,
      staticPrice: car?.price_per_day,
    });

    if (!car || !car.region_id) {
      console.warn('⚠️ [CarCard] Cannot load dynamic price: missing car or region_id');
      return;
    }

    this.priceLoading.set(true);
    this.cdr.markForCheck();

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      this.logger.debug('🔍 [CarCard] Calling calculate_dynamic_price RPC with:', {
        regionId: car.region_id,
        userId,
      });

      const { data, error } = await this.supabase.rpc('calculate_dynamic_price', {
        p_region_id: car.region_id,
        p_user_id: userId,
        p_rental_start: new Date().toISOString(),
        p_rental_hours: 24,
      });

      if (error) {
        console.error('❌ [CarCard] RPC error:', error);
        throw error;
      }

      this.logger.debug('✅ [CarCard] RPC response:', data);

      if (data && data.total_price) {
        const dynamicPricePerDay = data.total_price;
        this.dynamicPrice.set(dynamicPricePerDay);
        this.logger.debug(
          `💰 [CarCard] Dynamic price set: $${dynamicPricePerDay} (was $${car.price_per_day})`,
        );

        if (data.surge_active || dynamicPricePerDay > car.price_per_day * 1.2) {
          this.priceSurgeIcon.set('🔥');
        }

        this.cdr.detectChanges();
      }
    } catch (_error) {
      console.error('❌ [CarCard] Error loading dynamic price:', _error);
    } finally {
      this.priceLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  private readonly notificationManager = inject(NotificationManagerService);

  onCompareToggle(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.compareDisabled || this.isComparing) {
      this.compareToggle.emit(this.car.id);
    } else {
      this.notificationManager.warning('Límite alcanzado', 'Solo puedes comparar hasta 3 autos');
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

  onToggleAvailability(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.toggleAvailability.emit({
      id: this.car.id,
      status: this.car.status,
    });
  }

  formatDistance(km: number): string {
    return this.urgentRentalService.formatDistance(km);
  }

  private async loadUrgentModeData(): Promise<void> {
    const car = this._car();
    if (!car || !car.region_id) return;

    try {
      // Cargar precio por hora
      const quote = await this.urgentRentalService.getUrgentQuote(car.id, car.region_id, 1);
      this.hourlyPrice.set(quote.hourlyRate);

      // Verificar disponibilidad inmediata
      const availability = await this.urgentRentalService.checkImmediateAvailability(car.id);
      this.urgentAvailability.set({
        available: availability.available,
        distance: availability.distance,
        eta: availability.eta,
      });

      this.cdr.markForCheck();
    } catch (_error) {
      console.error('Error loading urgent mode data:', _error);
    }
  }
}
