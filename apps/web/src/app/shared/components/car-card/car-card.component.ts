import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';
import { RealtimePricingService } from '@core/services/payments/realtime-pricing.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { CarPricingService } from '@core/services/cars/car-pricing.service';
import type { Car } from '@core/models';
import { CarCardViewComponent } from './car-card-view.component';

@Component({
  selector: 'app-car-card',
  standalone: true,
  imports: [CarCardViewComponent],
  templateUrl: './car-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarCardComponent implements OnDestroy {
  private readonly logger = inject(LoggerService).createChildLogger('CarCardComponent');
  private readonly carPricing = inject(CarPricingService);
  private readonly realtimePricing = inject(RealtimePricingService);

  private unsubscribeRealtime?: () => void;
  private priceRequestId = 0;

  private readonly _car = signal<Car | undefined>(undefined);
  private readonly _selected = signal<boolean>(false);
  private readonly _distance = signal<string | undefined>(undefined);
  private readonly _isComparing = signal<boolean>(false);
  private readonly _compareDisabled = signal<boolean>(false);
  private readonly _showOwnerActions = signal<boolean>(false);
  private readonly _priority = signal<boolean>(false);
  private readonly _urgentMode = signal<boolean>(false);
  private readonly _isMapVariant = signal<boolean>(false);

  @Output() compareToggle = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  @Output() toggleAvailability = new EventEmitter<{ id: string; status: string }>();

  readonly priceUsd = signal<number | null>(null);
  readonly priceLoading = signal<boolean>(false);

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
    this.ensureRealtimeSubscription();
    void this.refreshPrice();
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

  carValue(): Car | undefined {
    return this._car();
  }

  ngOnDestroy(): void {
    this.unsubscribeRealtime?.();
  }

  private ensureRealtimeSubscription(): void {
    if (this.unsubscribeRealtime) return;

    this.unsubscribeRealtime = this.realtimePricing.subscribeToAllPricingUpdates({
      onExchangeRateUpdate: () => {
        void this.refreshPrice();
      },
      onDemandUpdate: (regionId) => {
        const car = this._car();
        if (!car) return;
        if (regionId === car.region_id) {
          void this.refreshPrice();
        }
      },
      onEventUpdate: () => {
        void this.refreshPrice();
      },
    });
  }

  private async refreshPrice(): Promise<void> {
    const car = this._car();
    if (!car) return;

    const requestId = ++this.priceRequestId;
    this.priceLoading.set(true);

    try {
      const quote = await this.carPricing.getDynamicDailyPriceUsd(car, { rentalHours: 24 });
      if (requestId !== this.priceRequestId) return;

      if (quote?.priceUsd) {
        this.priceUsd.set(quote.priceUsd);
        return;
      }

      // Fallback: static price converted to USD.
      this.priceUsd.set(this.carPricing.getStaticDailyPriceUsd(car));
    } catch (error: unknown) {
      if (requestId !== this.priceRequestId) return;
      this.logger.debug('Failed to refresh card price', 'CarCardComponent', { carId: car.id, error });
      this.priceUsd.set(this.carPricing.getStaticDailyPriceUsd(car));
    } finally {
      if (requestId === this.priceRequestId) this.priceLoading.set(false);
    }
  }
}
