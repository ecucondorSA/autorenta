import { Component, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LocationService,
  LocationData,
  LocationChoice,
} from '../../../core/services/location.service';
import { GeocodingService } from '../../../core/services/geocoding.service';

/**
 * Location selection result
 */
export interface LocationSelection {
  lat: number;
  lng: number;
  address?: string;
  source: 'home' | 'gps' | 'address';
}

/**
 * Location picker component
 * Allows users to select their location from:
 * - Home location (saved in profile)
 * - Current GPS location
 * - Manual address search
 */
@Component({
  selector: 'app-location-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="location-picker">
      <div class="location-picker-header">
        <h3 class="text-lg font-semibold mb-2">¿Desde dónde querés buscar autos?</h3>
        <p class="text-sm text-text-secondary dark:text-text-secondary mb-4">
          Mostramos autos cercanos a tu ubicación con mejores precios
        </p>
      </div>

      <div class="location-options space-y-3">
        <!-- Home Location Button -->
        @if (hasHomeLocation()) {
          <button
            type="button"
            class="location-option-btn"
            [class.selected]="selectedChoice() === 'home'"
            (click)="selectHomeLocation()"
            [disabled]="loading()"
          >
            <span class="icon">🏠</span>
            <div class="content">
              <span class="label">Mi domicilio</span>
              @if (homeLocationAddress()) {
                <span class="address">{{ homeLocationAddress() }}</span>
              }
            </div>
          </button>
        }

        <!-- Current GPS Location Button -->
        <button
          type="button"
          class="location-option-btn"
          [class.selected]="selectedChoice() === 'current'"
          (click)="selectCurrentLocation()"
          [disabled]="loading() || !isGeolocationAvailable()"
        >
          <span class="icon">📍</span>
          <div class="content">
            <span class="label">Ubicación actual</span>
            @if (currentLocationAddress()) {
              <span class="address">{{ currentLocationAddress() }}</span>
            }
          </div>
        </button>

        @if (!isGeolocationAvailable()) {
          <p class="text-xs text-error-600 ml-10">Geolocalización no disponible en tu navegador</p>
        }

        <!-- Address Search -->
        <div class="address-search-container">
          <div class="address-search-input">
            <span class="icon">🔍</span>
            <input
              type="text"
              placeholder="O ingresá una dirección..."
              [(ngModel)]="addressInput"
              (input)="onAddressChange()"
              (keydown.enter)="searchAddress()"
              [disabled]="loading()"
              class="address-input"
            />
          </div>
          @if (addressSearching()) {
            <p class="text-xs text-text-secondary dark:text-text-secondary mt-1 ml-10">Buscando...</p>
          }
        </div>
      </div>

      <!-- Selected Location Display -->
      @if (selectedLocation()) {
        <div
          class="selected-location mt-4 p-3 bg-success-light/10 border border-success-light/40 rounded-lg"
        >
          <div class="flex items-start">
            <span class="text-success-light mr-2">✅</span>
            <div class="flex-1">
              <p class="text-sm font-medium text-success-light">Ubicación seleccionada</p>
              @if (selectedLocation()!.address) {
                <p class="text-xs text-success-light mt-1">
                  {{ selectedLocation()!.address }}
                </p>
              }
              <p class="text-xs text-success-light mt-1">
                {{ selectedLocation()!.lat.toFixed(6) }},
                {{ selectedLocation()!.lng.toFixed(6) }}
              </p>
            </div>
          </div>
        </div>
      }

      <!-- Error Message -->
      @if (errorMessage()) {
        <div class="error-message mt-3 p-3 bg-error-50 border border-error-200 rounded-lg">
          <p class="text-sm text-error-800">{{ errorMessage() }}</p>
        </div>
      }

      <!-- Loading Indicator -->
      @if (loading()) {
        <div class="loading-indicator mt-3 text-center">
          <p class="text-sm text-text-secondary dark:text-text-secondary">Obteniendo ubicación...</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .location-picker {
        width: 100%;
      }

      .location-options {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .location-option-btn {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 1rem;
        text-align: left;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.2s;
      }

      .location-option-btn:hover:not(:disabled) {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .location-option-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .location-option-btn.selected {
        border-color: #3b82f6;
        background: #dbeafe;
      }

      .location-option-btn .icon {
        font-size: 1.5rem;
        margin-right: 0.75rem;
      }

      .location-option-btn .content {
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      .location-option-btn .label {
        font-weight: 600;
        color: #111827;
      }

      .location-option-btn .address {
        font-size: 0.75rem;
        color: #6b7280;
        margin-top: 0.25rem;
      }

      .address-search-container {
        width: 100%;
      }

      .address-search-input {
        display: flex;
        align-items: center;
        padding: 1rem;
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 0.5rem;
        transition: border-color 0.2s;
      }

      .address-search-input:focus-within {
        border-color: #3b82f6;
      }

      .address-search-input .icon {
        font-size: 1.25rem;
        margin-right: 0.75rem;
      }

      .address-input {
        flex: 1;
        border: none;
        outline: none;
        font-size: 0.875rem;
      }

      .address-input::placeholder {
        color: #9ca3af;
      }

      .selected-location {
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class LocationPickerComponent {
  @Output() locationSelected = new EventEmitter<LocationSelection>();

  private readonly locationService = inject(LocationService);
  private readonly geocodingService = inject(GeocodingService);

  // Signals
  selectedLocation = signal<LocationSelection | null>(null);
  selectedChoice = signal<LocationChoice>(null);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  addressInput = signal('');
  addressSearching = signal(false);
  hasHomeLocation = signal(false);
  homeLocationAddress = signal<string | null>(null);
  currentLocationAddress = signal<string | null>(null);

  private addressSearchTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.checkHomeLocation();
  }

  isGeolocationAvailable(): boolean {
    return this.locationService.isGeolocationSupported();
  }

  async checkHomeLocation(): Promise<void> {
    const hasHome = await this.locationService.hasHomeLocation();
    this.hasHomeLocation.set(hasHome);

    if (hasHome) {
      const homeLocation = await this.locationService.getHomeLocation();
      if (homeLocation) {
        this.homeLocationAddress.set(homeLocation.address ?? 'Domicilio guardado');
      }
    }
  }

  async selectHomeLocation(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.selectedChoice.set('home');

    try {
      const locationData = await this.locationService.getHomeLocation();

      if (locationData) {
        const selection: LocationSelection = {
          lat: locationData.lat,
          lng: locationData.lng,
          address: locationData.address,
          source: 'home',
        };

        this.selectedLocation.set(selection);
        this.locationSelected.emit(selection);
      } else {
        throw new Error('No se pudo obtener tu domicilio guardado');
      }
    } catch (error: unknown) {
      this.errorMessage.set((error as Error).message || 'Error al obtener domicilio');
      this.selectedChoice.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async selectCurrentLocation(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.selectedChoice.set('current');

    try {
      const locationData = await this.locationService.getCurrentPosition();

      if (!locationData) {
        throw new Error('No se pudo obtener tu ubicación actual. Verificá los permisos.');
      }

      // Try to get address from coordinates
      let address: string | undefined;
      try {
        const result = await this.geocodingService.reverseGeocode(
          locationData.lat,
          locationData.lng,
        );
        address = result.fullAddress;
        this.currentLocationAddress.set(address);
      } catch {
        // Ignore reverse geocoding errors
      }

      const selection: LocationSelection = {
        lat: locationData.lat,
        lng: locationData.lng,
        address,
        source: 'gps',
      };

      this.selectedLocation.set(selection);
      this.locationSelected.emit(selection);
    } catch (error: unknown) {
      this.errorMessage.set((error as Error).message || 'Error al obtener ubicación actual');
      this.selectedChoice.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  onAddressChange(): void {
    // Clear previous timeout
    if (this.addressSearchTimeout) {
      clearTimeout(this.addressSearchTimeout);
    }

    // Debounce address search
    const address = this.addressInput();
    if (address && address.length >= 5) {
      this.addressSearchTimeout = setTimeout(() => {
        this.searchAddress();
      }, 1000); // Wait 1 second after user stops typing
    }
  }

  async searchAddress(): Promise<void> {
    const address = this.addressInput();

    if (!address || address.length < 5) {
      return;
    }

    this.addressSearching.set(true);
    this.errorMessage.set(null);

    try {
      const result = await this.geocodingService.geocodeAddress(address, 'AR');

      if (result) {
        const selection: LocationSelection = {
          lat: result.latitude,
          lng: result.longitude,
          address: result.fullAddress,
          source: 'address',
        };

        this.selectedLocation.set(selection);
        this.selectedChoice.set(null); // Clear radio selection
        this.locationSelected.emit(selection);
      } else {
        throw new Error('No se encontró la dirección');
      }
    } catch (error: unknown) {
      this.errorMessage.set((error as Error).message || 'Error al buscar dirección');
    } finally {
      this.addressSearching.set(false);
    }
  }
}
