import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CarsService } from '../../../core/services/cars.service';
import { HostSupportInfoPanelComponent } from '../../../shared/components/host-support-info-panel/host-support-info-panel.component';
import { StockPhotosSelectorComponent } from '../../../shared/components/stock-photos-selector/stock-photos-selector.component';
import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';

// ✅ NEW: Extracted services
import { PublishCarFormService } from './services/publish-car-form.service';
import { PublishCarPhotoService } from './services/publish-car-photo.service';
import { PublishCarLocationService } from './services/publish-car-location.service';
import { PublishCarMpOnboardingService } from './services/publish-car-mp-onboarding.service';

/**
 * Publish Car V2 Component (REFACTORED)
 *
 * This component orchestrates the car publishing flow by delegating
 * all business logic to specialized services.
 *
 * Responsibilities:
 * - Coordinate service interactions
 * - Handle form submission
 * - Navigate user through the flow
 * - Display UI state
 *
 * Before refactor: 1,747 lines (template + logic)
 * After refactor: ~300 lines (orchestration only)
 */
@Component({
  selector: 'app-publish-car-v2',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    HostSupportInfoPanelComponent,
    StockPhotosSelectorComponent,
    AiPhotoGeneratorComponent,
  ],
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  providers: [
    PublishCarFormService,
    PublishCarPhotoService,
    PublishCarLocationService,
    PublishCarMpOnboardingService,
  ],
})
export class PublishCarV2Page implements OnInit {
  // Core services
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly carsService = inject(CarsService);

  // Feature services
  private readonly formService = inject(PublishCarFormService);
  private readonly photoService = inject(PublishCarPhotoService);
  private readonly locationService = inject(PublishCarLocationService);
  private readonly mpService = inject(PublishCarMpOnboardingService);

  // Component state
  readonly isSubmitting = signal(false);
  readonly editMode = signal(false);
  readonly showStockPhotosModal = signal(false);
  readonly showAIPhotosModal = signal(false);
  private carId: string | null = null;

  // Form reference
  publishForm!: FormGroup;

  // Expose service state to template
  readonly brands = this.formService.brands;
  readonly models = this.formService.models;
  readonly filteredModels = this.formService.filteredModels;
  readonly uploadedPhotos = this.photoService.uploadedPhotos;
  readonly isProcessingPhotos = this.photoService.isProcessingPhotos;
  readonly isGeneratingAIPhotos = this.photoService.isGeneratingAIPhotos;
  readonly manualCoordinates = this.locationService.manualCoordinates;
  readonly autofilledFromLast = this.formService.autofilledFromLast;

  // MP onboarding state
  readonly mpStatus = this.mpService.mpStatus;
  readonly mpStatusLoading = this.mpService.mpStatusLoading;
  readonly mpStatusError = this.mpService.mpStatusError;
  readonly mpReady = this.mpService.mpReady;
  readonly showMpBanner = this.mpService.showMpBanner;

  // Min/max year for validation
  readonly minYear = 1980;
  readonly maxYear = new Date().getFullYear() + 1;

  // Computed
  readonly selectedModelInfo = computed(() => {
    const modelId = this.publishForm?.get('model_id')?.value;
    if (!modelId) return null;
    return this.formService.getSelectedModelInfo(modelId);
  });

  async ngOnInit(): Promise<void> {
    // Initialize form
    this.publishForm = this.formService.initForm();

    // Check if editing
    this.carId = this.route.snapshot.paramMap.get('id');
    if (this.carId) {
      this.editMode.set(true);
    }

    // Load brands and models
    await this.formService.loadBrandsAndModels();

    // Load car data if editing
    if (this.carId) {
      const loaded = await this.formService.loadCarForEditing(this.carId);
      if (!loaded) {
        alert('No se pudo cargar el auto');
        await this.router.navigate(['/cars/my-cars']);
        return;
      }
      await this.photoService.loadExistingPhotos(this.carId);
    } else {
      // Auto-fill from last car
      await this.formService.autoFillFromLastCar();
    }
  }

  /**
   * Handle brand selection change
   */
  onBrandChange(): void {
    const brandId = this.publishForm.get('brand_id')?.value;
    this.formService.filterModelsByBrand(brandId);
    // Reset model selection
    this.publishForm.get('model_id')?.setValue('');
  }

  /**
   * Handle model selection change
   */
  onModelChange(): void {
    // Model info computed automatically via selectedModelInfo
  }

  /**
   * Set pricing strategy (dynamic vs custom)
   */
  setPricingStrategy(mode: 'dynamic' | 'custom'): void {
    this.formService.setPricingStrategy(mode);
  }

  /**
   * Check if dynamic pricing is enabled
   */
  isDynamicPricing(): boolean {
    return this.formService.isDynamicPricing();
  }

  /**
   * Handle photo selection
   */
  async onPhotoSelected(event: Event): Promise<void> {
    await this.photoService.selectPhotos(event);
  }

  /**
   * Generate AI photos
   */
  async generateAIPhotos(): Promise<void> {
    const brandId = this.publishForm.get('brand_id')?.value;
    const modelId = this.publishForm.get('model_id')?.value;
    const year = this.publishForm.get('year')?.value;

    if (!brandId || !modelId || !year) {
      alert('Debes seleccionar marca, modelo y año primero');
      return;
    }

    const brand = this.brands().find((b) => b.id === brandId);
    const model = this.models().find((m) => m.id === modelId);

    if (!brand || !model) {
      alert('No se pudo obtener información del vehículo');
      return;
    }

    await this.photoService.generateAIPhotos(brand.name, model.name, year);
  }

  /**
   * Remove photo at index
   */
  removePhoto(index: number): void {
    this.photoService.removePhoto(index);
  }

  /**
   * Use current GPS location
   */
  async useCurrentLocation(): Promise<void> {
    const location = await this.locationService.useCurrentLocation();

    if (location) {
      // Reverse geocode to get address
      const address = await this.locationService.reverseGeocode(
        location.latitude,
        location.longitude
      );

      if (address) {
        // Fill address fields
        this.publishForm.patchValue({
          location_street: address.street,
          location_street_number: address.streetNumber,
          location_city: address.city,
          location_state: address.state,
          location_country: address.country,
        });
      }
    }
  }

  /**
   * Open MercadoPago onboarding modal
   */
  async openOnboardingModal(): Promise<void> {
    await this.mpService.openOnboardingModal();
  }

  /**
   * Dismiss onboarding reminder
   */
  dismissOnboardingReminder(): void {
    this.mpService.dismissOnboardingReminder();
  }

  /**
   * Submit form
   */
  async onSubmit(): Promise<void> {
    if (!this.formService.isValid()) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (!this.photoService.hasMinimumPhotos()) {
      alert('Debes subir al menos 3 fotos');
      return;
    }

    this.isSubmitting.set(true);

    try {
      // Get form data
      const formData = this.formService.getFormData();

      // Get coordinates (manual or from address)
      let coordinates = this.locationService.getCoordinates();
      if (!coordinates) {
        // Geocode address
        const address = {
          street: formData.location_street as string,
          streetNumber: formData.location_street_number as string,
          city: formData.location_city as string,
          state: formData.location_state as string,
          country: formData.location_country as string,
        };
        coordinates = await this.locationService.geocodeAddress(address);
      }

      // Prepare car data
      const carData = {
        ...formData,
        latitude: coordinates?.latitude || null,
        longitude: coordinates?.longitude || null,
        status: 'active' as const, // Car is active immediately and will appear on map
      };

      let carId: string;

      if (this.editMode() && this.carId) {
        // Update existing car
        await this.carsService.updateCar(this.carId, carData);
        carId = this.carId;
        alert('✅ Auto actualizado exitosamente');
      } else {
        // Create new car
        const newCar = await this.carsService.createCar(carData);
        carId = newCar.id;
        alert('✅ Auto publicado exitosamente');
      }

      // Upload photos (if new or changed)
      if (this.photoService.getPhotoCount() > 0) {
        await this.photoService.uploadPhotos(carId);
      }

      // Navigate to my cars
      await this.router.navigate(['/cars/my-cars']);
    } catch (error) {
      console.error('Failed to publish car:', error);
      alert('❌ Error al publicar el auto. Por favor intenta nuevamente.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Go back to previous page
   */
  async goBack(): Promise<void> {
    await this.router.navigate(['/cars/my-cars']);
  }
}
