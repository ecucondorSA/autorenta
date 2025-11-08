import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UrgentRentalService } from '../../../core/services/urgent-rental.service';
import { ToastService } from '../../../core/services/toast.service';
import { CarsService } from '../../../core/services/cars.service';
import type { Car } from '../../../core/models';

@Component({
  selector: 'app-urgent-booking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Alquiler Urgente</h1>
        <p class="mt-2 text-sm text-gray-600">
          Reserva un auto disponible inmediatamente cerca de tu ubicación.
        </p>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      } @else if (car(); as c) {
        <div class="space-y-6">
          <!-- Información del auto -->
          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 class="mb-4 text-xl font-semibold text-gray-900">{{ c.brand }} {{ c.model }}</h2>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-gray-600">Año</p>
                <p class="font-medium text-gray-900">{{ c.year }}</p>
              </div>
              <div>
                <p class="text-gray-600">Precio por hora</p>
                <p class="font-medium text-gray-900">${{ quote()?.hourlyRate | number: '1.2-2' || '...' }}</p>
              </div>
            </div>
          </div>

          <!-- Disponibilidad -->
          @if (availability(); as a) {
            <div
              class="rounded-lg border p-4"
              [class.bg-green-50]="a.available"
              [class.bg-red-50]="!a.available"
            >
              @if (a.available) {
                <div class="flex items-center gap-2">
                  <svg class="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <div>
                    <p class="font-medium text-green-800">Disponible ahora</p>
                    @if (a.distance) {
                      <p class="text-sm text-green-700">
                        A {{ a.distance | number: '1.1-1' }} km de tu ubicación
                      </p>
                    }
                    @if (a.eta) {
                      <p class="text-sm text-green-700">ETA: {{ a.eta }} minutos</p>
                    }
                  </div>
                </div>
              } @else {
                <p class="text-red-800">{{ a.reason || 'No disponible' }}</p>
              }
            </div>
          }

          <!-- Configuración de alquiler -->
          <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 class="mb-4 text-lg font-semibold text-gray-900">Configuración</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Duración (horas)
                </label>
                <input
                  type="number"
                  [(ngModel)]="durationHours"
                  min="1"
                  max="24"
                  (change)="updateQuote()"
                  class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              <!-- Cotización -->
              @if (quote(); as q) {
                <div class="rounded-lg bg-blue-50 p-4">
                  <div class="mb-2 flex items-center justify-between">
                    <span class="text-sm font-medium text-blue-900">Total</span>
                    <span class="text-xl font-bold text-blue-900">
                      ${{ q.totalPrice | number: '1.2-2' }}
                    </span>
                  </div>
                  @if (q.surgeFactor && q.surgeFactor > 1) {
                    <p class="text-xs text-blue-700">
                      Incluye recargo por demanda: {{ (q.surgeFactor - 1) * 100 | number: '1.0-0' }}%
                    </p>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Botón de confirmación -->
          <button
            (click)="createBooking()"
            [disabled]="!canCreateBooking() || creating()"
            class="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            @if (creating()) {
              <span class="flex items-center justify-center gap-2">
                <span class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Creando reserva...
              </span>
            } @else {
              Confirmar Alquiler Urgente
            }
          </button>

          @if (error()) {
            <div class="rounded-lg bg-red-50 p-4 text-red-800">
              {{ error() }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class UrgentBookingPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly urgentRentalService = inject(UrgentRentalService);
  private readonly carsService = inject(CarsService);
  private readonly toastService = inject(ToastService);

  readonly car = signal<Car | null>(null);
  readonly availability = signal<any>(null);
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

    await Promise.all([
      this.loadCar(),
      this.loadAvailability(),
      this.loadUserLocation(),
    ]);
    await this.updateQuote();
  }

  async loadCar(): Promise<void> {
    this.loading.set(true);

    try {
      const car = await this.carsService.getCarById(this.carId);
      this.car.set(car);
    } catch (err) {
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
        this.toastService.success('Reserva urgente creada correctamente');
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

