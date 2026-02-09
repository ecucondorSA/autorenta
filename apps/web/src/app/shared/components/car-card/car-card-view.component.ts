import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Car } from '@core/models';
import { getCarImageUrl } from '../../utils/car-placeholder.util';

@Component({
  selector: 'app-car-card-view',
  standalone: true,
  imports: [CommonModule, RouterLink, NgOptimizedImage],
  templateUrl: './car-card-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarCardViewComponent {
  protected readonly Math = Math;

  private readonly _car = signal<Car | undefined>(undefined);
  private readonly _selected = signal<boolean>(false);
  private readonly _distance = signal<string | undefined>(undefined);
  private readonly _isComparing = signal<boolean>(false);
  private readonly _compareDisabled = signal<boolean>(false);
  private readonly _showOwnerActions = signal<boolean>(false);
  protected readonly _priority = signal<boolean>(false);
  private readonly _urgentMode = signal<boolean>(false);
  private readonly _isMapVariant = signal<boolean>(false);

  private readonly _priceUsd = signal<number | null>(null);
  private readonly _priceLoading = signal<boolean>(false);

  @Output() compareToggle = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  @Output() toggleAvailability = new EventEmitter<{ id: string; status: string }>();

  @Input({ required: true })
  set car(value: Car) {
    this._car.set(value);
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
  set showOwnerActions(value: boolean) {
    this._showOwnerActions.set(value);
  }

  get showOwnerActions(): boolean {
    return this._showOwnerActions();
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

  @Input()
  set priceUsd(value: number | null) {
    this._priceUsd.set(value);
  }

  get priceUsd(): number | null {
    return this._priceUsd();
  }

  @Input()
  set priceLoading(value: boolean) {
    this._priceLoading.set(value);
  }

  get priceLoading(): boolean {
    return this._priceLoading();
  }

  readonly displayPrice = computed(() => this._priceUsd() ?? 0);

  readonly hasValidPrice = computed(() => {
    const price = this._priceUsd();
    return typeof price === 'number' && Number.isFinite(price) && price > 0;
  });

  readonly displayTitle = computed(() => {
    const car = this._car();
    if (!car) return 'Próximamente';
    if (car.title && car.title.trim().length > 0) return car.title.trim();

    const parts = [car.brand || car.brand_name || '', car.model || car.model_name || '', car.year || '']
      .map((p) => String(p).trim())
      .filter(Boolean);

    const fallback = parts.join(' ').trim();
    return fallback || 'Próximamente';
  });

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

    const alt =
      car.title ||
      `${car.brand || car.brand_name || ''} ${car.model || car.model_name || ''} ${car.year || ''}`.trim() ||
      'Auto';

    return { url, alt };
  });

  /**
   * NgOptimizedImage does not support data: URLs. Fallback to plain <img>.
   */
  protected isBase64Image(url: string): boolean {
    return url.startsWith('data:image');
  }

  readonly isOwnerVerified = computed(() => {
    const car = this._car();
    if (!car?.owner) return true; // Avoid false grey when owner payload isn't present.
    // Product policy: pending is only about missing identity/documents (level 2).
    return car.owner.id_verified === true;
  });

  readonly isCarActive = computed(() => {
    const car = this._car();
    // If status is missing in older payloads, assume active.
    return !car?.status || car.status === 'active';
  });

  // "Selectable" means: renters can open and act on it (book/flow).
  readonly isSelectableForRenter = computed(() => this.isCarActive() && this.isOwnerVerified());

  readonly navigationEnabled = computed(() => {
    // Owner views should remain navigable even if the car is pending verification.
    if (this._showOwnerActions()) return true;
    return this.isSelectableForRenter();
  });

  onCardClick(event: MouseEvent): void {
    if (this.navigationEnabled()) return;
    event.preventDefault();
    event.stopPropagation();
  }

  readonly hasInstantBooking = computed(() => {
    const car = this._car();
    if (!car) return false;
    return 'instant_booking_enabled' in car && car.instant_booking_enabled === true;
  });

  readonly ownerAvailabilityActionLabel = computed(() => {
    const car = this._car();
    const status = car?.status;

    if (status === 'pending') return 'Verificar';
    if (status === 'active' || !status) return 'Pausar';
    return 'Activar';
  });

  onCompareToggle(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.compareToggle.emit(this.car.id);
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
    this.toggleAvailability.emit({ id: this.car.id, status: this.car.status ?? 'active' });
  }
}
