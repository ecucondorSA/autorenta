import { Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CarsService } from '@core/services/cars/cars.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { APP_CONSTANTS } from '@core/config/constants';

export type QuestionId =
  | 'vehicle'
  | 'year'
  | 'model'
  | 'photos'
  | 'mileage'
  | 'price'
  | 'location'
  | 'summary';

export interface ConversationalAnswer {
  questionId: QuestionId;
  value: unknown;
  displayValue: string;
  timestamp: Date;
}

/**
 * Service for managing conversational form state and navigation
 *
 * Responsibilities:
 * - Track current question/step
 * - Store answers
 * - Handle transitions
 * - Persist draft to localStorage
 * - Prepare data for submission
 */
@Injectable()
export class ConversationalFormService {
  private readonly fb = inject(FormBuilder);
  private readonly carsService = inject(CarsService);
  private readonly notifications = inject(NotificationManagerService);

  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly STORAGE_KEY = 'autorenta_publish_draft';
  private readonly QUESTIONS: QuestionId[] = [
    'vehicle',
    'year',
    'model',
    'photos',
    'mileage',
    'price',
    'location',
    'summary',
  ];

  // State
  readonly currentIndex = signal(0);
  readonly answers = signal<Map<QuestionId, ConversationalAnswer>>(new Map());
  readonly direction = signal<'forward' | 'backward'>('forward');
  readonly isTransitioning = signal(false);
  readonly isSubmitting = signal(false);

  // FIPE Data (populated from vehicle selection)
  readonly selectedBrand = signal<{ code: string; name: string } | null>(null);
  readonly selectedModel = signal<{ code: string; name: string } | null>(null);
  readonly selectedYear = signal<number | null>(null);
  readonly fipeValue = signal<number | null>(null);
  readonly suggestedPrice = signal<number | null>(null);

  // Location data
  readonly locationAddress = signal<{
    street: string;
    streetNumber: string;
    city: string;
    state: string;
    country: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);

  // Form for validation
  private formInstance: FormGroup | null = null;

  // Computed properties
  readonly currentQuestion = computed(() => this.QUESTIONS[this.currentIndex()]);
  readonly totalQuestions = computed(() => this.QUESTIONS.length);
  readonly progress = computed(() => (this.currentIndex() + 1) / this.QUESTIONS.length);
  readonly canGoBack = computed(() => this.currentIndex() > 0);
  readonly canGoForward = computed(() => this.currentIndex() < this.QUESTIONS.length - 1);
  readonly isFirstQuestion = computed(() => this.currentIndex() === 0);
  readonly isLastQuestion = computed(() => this.currentIndex() === this.QUESTIONS.length - 1);
  readonly isSummaryStep = computed(() => this.currentQuestion() === 'summary');

  readonly hasMinimumData = computed(() => {
    const ans = this.answers();
    return (
      ans.has('vehicle') && ans.has('year') && ans.has('model') && ans.has('photos') && ans.has('price')
    );
  });

  readonly missingRequirements = computed(() => {
    const ans = this.answers();
    const missing: string[] = [];
    if (!ans.has('vehicle')) missing.push('Marca del vehículo');
    if (!ans.has('year')) missing.push('Año del vehículo');
    if (!ans.has('model')) missing.push('Modelo del vehículo');
    if (!ans.has('photos')) missing.push('Fotos del vehículo');
    if (!ans.has('mileage')) missing.push('Kilometraje');
    if (!ans.has('price')) missing.push('Precio por día');
    if (!ans.has('location')) missing.push('Ubicación');
    return missing;
  });

  /**
   * Initialize the form service
   */
  initForm(): FormGroup {
    this.formInstance = this.fb.group({
      // Vehicle (from FIPE)
      brand_text_backup: ['', Validators.required],
      model_text_backup: ['', Validators.required],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(1980)]],

      // Technical (with smart defaults)
      mileage: [null, [Validators.required, Validators.min(0)]],
      transmission: ['automatic'],
      fuel: ['nafta'],
      color: [''],
      description: [''],

      // Rental rules (smart defaults - unlimited km is most popular)
      mileage_limit: [0], // 0 = Unlimited
      extra_km_price: [0], // No extra since unlimited
      fuel_policy: ['full_to_full'],
      allow_second_driver: [false],
      max_anticipation_days: [90],

      // Pricing
      pricing_strategy: ['dynamic'],
      price_per_day: [
        null,
        [
          Validators.required,
          Validators.min(APP_CONSTANTS.MIN_DAILY_RATE_USD),
          Validators.max(APP_CONSTANTS.MAX_DAILY_RATE_USD),
        ],
      ],
      currency: ['USD'],
      value_usd: [null],
      deposit_required: [true],
      deposit_amount: [0], // Calculated as 7% of car value
      auto_approval: [false],

      // Location
      location_street: [''],
      location_street_number: [''],
      location_city: [''],
      location_state: [''],
      location_country: ['AR'],

      // Availability
      availability_start_date: [this.todayISO()],
      availability_end_date: [this.nextYearISO()],
    });

    // Try to restore draft
    this.restoreDraft();

    return this.formInstance;
  }

  /**
   * Get form instance
   */
  getForm(): FormGroup {
    if (!this.formInstance) {
      throw new Error('Form not initialized. Call initForm() first.');
    }
    return this.formInstance;
  }

  /**
   * Navigate to next question
   */
  async goNext(): Promise<void> {
    if (!this.canGoForward() || this.isTransitioning()) return;

    this.direction.set('forward');
    this.isTransitioning.set(true);

    // Save current answer
    this.saveDraft();

    await this.animationDelay();
    this.currentIndex.update((i) => Math.min(i + 1, this.QUESTIONS.length - 1));
    this.isTransitioning.set(false);
  }

  /**
   * Navigate to previous question
   */
  async goBack(): Promise<void> {
    if (!this.canGoBack() || this.isTransitioning()) return;

    this.direction.set('backward');
    this.isTransitioning.set(true);

    await this.animationDelay();
    this.currentIndex.update((i) => Math.max(i - 1, 0));
    this.isTransitioning.set(false);
  }

  /**
   * Jump to specific question
   */
  async goToQuestion(questionId: QuestionId): Promise<void> {
    const index = this.QUESTIONS.indexOf(questionId);
    if (index === -1 || index === this.currentIndex() || this.isTransitioning()) return;

    this.direction.set(index > this.currentIndex() ? 'forward' : 'backward');
    this.isTransitioning.set(true);

    await this.animationDelay();
    this.currentIndex.set(index);
    this.isTransitioning.set(false);
  }

  /**
   * Set answer for a question
   */
  setAnswer(questionId: QuestionId, value: unknown, displayValue: string): void {
    const answer: ConversationalAnswer = {
      questionId,
      value,
      displayValue,
      timestamp: new Date(),
    };

    this.answers.update((map) => {
      const newMap = new Map(map);
      newMap.set(questionId, answer);
      return newMap;
    });

    // Update form values based on question
    this.syncFormFromAnswer(questionId, value);

    // Save draft
    this.saveDraft();
  }

  /**
   * Get answer for a question
   */
  getAnswer(questionId: QuestionId): ConversationalAnswer | undefined {
    return this.answers().get(questionId);
  }

  /**
   * Clear answer for a question
   */
  clearAnswer(questionId: QuestionId): void {
    this.answers.update((map) => {
      const newMap = new Map(map);
      newMap.delete(questionId);
      return newMap;
    });
  }

  /**
   * Prepare form data for submission
   */
  getFormData(): Record<string, unknown> {
    if (!this.formInstance) {
      throw new Error('Form not initialized');
    }

    const rawValue = this.formInstance.getRawValue();
    const brand = this.selectedBrand();
    const model = this.selectedModel();
    const year = this.selectedYear();
    const location = this.locationAddress();

    // Generate description if empty
    const description =
      rawValue.description ||
      this.generateDescription(brand?.name || '', model?.name || '', year || 0, rawValue.mileage);

    return {
      // Vehicle
      brand_id: null,
      model_id: null,
      brand_text_backup: brand?.name || rawValue.brand_text_backup,
      model_text_backup: model?.name || rawValue.model_text_backup,
      year: year || rawValue.year,
      color: rawValue.color || 'No especificado',
      mileage: rawValue.mileage,
      transmission: rawValue.transmission,
      fuel: rawValue.fuel,

      // Rental rules (smart defaults - unlimited km)
      mileage_limit: rawValue.mileage_limit ?? 0, // 0 = Unlimited
      extra_km_price: rawValue.extra_km_price ?? 0,
      fuel_policy: rawValue.fuel_policy || 'full_to_full',
      allow_second_driver: rawValue.allow_second_driver ?? false,
      second_driver_cost: 10,
      max_anticipation_days: rawValue.max_anticipation_days ?? 90,

      // Pricing
      price_per_day: rawValue.price_per_day,
      currency: rawValue.currency,
      value_usd: this.fipeValue() || rawValue.value_usd,
      uses_dynamic_pricing: rawValue.pricing_strategy === 'dynamic',
      min_rental_days: 1,
      max_rental_days: 30,
      deposit_required: rawValue.deposit_required ?? true,
      // Deposit: 7% of car value for pre-auth, 0% for Wallet
      deposit_amount: rawValue.deposit_amount || Math.round((this.fipeValue() || 0) * 0.07),
      insurance_included: false,
      auto_approval: rawValue.auto_approval ?? false,

      // Location
      location_street: location?.street || rawValue.location_street,
      location_street_number: location?.streetNumber || rawValue.location_street_number,
      location_city: location?.city || rawValue.location_city,
      location_state: location?.state || rawValue.location_state,
      location_country: location?.country || rawValue.location_country || 'AR',
      location_lat: location?.latitude || rawValue.location_lat,
      location_lng: location?.longitude || rawValue.location_lng,

      // Generated
      title: `${brand?.name || ''} ${model?.name || ''} ${year || ''}`.trim(),
      description,
      seats: 5,
      doors: 4,
      features: {},
      fuel_type: rawValue.fuel,
      location_province: location?.state || rawValue.location_state,
      rating_avg: 0,
      rating_count: 0,
      availability_start_date: rawValue.availability_start_date || this.todayISO(),
      availability_end_date: rawValue.availability_end_date || this.nextYearISO(),
    };
  }

  /**
   * Save draft to localStorage
   */
  saveDraft(): void {
    if (!this.isBrowser) return;
    try {
      const draft = {
        currentIndex: this.currentIndex(),
        answers: Array.from(this.answers().entries()),
        selectedBrand: this.selectedBrand(),
        selectedModel: this.selectedModel(),
        selectedYear: this.selectedYear(),
        fipeValue: this.fipeValue(),
        suggestedPrice: this.suggestedPrice(),
        locationAddress: this.locationAddress(),
        formValues: this.formInstance?.getRawValue(),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save draft:', e);
    }
  }

  /**
   * Restore draft from localStorage
   */
  restoreDraft(): boolean {
    if (!this.isBrowser) return false;
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return false;

      const draft = JSON.parse(saved);

      // Check if draft is recent (within 24 hours)
      const savedAt = new Date(draft.savedAt);
      const hoursSince = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince > 24) {
        this.clearDraft();
        return false;
      }

      // Restore state
      if (draft.currentIndex !== undefined) {
        this.currentIndex.set(draft.currentIndex);
      }
      if (draft.answers) {
        this.answers.set(new Map(draft.answers));
      }
      if (draft.selectedBrand) {
        this.selectedBrand.set(draft.selectedBrand);
      }
      if (draft.selectedModel) {
        this.selectedModel.set(draft.selectedModel);
      }
      if (draft.selectedYear) {
        this.selectedYear.set(draft.selectedYear);
      }
      if (draft.fipeValue) {
        this.fipeValue.set(draft.fipeValue);
      }
      if (draft.suggestedPrice) {
        this.suggestedPrice.set(draft.suggestedPrice);
      }
      if (draft.locationAddress) {
        this.locationAddress.set(draft.locationAddress);
      }
      if (draft.formValues && this.formInstance) {
        this.formInstance.patchValue(draft.formValues);
      }

      this.notifications.show({
        title: 'Borrador',
        message: 'Retomamos donde lo dejaste',
        type: 'info',
        duration: 7000,
        data: {
          kind: 'draft',
        },
      });
      return true;
    } catch (e) {
      console.warn('Failed to restore draft:', e);
      return false;
    }
  }

  /**
   * Clear draft from localStorage
   */
  clearDraft(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Reset form state
   */
  reset(): void {
    this.currentIndex.set(0);
    this.answers.set(new Map());
    this.selectedBrand.set(null);
    this.selectedModel.set(null);
    this.selectedYear.set(null);
    this.fipeValue.set(null);
    this.suggestedPrice.set(null);
    this.locationAddress.set(null);
    this.clearDraft();
    if (this.formInstance) {
      this.formInstance.reset();
    }
  }

  /**
   * Sync form values from answer
   */
  private syncFormFromAnswer(questionId: QuestionId, value: unknown): void {
    if (!this.formInstance) return;

    switch (questionId) {
      case 'vehicle':
        if (typeof value === 'object' && value !== null) {
          const brand = value as { code: string; name: string };
          this.selectedBrand.set(brand);
          this.formInstance.patchValue({ brand_text_backup: brand.name });
        }
        break;
      case 'year':
        if (typeof value === 'number') {
          this.selectedYear.set(value);
          this.formInstance.patchValue({ year: value });
        }
        break;
      case 'model':
        if (typeof value === 'object' && value !== null) {
          const model = value as { code: string; name: string };
          this.selectedModel.set(model);
          this.formInstance.patchValue({ model_text_backup: model.name });
        }
        break;
      case 'mileage':
        if (typeof value === 'number') {
          this.formInstance.patchValue({ mileage: value });
        }
        break;
      case 'price':
        if (typeof value === 'number') {
          this.formInstance.patchValue({ price_per_day: value });
        }
        break;
      case 'location':
        if (typeof value === 'object' && value !== null) {
          const loc = value as {
            street: string;
            streetNumber: string;
            city: string;
            state: string;
            country: string;
            latitude?: number;
            longitude?: number;
          };
          this.locationAddress.set({
            street: loc.street,
            streetNumber: loc.streetNumber,
            city: loc.city,
            state: loc.state,
            country: loc.country,
            latitude: loc.latitude,
            longitude: loc.longitude,
          });
          this.formInstance.patchValue({
            location_street: loc.street,
            location_street_number: loc.streetNumber,
            location_city: loc.city,
            location_state: loc.state,
            location_country: loc.country,
          });
        }
        break;
    }
  }

  /**
   * Generate AI description
   */
  private generateDescription(brand: string, model: string, year: number, mileage: number): string {
    const parts: string[] = [];

    if (brand && model && year) {
      parts.push(`${brand} ${model} ${year}`);
    }

    if (mileage) {
      if (mileage < 30000) {
        parts.push('con bajo kilometraje');
      } else if (mileage < 80000) {
        parts.push('en excelente estado');
      } else {
        parts.push('muy bien mantenido');
      }
    }

    parts.push('Disponible para alquiler');
    parts.push('Ideal para viajes y uso diario');

    return parts.join('. ') + '.';
  }

  private animationDelay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 400));
  }

  private todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private nextYearISO(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
  }
}
