import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Car } from '../../../core/models';
import { MoneyPipe } from '../../pipes/money.pipe';

@Component({
  selector: 'app-car-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MoneyPipe],
  templateUrl: './car-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarCardComponent {
  private readonly _car = signal<Car | undefined>(undefined);

  @Input({ required: true })
  set car(value: Car) {
    this._car.set(value);
  }

  get car(): Car {
    return this._car()!;
  }

  readonly firstPhoto = computed(() => this._car()?.photos?.[0] ?? null);
}
