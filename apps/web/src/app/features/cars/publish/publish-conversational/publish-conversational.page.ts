import {
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup } from '@angular/forms';

// Core services
import { isPermissionError, isSupabaseError } from '@core/errors';
import { AuthService } from '@core/services/auth/auth.service';
import { CarsService } from '@core/services/cars/cars.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { VehiclePosition } from '@core/services/ai/photo-quality.service';
import { VerificationStateService } from '@core/services/verification/verification-state.service';

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
    <div class="min-h-screen bg-gradient-to-b from-surface-primary to-surface-secondary pb-safe">
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
      <main class="max-w-lg mx-auto px-4 py-6 sm:py-12">
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
                [initialPhotos]="photos()"
                [isGeneratingAI]="photoService.isGeneratingAIPhotos()"
                [generationCountdown]="photoService.aiGenerationCountdown()"
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

      <!-- Loading overlay with progress -->
      @if (isSubmitting()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div class="bg-surface-raised rounded-2xl p-8 shadow-2xl text-center min-w-[280px]">
            @if (publishingStep() === 'error') {
              <!-- Error state -->
              <div class="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p class="mt-4 text-red-600 font-semibold">Error</p>
              <p class="text-sm text-text-muted mt-2 max-w-xs">{{ publishingMessage() }}</p>
              <button (click)="isSubmitting.set(false)" class="mt-4 px-4 py-2 bg-cta-default text-white rounded-lg text-sm font-medium">
                Cerrar
              </button>
            } @else {
              <!-- Progress state -->
              <svg class="animate-spin h-12 w-12 mx-auto text-cta-default" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="mt-4 text-text-primary font-semibold">{{ publishingMessage() }}</p>
              <!-- Progress steps -->
              <div class="flex justify-center gap-2 mt-4">
                <div class="w-2 h-2 rounded-full" [class]="publishingStep() === 'validating' ? 'bg-cta-default animate-pulse' : (publishingStep() === 'creating' || publishingStep() === 'uploading' || publishingStep() === 'success' ? 'bg-green-500' : 'bg-gray-300')"></div>
                <div class="w-2 h-2 rounded-full" [class]="publishingStep() === 'creating' ? 'bg-cta-default animate-pulse' : (publishingStep() === 'uploading' || publishingStep() === 'success' ? 'bg-green-500' : 'bg-gray-300')"></div>
                <div class="w-2 h-2 rounded-full" [class]="publishingStep() === 'uploading' ? 'bg-cta-default animate-pulse' : (publishingStep() === 'success' ? 'bg-green-500' : 'bg-gray-300')"></div>
              </div>
            }
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
  readonly photoService = inject(PublishCarPhotoService);
  private readonly locationService = inject(PublishCarLocationService);
  private readonly carsService = inject(CarsService);
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationManagerService);
  private readonly router = inject(Router);
  private readonly verificationState = inject(VerificationStateService);

  // State
  readonly isSubmitting = signal(false);
  readonly showCelebration = signal(false);
  readonly publishedCarId = signal<string | null>(null);
  readonly publishedCarTitle = signal<string | null>(null);
  readonly isDynamicPricing = signal(true);
  readonly photos = signal<PhotoWithAI[]>([]);

  // Form
  private publishForm!: FormGroup;

  constructor() {
    // Sync AI-generated photos from service to local state
    effect(() => {
      const servicePhotos = this.photoService.uploadedPhotos();
      if (servicePhotos.length > 0) {
        // Convert service photos to PhotoWithAI format
        const aiPhotos: PhotoWithAI[] = servicePhotos.map((p, i) => ({
          id: crypto.randomUUID(),
          file: p.file,
          preview: p.preview,
          position: (p.position as PhotoPosition) || this.guessPosition(i),
          status: 'valid' as const,
          progress: 100,
        }));
        this.photos.set(aiPhotos);
      }
    });
  }

  private guessPosition(index: number): PhotoPosition {
    const positions: PhotoPosition[] = ['cover', 'front', 'rear', 'left', 'right', 'interior', 'dashboard', 'trunk'];
    return positions[index] || 'detail';
  }

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
    this.notifications.show({
      title: 'Borrador',
      message: 'Tu progreso se guardó correctamente',
      type: 'success',
      duration: 6000,
      data: {
        kind: 'draft',
      },
    });
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

  // Publishing state
  readonly publishingStep = signal<'idle' | 'validating' | 'creating' | 'uploading' | 'success' | 'error'>('idle');
  readonly publishingMessage = signal('');

  // Publishing
  async publish(): Promise<void> {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.publishingStep.set('validating');
    this.publishingMessage.set('Validando información...');

    try {
      // Auth-first: don't attempt any write if we don't have a valid session.
      const session = await this.authService.ensureSession();
      if (!session?.user?.id) {
        throw new Error('Usuario no autenticado');
      }

      // Step 1: Prepare and validate form data
      const formData = this.formService.getFormData();

      // Validate required fields
      if (!formData['price_per_day'] || (formData['price_per_day'] as number) <= 0) {
        throw new Error('El precio por día es requerido y debe ser mayor a 0');
      }
      if (!formData['location_lat'] || !formData['location_lng']) {
        throw new Error('La ubicación es requerida. Seleccioná una ubicación en el mapa.');
      }

      // Step 2: Create car
      this.publishingStep.set('creating');
      this.publishingMessage.set('Creando publicación...');

      // Publishing policy: if documents/identity verification (level 2) is incomplete, publish as pending.
      const progress = await this.verificationState.refreshProgress(true);
      const canActivate =
        !!progress?.requirements?.level_2?.completed;
      (formData as Record<string, unknown>)['status'] = canActivate ? 'active' : 'pending';

      const car = await this.carsService.createCar(formData);

      if (!car?.id) {
        throw new Error('No se pudo crear la publicación. Intentá de nuevo.');
      }

      const carId = car.id;

      // Step 3: Upload photos
      const photos = this.photoService.uploadedPhotos();
      if (photos.length > 0) {
        this.publishingStep.set('uploading');
        this.publishingMessage.set(`Subiendo ${photos.length} foto(s)...`);
        await this.photoService.uploadPhotos(carId);
      }

      // Step 4: Success!
      this.publishingStep.set('success');
      this.publishingMessage.set('¡Publicación exitosa!');
      this.publishedCarId.set(carId);
      this.publishedCarTitle.set(
        `${this.formService.selectedBrand()?.name} ${this.formService.selectedModel()?.name} ${this.formService.selectedYear()}`,
      );
      this.showCelebration.set(true);

      // Clear draft
      this.formService.clearDraft();

      // Success notification
      this.notifications.show({
        title: '¡Auto publicado!',
        message: canActivate
          ? 'Tu auto ya está visible en el marketplace'
          : 'Tu auto se publico, pero estara limitado hasta completar tu verificacion',
        type: 'success',
        duration: 5000,
      });
    } catch (error) {
      this.publishingStep.set('error');
      console.error('Publish error:', error);

      // Parse specific error types for better UX
      const errorMessage = this.parsePublishError(error);
      this.publishingMessage.set(errorMessage);

      this.notifications.error('Error al publicar', errorMessage);

      // Session expired or not available: send user back to login and keep return URL.
      // (AuthGuard should normally prevent this, but publish is a critical action.)
      const errMsg =
        error instanceof Error
          ? error.message
          : isSupabaseError(error)
            ? String(error.message || '')
            : '';

      if (
        errMsg.toLowerCase().includes('usuario no autenticado') ||
        errMsg.toLowerCase().includes('not authenticated') ||
        errMsg.toLowerCase().includes('jwt') ||
        (isSupabaseError(error) && isPermissionError(error))
      ) {
        await this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/cars/publish' } });
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Parse publish errors for user-friendly messages
   */
  private parsePublishError(error: unknown): string {
    // Supabase/PostgREST errors are often plain objects (not `Error` instances).
    // Normalize them first to avoid showing a generic "Error inesperado".
    if (isSupabaseError(error) && !(error instanceof Error)) {
      const msg = String(error.message || '');
      const lower = msg.toLowerCase();

      if (msg.includes('PGRST204') || lower.includes('schema cache')) {
        return 'Error de sincronización. Por favor recargá la página e intentá de nuevo.';
      }

      if (isPermissionError(error) || lower.includes('unauthorized') || lower.includes('jwt')) {
        return 'Tu sesión expiró o no tenés permisos para publicar. Iniciá sesión de nuevo.';
      }

      if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('fetch')) {
        return 'Error de conexión. Verificá tu internet e intentá de nuevo.';
      }

      return msg || 'Error inesperado. Por favor intentá de nuevo.';
    }

    if (error instanceof Error) {
      const msg = error.message;

      // PostgREST schema cache errors
      if (msg.includes('PGRST204') || msg.includes('schema cache')) {
        return 'Error de sincronización. Por favor recargá la página e intentá de nuevo.';
      }

      // Network errors
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        return 'Error de conexión. Verificá tu internet e intentá de nuevo.';
      }

      // Validation errors
      if (msg.includes('required') || msg.includes('requerido')) {
        return msg;
      }

      // RLS/Permission errors
      if (msg.includes('row-level security') || msg.includes('permission denied')) {
        return 'No tenés permisos para publicar. Verificá tu cuenta.';
      }

      // Auth errors
      if (msg.toLowerCase().includes('usuario no autenticado') || msg.toLowerCase().includes('not authenticated')) {
        return 'Tu sesión expiró. Iniciá sesión de nuevo para publicar.';
      }

      return msg;
    }

    return 'Error inesperado. Por favor intentá de nuevo.';
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
