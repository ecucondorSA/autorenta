import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, Output, EventEmitter, computed, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Car } from '../../../core/models';
import { MoneyPipe } from '../../pipes/money.pipe';
import { getCarImageUrl } from '../../utils/car-placeholder.util';
import { DynamicPricingService } from '../../../core/services/dynamic-pricing.service';

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
    this._car.set(value);
    // Load dynamic price when car changes
    if (value?.region_id) {
      void this.loadDynamicPrice();
    }
  }

  get car(): Car {
    return this._car()!;
  }

  ngOnInit(): void {
    // Load dynamic price on init if car already set
    if (this.car?.region_id) {
      void this.loadDynamicPrice();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private async loadDynamicPrice(): Promise<void> {
    const car = this._car();
    if (!car || !car.region_id) {
      return;
    }

    this.priceLoading.set(true);
    this.cdr.markForCheck();

    try {
      const priceData = await this.pricingService.getQuickPrice(car.id, car.region_id);
      
      if (priceData) {
        this.dynamicPrice.set(priceData.price_per_day);
        
        // Set surge icon if applicable
        if (priceData.surge_active && priceData.surge_icon) {
          this.priceSurgeIcon.set(priceData.surge_icon);
        }
        
        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('Failed to load dynamic price for car:', car.id, error);
      // Fallback: dynamicPrice stays null, displayPrice uses car.price_per_day
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
