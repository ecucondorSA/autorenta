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

import { AdminService, VerificationStats } from '@core/services/admin.service';
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
  private readonly verificationStatsSignal = signal<VerificationStats | null>(null);
  private readonly loadingSignal = signal<boolean>(true);

  readonly pendingCars = computed(() => this.pendingCarsSignal());
  readonly bookings = computed(() => this.bookingsSignal());
  readonly verificationStats = computed(() => this.verificationStatsSignal());
  readonly loading = computed(() => this.loadingSignal());

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async approveCar(carId: string): Promise<void> {
    try {
      await this.adminService.approveCar(carId);
      await this.loadData();
    } catch (__error) { /* Silenced */ }
  }

  private async loadData(): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const [cars, bookings, verificationStats] = await Promise.all([
        this.adminService.listPendingCars(),
        this.adminService.listRecentBookings(),
        this.adminService.getVerificationStats(),
      ]);
      this.pendingCarsSignal.set(cars);
      this.bookingsSignal.set(bookings);
      this.verificationStatsSignal.set(verificationStats);
    } catch (__error) {
      this.pendingCarsSignal.set([]);
      this.bookingsSignal.set([]);
      this.verificationStatsSignal.set(null);
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
