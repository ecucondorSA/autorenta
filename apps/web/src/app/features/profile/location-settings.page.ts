import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, filter, Subject, takeUntil } from 'rxjs';
import { LocationService } from '../../core/services/location.service';
import { ProfileService } from '../../core/services/profile.service';
import { GeocodingService } from '../../core/services/geocoding.service';
import { UserProfile } from '../../core/models';
import {
  LocationMapPickerComponent,
  LocationCoordinates,
} from '../../shared/components/location-map-picker/location-map-picker.component';

@Component({
  standalone: true,
  selector: 'app-location-settings-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LocationMapPickerComponent,
  ],
  templateUrl: './location-settings.page.html',
  styleUrls: ['./location-settings.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationSettingsPage implements OnInit, OnDestroy {
  @ViewChild(LocationMapPickerComponent) mapPicker?: LocationMapPickerComponent;

  private readonly fb = inject(FormBuilder);
  private readonly locationService = inject(LocationService);
  private readonly profileService = inject(ProfileService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly destroy$ = new Subject<void>();

  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly verifying = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly selectedCoordinates = signal<LocationCoordinates | null>(null);

  // Computed properties
  readonly hasHomeLocation = computed(() => {
    const p = this.profile();
    return p?.home_latitude !== null && p?.home_longitude !== null;
  });

  readonly isLocationVerified = computed(() => {
    const p = this.profile();
    return p?.location_verified_at !== null;
  });

  readonly locationVerifiedAt = computed(() => {
    const p = this.profile();
    return p?.location_verified_at ? new Date(p.location_verified_at) : null;
  });

  readonly verificationBadgeText = computed(() => {
    if (this.isLocationVerified()) {
      return 'Ubicación Verificada';
    } else if (this.hasHomeLocation()) {
      return 'Ubicación No Verificada';
    } else {
      return 'Sin Ubicación Guardada';
    }
  });

  readonly verificationBadgeClass = computed(() => {
    if (this.isLocationVerified()) {
      return 'badge-verified';
    } else if (this.hasHomeLocation()) {
      return 'badge-unverified';
    } else {
      return 'badge-empty';
    }
  });

  readonly form = this.fb.nonNullable.group({
    preferred_search_radius_km: [50, [Validators.required, Validators.min(5), Validators.max(100)]],
    address_search: [''],
  });

  ngOnInit(): void {
    void this.loadProfile();
    this.setupAddressSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup debouncing for address search input
   * Waits 500ms after user stops typing before triggering search
   */
  private setupAddressSearchDebounce(): void {
    this.form.controls.address_search.valueChanges
      .pipe(
        debounceTime(500), // Wait 500ms after user stops typing
        distinctUntilChanged(), // Only emit if value actually changed
        filter((value) => value !== null && value.trim().length >= 3), // Minimum 3 characters
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Auto-search when user stops typing
        void this.searchAddress();
      });
  }

  async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const profile = await this.profileService.getCurrentProfile();
      this.profile.set(profile);

      if (profile) {
        // Set form values
        this.form.patchValue({
          preferred_search_radius_km: profile.preferred_search_radius_km ?? 50,
        });

        // Set initial coordinates if available
        if (profile.home_latitude && profile.home_longitude) {
          this.selectedCoordinates.set({
            latitude: profile.home_latitude,
            longitude: profile.home_longitude,
            address: profile.address_line1 ?? undefined,
          });
        }
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No pudimos cargar tu perfil.');
    } finally {
      this.loading.set(false);
    }
  }

  onMapLocationChange(coords: LocationCoordinates): void {
    this.selectedCoordinates.set(coords);
    this.message.set(null);
    this.error.set(null);
  }

  async searchAddress(): Promise<void> {
    const addressInput = this.form.value.address_search?.trim();
    if (!addressInput) {
      this.error.set('Por favor ingresa una dirección');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const result = await this.geocodingService.geocodeAddress(addressInput, 'AR');

      if (result) {
        // Update map
        this.mapPicker?.flyToLocation(result.latitude, result.longitude, result.fullAddress);

        this.selectedCoordinates.set({
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.fullAddress,
        });

        this.message.set('Dirección encontrada. Ajusta el marcador si es necesario.');
      } else {
        this.error.set('No pudimos encontrar esa dirección. Intenta con otra.');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al buscar la dirección.');
    } finally {
      this.loading.set(false);
    }
  }

  async useCurrentLocation(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const currentPos = await this.locationService.getCurrentPosition();

      if (currentPos) {
        // Reverse geocode to get address
        const result = await this.geocodingService.reverseGeocode(currentPos.lat, currentPos.lng);

        // Update map
        this.mapPicker?.flyToLocation(currentPos.lat, currentPos.lng, result.fullAddress);

        this.selectedCoordinates.set({
          latitude: currentPos.lat,
          longitude: currentPos.lng,
          address: result.fullAddress,
        });

        this.message.set('Ubicación actual obtenida exitosamente.');
      } else {
        this.error.set('No pudimos obtener tu ubicación. Verifica los permisos del navegador.');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al obtener ubicación actual.');
    } finally {
      this.loading.set(false);
    }
  }

  async saveLocation(): Promise<void> {
    const coords = this.selectedCoordinates();
    if (!coords) {
      this.error.set('Por favor selecciona una ubicación en el mapa');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.message.set(null);

    try {
      // Save location
      await this.locationService.saveHomeLocation(
        coords.latitude,
        coords.longitude,
        coords.address
      );

      // Update preferred search radius
      const radiusValue = this.form.value.preferred_search_radius_km ?? 50;
      await this.profileService.updateProfile({
        preferred_search_radius_km: radiusValue,
      });

      // Reload profile
      await this.loadProfile();

      this.message.set('Ubicación guardada exitosamente');
      setTimeout(() => this.message.set(null), 3000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No pudimos guardar tu ubicación.');
    } finally {
      this.saving.set(false);
    }
  }

  async verifyLocation(): Promise<void> {
    const coords = this.selectedCoordinates();
    if (!coords) {
      this.error.set('Por favor selecciona una ubicación primero');
      return;
    }

    this.verifying.set(true);
    this.error.set(null);
    this.message.set(null);

    try {
      // Get current GPS position
      const currentPos = await this.locationService.getCurrentPosition();

      if (!currentPos) {
        this.error.set('No pudimos obtener tu ubicación actual. Verifica los permisos del navegador.');
        this.verifying.set(false);
        return;
      }

      // Calculate distance between saved location and current location
      const distance = this.calculateDistance(
        coords.latitude,
        coords.longitude,
        currentPos.lat,
        currentPos.lng
      );

      // Allow verification if within 500 meters
      const VERIFICATION_THRESHOLD_KM = 0.5;

      if (distance <= VERIFICATION_THRESHOLD_KM) {
        // Save with verification timestamp
        await this.locationService.saveHomeLocation(
          coords.latitude,
          coords.longitude,
          coords.address
        );

        await this.loadProfile();

        this.message.set('¡Ubicación verificada exitosamente!');
        setTimeout(() => this.message.set(null), 3000);
      } else {
        this.error.set(
          `Debes estar cerca de tu ubicación guardada para verificarla. ` +
          `Distancia actual: ${distance.toFixed(2)} km`
        );
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al verificar ubicación.');
    } finally {
      this.verifying.set(false);
    }
  }

  async clearLocation(): Promise<void> {
    if (!confirm('¿Estás seguro de eliminar tu ubicación guardada?')) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      await this.locationService.clearHomeLocation();
      this.selectedCoordinates.set(null);
      await this.loadProfile();

      this.message.set('Ubicación eliminada');
      setTimeout(() => this.message.set(null), 3000);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No pudimos eliminar tu ubicación.');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @returns Distance in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
