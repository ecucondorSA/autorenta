import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WizardComponent, WizardStep } from '../../../../shared/components/wizard/wizard.component';
import { PublishBasicInfoStepComponent, PublishBasicInfo } from '../../components/publish-basic-info-step/publish-basic-info-step.component';
import { PublishPhotosDescriptionStepComponent, PublishPhotosDescription } from '../../components/publish-photos-description-step/publish-photos-description-step.component';
import { PublishPriceAvailabilityStepComponent, PublishPriceAvailability } from '../../components/publish-price-availability-step/publish-price-availability-step.component';
import { PublishReviewStepComponent } from '../../components/publish-review-step/publish-review-step.component';
import { CarsService } from '../../../../core/services/cars.service';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';

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
  imports: [CommonModule, WizardComponent, PublishBasicInfoStepComponent, PublishPhotosDescriptionStepComponent, PublishPriceAvailabilityStepComponent, PublishReviewStepComponent, LoadingStateComponent, ErrorStateComponent],
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
        <app-error-state variant="banner" [retryable]="true" (retry)="error.set('')">{{ error() }}</app-error-state>
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
          (complete)="handleComplete()">

          @if (currentStep() === 0) {
            <app-publish-basic-info-step [data]="basicInfoData()" (dataChange)="handleBasicInfoChange($event)" (validChange)="step1Valid.set($event)" />
          }

          @if (currentStep() === 1) {
            <app-publish-photos-description-step [data]="photosData()" (dataChange)="handlePhotosChange($event)" (validChange)="step2Valid.set($event)" />
          }

          @if (currentStep() === 2) {
            <app-publish-price-availability-step [data]="priceAvailData()" (dataChange)="handlePriceAvailChange($event)" (validChange)="step3Valid.set($event)" />
          }

          @if (currentStep() === 3) {
            <app-publish-review-step [basicInfo]="basicInfoData()" [photos]="photosData()" [priceAvail]="priceAvailData()" />
          }
        </app-wizard>
      }
    </div>
  `,
  styles: [`
    .publish-wizard-container { min-height: 100vh; background: var(--surface-base); padding: 2rem; }
    .page-header { max-width: 1200px; margin: 0 auto 2rem; text-align: center; }
    .page-title { font-size: 2rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem 0; }
    .page-subtitle { font-size: 1.125rem; color: var(--text-secondary); margin: 0; }
    @media (max-width: 768px) { .publish-wizard-container { padding: 1rem; } .page-title { font-size: 1.5rem; } .page-subtitle { font-size: 1rem; } }
  `]
})
export class PublishCarWizardPage implements OnInit {
  private readonly router = inject(Router);
  private readonly carsService = inject(CarsService);

  currentStep = signal<number>(0);
  isLoading = signal<boolean>(false);
  error = signal<string>('');
  isProcessing = signal<boolean>(false);

  basicInfoData = signal<PublishBasicInfo>({ brand: '', model: '', year: new Date().getFullYear(), category: '', transmission: '', fuelType: '', doors: 4, seats: 5, color: '', licensePlate: '' });
  photosData = signal<PublishPhotosDescription>({ photos: [], description: '', features: [] });
  priceAvailData = signal<PublishPriceAvailability>({ dailyRate: 5000, weeklyDiscount: 10, monthlyDiscount: 20, minimumDays: 1, maximumDays: 30, address: '', city: '', province: '', availableFrom: new Date().toISOString().split('T')[0], availableUntil: '' });

  step1Valid = signal<boolean>(false);
  step2Valid = signal<boolean>(false);
  step3Valid = signal<boolean>(false);

  wizardSteps: WizardStep[] = [
    { id: 'basic-info', label: 'Información Básica', description: 'Datos del vehículo', isValid: () => this.step1Valid() },
    { id: 'photos-description', label: 'Fotos y Descripción', description: 'Imágenes y detalles', isValid: () => this.step2Valid() },
    { id: 'price-availability', label: 'Precio y Disponibilidad', description: 'Configuración de renta', isValid: () => this.step3Valid() },
    { id: 'review', label: 'Revisión', description: 'Confirmar y publicar', isValid: () => true }
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
      const carData = {
        ...this.basicInfoData(),
        ...this.photosData(),
        ...this.priceAvailData()
      };

      // TODO: Implement actual car creation via CarsService
      console.log('Creating car:', carData);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Navigate to success page
      this.router.navigate(['/cars/my-cars']);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error publicando vehículo');
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
