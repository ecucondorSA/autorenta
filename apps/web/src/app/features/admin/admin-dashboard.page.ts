import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AdminService } from '../../core/services/admin.service';
import { CarsService } from '../../core/services/cars.service';
import { ProfileService } from '../../core/services/profile.service';
import { Car } from '../../core/models';
import { injectSupabase } from '../../core/services/supabase-client.service';
import { DatabaseExportService } from '../../core/services/database-export.service';
import { CarCardComponent } from '../../shared/components/car-card/car-card.component';

interface DatabaseStats {
  totalProfiles: number;
  totalCars: number;
  activeCars: number;
  pendingCars: number;
  totalPhotos: number;
  totalBookings: number;
  totalPayments: number;
}

@Component({
  standalone: true,
  selector: 'app-admin-dashboard-page',
  imports: [CommonModule, CarCardComponent, TranslateModule],
  templateUrl: './admin-dashboard.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage implements OnInit {
  private readonly supabase = injectSupabase();

  readonly pendingCars = signal<Car[]>([]);
  readonly stats = signal<DatabaseStats>({
    totalProfiles: 0,
    totalCars: 0,
    activeCars: 0,
    pendingCars: 0,
    totalPhotos: 0,
    totalBookings: 0,
    totalPayments: 0,
  });
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly exporting = signal(false);
  readonly exportMessage = signal<string | null>(null);

  constructor(
    private readonly adminService: AdminService,
    private readonly carsService: CarsService,
    private readonly profileService: ProfileService,
    private readonly databaseExportService: DatabaseExportService,
  ) {}

  ngOnInit(): void {
    void this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    this.loading.set(true);
    try {
      // Load statistics in parallel
      const [cars, profiles, photos, bookings, payments] = await Promise.all([
        this.carsService.listPendingCars(),
        this.getAllProfiles(),
        this.getPhotoCount(),
        this.getBookingCount(),
        this.getPaymentCount(),
      ]);

      const allCars = await this.getAllCars();
      const activeCars = allCars.filter((c) => c.status === 'active');

      this.pendingCars.set(cars);
      this.stats.set({
        totalProfiles: profiles,
        totalCars: allCars.length,
        activeCars: activeCars.length,
        pendingCars: cars.length,
        totalPhotos: photos,
        totalBookings: bookings,
        totalPayments: payments,
      });
    } catch (err) {
      console.error(err);
      this.message.set('No pudimos cargar las estadísticas.');
    } finally {
      this.loading.set(false);
    }
  }

  private async getAllProfiles(): Promise<number> {
    const { count } = await this.supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    return count ?? 0;
  }

  private async getAllCars(): Promise<Car[]> {
    const { data } = await this.supabase.from('cars').select('*');
    return (data ?? []) as Car[];
  }

  private async getPhotoCount(): Promise<number> {
    const { count } = await this.supabase
      .from('car_photos')
      .select('*', { count: 'exact', head: true });
    return count ?? 0;
  }

  private async getBookingCount(): Promise<number> {
    const { count } = await this.supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });
    return count ?? 0;
  }

  private async getPaymentCount(): Promise<number> {
    const { count } = await this.supabase
      .from('payments')
      .select('*', { count: 'exact', head: true });
    return count ?? 0;
  }

  async approve(car: Car): Promise<void> {
    try {
      await this.adminService.approveCar(car.id);
      this.message.set(`Auto ${car.title} aprobado.`);
      await this.loadDashboardData();
    } catch (err) {
      console.error(err);
      this.message.set('Fallo al aprobar el auto.');
    }
  }

  async exportSnapshot(): Promise<void> {
    if (this.exporting()) {
      return;
    }

    this.exporting.set(true);
    this.exportMessage.set(null);

    try {
      const { blob, filename } = await this.databaseExportService.exportSnapshot();
      this.triggerDownload(blob, filename);
      this.exportMessage.set(`Exportación generada (${filename}).`);
    } catch (err: unknown) {
      console.error(err);
      this.exportMessage.set(err instanceof Error ? err.message : 'No pudimos exportar la base de datos.');
    } finally {
      this.exporting.set(false);
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    if (typeof document === 'undefined') {
      throw new Error('La exportación requiere un navegador.');
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
}
