import { Component, Output, EventEmitter, Input, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

// Services
import { LocationService } from '../../../../core/services/location.service';
import { GeocodingService } from '../../../../core/services/geocoding.service';
import { DistanceCalculatorService } from '../../../../core/services/distance-calculator.service';

// Components
import { LocationPickerComponent } from '../../../../shared/components/location-picker/location-picker.component';

/**
 * Location selection result for booking
 */
export interface BookingLocationData {
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress?: string;
  deliveryRequired: boolean;
  distanceKm: number;
  deliveryFeeCents: number;
  distanceTier: 'local' | 'regional' | 'long_distance';
}

/**
 * Booking Location Form Component
 * Allows users to select pickup/dropoff locations and delivery preference
 * Calculates distance and delivery fees in real-time
 */
@Component({
  selector: 'app-booking-location-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    LocationPickerComponent,
  ],
  template: `
    <div class="booking-location-form bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          ¿Dónde es el retiro y devolución del auto?
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          Selecciona ubicaciones para calcular la tarifa de delivery si es necesario
        </p>
      </div>

      <!-- Pickup Location -->
      <div class="mb-8">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📍 Lugar de retiro
        </h3>
        <div class="location-input-group">
          <!-- Address Input -->
          <input
            type="text"
            [(ngModel)]="pickupAddress"
            placeholder="Ej: Av. Corrientes 1234, Buenos Aires"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            (input)="onPickupAddressChange()"
            [disabled]="loading()"
          />
          @if (pickupSuggestions().length > 0) {
            <div class="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              @for (suggestion of pickupSuggestions(); track suggestion.address) {
                <button
                  type="button"
                  (click)="selectPickupSuggestion(suggestion)"
                  class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  <div class="font-medium text-gray-900 dark:text-white">{{ suggestion.address }}</div>
                  <div class="text-sm text-gray-500">{{ suggestion.city }}</div>
                </button>
              }
            </div>
          }
          @if (pickupCoordinates()) {
            <div class="mt-2 text-sm text-green-600 dark:text-green-400">
              ✓ Ubicación: {{ pickupCoordinates()!.lat.toFixed(4) }}, {{ pickupCoordinates()!.lng.toFixed(4) }}
            </div>
          }
        </div>
      </div>

      <!-- Dropoff Location -->
      <div class="mb-8">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📍 Lugar de devolución
        </h3>
        <div class="location-input-group">
          <!-- Address Input -->
          <input
            type="text"
            [(ngModel)]="dropoffAddress"
            placeholder="Ej: Av. Rivadavia 5678, Buenos Aires"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            (input)="onDropoffAddressChange()"
            [disabled]="loading()"
          />
          @if (dropoffSuggestions().length > 0) {
            <div class="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              @for (suggestion of dropoffSuggestions(); track suggestion.address) {
                <button
                  type="button"
                  (click)="selectDropoffSuggestion(suggestion)"
                  class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  <div class="font-medium text-gray-900 dark:text-white">{{ suggestion.address }}</div>
                  <div class="text-sm text-gray-500">{{ suggestion.city }}</div>
                </button>
              }
            </div>
          }
          @if (dropoffCoordinates()) {
            <div class="mt-2 text-sm text-green-600 dark:text-green-400">
              ✓ Ubicación: {{ dropoffCoordinates()!.lat.toFixed(4) }}, {{ dropoffCoordinates()!.lng.toFixed(4) }}
            </div>
          }
        </div>
      </div>

      <!-- Distance Display -->
      @if (distanceKm() !== null) {
        <div class="mb-8 p-4 bg-sky-50 dark:bg-sky-700 rounded-lg border border-sky-200 dark:border-sky-700">
          <div class="text-lg font-semibold text-sky-700 dark:text-sky-100">
            Distancia: {{ distanceKm()! | number: '1.0-2' }} km
          </div>
          <div class="text-sm text-sky-700 dark:text-sky-300">
            Categoría: {{ distanceTier() === 'local' ? 'Local' : distanceTier() === 'regional' ? 'Regional' : 'Larga distancia' }}
          </div>
        </div>
      }

      <!-- Delivery Toggle -->
      <div class="mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <label class="flex items-center cursor-pointer">
          <input
            type="checkbox"
            [(ngModel)]="deliveryRequired"
            (change)="onDeliveryToggle()"
            [disabled]="loading() || !isWithinDeliveryRange()"
            class="w-5 h-5 text-sky-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <div class="ml-3 flex-1">
            <div class="font-semibold text-gray-900 dark:text-white">
              ¿Necesitas delivery del auto?
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              Entrega del auto en tu ubicación de retiro
            </div>
            @if (!isWithinDeliveryRange()) {
              <div class="text-xs text-orange-600 dark:text-orange-400 mt-1">
                ⚠️ La distancia excede el rango de delivery (máx. 50 km)
              </div>
            }
          </div>
        </label>

        <!-- Delivery Fee Display -->
        @if (deliveryRequired && deliveryFeeCents() > 0) {
          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              Tarifa de delivery: ARS ${{ (deliveryFeeCents() / 100) | number: '1.2-2' }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Se agregará al precio total del alquiler
            </div>
          </div>
        }
      </div>

      <!-- Error Messages -->
      @if (errorMessage()) {
        <div class="mb-6 p-4 bg-red-50 dark:bg-red-900 rounded-lg border border-red-200 dark:border-red-700">
          <div class="text-red-700 dark:text-red-100">{{ errorMessage() }}</div>
        </div>
      }

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button
          type="button"
          (click)="onCancel()"
          [disabled]="loading()"
          class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 font-semibold"
        >
          Cancelar
        </button>
        <button
          type="button"
          (click)="onSubmit()"
          [disabled]="loading() || !isValid()"
          class="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
        >
          @if (loading()) {
            <span class="inline-block animate-spin">⏳</span>
          }
          Continuar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .booking-location-form {
      max-width: 600px;
      margin: 0 auto;
    }

    .location-input-group {
      position: relative;
    }
  `],
})
export class BookingLocationFormComponent {
  private readonly locationService = inject(LocationService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly distanceCalculator = inject(DistanceCalculatorService);

  @Input() carOwnerLat?: number;
  @Input() carOwnerLng?: number;
  @Input() carOwnerAddress?: string;

  @Output() locationSelected = new EventEmitter<BookingLocationData>();
  @Output() cancelled = new EventEmitter<void>();

  // State
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  // Pickup location
  pickupAddress = signal('');
  pickupCoordinates = signal<{ lat: number; lng: number } | null>(null);
  pickupSuggestions = signal<Array<{ address: string; city: string; lat: number; lng: number }>>([]);

  // Dropoff location
  dropoffAddress = signal('');
  dropoffCoordinates = signal<{ lat: number; lng: number } | null>(null);
  dropoffSuggestions = signal<Array<{ address: string; city: string; lat: number; lng: number }>>([]);

  // Delivery
  deliveryRequired = signal(false);

  // Calculated values
  distanceKm = signal<number | null>(null);
  deliveryFeeCents = signal(0);
  distanceTier = signal<'local' | 'regional' | 'long_distance'>('local');

  constructor() {
    // Initialize pickup location with user's home location
    this.initializePickupLocation();

    // Watch for changes to calculate distance
    effect(() => {
      const pickup = this.pickupCoordinates();
      const dropoff = this.dropoffCoordinates();
      if (pickup && dropoff) {
        this.calculateDistance(pickup, dropoff);
      }
    });
  }

  /**
   * Initialize pickup location with user's home location
   */
  private async initializePickupLocation(): Promise<void> {
    try {
      const userLocation = await this.locationService.getUserLocation();
      if (userLocation) {
        this.pickupCoordinates.set({
          lat: userLocation.lat,
          lng: userLocation.lng,
        });
        this.pickupAddress.set(userLocation.address || '');
      }
    } catch (error) {
      console.warn('Could not get user location:', error);
    }
  }

  /**
   * Handle pickup address change
   */
  async onPickupAddressChange(): Promise<void> {
    const address = this.pickupAddress();
    if (!address || address.length < 3) {
      this.pickupSuggestions.set([]);
      return;
    }

    this.loading.set(true);
    try {
      // Use geocoding service to get suggestions
      const results = await this.geocodingService.geocodeAddress(address, 'AR');
      if (results) {
        this.pickupSuggestions.set([
          {
            address: results.address || address,
            city: results.city || 'Argentina',
            lat: results.lat,
            lng: results.lng,
          },
        ]);
      }
    } catch (error) {
      console.warn('Geocoding error:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Handle dropoff address change
   */
  async onDropoffAddressChange(): Promise<void> {
    const address = this.dropoffAddress();
    if (!address || address.length < 3) {
      this.dropoffSuggestions.set([]);
      return;
    }

    this.loading.set(true);
    try {
      const results = await this.geocodingService.geocodeAddress(address, 'AR');
      if (results) {
        this.dropoffSuggestions.set([
          {
            address: results.address || address,
            city: results.city || 'Argentina',
            lat: results.lat,
            lng: results.lng,
          },
        ]);
      }
    } catch (error) {
      console.warn('Geocoding error:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Select pickup suggestion
   */
  selectPickupSuggestion(suggestion: { address: string; city: string; lat: number; lng: number }): void {
    this.pickupAddress.set(suggestion.address);
    this.pickupCoordinates.set({ lat: suggestion.lat, lng: suggestion.lng });
    this.pickupSuggestions.set([]);
  }

  /**
   * Select dropoff suggestion
   */
  selectDropoffSuggestion(suggestion: { address: string; city: string; lat: number; lng: number }): void {
    this.dropoffAddress.set(suggestion.address);
    this.dropoffCoordinates.set({ lat: suggestion.lat, lng: suggestion.lng });
    this.dropoffSuggestions.set([]);
  }

  /**
   * Calculate distance between pickup and dropoff
   */
  private calculateDistance(
    pickup: { lat: number; lng: number },
    dropoff: { lat: number; lng: number }
  ): void {
    try {
      const distance = this.distanceCalculator.calculateDistance(
        pickup.lat,
        pickup.lng,
        dropoff.lat,
        dropoff.lng
      );

      this.distanceKm.set(distance);

      const tier = this.distanceCalculator.getDistanceTier(distance);
      this.distanceTier.set(tier);

      const deliveryFee = this.distanceCalculator.calculateDeliveryFee(distance);
      this.deliveryFeeCents.set(deliveryFee);

      this.errorMessage.set(null);
    } catch (error) {
      console.error('Distance calculation error:', error);
      this.errorMessage.set('Error al calcular la distancia');
    }
  }

  /**
   * Check if distance is within delivery range
   */
  isWithinDeliveryRange(): boolean {
    if (this.distanceKm() === null) return false;
    return this.distanceCalculator.isWithinDeliveryRange(this.distanceKm()!);
  }

  /**
   * Handle delivery toggle
   */
  onDeliveryToggle(): void {
    // Reset delivery fee if disabled
    if (!this.deliveryRequired()) {
      this.deliveryFeeCents.set(0);
    } else {
      // Recalculate delivery fee
      if (this.distanceKm() !== null) {
        const deliveryFee = this.distanceCalculator.calculateDeliveryFee(this.distanceKm()!);
        this.deliveryFeeCents.set(deliveryFee);
      }
    }
  }

  /**
   * Check if form is valid
   */
  isValid = computed(() => {
    return (
      this.pickupCoordinates() !== null &&
      this.dropoffCoordinates() !== null &&
      this.distanceKm() !== null &&
      (!this.deliveryRequired() || this.isWithinDeliveryRange())
    );
  });

  /**
   * Submit form
   */
  onSubmit(): void {
    if (!this.isValid()) {
      this.errorMessage.set('Por favor completa todos los campos requeridos');
      return;
    }

    const pickup = this.pickupCoordinates();
    const dropoff = this.dropoffCoordinates();

    if (!pickup || !dropoff) {
      this.errorMessage.set('Las ubicaciones son requeridas');
      return;
    }

    const locationData: BookingLocationData = {
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      pickupAddress: this.pickupAddress() || undefined,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng,
      dropoffAddress: this.dropoffAddress() || undefined,
      deliveryRequired: this.deliveryRequired(),
      distanceKm: this.distanceKm()!,
      deliveryFeeCents: this.deliveryFeeCents(),
      distanceTier: this.distanceTier(),
    };

    this.locationSelected.emit(locationData);
  }

  /**
   * Cancel
   */
  onCancel(): void {
    this.cancelled.emit();
  }
}
