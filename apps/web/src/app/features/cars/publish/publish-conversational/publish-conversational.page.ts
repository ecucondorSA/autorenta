import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup } from '@angular/forms';

// Core services
import { CarsService } from '@core/services/cars/cars.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { VehiclePosition } from '@core/services/ai/photo-quality.service';

// Shared components
import { PhotoWithAI, VehicleAutoDetect, PhotoPosition } from '@shared/components/photo-upload-ai/photo-upload-ai.component';

// Parent services
import { PublishCarPhotoService } from '../services/publish-car-photo.service';
import { PublishCarLocationService } from '../services/publish-car-location.service';

// Local services
import { ConversationalFormService, QuestionId } from './conversational-form.service';

// Local components
import { ProgressDotsComponent } from './components/progress-dots.component';
import { QuestionCardComponent } from './components/question-card.component';
import { CelebrationComponent } from './components/celebration.component';

// Question components
import { VehicleQuestionComponent } from './questions/vehicle-question.component';
import { YearQuestionComponent } from './questions/year-question.component';
import { ModelQuestionComponent } from './questions/model-question.component';
import { PhotosQuestionComponent } from './questions/photos-question.component';
import { MileageQuestionComponent } from './questions/mileage-question.component';
import { PriceQuestionComponent } from './questions/price-question.component';
import { LocationQuestionComponent, LocationAnswer } from './questions/location-question.component';
import { SummaryQuestionComponent, SummaryData } from './questions/summary-question.component';

// Config
import { QUESTIONS_CONFIG, formatQuestionTitle } from './questions.config';

/**
 * Conversational form for publishing a car
 *
 * Features:
 * - 8 step flow (brand, year, model, photos, mileage, price, location, summary)
 * - Typeform-style one question at a time
 * - Smart defaults to reduce friction
 * - Draft persistence to localStorage
 * - Keyboard navigation (Enter, Escape)
 * - Swipe navigation on mobile
 */
@Component({
  selector: 'app-publish-conversational',
  standalone: true,
  imports: [
    ProgressDotsComponent,
    QuestionCardComponent,
    CelebrationComponent,
    VehicleQuestionComponent,
    YearQuestionComponent,
    ModelQuestionComponent,
    PhotosQuestionComponent,
    MileageQuestionComponent,
    PriceQuestionComponent,
    LocationQuestionComponent,
    SummaryQuestionComponent,
  ],
  providers: [ConversationalFormService, PublishCarPhotoService, PublishCarLocationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gradient-to-b from-surface-primary to-surface-secondary">
      <!-- Header -->
      <header class="sticky top-0 z-40 bg-surface-primary/80 backdrop-blur-lg border-b border-border-default">
        <div class="max-w-lg mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <!-- Back/Close button -->
            <button
              type="button"
              (click)="onHeaderBack()"
              class="p-2 -ml-2 rounded-lg hover:bg-surface-secondary transition-colors"
            >
              @if (formService.isFirstQuestion()) {
                <svg class="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              } @else {
                <svg class="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              }
            </button>

            <!-- Progress dots -->
            <app-progress-dots
              [currentIndex]="formService.currentIndex()"
              [totalSteps]="formService.totalQuestions()"
              [completedSteps]="completedSteps()"
              [onNavigate]="onProgressNavigate.bind(this)"
            />

            <!-- Save draft -->
            <button
              type="button"
              (click)="saveDraft()"
              class="p-2 -mr-2 rounded-lg hover:bg-surface-secondary transition-colors text-text-secondary"
              title="Guardar borrador"
            >
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
          </div>

          <!-- Progress bar -->
          <div class="mt-3 h-1 bg-surface-secondary rounded-full overflow-hidden">
            <div
              class="h-full bg-cta-default transition-all duration-500 ease-out rounded-full"
              [style.width.%]="formService.progress() * 100"
            ></div>
          </div>
        </div>
      </header>

      <!-- Main content -->
      <main class="max-w-lg mx-auto px-4 py-8 sm:py-12">
        <!-- Question card with animation -->
        <app-question-card
          [title]="currentTitle()"
          [subtitle]="currentSubtitle()"
          [icon]="currentIcon()"
          [canGoBack]="formService.canGoBack()"
          [canContinue]="canContinue()"
          [isSummary]="formService.isSummaryStep()"
          [direction]="formService.direction()"
          [isTransitioning]="formService.isTransitioning()"
          (back)="goBack()"
          (next)="goNext()"
        >
          @switch (formService.currentQuestion()) {
            @case ('vehicle') {
              <app-vehicle-question
                [initialValue]="formService.selectedBrand()"
                (brandSelected)="onBrandSelected($event)"
              />
            }
            @case ('year') {
              <app-year-question
                [brandName]="formService.selectedBrand()?.name"
                [initialValue]="formService.selectedYear()"
                (yearSelected)="onYearSelected($event)"
              />
            }
            @case ('model') {
              <app-model-question
                [brandCode]="formService.selectedBrand()?.code || ''"
                [brandName]="formService.selectedBrand()?.name || ''"
                [year]="formService.selectedYear() || 2024"
                [initialValue]="formService.selectedModel()"
                (modelSelected)="onModelSelected($event)"
                (fipeValueLoaded)="onFipeValueLoaded($event)"
              />
            }
            @case ('photos') {
              <app-photos-question
                [brandName]="formService.selectedBrand()?.name ?? ''"
                [modelName]="formService.selectedModel()?.name ?? ''"
                [year]="formService.selectedYear() ?? undefined"
                (photosChanged)="onPhotosChanged($event)"
                (vehicleDetected)="onVehicleAutoDetected($event)"
                (requestAiGeneration)="onRequestAiGeneration()"
              />
            }
            @case ('mileage') {
              <app-mileage-question
                [initialValue]="getMileageValue()"
                (mileageChanged)="onMileageChanged($event)"
              />
            }
            @case ('price') {
              <app-price-question
                [fipeValue]="formService.fipeValue()"
                [mileage]="getMileageValue()"
                [year]="formService.selectedYear()"
                [initialValue]="getPriceValue()"
                (priceChanged)="onPriceChanged($event)"
                (dynamicPricingChanged)="onDynamicPricingChanged($event)"
              />
            }
            @case ('location') {
              <app-location-question
                [initialValue]="formService.locationAddress()"
                (locationChanged)="onLocationChanged($event)"
              />
            }
            @case ('summary') {
              <app-summary-question
                [data]="summaryData()"
                (editField)="onEditFromSummary($event)"
              />
            }
          }
        </app-question-card>
      </main>

      <!-- Celebration overlay -->
      @if (showCelebration()) {
        <app-celebration
          [carTitle]="publishedCarTitle()"
          [carId]="publishedCarId()"
          (viewListing)="viewPublishedCar()"
          (publishAnother)="publishAnother()"
        />
      }

      <!-- Loading overlay -->
      @if (isSubmitting()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div class="bg-surface-raised rounded-2xl p-8 shadow-2xl text-center">
            <svg class="animate-spin h-12 w-12 mx-auto text-cta-default" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-4 text-text-primary font-medium">Publicando tu auto...</p>
            <p class="text-sm text-text-muted mt-1">Esto puede tomar unos segundos</p>
          </div>
        </div>
      }
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
export class PublishConversationalPage implements OnInit, OnDestroy {
  readonly formService = inject(ConversationalFormService);
  private readonly photoService = inject(PublishCarPhotoService);
  private readonly locationService = inject(PublishCarLocationService);
  private readonly carsService = inject(CarsService);
  private readonly notifications = inject(NotificationManagerService);
  private readonly router = inject(Router);

  // State
  readonly isSubmitting = signal(false);
  readonly showCelebration = signal(false);
  readonly publishedCarId = signal<string | null>(null);
  readonly publishedCarTitle = signal<string | null>(null);
  readonly isDynamicPricing = signal(true);
  readonly photos = signal<PhotoWithAI[]>([]);

  // Form
  private publishForm!: FormGroup;

  // Computed
  readonly completedSteps = computed(() => {
    const completed = new Set<number>();
    const answers = this.formService.answers();
    const questionIds: QuestionId[] = ['vehicle', 'year', 'model', 'photos', 'mileage', 'price', 'location', 'summary'];

    questionIds.forEach((id, index) => {
      if (answers.has(id)) {
        completed.add(index);
      }
    });

    return completed;
  });

  readonly currentTitle = computed(() => {
    const config = QUESTIONS_CONFIG[this.formService.currentIndex()];
    return formatQuestionTitle(config, {
      brand: this.formService.selectedBrand()?.name,
      model: this.formService.selectedModel()?.name,
      year: this.formService.selectedYear() ?? undefined,
    });
  });

  readonly currentSubtitle = computed(() => {
    return QUESTIONS_CONFIG[this.formService.currentIndex()]?.subtitle;
  });

  readonly currentIcon = computed(() => {
    return QUESTIONS_CONFIG[this.formService.currentIndex()]?.icon;
  });

  readonly canContinue = computed(() => {
    const question = this.formService.currentQuestion();

    switch (question) {
      case 'vehicle':
        return !!this.formService.selectedBrand();
      case 'year':
        return !!this.formService.selectedYear();
      case 'model':
        return !!this.formService.selectedModel();
      case 'photos':
        return this.photos().length >= 3;
      case 'mileage':
        return !!this.formService.getAnswer('mileage');
      case 'price':
        return !!this.formService.getAnswer('price');
      case 'location':
        return !!this.formService.locationAddress()?.city;
      case 'summary':
        return this.formService.hasMinimumData();
      default:
        return true;
    }
  });

  readonly summaryData = computed((): SummaryData => {
    return {
      brand: this.formService.selectedBrand()?.name || '',
      model: this.formService.selectedModel()?.name || '',
      year: this.formService.selectedYear() || 0,
      mileage: this.getMileageValue() || 0,
      price: this.getPriceValue() || 0,
      location: {
        city: this.formService.locationAddress()?.city || '',
        state: this.formService.locationAddress()?.state || '',
      },
      photosCount: this.photos().length,
      isDynamicPricing: this.isDynamicPricing(),
    };
  });

  // Typed getters for answer values
  getMileageValue(): number | null {
    const answer = this.formService.getAnswer('mileage');
    return typeof answer?.value === 'number' ? answer.value : null;
  }

  getPriceValue(): number | null {
    const answer = this.formService.getAnswer('price');
    return typeof answer?.value === 'number' ? answer.value : null;
  }

  ngOnInit(): void {
    this.publishForm = this.formService.initForm();
  }

  ngOnDestroy(): void {
    // Save draft on exit
    this.formService.saveDraft();
  }

  // Keyboard navigation
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.canContinue() && !this.formService.isTransitioning()) {
      event.preventDefault();
      this.goNext();
    } else if (event.key === 'Escape' && this.formService.canGoBack()) {
      event.preventDefault();
      this.goBack();
    }
  }

  // Navigation
  onHeaderBack(): void {
    if (this.formService.isFirstQuestion()) {
      // Confirm exit
      if (confirm('¿Seguro que querés salir? Tu progreso se guardará como borrador.')) {
        this.formService.saveDraft();
        this.router.navigate(['/cars']);
      }
    } else {
      this.goBack();
    }
  }

  async goNext(): Promise<void> {
    if (this.formService.isSummaryStep()) {
      await this.publish();
    } else {
      await this.formService.goNext();
    }
  }

  async goBack(): Promise<void> {
    await this.formService.goBack();
  }

  onProgressNavigate(index: number): void {
    const questionIds: QuestionId[] = ['vehicle', 'year', 'model', 'photos', 'mileage', 'price', 'location', 'summary'];
    this.formService.goToQuestion(questionIds[index]);
  }

  saveDraft(): void {
    this.formService.saveDraft();
    this.notifications.success('Borrador', 'Tu progreso se guardó correctamente');
  }

  // Question handlers
  onBrandSelected(brand: { code: string; name: string }): void {
    this.formService.setAnswer('vehicle', brand, brand.name);
  }

  onYearSelected(year: number): void {
    this.formService.setAnswer('year', year, year.toString());
  }

  onModelSelected(model: { code: string; name: string }): void {
    this.formService.setAnswer('model', model, model.name);
  }

  onFipeValueLoaded(value: number): void {
    this.formService.fipeValue.set(value);
  }

  onPhotosChanged(photos: PhotoWithAI[]): void {
    this.photos.set(photos);
    if (photos.length >= 3) {
      this.formService.setAnswer('photos', photos, `${photos.length} fotos`);
    }

    // Convert PhotoPosition to VehiclePosition (filter out 'cover' and 'detail' which are not valid VehiclePosition)
    const validVehiclePositions: VehiclePosition[] = ['front', 'rear', 'left', 'right', 'interior', 'dashboard', 'trunk'];
    const toVehiclePosition = (pos: PhotoPosition): VehiclePosition | undefined => {
      return validVehiclePositions.includes(pos as VehiclePosition) ? (pos as VehiclePosition) : undefined;
    };

    // Sync with photo service
    const photoPreviewsForService = photos.map((p) => ({
      file: p.file,
      preview: p.preview,
      position: toVehiclePosition(p.position),
      aiValidation: {
        quality: p.quality?.score,
        vehicle:
          p.vehicle?.brand && p.vehicle?.model
            ? {
                brand: p.vehicle.brand,
                model: p.vehicle.model,
                year: p.vehicle.year,
                color: p.vehicle.color,
                confidence: p.vehicle.confidence,
              }
            : undefined,
        plates: p.plates?.detected
          ? [{ text: '', confidence: 100, blurred: true }]
          : undefined,
      },
    }));
    this.photoService.setPhotosFromAI(photoPreviewsForService);
  }

  onVehicleAutoDetected(vehicle: VehicleAutoDetect): void {
    // Optionally auto-fill if confidence is high
    if (vehicle.confidence >= 80) {
      this.notifications.info(
        'Vehículo detectado',
        `${vehicle.brand} ${vehicle.model} (${vehicle.confidence}% confianza)`,
      );
    }
  }

  onRequestAiGeneration(): void {
    const brand = this.formService.selectedBrand()?.name;
    const model = this.formService.selectedModel()?.name;
    const year = this.formService.selectedYear();

    if (!brand || !model || !year) {
      this.notifications.warning('Fotos AI', 'Primero seleccioná marca, modelo y año');
      return;
    }

    this.photoService.generateAIPhotos(brand, model, year);
  }

  onMileageChanged(mileage: number): void {
    this.formService.setAnswer('mileage', mileage, `${mileage.toLocaleString('es-AR')} km`);
  }

  onPriceChanged(price: number): void {
    this.formService.setAnswer('price', price, `US$ ${price}/día`);
  }

  onDynamicPricingChanged(enabled: boolean): void {
    this.isDynamicPricing.set(enabled);
  }

  onLocationChanged(location: LocationAnswer): void {
    this.formService.setAnswer('location', location, `${location.city}, ${location.state}`);
  }

  onEditFromSummary(field: string): void {
    const fieldToQuestion: Record<string, QuestionId> = {
      vehicle: 'vehicle',
      photos: 'photos',
      mileage: 'mileage',
      price: 'price',
      location: 'location',
    };

    const questionId = fieldToQuestion[field];
    if (questionId) {
      this.formService.goToQuestion(questionId);
    }
  }

  // Publishing
  async publish(): Promise<void> {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);

    try {
      // Prepare form data
      const formData = this.formService.getFormData();

      // Create car
      const car = await this.carsService.createCar(formData);

      if (!car?.id) {
        throw new Error('No se pudo crear la publicación');
      }

      const carId = car.id;

      // Upload photos
      await this.photoService.uploadPhotos(carId);

      // Success!
      this.publishedCarId.set(carId);
      this.publishedCarTitle.set(
        `${this.formService.selectedBrand()?.name} ${this.formService.selectedModel()?.name} ${this.formService.selectedYear()}`,
      );
      this.showCelebration.set(true);

      // Clear draft
      this.formService.clearDraft();
    } catch (error) {
      console.error('Publish error:', error);
      this.notifications.error(
        'Error',
        error instanceof Error ? error.message : 'No se pudo publicar el auto. Intentá de nuevo.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  viewPublishedCar(): void {
    const carId = this.publishedCarId();
    if (carId) {
      this.router.navigate(['/cars', carId]);
    }
  }

  publishAnother(): void {
    this.showCelebration.set(false);
    this.formService.reset();
    this.photos.set([]);
    this.photoService.clearPhotos();
  }
}
