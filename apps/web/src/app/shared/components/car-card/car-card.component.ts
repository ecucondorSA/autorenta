import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, Output, EventEmitter, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Car } from '../../../core/models';
import { MoneyPipe } from '../../pipes/money.pipe';
import { getCarPlaceholderImage } from '../../utils/car-placeholder-images';

@Component({
  selector: 'app-car-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MoneyPipe],
  templateUrl: './car-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarCardComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly _car = signal<Car | undefined>(undefined);
  private readonly _selected = signal<boolean>(false);
  private readonly _distance = signal<string | undefined>(undefined);
  private readonly _isComparing = signal<boolean>(false);
  private readonly _compareDisabled = signal<boolean>(false);

  @Output() compareToggle = new EventEmitter<string>();
  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();

  private readonly _showOwnerActions = signal<boolean>(false);

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

    const photo = car.photos?.[0];
    if (photo) {
      return { url: photo.url, alt: car.title };
    }

    // Use placeholder image based on car ID
    return getCarPlaceholderImage(car.id);
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
