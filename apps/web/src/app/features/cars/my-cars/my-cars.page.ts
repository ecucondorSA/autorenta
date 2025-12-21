import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { Car, CarStatus } from '../../../core/models';
import { AuthService } from '@core/services/auth/auth.service';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { CarsService } from '@core/services/cars/cars.service';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';
import { MpOnboardingModalComponent } from '../../../shared/components/mp-onboarding-modal/mp-onboarding-modal.component';

import { BonusProgress } from '@core/models/organization.model';
import { OrganizationService, Organization } from '../../organizations/services/organization.service';

@Component({
  standalone: true,
  selector: 'app-my-cars-page',
  imports: [CommonModule, CarCardComponent, TranslateModule],
  templateUrl: './my-cars.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyCarsPage {
  private readonly carsService = inject(CarsService);
  private readonly orgService = inject(OrganizationService);
  private readonly bookingsService = inject(BookingsService);
  private readonly authService = inject(AuthService);
  private readonly modalCtrl = inject(ModalController);
  private readonly router = inject(Router);

  readonly cars = signal<Car[]>([]);
  readonly organizations = signal<Organization[]>([]);
  readonly bonuses = signal<BonusProgress[]>([]);
  readonly loading = signal(false);

  // Owner penalties
  readonly ownerPenalties = signal<{
    visibilityPenaltyUntil: string | null;
    visibilityFactor: number;
    cancellationCount90d: number;
    isSuspended: boolean;
  } | null>(null);

  readonly hasPenalty = computed(() => {
    const penalties = this.ownerPenalties();
    return penalties && (penalties.visibilityFactor < 1 || penalties.isSuspended);
  });

  readonly penaltyMessage = computed(() => {
    const penalties = this.ownerPenalties();
    if (!penalties) return null;

    if (penalties.isSuspended) {
      return 'Tu cuenta está suspendida temporalmente por cancelaciones frecuentes.';
    }

    if (penalties.visibilityFactor < 1) {
      const reduction = Math.round((1 - penalties.visibilityFactor) * 100);
      const until = penalties.visibilityPenaltyUntil
        ? new Date(penalties.visibilityPenaltyUntil).toLocaleDateString('es-AR')
        : 'próximamente';
      return `Visibilidad reducida ${reduction}% hasta ${until} por cancelaciones recientes.`;
    }

    return null;
  });

  constructor() {
    this.loading.set(true);
    Promise.all([
      this.carsService.listMyCars(),
      this.orgService.getMyOrganizations(),
      this.bookingsService.getOwnerPenalties(),
    ]).then(async ([cars, orgs, penalties]) => {
      this.cars.set(cars);
      this.organizations.set(orgs);
      this.ownerPenalties.set(penalties);

      // Fetch bonuses if org exists
      if (orgs.length > 0) {
        const bonuses = await this.orgService.getBonusesProgress(orgs[0].id);
        this.bonuses.set(bonuses);
      }

      this.loading.set(false);
    });
  }

  readonly countActive = computed(
    () => this.cars().filter((car) => car.status === 'active').length,
  );
  readonly countDraft = computed(() => this.cars().filter((car) => car.status === 'draft').length);

  async openPublishModal(carId?: string): Promise<void> {
    const queryParams = carId ? { edit: carId } : {};
    await this.router.navigate(['/cars/publish'], { queryParams });
  }

  async onEditCar(carId: string): Promise<void> {
    await this.router.navigate(['/cars/publish'], { queryParams: { edit: carId } });
  }

  async onDeleteCar(carId: string): Promise<void> {
    this.loading.set(true);
    try {
      const hasBookings = await this.carsService.hasActiveBookings(carId);
      if (hasBookings.hasActive) {
        return;
      }

      await this.carsService.deleteCar(carId);
      this.cars.set(this.cars().filter((car) => car.id !== carId));
    } catch {
      // Handle error
    } finally {
      this.loading.set(false);
    }
  }

  async onToggleAvailability(carId: string, currentStatus: string): Promise<void> {
    this.loading.set(true);
    try {
      const newStatus: CarStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await this.carsService.updateCarStatus(carId, newStatus);
      this.cars.update((cars) =>
        cars.map((car) => (car.id === carId ? { ...car, status: newStatus } : car)),
      );
    } catch {
      // Handle error
    } finally {
      this.loading.set(false);
    }
  }

  async openOnboardingModal(): Promise<void> {
    const user = await this.authService.getCurrentUser();
    if (!user) {
      alert('No pudimos identificar tu cuenta. Volvé a iniciar sesión e intentá nuevamente.');
      return;
    }

    const modal = await this.modalCtrl.create({
      component: MpOnboardingModalComponent,
      backdropDismiss: true,
    });

    await modal.present();
    await modal.onWillDismiss();

    // Recargar lista de autos para actualizar estados
    this.loading.set(true);
    this.carsService.listMyCars().then((cars) => {
      this.cars.set(cars);
      this.loading.set(false);
    });
  }
}
