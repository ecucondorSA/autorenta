import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WizardComponent, WizardStep } from '../../../../shared/components/wizard/wizard.component';
import {
  PublishBasicInfoStepComponent,
  PublishBasicInfo,
} from '../../components/publish-basic-info-step/publish-basic-info-step.component';
import {
  PublishPhotosDescriptionStepComponent,
  PublishPhotosDescription,
} from '../../components/publish-photos-description-step/publish-photos-description-step.component';
import {
  PublishPriceAvailabilityStepComponent,
  PublishPriceAvailability,
} from '../../components/publish-price-availability-step/publish-price-availability-step.component';
import { PublishReviewStepComponent } from '../../components/publish-review-step/publish-review-step.component';
import { CarsService } from '../../../../core/services/cars.service';
import { GeocodingService } from '../../../../core/services/geocoding.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { Car } from '../../../../core/models';

/**
 * PublishCarWizardPage - 4-step car publishing wizard
 *
 * Step 1: Basic Info (brand, model, year, specs)
 * Step 2: Photos & Description
 * Step 3: Price & Availability
 * Step 4: Review & Publish
 */
@Component({
  selector: 'app-publish-car-wizard',
  standalone: true,
  imports: [
    CommonModule,
    WizardComponent,
    PublishBasicInfoStepComponent,
    PublishPhotosDescriptionStepComponent,
    PublishPriceAvailabilityStepComponent,
    PublishReviewStepComponent,
    LoadingStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <div class="publish-wizard-container">
      <div class="page-header">
        <h1 class="page-title">Publicar Tu Vehículo</h1>
        <p class="page-subtitle">Completa los 4 pasos para publicar tu auto en AutoRenta</p>
      </div>

      @if (isLoading()) {
        <app-loading-state type="spinner" size="lg">Cargando...</app-loading-state>
      }

      @if (error() && !isLoading()) {
        <app-error-state variant="banner" [retryable]="true" (retry)="error.set('')">{{
          error()
        }}</app-error-state>
      }

      @if (!isLoading() && !error()) {
        <app-wizard
          [steps]="wizardSteps"
          [currentStepIndex]="currentStep()"
          [isProcessing]="isProcessing()"
          [showCancelButton]="true"
          cancelLabel="Cancelar"
          completeLabel="Publicar Vehículo"
          (stepChange)="handleStepChange($event)"
          (cancel)="handleCancel()"
          (complete)="handleComplete()"
        >
          @if (currentStep() === 0) {
            <app-publish-basic-info-step
              [data]="basicInfoData()"
              (dataChange)="handleBasicInfoChange($event)"
              (validChange)="step1Valid.set($event)"
            />
          }

          @if (currentStep() === 1) {
            <app-publish-photos-description-step
              [data]="photosData()"
              (dataChange)="handlePhotosChange($event)"
              (validChange)="step2Valid.set($event)"
            />
          }

          @if (currentStep() === 2) {
            <app-publish-price-availability-step
              [data]="priceAvailData()"
              (dataChange)="handlePriceAvailChange($event)"
              (validChange)="step3Valid.set($event)"
            />
          }

          @if (currentStep() === 3) {
            <app-publish-review-step
              [basicInfo]="basicInfoData()"
              [photos]="photosData()"
              [priceAvail]="priceAvailData()"
            />
          }
        </app-wizard>
      }
    </div>
  `,
  styles: [
    `
      .publish-wizard-container {
        min-height: 100vh;
        background: var(--surface-base);
        padding: 2rem;
      }
      .page-header {
        max-width: 1200px;
        margin: 0 auto 2rem;
        text-align: center;
      }
      .page-title {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 0.5rem 0;
      }
      .page-subtitle {
        font-size: 1.125rem;
        color: var(--text-secondary);
        margin: 0;
      }
      @media (max-width: 768px) {
        .publish-wizard-container {
          padding: 1rem;
        }
        .page-title {
          font-size: 1.5rem;
        }
        .page-subtitle {
          font-size: 1rem;
        }
      }
    `,
  ],
})
export class PublishCarWizardPage implements OnInit {
  private readonly router = inject(Router);
  private readonly carsService = inject(CarsService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly toastService = inject(ToastService);

  currentStep = signal<number>(0);
  isLoading = signal<boolean>(false);
  error = signal<string>('');
  isProcessing = signal<boolean>(false);

  basicInfoData = signal<PublishBasicInfo>({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    category: '',
    transmission: '',
    fuelType: '',
    doors: 4,
    seats: 5,
    color: '',
    licensePlate: '',
  });
  photosData = signal<PublishPhotosDescription>({ photos: [], description: '', features: [] });
  priceAvailData = signal<PublishPriceAvailability>({
    dailyRate: 5000,
    weeklyDiscount: 10,
    monthlyDiscount: 20,
    minimumDays: 1,
    maximumDays: 30,
    address: '',
    city: '',
    province: '',
    availableFrom: new Date().toISOString().split('T')[0],
    availableUntil: '',
  });

  step1Valid = signal<boolean>(false);
  step2Valid = signal<boolean>(false);
  step3Valid = signal<boolean>(false);

  wizardSteps: WizardStep[] = [
    {
      id: 'basic-info',
      label: 'Información Básica',
      description: 'Datos del vehículo',
      isValid: () => this.step1Valid(),
    },
    {
      id: 'photos-description',
      label: 'Fotos y Descripción',
      description: 'Imágenes y detalles',
      isValid: () => this.step2Valid(),
    },
    {
      id: 'price-availability',
      label: 'Precio y Disponibilidad',
      description: 'Configuración de renta',
      isValid: () => this.step3Valid(),
    },
    { id: 'review', label: 'Revisión', description: 'Confirmar y publicar', isValid: () => true },
  ];

  ngOnInit(): void {
    // Could load saved draft here
  }

  handleStepChange(newStep: number): void {
    this.currentStep.set(newStep);
  }

  handleCancel(): void {
    this.router.navigate(['/cars']);
  }

  async handleComplete(): Promise<void> {
    this.isProcessing.set(true);
    this.error.set('');

    try {
      const basicInfo = this.basicInfoData();
      const photosInfo = this.photosData();
      const priceInfo = this.priceAvailData();

      // ============================================
      // STEP 1: Lookup Brand/Model IDs
      // ============================================
      let brandId: string | undefined;
      let modelId: string | undefined;

      try {
        // Get all brands
        const brands = await this.carsService.getCarBrands();
        const matchedBrand = brands.find(
          (b) => b.name.toLowerCase() === basicInfo.brand.toLowerCase(),
        );

        if (matchedBrand) {
          brandId = matchedBrand.id;

          // Get models for this brand
          const models = await this.carsService.getCarModels(brandId);
          const matchedModel = models.find(
            (m) => m.name.toLowerCase() === basicInfo.model.toLowerCase(),
          );

          if (matchedModel) {
            modelId = matchedModel.id;
          }
        }

        // If no match found, we'll use text fallback (brand_text_backup, model_text_backup)
        if (!brandId || !modelId) {
          console.warn('⚠️ Brand/Model no encontrados en BD, usando texto directo');
        }
      } catch (err) {
        console.error('Error lookup brand/model:', err);
        // Continue anyway, will use text fallback
      }

      // ============================================
      // STEP 2: Geocode Address
      // ============================================
      let latitude: number | undefined;
      let longitude: number | undefined;
      let formattedAddress: string | undefined;

      try {
        const fullAddress = `${priceInfo.address}, ${priceInfo.city}, ${priceInfo.province}`;
        const geocodingResult = await this.geocodingService.geocodeAddress(fullAddress, 'AR');

        latitude = geocodingResult.latitude;
        longitude = geocodingResult.longitude;
        formattedAddress = geocodingResult.fullAddress;

        console.log('✅ Geocoded:', { latitude, longitude, formattedAddress });
      } catch (err) {
        console.error('⚠️ Geocoding failed, trying city fallback:', err);

        // Fallback: try to geocode just the city
        try {
          const cityResult = await this.geocodingService.getCityCoordinates(priceInfo.city, 'AR');
          latitude = cityResult.latitude;
          longitude = cityResult.longitude;
          formattedAddress = cityResult.fullAddress;
          console.log('✅ City geocoded:', { latitude, longitude });
        } catch (fallbackErr) {
          console.error('❌ City geocoding also failed:', fallbackErr);
          // Continue without coordinates (CarsService will warn)
        }
      }

      // ============================================
      // STEP 3: Create Car (without photos first)
      // ============================================
      const carPayload: Partial<Car> = {
        // Brand/Model (use IDs if found, otherwise fallback to text)
        brand_id: brandId || 'unknown',
        model_id: modelId || 'unknown',
        brand_text_backup: basicInfo.brand,
        model_text_backup: basicInfo.model,
        brand: basicInfo.brand, // For backward compatibility
        model: basicInfo.model,

        // Basic info
        title: `${basicInfo.brand} ${basicInfo.model} ${basicInfo.year}`,
        description: photosInfo.description,
        year: basicInfo.year,
        plate: basicInfo.licensePlate,
        transmission: basicInfo.transmission as any,
        fuel: basicInfo.fuelType as any,
        fuel_type: basicInfo.fuelType as any,
        seats: basicInfo.seats,
        doors: basicInfo.doors,
        color: basicInfo.color,

        // Features
        features: photosInfo.features.reduce(
          (acc, feature) => {
            acc[feature.toLowerCase().replace(/\s+/g, '_')] = true;
            return acc;
          },
          {} as Record<string, boolean>,
        ),

        // Pricing
        price_per_day: priceInfo.dailyRate,
        currency: 'ARS',
        min_rental_days: priceInfo.minimumDays,
        max_rental_days: priceInfo.maximumDays,

        // Location
        location_city: priceInfo.city,
        location_state: priceInfo.province,
        location_province: priceInfo.province,
        location_country: 'Argentina',
        location_street: priceInfo.address,
        location_formatted_address: formattedAddress,
        location_lat: latitude,
        location_lng: longitude,

        // Status
        status: 'draft', // Start as draft until admin approval

        // Default values
        rating_avg: 0,
        rating_count: 0,
        mileage: 0,
        cancel_policy: 'flex',
      };

      console.log('🚗 Creating car with payload:', carPayload);
      const createdCar = await this.carsService.createCar(carPayload);
      console.log('✅ Car created:', createdCar.id);

      // ============================================
      // STEP 4: Upload Photos
      // ============================================
      if (photosInfo.photos.length > 0) {
        console.log(`📸 Uploading ${photosInfo.photos.length} photos...`);

        const uploadPromises = photosInfo.photos.map((photo, index) =>
          this.carsService.uploadPhoto(photo, createdCar.id, index),
        );

        try {
          await Promise.all(uploadPromises);
          console.log('✅ All photos uploaded');
        } catch (photoErr) {
          console.error('⚠️ Some photos failed to upload:', photoErr);
          // Continue anyway, car is created
        }
      }

      // ============================================
      // STEP 5: Show Success & Navigate
      // ============================================
      this.toastService.success(
        '¡Auto publicado!',
        'Tu vehículo ha sido agregado exitosamente',
        4000,
      );

      this.router.navigate(['/cars/my-cars'], {
        queryParams: { newCar: createdCar.id },
      });
    } catch (err) {
      console.error('❌ Error creating car:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error publicando vehículo';

      this.toastService.error('Error al publicar', errorMsg, 6000);

      this.error.set(errorMsg);
      this.isProcessing.set(false);
    }
  }

  handleBasicInfoChange(data: PublishBasicInfo): void {
    this.basicInfoData.set(data);
  }

  handlePhotosChange(data: PublishPhotosDescription): void {
    this.photosData.set(data);
  }

  handlePriceAvailChange(data: PublishPriceAvailability): void {
    this.priceAvailData.set(data);
  }
}
