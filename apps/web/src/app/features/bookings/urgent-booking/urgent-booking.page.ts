import { CommonModule } from '@angular/common';
import {Component, OnInit, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { Car } from '../../../core/models';
import { CarsService } from '@core/services/cars/cars.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { UrgentRentalService } from '@core/services/bookings/urgent-rental.service';

@Component({
  selector: 'app-urgent-booking',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './urgent-booking.page.html',
})
export class UrgentBookingPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly urgentRentalService = inject(UrgentRentalService);
  private readonly carsService = inject(CarsService);
  private readonly toastService = inject(NotificationManagerService);

  readonly car = signal<Car | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly availability = signal<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly quote = signal<any>(null);
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly error = signal<string | null>(null);

  durationHours = 5;
  carId = '';
  regionId = '';

  async ngOnInit(): Promise<void> {
    this.carId = this.route.snapshot.paramMap.get('carId') || '';
    this.regionId = this.route.snapshot.queryParamMap.get('regionId') || '';

    if (!this.carId) {
      this.error.set('ID de auto no proporcionado');
      return;
    }

    await Promise.all([this.loadCar(), this.loadAvailability(), this.loadUserLocation()]);
    await this.updateQuote();
  }

  async loadCar(): Promise<void> {
    this.loading.set(true);

    try {
      const car = await this.carsService.getCarById(this.carId);
      this.car.set(car);
    } catch {
      this.error.set('Error al cargar información del auto');
    } finally {
      this.loading.set(false);
    }
  }

  async loadAvailability(): Promise<void> {
    try {
      const availability = await this.urgentRentalService.checkImmediateAvailability(this.carId);
      this.availability.set(availability);
    } catch (err) {
      console.error('Error checking availability:', err);
    }
  }

  async loadUserLocation(): Promise<void> {
    try {
      await this.urgentRentalService.getCurrentLocation();
    } catch (err) {
      console.warn('No se pudo obtener ubicación del usuario:', err);
    }
  }

  async updateQuote(): Promise<void> {
    if (!this.regionId || !this.carId) return;

    try {
      const quote = await this.urgentRentalService.getUrgentQuote(
        this.carId,
        this.regionId,
        this.durationHours,
      );
      this.quote.set(quote);
    } catch (err) {
      console.error('Error getting quote:', err);
    }
  }

  canCreateBooking(): boolean {
    const avail = this.availability();
    return avail?.available === true && this.quote() !== null;
  }

  async createBooking(): Promise<void> {
    if (!this.canCreateBooking()) return;

    this.creating.set(true);
    this.error.set(null);

    try {
      const userLocation = this.urgentRentalService.userLocation();
      const result = await this.urgentRentalService.createUrgentBooking(
        this.carId,
        this.durationHours,
        userLocation || undefined,
      );

      if (result.success && result.bookingId) {
        this.toastService.success('Reserva urgente creada correctamente', '');
        await this.router.navigate(['/bookings', result.bookingId]);
      } else {
        this.error.set(result.error || 'Error al crear la reserva');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      this.creating.set(false);
    }
  }
}
