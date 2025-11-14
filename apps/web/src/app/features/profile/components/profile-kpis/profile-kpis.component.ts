import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-profile-kpis',
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-kpis.component.html',
  styleUrls: ['./profile-kpis.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileKpisComponent {
  availableBalance = input<number>(0);
  activeBookings = input<number>(0);
  publishedCars = input<number>(0);
  reviewsCount = input<number>(0);
  canPublishCars = input<boolean>(false);
  canBookCars = input<boolean>(false);

  walletClick = output<void>();
  bookingsClick = output<void>();
  carsClick = output<void>();
  reviewsClick = output<void>();

  readonly walletStatus = computed(() => {
    const balance = this.availableBalance();
    if (balance === 0) return 'empty';
    if (balance < 100) return 'low';
    return 'normal';
  });

  readonly bookingsStatus = computed(() => {
    const bookings = this.activeBookings();
    if (bookings === 0) return 'none';
    if (bookings > 3) return 'high';
    return 'normal';
  });

  readonly carsStatus = computed(() => {
    const cars = this.publishedCars();
    if (cars === 0) return 'none';
    if (cars >= 5) return 'high';
    return 'normal';
  });

  readonly reviewsStatus = computed(() => {
    const reviews = this.reviewsCount();
    if (reviews === 0) return 'none';
    if (reviews >= 10) return 'high';
    return 'normal';
  });
}
