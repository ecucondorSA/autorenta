import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
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
  private readonly _car = signal<Car | undefined>(undefined);
  private readonly _selected = signal<boolean>(false);
  private readonly _distanceKm = signal<number | null>(null);
  private readonly _isComparing = signal<boolean>(false);
  private readonly _compareDisabled = signal<boolean>(false);

  @Output() compareToggle = new EventEmitter<string>();

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
  set distanceKm(value: number | null) {
    this._distanceKm.set(value);
  }

  get distanceKm(): number | null {
    return this._distanceKm();
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
}
