import {
  Component,
  inject,
  input,
  output,
  signal,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PublishCarLocationService, PublishCoordinates } from '../../services/publish-car-location.service';

export interface LocationAnswer {
  street: string;
  streetNumber: string;
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Location selection question
 * Features GPS auto-detect and manual address input
 */
@Component({
  selector: 'app-location-question',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- GPS Button -->
      <button
        type="button"
        (click)="useCurrentLocation()"
        [disabled]="isLoading()"
        class="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-cta-default to-cta-hover text-white font-semibold rounded-xl shadow-lg shadow-cta-default/30 hover:shadow-cta-default/50 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-wait"
      >
        @if (isLoading()) {
          <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ locationState() === 'acquiring' ? 'Obteniendo ubicación...' : 'Buscando dirección...' }}</span>
        } @else {
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Usar mi ubicación actual</span>
        }
      </button>

      <!-- Divider -->
      <div class="flex items-center gap-4">
        <div class="flex-1 h-px bg-border-default"></div>
        <span class="text-sm text-text-muted">o ingresá manualmente</span>
        <div class="flex-1 h-px bg-border-default"></div>
      </div>

      <!-- Manual address form -->
      <div class="space-y-4">
        <!-- Street -->
        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-text-secondary mb-1">Calle</label>
            <input
              type="text"
              [(ngModel)]="street"
              (ngModelChange)="onAddressChange()"
              placeholder="Av. Corrientes"
              class="w-full px-4 py-3 bg-surface-raised border border-border-default rounded-xl focus:ring-2 focus:ring-cta-default focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Número</label>
            <input
              type="text"
              [(ngModel)]="streetNumber"
              (ngModelChange)="onAddressChange()"
              placeholder="1234"
              class="w-full px-4 py-3 bg-surface-raised border border-border-default rounded-xl focus:ring-2 focus:ring-cta-default focus:border-transparent transition-all"
            />
          </div>
        </div>

        <!-- City and State -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Ciudad</label>
            <input
              type="text"
              [(ngModel)]="city"
              (ngModelChange)="onAddressChange()"
              placeholder="Buenos Aires"
              class="w-full px-4 py-3 bg-surface-raised border border-border-default rounded-xl focus:ring-2 focus:ring-cta-default focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">Provincia</label>
            <input
              type="text"
              [(ngModel)]="state"
              (ngModelChange)="onAddressChange()"
              placeholder="CABA"
              class="w-full px-4 py-3 bg-surface-raised border border-border-default rounded-xl focus:ring-2 focus:ring-cta-default focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      <!-- Location confirmed indicator -->
      @if (hasValidLocation()) {
        <div class="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm text-emerald-700 dark:text-emerald-400">Ubicación confirmada</p>
            <p class="font-semibold text-emerald-900 dark:text-emerald-200">
              {{ street }} {{ streetNumber }}, {{ city }}
            </p>
          </div>
        </div>
      }

      <!-- Privacy note -->
      <div class="flex items-start gap-3 p-4 bg-surface-secondary rounded-xl">
        <svg class="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-text-primary">Tu privacidad está protegida</p>
          <p class="text-xs text-text-muted mt-1">
            La dirección exacta solo se comparte con el arrendatario después de confirmar la reserva.
            En el listado solo mostramos la zona aproximada.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class LocationQuestionComponent implements OnInit {
  private readonly locationService = inject(PublishCarLocationService);

  readonly initialValue = input<LocationAnswer | null>(null);
  readonly locationChanged = output<LocationAnswer>();

  // Form fields
  street = '';
  streetNumber = '';
  city = '';
  state = '';
  country = 'AR';

  // State
  readonly isLoading = signal(false);
  readonly locationState = signal<'idle' | 'acquiring' | 'geocoding'>('idle');
  readonly coordinates = signal<PublishCoordinates | null>(null);

  ngOnInit(): void {
    const initial = this.initialValue();
    if (initial) {
      this.street = initial.street;
      this.streetNumber = initial.streetNumber;
      this.city = initial.city;
      this.state = initial.state;
      this.country = initial.country;
      if (initial.latitude && initial.longitude) {
        this.coordinates.set({ latitude: initial.latitude, longitude: initial.longitude });
      }
    }
  }

  async useCurrentLocation(): Promise<void> {
    this.isLoading.set(true);
    this.locationState.set('acquiring');

    try {
      const coords = await this.locationService.useCurrentLocation();

      if (coords) {
        this.coordinates.set(coords);
        this.locationState.set('geocoding');

        // Reverse geocode to get address
        const address = await this.locationService.reverseGeocode(coords.latitude, coords.longitude);

        if (address) {
          this.street = address.street;
          this.streetNumber = address.streetNumber;
          this.city = address.city;
          this.state = address.state;
          this.country = address.country || 'AR';
          this.emitLocation();
        }
      }
    } catch (error) {
      console.error('Location error:', error);
    } finally {
      this.isLoading.set(false);
      this.locationState.set('idle');
    }
  }

  onAddressChange(): void {
    // Clear coordinates when manually editing
    this.coordinates.set(null);
    this.emitLocation();
  }

  hasValidLocation(): boolean {
    return !!(this.street && this.city && this.state);
  }

  private emitLocation(): void {
    if (!this.hasValidLocation()) return;

    const coords = this.coordinates();
    const location: LocationAnswer = {
      street: this.street,
      streetNumber: this.streetNumber,
      city: this.city,
      state: this.state,
      country: this.country,
      ...(coords && { latitude: coords.latitude, longitude: coords.longitude }),
    };

    this.locationChanged.emit(location);
  }
}
