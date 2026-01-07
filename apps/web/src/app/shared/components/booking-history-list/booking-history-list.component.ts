import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingsService } from '@core/services/bookings/bookings.service';
import type { Booking } from '../../../core/models';

/**
 * BookingHistoryListComponent
 *
 * Displays user's recent booking history in a compact list format.
 * Used in the profile dashboard to show trip history at a glance.
 *
 * @example
 * ```html
 * <app-booking-history-list [limit]="5" [showViewMore]="true" />
 * ```
 */
@Component({
  selector: 'app-booking-history-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-white rounded-xl border border-border-default shadow-sm">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-border-default flex items-center justify-between">
        <h3 class="font-bold text-text-primary flex items-center gap-2">
          <svg class="w-5 h-5 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Historial de Viajes
        </h3>
        @if (showViewMore && totalCount() > limit) {
          <a routerLink="/bookings" class="text-xs text-cta-default hover:underline font-medium">
            Ver todos ({{ totalCount() }})
          </a>
        }
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="p-4 space-y-3">
          @for (i of [1, 2, 3]; track i) {
            <div class="animate-pulse flex items-center gap-3">
              <div class="w-16 h-12 bg-surface-hover rounded-lg"></div>
              <div class="flex-1">
                <div class="h-4 bg-surface-hover rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-surface-hover rounded w-1/2"></div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && bookings().length === 0) {
        <div class="p-8 text-center">
          <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p class="text-sm text-text-secondary">
            No tienes viajes registrados
          </p>
          <a routerLink="/marketplace" class="text-xs text-cta-default hover:underline mt-2 inline-block">
            Explorar autos disponibles
          </a>
        </div>
      }

      <!-- Booking List -->
      @if (!loading() && bookings().length > 0) {
        <div class="divide-y divide-border-default">
          @for (booking of bookings(); track booking.id) {
            <div class="p-4 flex items-center gap-3 hover:bg-surface-hover/50 transition-colors">
              <!-- Car Image -->
              <div class="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                @if (getCarImage(booking)) {
                  <img
                    [src]="getCarImage(booking)"
                    [alt]="getCarTitle(booking)"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                } @else {
                  <div class="w-full h-full flex items-center justify-center">
                    <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10" />
                    </svg>
                  </div>
                }
              </div>

              <!-- Booking Info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm text-text-primary truncate">
                  {{ getCarTitle(booking) }}
                </p>
                <p class="text-xs text-text-secondary">
                  {{ formatDateRange(booking.start_at, booking.end_at) }}
                </p>
              </div>

              <!-- Status Badge & Action -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <span
                  class="text-xs font-bold px-2 py-0.5 rounded-full uppercase"
                  [ngClass]="getStatusClasses(booking.status)"
                >
                  {{ getStatusLabel(booking.status) }}
                </span>
                <a
                  [routerLink]="['/bookings', booking.id]"
                  class="text-xs bg-cta-default/10 text-cta-default px-3 py-1.5 rounded-full font-medium hover:bg-cta-default/20 transition-colors"
                >
                  Ver
                </a>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class BookingHistoryListComponent implements OnInit {
  private readonly bookingsService = inject(BookingsService);

  @Input() limit = 5;
  @Input() showViewMore = true;

  readonly loading = signal(true);
  readonly bookings = signal<Booking[]>([]);
  readonly totalCount = signal(0);

  readonly hasBookings = computed(() => this.bookings().length > 0);

  async ngOnInit(): Promise<void> {
    await this.loadBookings();
  }

  private async loadBookings(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.bookingsService.getMyBookings({
        limit: this.limit,
        offset: 0,
      });
      this.bookings.set(result.bookings);
      this.totalCount.set(result.total);
    } catch (error) {
      console.error('Error loading bookings:', error);
      this.bookings.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  getCarTitle(booking: Booking): string {
    if (booking.car) {
      return booking.car.title || `${booking.car.brand} ${booking.car.model}`;
    }
    return 'Auto';
  }

  getCarImage(booking: Booking): string | null {
    // Try multiple sources for car image
    return (
      booking.main_photo_url ||
      booking.car_image ||
      booking.car?.photos?.[0]?.url ||
      booking.car?.car_photos?.[0]?.url ||
      booking.car?.images?.[0] ||
      null
    );
  }

  formatDateRange(startAt: string, endAt: string): string {
    const start = new Date(startAt);
    const end = new Date(endAt);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('es-AR', options);
    const endStr = end.toLocaleDateString('es-AR', options);
    return `${startStr} - ${endStr}`;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      pending_payment: 'Pago Pendiente',
      confirmed: 'Confirmado',
      in_progress: 'En Curso',
      completed: 'Completado',
      cancelled: 'Cancelado',
      disputed: 'En Disputa',
    };
    return labels[status] || status;
  }

  getStatusClasses(status: string): Record<string, boolean> {
    return {
      'bg-yellow-100 text-yellow-800': status === 'pending' || status === 'pending_payment',
      'bg-blue-100 text-blue-800': status === 'confirmed',
      'bg-indigo-100 text-indigo-800': status === 'in_progress',
      'bg-green-100 text-green-800': status === 'completed',
      'bg-red-100 text-red-800': status === 'cancelled' || status === 'disputed',
    };
  }
}
