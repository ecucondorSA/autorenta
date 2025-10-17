import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
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

  readonly firstPhoto = computed(() => this._car()?.photos?.[0] ?? null);

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
