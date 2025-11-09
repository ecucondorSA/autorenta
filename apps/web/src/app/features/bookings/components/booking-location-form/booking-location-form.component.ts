import { Component, Output, EventEmitter, Input, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

// Services
import { LocationService } from '../../../../core/services/location.service';
import { GeocodingService } from '../../../../core/services/geocoding.service';
import { DistanceCalculatorService } from '../../../../core/services/distance-calculator.service';

// Components
// LocationPickerComponent removed - not used in template

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
  ],
  templateUrl: './booking-location-form.component.html',
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
            address: results.fullAddress || address,
            city: results.placeName || 'Argentina',
            lat: results.latitude,
            lng: results.longitude,
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
            address: results.fullAddress || address,
            city: results.placeName || 'Argentina',
            lat: results.latitude,
            lng: results.longitude,
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
