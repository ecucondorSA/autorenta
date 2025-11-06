import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { AdminService } from '@core/services/admin.service';
import { Car, Booking } from '@core/models';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'autorenta-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MoneyPipe, TranslateModule],
  templateUrl: './admin-dashboard.page.html',
  styleUrl: './admin-dashboard.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage implements OnInit {
  private readonly adminService = inject(AdminService);

  private readonly pendingCarsSignal = signal<Car[]>([]);
  private readonly bookingsSignal = signal<Booking[]>([]);
  private readonly loadingSignal = signal<boolean>(true);

  readonly pendingCars = computed(() => this.pendingCarsSignal());
  readonly bookings = computed(() => this.bookingsSignal());
  readonly loading = computed(() => this.loadingSignal());

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async approveCar(carId: string): Promise<void> {
    try {
      await this.adminService.approveCar(carId);
      await this.loadData();
    } catch (error) { /* Silenced */ }
  }

  private async loadData(): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const [cars, bookings] = await Promise.all([
        this.adminService.listPendingCars(),
        this.adminService.listRecentBookings(),
      ]);
      this.pendingCarsSignal.set(cars);
      this.bookingsSignal.set(bookings);
    } catch (error) {
      this.pendingCarsSignal.set([]);
      this.bookingsSignal.set([]);
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
