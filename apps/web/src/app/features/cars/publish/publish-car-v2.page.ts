import { LoggerService } from '@core/services/infrastructure/logger.service';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CarsService } from '@core/services/cars/cars.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { PricingService } from '@core/services/payments/pricing.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { FipeAutocompleteComponent } from '../../../shared/components/fipe-autocomplete/fipe-autocomplete.component';
import { HostSupportInfoPanelComponent } from '../../../shared/components/host-support-info-panel/host-support-info-panel.component';
import { StockPhotosSelectorComponent } from '../../../shared/components/stock-photos-selector/stock-photos-selector.component';

// ✅ NEW: Extracted services
import { CarOwnerNotificationsService } from '@core/services/cars/car-owner-notifications.service';
import { VehicleDocumentsService } from '@core/services/verification/vehicle-documents.service';
import { PublishCarFormService } from './services/publish-car-form.service';
import { PublishCarLocationService } from './services/publish-car-location.service';
import { PublishCarMpOnboardingService } from './services/publish-car-mp-onboarding.service';
import { PublishCarPhotoService } from './services/publish-car-photo.service';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    StockPhotosSelectorComponent,
    AiPhotoGeneratorComponent,
    FipeAutocompleteComponent,
    HostSupportInfoPanelComponent,
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
  private readonly logger = inject(LoggerService);
  // Core services
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly carsService = inject(CarsService);
  private readonly pricingService = inject(PricingService);
  private readonly notificationManager = inject(NotificationManagerService);

  // Feature services
  private readonly formService = inject(PublishCarFormService);
  private readonly photoService = inject(PublishCarPhotoService);
  private readonly locationService = inject(PublishCarLocationService);
  private readonly mpService = inject(PublishCarMpOnboardingService);
  private readonly documentsService = inject(VehicleDocumentsService);
  private readonly carOwnerNotifications = inject(CarOwnerNotificationsService);
  private readonly supabase = inject(SupabaseClientService).getClient();
  private readonly destroyRef = inject(DestroyRef);

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
  readonly maxYear = new Date().getFullYear(); // ✅ Changed: removed +1 to avoid showing future years

  // ✅ Feature flag: FIPE validation is optional (false = optional, true = required)
  readonly REQUIRE_FIPE_VALIDATION = false;

  // Computed
  readonly selectedModelInfo = computed(() => {
    const modelId = this.publishForm?.get('model_id')?.value;
    if (!modelId) return null;
    return this.formService.getSelectedModelInfo(modelId);
  });

  // Expose dynamic pricing signal from service
  readonly isDynamicPricingSignal = this.formService.isDynamicPricingSignal();

  // FIPE value signals (for UI state)
  readonly valueAutoCalculated = signal(false);
  readonly isFetchingFIPEValue = signal(false);
  readonly fipeError = signal<string | null>(null);
  readonly fipeErrorCode = signal<string | null>(null); // ✅ NEW: Machine-readable error code
  readonly fipeSuggestions = signal<string[]>([]); // ✅ NEW: Actionable suggestions
  readonly allowManualValueEdit = signal(true);
  readonly fipeMultiCurrencyValues = signal<Record<string, unknown> | null>(null);
  readonly selectedFIPEBrand = signal<{ code: string; name: string } | null>(null);
  readonly selectedFIPEModel = signal<{ code: string; name: string } | null>(null);
  readonly suggestedPrice = signal<number | null>(null);
  readonly selectedCategoryName = signal<string>('');
  readonly isCalculatingSuggestedPrice = signal(false);
  readonly pricingOverrides = signal<{ day: string; price_per_day: number }[]>([]);

  // ✅ NEW: Control submit button availability - Requiere marca, modelo, año, 3 fotos y ubicación
  // Verifica tanto valores del formulario (brand_id/model_id o brand_text_backup/model_text_backup) como signals FIPE
  readonly canSubmit = computed(() => {
    // Verificar valores del formulario tradicional (UUIDs)
    const brandId = this.publishForm?.get('brand_id')?.value;
    const modelId = this.publishForm?.get('model_id')?.value;

    // Verificar valores de texto backup (para FIPE)
    const brandTextBackup = this.publishForm?.get('brand_text_backup')?.value;
    const modelTextBackup = this.publishForm?.get('model_text_backup')?.value;

    // Verificar valores FIPE (nuevo sistema)
    const fipeBrand = this.selectedFIPEBrand();
    const fipeModel = this.selectedFIPEModel();

    // Aceptar cualquiera de los sistemas: UUIDs, texto backup, o FIPE signals
    const hasBrand = !!(brandId || brandTextBackup || (fipeBrand && fipeBrand.name));
    const hasModel = !!(modelId || modelTextBackup || (fipeModel && fipeModel.name));

    const year = this.publishForm?.get('year')?.value;
    const hasPhotos = this.photoService.hasMinimumPhotos();
    const description = this.publishForm?.get('description')?.value;
    const availabilityStart = this.publishForm?.get('availability_start_date')?.value;
    const availabilityEnd = this.publishForm?.get('availability_end_date')?.value;

    // ✅ CRITICAL: Ubicación es obligatoria para aparecer en búsquedas
    const hasLocation = this.hasValidLocation();

    const hasDescription = !!(description && description.trim().length >= 40);
    const hasAvailability =
      !!availabilityStart &&
      !!availabilityEnd &&
      new Date(availabilityStart) <= new Date(availabilityEnd);

    // Bloquear si falta alguno de los requisitos
    return !!(
      hasBrand &&
      hasModel &&
      year &&
      hasPhotos &&
      hasLocation &&
      hasDescription &&
      hasAvailability
    );
  });

  // ✅ NEW: Draft saving capability (Minimal requirements: Brand + Model)
  readonly canSaveDraft = computed(() => {
    const brandId = this.publishForm?.get('brand_id')?.value;
    const modelId = this.publishForm?.get('model_id')?.value;
    const brandTextBackup = this.publishForm?.get('brand_text_backup')?.value;
    const modelTextBackup = this.publishForm?.get('model_text_backup')?.value;
    const fipeBrand = this.selectedFIPEBrand();
    const fipeModel = this.selectedFIPEModel();

    const hasBrand = !!(brandId || brandTextBackup || (fipeBrand && fipeBrand.name));
    const hasModel = !!(modelId || modelTextBackup || (fipeModel && fipeModel.name));

    return hasBrand && hasModel;
  });

  // ✅ NEW: Check if we have valid location coordinates
  readonly hasValidLocation = computed(() => {
    const coordinates = this.locationService.getCoordinates();
    return !!(coordinates?.latitude && coordinates?.longitude);
  });

  // ✅ NEW: Show explicit pending requirements in UI
  readonly missingRequirements = computed(() => {
    const missing: string[] = [];

    const brandId = this.publishForm?.get('brand_id')?.value;
    const modelId = this.publishForm?.get('model_id')?.value;
    const brandTextBackup = this.publishForm?.get('brand_text_backup')?.value;
    const modelTextBackup = this.publishForm?.get('model_text_backup')?.value;
    const fipeBrand = this.selectedFIPEBrand();
    const fipeModel = this.selectedFIPEModel();
    const year = this.publishForm?.get('year')?.value;

    const hasBrand = !!(brandId || brandTextBackup || (fipeBrand && fipeBrand.name));
    const hasModel = !!(modelId || modelTextBackup || (fipeModel && fipeModel.name));
    const description = this.publishForm?.get('description')?.value;
    const availabilityStart = this.publishForm?.get('availability_start_date')?.value;
    const availabilityEnd = this.publishForm?.get('availability_end_date')?.value;

    if (!hasBrand) missing.push('Marca');
    if (!hasModel) missing.push('Modelo');
    if (!year) missing.push('Año');
    if (!this.photoService.hasMinimumPhotos()) missing.push('Mínimo 3 fotos');
    if (!this.hasValidLocation()) missing.push('Ubicación en el mapa');
    if (!description || description.trim().length < 40)
      missing.push('Descripción (min. 40 caracteres)');
    if (!availabilityStart || !availabilityEnd) {
      missing.push('Rango de disponibilidad');
    } else if (!this.isAvailabilityRangeValid()) {
      missing.push('Fechas de disponibilidad válidas');
    }

    return missing;
  });

  // Submit habilitado con datos mínimos; MP recomendado pero no bloquea
  readonly canSubmitWithPayments = computed(() => this.canSubmit());
  readonly publishBlockerMessage = computed(() => {
    if (this.mpStatusLoading()) return null;
    if (!this.mpReady()) {
      return 'Conecta Mercado Pago para cobrar (puedes publicar igual).';
    }
    return null;
  });

  // FIPE autocomplete signals
  readonly fipeBrands = signal<{ code: string; name: string }[]>([]);
  readonly fipeModels = signal<{ code: string; name: string }[]>([]);
  readonly isLoadingFIPEBrands = signal(false);
  readonly isLoadingFIPEModels = signal(false);

  // Year options (2013-2025)
  // ✅ Generate years dynamically from current year back 12 years
  readonly yearOptions = Array.from({ length: 13 }, (_, i) => new Date().getFullYear() - i);

  // Helper to validate disponibilidad
  readonly isAvailabilityRangeValid = computed(() => {
    const start = this.publishForm?.get('availability_start_date')?.value;
    const end = this.publishForm?.get('availability_end_date')?.value;

    if (!start || !end) return false;

    const startDate = new Date(start);
    const endDate = new Date(end);
    return startDate <= endDate;
  });

  async ngOnInit(): Promise<void> {
    // Initialize form
    this.publishForm = this.formService.initForm();

    // ✅ NEW: Listen to category_id changes to update selectedCategoryName
    this.publishForm
      .get('category_id')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async (categoryId) => {
        if (categoryId) {
          await this.updateCategoryName(categoryId);
        } else {
          this.selectedCategoryName.set('');
        }
      });

    // Check if editing
    this['carId'] = this.route.snapshot.paramMap.get('id');
    if (this['carId']) {
      this.editMode.set(true);
    }

    // Load brands and models
    await this.formService.loadBrandsAndModels();

    // ✅ CRITICAL: Load FIPE brands for autocomplete
    await this.loadFIPEBrands();

    // Load car data if editing
    if (this['carId']) {
      const loaded = await this.formService.loadCarForEditing(this['carId']);
      if (!loaded) {
        alert('No se pudo cargar el auto');
        await this.router.navigate(['/cars/my-cars']);
        return;
      }
      await this.photoService.loadExistingPhotos(this['carId']);
      await this.loadPricingOverrides(this['carId']);
    } else {
      // Auto-fill from last car
      await this.formService.autoFillFromLastCar();
    }
  }

  /**
   * ✅ NEW: Update selectedCategoryName when category_id changes
   */
  private async updateCategoryName(categoryId: string): Promise<void> {
    try {
      this.logger.debug('[PublishCarV2] updateCategoryName called with categoryId:', categoryId);
      const categories = await this.pricingService.getVehicleCategories();
      this.logger.debug('[PublishCarV2] Loaded categories:', categories.length);
      const category = categories.find((c) => c['id'] === categoryId);
      if (category) {
        const categoryName =
          (category as { name_es?: string; name: string }).name_es || category.name;
        this.logger.debug('[PublishCarV2] ✅ Category name updated:', categoryName);
        this.selectedCategoryName.set(categoryName);
      } else {
        console.warn('[PublishCarV2] ⚠️ Category not found for ID:', categoryId);
      }
    } catch (error) {
      console.error('[PublishCarV2] ❌ Error updating category name:', error);
    }
  }

  private async loadPricingOverrides(carId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('pricing_overrides')
        .select('day, price_per_day')
        .eq('car_id', carId)
        .order('day', { ascending: true });
      if (error) throw error;
      this.pricingOverrides.set((data as { day: string; price_per_day: number }[]) || []);
    } catch (err) {
      console.warn('pricing-overrides-load', err);
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
   * Check if dynamic pricing is enabled (legacy method)
   */
  isDynamicPricing(): boolean {
    return this.formService.isDynamicPricing();
  }

  /**
   * Enable manual editing of value_usd field
   */
  enableManualValueEdit(): void {
    this.allowManualValueEdit.set(true);
  }

  /**
   * ✅ NEW: Load FIPE brands from API
   */
  async loadFIPEBrands(): Promise<void> {
    this.isLoadingFIPEBrands.set(true);
    try {
      const brands = await this.pricingService.getFipeBrands();
      this.logger.debug('[PublishCarV2] Loaded FIPE brands:', brands.length);

      // Convert to FIPEAutocompleteOption format
      const formattedBrands = brands.map((brand) => ({
        code: brand.code,
        name: brand.name,
      }));

      this.fipeBrands.set(formattedBrands);
      this.logger.debug('[PublishCarV2] Formatted brands:', formattedBrands.slice(0, 5));
    } catch (error) {
      console.error('[PublishCarV2] Error loading FIPE brands:', error);
      this.fipeBrands.set([]);
    } finally {
      this.isLoadingFIPEBrands.set(false);
    }
  }

  /**
   * Handle FIPE brand selection
   */
  async onFIPEBrandSelected(brand: { code: string; name: string } | null): Promise<void> {
    this.logger.debug('[PublishCarV2] Brand selected:', brand);
    this.selectedFIPEBrand.set(brand);
    this.selectedFIPEModel.set(null);
    this.fipeModels.set([]);

    // ✅ CRITICAL: brand_id y model_id son UUIDs, NO códigos FIPE
    // Los códigos FIPE se guardan en fipe_code y los nombres en brand_text_backup/model_text_backup
    // Por ahora, dejamos brand_id/model_id como null y usamos los campos de texto
    this.publishForm?.get('brand_id')?.setValue(null);
    this.publishForm?.get('model_id')?.setValue(null);

    // Guardar nombre de marca en brand_text_backup (para backward compatibility)
    if (brand && brand.name) {
      this.publishForm?.patchValue({
        brand_text_backup: brand.name,
      });
    }

    // Load models for selected brand
    if (brand && brand.code) {
      this.isLoadingFIPEModels.set(true);
      try {
        const models = await this.pricingService.getFipeModels(brand.code);
        this.logger.debug('[PublishCarV2] Loaded models for brand:', models.length);

        // Convert to FIPEAutocompleteOption format
        const formattedModels = models.map((model) => ({
          code: model.code,
          name: model.name,
        }));

        this.fipeModels.set(formattedModels);
      } catch (error) {
        console.error('[PublishCarV2] Error loading FIPE models:', error);
        this.fipeModels.set([]);
      } finally {
        this.isLoadingFIPEModels.set(false);
      }
    }
  }

  /**
   * Handle FIPE model selection
   */
  async onFIPEModelSelected(model: { code: string; name: string } | null): Promise<void> {
    this.logger.debug('[PublishCarV2] Model selected:', model);
    this.selectedFIPEModel.set(model);

    // ✅ CRITICAL: model_id es UUID, NO código FIPE
    // Guardar nombre de modelo en model_text_backup (para backward compatibility)
    this.publishForm?.get('model_id')?.setValue(null);

    if (model && model.name) {
      this.publishForm?.patchValue({
        model_text_backup: model.name,
      });
    }

    // Fetch vehicle value from FIPE API when we have brand, model, and year
    await this.fetchFIPEValue();
  }

  /**
   * Handle year change (trigger FIPE value fetch)
   */
  async onYearChange(): Promise<void> {
    const year = this.publishForm?.get('year')?.value;
    this.logger.debug('[PublishCarV2] Year changed to:', year);

    // Re-fetch FIPE value if we have all required data
    if (year && this.selectedFIPEBrand() && this.selectedFIPEModel()) {
      await this.fetchFIPEValue();
    }
  }

  /**
   * ✅ NEW: Fetch FIPE value when brand, model, and year are available
   */
  async fetchFIPEValue(): Promise<void> {
    const brand = this.selectedFIPEBrand();
    const model = this.selectedFIPEModel();
    const year = this.publishForm?.get('year')?.value;

    // Need all three to fetch value
    if (!brand || !model || !year) {
      this.logger.debug('[PublishCarV2] Cannot fetch FIPE value - missing data:', {
        brand: !!brand,
        model: !!model,
        year: !!year,
      });
      return;
    }

    this.logger.debug('[PublishCarV2] Fetching FIPE value for:', {
      brand: brand.name,
      model: model.name,
      year,
    });

    this.isFetchingFIPEValue.set(true);
    this.fipeError.set(null);
    this.fipeErrorCode.set(null);
    this.fipeSuggestions.set([]);

    try {
      const result = await this.pricingService.getFipeValueRealtime({
        brand: brand.name,
        model: model.name,
        year: year,
        country: 'AR',
      });

      this.logger.debug('[PublishCarV2] FIPE value result:', result);

      if (result && result.success && result.data) {
        // Store multi-currency values
        this.fipeMultiCurrencyValues.set({
          value_brl: result.data.value_brl,
          value_usd: result.data.value_usd,
          value_ars: result.data.value_ars,
          fipe_code: result.data.fipe_code,
          reference_month: result.data.reference_month,
        });

        // Ensure value_usd is a number
        const valueUsd = Number(result.data.value_usd);
        if (isNaN(valueUsd) || valueUsd <= 0) {
          console.error(
            '[PublishCarV2] Invalid value_usd from pricing API:',
            result.data.value_usd,
          );
          this.fipeError.set(
            'No se pudo calcular el valor automáticamente. Podés ingresarlo manualmente.',
          );

          // ✅ REMOVED: No longer blocking submit - FIPE is optional
          return;
        }

        // Auto-fill the value_usd field
        this.publishForm.get('value_usd')?.setValue(valueUsd, {
          emitEvent: true, // ✅ FIX: Trigger valueChanges to recalculate price
        });

        // ✅ NEW: Auto-categorize vehicle based on value USD
        this.logger.debug('[PublishCarV2] Calling autoCategorizeVehicle with:', {
          valueUsd,
          brand: brand.name,
          model: model.name,
          year,
        });
        await this.autoCategorizeVehicle(valueUsd, brand.name, model.name, year);

        // Mark as auto-calculated
        this.valueAutoCalculated.set(true);
        this.allowManualValueEdit.set(false);
        this.fipeError.set(null);
        this.fipeErrorCode.set(null);
        this.fipeSuggestions.set([]);

        // ✅ CRITICAL: Force price calculation after setting value_usd
        if (this.isDynamicPricing()) {
          setTimeout(async () => {
            await this.calculateSuggestedRate();
          }, 100);
        }
      } else {
        // ✅ NEW: Enhanced error handling with error codes and suggestions
        const errorMsg = result?.['error'] || 'No se pudo obtener el valor del vehículo';
        const errorCode = result?.errorCode || 'UNKNOWN';
        const suggestions = result?.suggestions || [];

        console.warn('[PublishCarV2] FIPE lookup failed:', {
          errorMsg,
          errorCode,
          suggestions,
          availableOptions: result?.availableOptions,
        });

        this.fipeError.set(errorMsg);
        this.fipeErrorCode.set(errorCode);
        this.fipeSuggestions.set(suggestions);
        this.valueAutoCalculated.set(false);

        // ✅ FIPE es opcional - permitir input manual
        this.allowManualValueEdit.set(true);
        this.logger.debug('[PublishCarV2] ⚠️ FIPE failed but manual input allowed');
      }
    } catch (err) {
      console.error('[PublishCarV2] Error fetching FIPE value:', err);
      this.isFetchingFIPEValue.set(false);
      this.fipeError.set('Error al consultar el valor. Intentá nuevamente en unos momentos.');
      this.fipeErrorCode.set('NETWORK_ERROR');
      this.fipeSuggestions.set([
        'Verifica tu conexión a internet',
        'Reintenta en unos momentos',
        'Si el problema persiste, contacta a soporte',
      ]);

      // ✅ FIPE es opcional - permitir input manual
      this.valueAutoCalculated.set(false);
      this.allowManualValueEdit.set(true);
    } finally {
      this.isFetchingFIPEValue.set(false);
    }
  }

  /**
   * ✅ NEW: Auto-categorize vehicle based on value USD or brand/model/year
   * Uses two methods:
   * 1. Try estimateVehicleValue() for precise category from pricing_models
   * 2. Fallback to value-based classification if not found
   */
  private async autoCategorizeVehicle(
    valueUsd: number,
    brand: string,
    model: string,
    year: number,
  ): Promise<void> {
    this.logger.debug('[PublishCarV2] Auto-categorizing vehicle:', {
      valueUsd,
      brand,
      model,
      year,
    });

    // Validate inputs
    if (!valueUsd || valueUsd <= 0) {
      console.warn('[PublishCarV2] Invalid value_usd for categorization:', valueUsd);
      return;
    }

    // Method 1: Try to get category from pricing_models (most accurate)
    try {
      const estimate = await this.pricingService.estimateVehicleValue({
        brand,
        model,
        year,
        country: 'AR',
      });

      if (estimate && estimate.category_id) {
        this.logger.debug(
          '[PublishCarV2] ✅ Category from pricing_models:',
          estimate.category_name,
          `(${valueUsd} USD)`,
          'category_id:',
          estimate.category_id,
        );
        const categoryControl = this.publishForm.get('category_id');
        if (categoryControl) {
          categoryControl.setValue(estimate.category_id, { emitEvent: true });
          categoryControl.markAsTouched();
          categoryControl.updateValueAndValidity();
          this.logger.debug(
            '[PublishCarV2] Category control updated, value:',
            categoryControl.value,
            'valid:',
            categoryControl.valid,
            'form valid:',
            this.publishForm.valid,
          );
        } else {
          console.error('[PublishCarV2] ❌ category_id control not found in form!');
        }
        // Update name immediately
        this.selectedCategoryName.set(estimate.category_name || '');
        return;
      }
    } catch (error) {
      console.warn('[PublishCarV2] Could not get category from pricing_models:', error);
    }

    // Method 2: Classify by value USD (fallback)
    // Load categories to get IDs
    let categories;
    try {
      categories = await this.pricingService.getVehicleCategories();
      if (!categories || categories.length === 0) {
        console.warn('[PublishCarV2] No categories available for auto-classification');
        return;
      }
    } catch (error) {
      console.error('[PublishCarV2] Error loading categories:', error);
      return;
    }

    let categoryCode: string;
    // ✅ UPDATED: New category thresholds
    // Economy: < $13,000
    // Standard: $13,000 - $25,000
    // Premium: $25,000 - $40,000
    // Luxury: >= $40,000
    if (valueUsd < 13000) {
      categoryCode = 'economy';
    } else if (valueUsd < 25000) {
      categoryCode = 'standard';
    } else if (valueUsd < 40000) {
      categoryCode = 'premium';
    } else {
      categoryCode = 'luxury';
    }

    this.logger.debug('[PublishCarV2] Value-based classification:', { valueUsd, categoryCode });

    const category = categories.find((c) => c.code === categoryCode);
    if (category) {
      const categoryName =
        (category as { name_es?: string; name: string }).name_es || category.name;
      this.logger.debug(
        '[PublishCarV2] ✅ Category from value USD:',
        categoryName,
        `(${valueUsd} USD)`,
        'category_id:',
        category['id'],
      );
      const categoryControl = this.publishForm.get('category_id');
      if (categoryControl) {
        categoryControl.setValue(category['id'], { emitEvent: true });
        categoryControl.markAsTouched();
        categoryControl.updateValueAndValidity();
        this.logger.debug(
          '[PublishCarV2] Category control updated, value:',
          categoryControl.value,
          'valid:',
          categoryControl.valid,
          'form valid:',
          this.publishForm.valid,
        );
      } else {
        console.error('[PublishCarV2] ❌ category_id control not found in form!');
      }
      // Update name immediately
      this.selectedCategoryName.set(categoryName);
    } else {
      console.error(
        '[PublishCarV2] ❌ Category not found for code:',
        categoryCode,
        'Available codes:',
        categories.map((c) => c.code),
      );
    }
  }

  /**
   * ✅ NEW: Calculate suggested rate based on vehicle value and category
   * Called when: vehicle value changes, category changes, or dynamic pricing toggled on
   */
  private async calculateSuggestedRate(): Promise<void> {
    const valueUsd = this.publishForm?.get('value_usd')?.value;
    const categoryId = this.publishForm?.get('category_id')?.value;
    const isDynamic = this.isDynamicPricing();

    this.logger.debug('[PublishCarV2] calculateSuggestedRate called:', {
      valueUsd,
      categoryId,
      isDynamic,
    });

    // Only calculate if dynamic pricing is enabled
    if (!isDynamic) {
      this.logger.debug('[PublishCarV2] Dynamic pricing not enabled, skipping calculation');
      this.suggestedPrice.set(0);
      return;
    }

    // Need vehicle value and category
    if (!valueUsd) {
      console.warn('[PublishCarV2] No value_usd, cannot calculate price');
      this.suggestedPrice.set(0);
      return;
    }

    if (!categoryId) {
      console.warn(
        '[PublishCarV2] No category_id selected. Price calculation requires a category.',
      );
      this.suggestedPrice.set(0);
      return;
    }

    this.isCalculatingSuggestedPrice.set(true);

    try {
      // Call pricing service to get suggested daily rate
      const suggestedRate = await this.pricingService.calculateSuggestedRate({
        categoryId: categoryId,
        estimatedValueUsd: valueUsd,
      });

      if (suggestedRate && suggestedRate > 0) {
        // Round to nearest integer
        const roundedPrice = Math.round(suggestedRate);
        this.suggestedPrice.set(roundedPrice);

        // ✅ CRITICAL: Also update the form field directly to ensure it's set
        if (this.publishForm && this.isDynamicPricing()) {
          const currentPrice = this.publishForm.get('price_per_day')?.value;
          this.logger.debug('[PublishCarV2] Updating price_per_day:', {
            currentPrice,
            suggestedPrice: roundedPrice,
            willUpdate: !currentPrice || currentPrice !== roundedPrice,
          });

          // Always update when in dynamic mode
          this.publishForm.get('price_per_day')?.setValue(roundedPrice, { emitEvent: false });
        }
      }
    } catch (error) {
      console.error('[PublishCarV2] Error calculating suggested rate:', error);
      this.suggestedPrice.set(0);
    } finally {
      this.isCalculatingSuggestedPrice.set(false);
    }
  }

  /**
   * Get placeholder text for model selection
   */
  getModelPlaceholder(): string {
    const selectedBrand = this.selectedFIPEBrand();
    if (!selectedBrand) {
      return 'Primero selecciona una marca';
    }
    return `Buscar modelo de ${selectedBrand.name}...`;
  }

  /**
   * Get helper text for model selection
   */
  getModelHelperText(): string {
    const selectedBrand = this.selectedFIPEBrand();
    if (!selectedBrand) {
      return 'Primero selecciona una marca';
    }
    return `Selecciona el modelo de ${selectedBrand.name}`;
  }

  /**
   * Handle photo selection
   */
  async onPhotoSelected(event: Event): Promise<void> {
    await this.photoService.selectPhotos(event);
  }

  /**
   * Handle stock photos selection
   */
  async onStockPhotosSelected(photos: File[]): Promise<void> {
    await this.photoService.addStockPhotosFiles(photos);
    this.showStockPhotosModal.set(false);
  }

  /**
   * Handle AI photos generation
   */
  async onAIPhotosGenerated(photos: File[]): Promise<void> {
    await this.photoService.addAIPhotosFiles(photos);
    this.showAIPhotosModal.set(false);
  }

  /**
   * Get current brand name
   * ✅ Updated to support FIPE autocomplete
   */
  getCurrentBrand(): string {
    // Try FIPE signal first
    const fipeBrand = this.selectedFIPEBrand();
    if (fipeBrand && fipeBrand.code) {
      return fipeBrand.name;
    }

    // Try text backup (for FIPE)
    const brandTextBackup = this.publishForm?.get('brand_text_backup')?.value;
    if (brandTextBackup) {
      return brandTextBackup;
    }

    // Fallback to traditional brand_id (UUID)
    const brandId = this.publishForm?.get('brand_id')?.value;
    if (!brandId) return '';
    const brand = this.brands().find((b) => b['id'] === brandId);
    return brand?.name || '';
  }

  /**
   * Get current model name
   * ✅ Updated to support FIPE autocomplete
   */
  getCurrentModel(): string {
    // Try FIPE signal first
    const fipeModel = this.selectedFIPEModel();
    if (fipeModel && fipeModel.name) {
      return fipeModel.name;
    }

    // Try text backup (for FIPE)
    const modelTextBackup = this.publishForm?.get('model_text_backup')?.value;
    if (modelTextBackup) {
      return modelTextBackup;
    }

    // Fallback to traditional model_id (UUID)
    const modelId = this.publishForm?.get('model_id')?.value;
    if (!modelId) return '';
    const model = this.models().find((m) => m['id'] === modelId);
    return model?.name || '';
  }

  /**
   * Get current year
   */
  getCurrentYear(): number {
    return this.publishForm?.get('year')?.value || new Date().getFullYear();
  }

  /**
   * Generate AI photos
   */
  async generateAIPhotos(): Promise<void> {
    const brandId = this.publishForm.get('brand_id')?.value;
    const modelId = this.publishForm.get('model_id')?.value;
    const year = this.publishForm.get('year')?.value;
    const color = this.publishForm.get('color')?.value;

    if (!brandId || !modelId || !year) {
      alert('Debes seleccionar marca, modelo y año primero');
      return;
    }

    const brand = this.brands().find((b) => b['id'] === brandId);
    const model = this.models().find((m) => m['id'] === modelId);

    if (!brand || !model) {
      alert('No se pudo obtener información del vehículo');
      return;
    }

    await this.photoService.generateAIPhotos(brand.name, model.name, year, {
      color: color || undefined,
    });
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
        location.longitude,
      );

      if (address) {
        // Fill address fields - combine street + number for display
        const streetWithNumber = address.streetNumber
          ? `${address.street} ${address.streetNumber}`
          : address.street;

        this.publishForm.patchValue({
          location_street: streetWithNumber,
          location_street_number: address.streetNumber,
          location_city: address['city'],
          location_state: address.state,
          location_country: address['country'],
        });
        this.notificationManager.success(
          'Ubicación actualizada',
          'Se completó la dirección automáticamente.',
        );
      } else {
        this.notificationManager.warning(
          'Ubicación detectada',
          'Tenemos tus coordenadas, pero no pudimos encontrar la dirección exacta. Por favor completa los campos manualmente.',
        );
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
    // ✅ NUEVO: Solo validar campos mínimos (marca, modelo, año, fotos)
    // Verificar tanto valores del formulario como signals FIPE
    const brandId = this.publishForm.get('brand_id')?.value;
    const modelId = this.publishForm.get('model_id')?.value;
    const brandTextBackup = this.publishForm.get('brand_text_backup')?.value;
    const modelTextBackup = this.publishForm.get('model_text_backup')?.value;
    const fipeBrand = this.selectedFIPEBrand();
    const fipeModel = this.selectedFIPEModel();

    const hasBrand = !!(brandId || brandTextBackup || (fipeBrand && fipeBrand.name));
    const hasModel = !!(modelId || modelTextBackup || (fipeModel && fipeModel.name));
    const year = this.publishForm.get('year')?.value;

    if (!hasBrand || !hasModel || !year) {
      alert('Por favor completa: Marca, Modelo y Año');
      return;
    }

    if (!this.photoService.hasMinimumPhotos()) {
      this.notificationManager['error'](
        'Fotos requeridas',
        'Debes subir al menos 3 fotos para publicar tu auto.',
      );
      return;
    }

    const description = this.publishForm.get('description')?.value as string | undefined;
    if (!description || description.trim().length < 40) {
      this.notificationManager['error'](
        'Descripción incompleta',
        'Agrega una descripción clara (mínimo 40 caracteres) para que los viajeros conozcan tu auto.',
      );
      return;
    }

    if (
      !this.publishForm.get('availability_start_date')?.value ||
      !this.publishForm.get('availability_end_date')?.value
    ) {
      this.notificationManager['error'](
        'Disponibilidad faltante',
        'Indicá desde cuándo y hasta cuándo está disponible el auto.',
      );
      return;
    }

    if (!this.isAvailabilityRangeValid()) {
      this.notificationManager['error'](
        'Fechas inválidas',
        'La fecha de fin debe ser posterior o igual a la fecha de inicio.',
      );
      return;
    }

    // ✅ CRITICAL: Validar ubicación antes de publicar
    if (!this.hasValidLocation()) {
      this.notificationManager['error'](
        'Ubicación requerida',
        'Debes seleccionar una ubicación en el mapa o usar tu ubicación actual para que tu auto aparezca en las búsquedas.',
      );
      return;
    }

    const mpReady = this.mpReady();

    if (!mpReady) {
      void this.notificationManager.show({
        type: 'warning',
        title: 'Conectá Mercado Pago',
        message:
          'Vinculá tu cuenta para recibir pagos. Podés publicar ahora y conectar Mercado Pago después.',
        actions: [
          {
            label: 'Conectar',
            command: () => {
              void this.openOnboardingModal();
            },
          },
        ],
      });
    }

    // ✅ IMPORTANTE: NO bloqueamos la publicación por documentos faltantes
    // El usuario puede publicar su auto sin documentos, pero le notificaremos
    // después de la publicación que faltan documentos (DNI, Cédula, Seguro, etc.)

    this.isSubmitting.set(true);

    try {
      // Get form data
      const formData = this.formService.getFormData();

      this.logger.debug('📝 Form data before processing:', {
        brand_id: formData['brand_id'],
        model_id: formData['model_id'],
        year: formData['year'],
        price_per_day: formData['price_per_day'],
        pricing_strategy: formData['pricing_strategy'],
      });

      // ✅ NUEVO: Establecer valores por defecto para campos opcionales
      // ✅ CRITICAL: price_per_day siempre debe ser > 0 para pasar validación
      const pricePerDay = formData['price_per_day']
        ? Number(formData['price_per_day'])
        : formData['pricing_strategy'] === 'dynamic'
          ? 50
          : 100; // Default: 50 si dinámico, 100 si custom

      this.logger.debug('💰 Calculated price_per_day:', pricePerDay);

      const carData: Record<string, unknown> = {
        ...formData,
        // Campos opcionales con valores por defecto
        color: formData['color'] || 'No especificado',
        mileage: formData['mileage'] || 0,
        transmission: (formData['transmission'] || 'manual') as string,
        fuel: (formData['fuel'] || 'nafta') as string,
        price_per_day: pricePerDay, // ✅ Siempre un número válido > 0
        value_usd: formData['value_usd'] || 10000, // Valor por defecto si no se especifica
        category_id: formData['category_id'] || null, // Se puede auto-categorizar después
        min_rental_days: formData['min_rental_days'] || 1,
        max_rental_days: formData['max_rental_days'] || null,
        deposit_required: formData['deposit_required'] ?? true,
        deposit_amount: formData['deposit_amount'] || 200,
        insurance_included: formData['insurance_included'] ?? false,
        auto_approval: formData['auto_approval'] ?? true,
        // Location opcional
        location_street: formData['location_street'] || '',
        location_street_number: formData['location_street_number'] || '',
        // ✅ FIXED: city/province are NOT NULL in DB, ensure valid defaults
        location_city: formData['location_city'] || 'Buenos Aires',
        location_state: formData['location_state'] || 'Buenos Aires',
        location_country: formData['location_country'] || 'AR',
      };

      // Get coordinates (manual or from address)
      let coordinates = this.locationService.getCoordinates();
      if (!coordinates && carData['location_street'] && carData['location_city']) {
        // Geocode address si está disponible
        const address = {
          street: carData['location_street'] as string,
          streetNumber: carData['location_street_number'] as string,
          city: carData['location_city'] as string,
          state: carData['location_state'] as string,
          country: carData['location_country'] as string,
        };
        coordinates = await this.locationService.geocodeAddress(address);
      }

      // Agregar coordenadas (solo si existen)
      // ✅ CRITICAL: Solo incluir location_lat/location_lng si tienen valores válidos
      // Esto evita errores de schema cache si las columnas no están disponibles
      if (coordinates?.latitude && coordinates?.longitude) {
        carData['location_lat'] = coordinates.latitude;
        carData['location_lng'] = coordinates.longitude;
      } else {
        // No incluir las propiedades si no hay coordenadas
        // El backend puede manejar autos sin coordenadas
        delete carData['location_lat'];
        delete carData['location_lng'];
      }

      carData['status'] = 'active' as const; // Car is active inmediatamente y aparecerá en el mapa

      this.logger.debug('🚗 Final car data to submit:', {
        ...carData,
        // Redact sensitive data
        owner_id: carData['owner_id'] ? '***' : undefined,
      });

      await this.performSubmission(carData);
    } catch (error) {
      this.handleSubmissionError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Save car as draft (Minimal validation)
   */
  async saveDraft(): Promise<void> {
    if (!this.canSaveDraft()) return;

    this.isSubmitting.set(true);
    try {
      const formData = this.formService.getFormData();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const carData: any = {
        ...formData,
        status: 'draft', // ✅ Explicitly set as draft
        // Defaults for draft to avoid DB constraints if any
        price_per_day: formData['price_per_day'] || 0,
        year: formData['year'] || new Date().getFullYear(),
        mileage: formData['mileage'] || 0,
        transmission: formData['transmission'] || 'manual',
        fuel: formData['fuel'] || 'nafta',
      };

      await this.performSubmission(carData);

      this.notificationManager.success(
        'Borrador guardado',
        'Tu progreso ha sido guardado. Puedes continuar editando más tarde.',
      );
    } catch (error) {
      this.handleSubmissionError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async performSubmission(carData: Record<string, unknown>): Promise<void> {
    let carId: string;

    if (this.editMode() && this['carId']) {
      // Update existing car
      await this.carsService.updateCar(this['carId'], carData);
      carId = this['carId'];

      if (carData['status'] === 'active') {
        this.notificationManager.success(
          '✅ Auto actualizado exitosamente',
          'Los cambios se han guardado correctamente.',
          6000,
        );
      }
    } else {
      // Create new car
      const newCar = await this.carsService.createCar(carData);
      carId = newCar['id'];

      if (carData['status'] === 'active') {
        this.notificationManager.success(
          '🎉 ¡Auto publicado exitosamente!',
          'Tu auto ya está visible en el marketplace.',
          8000,
        );
      }
    }

    // Upload photos (if new or changed)
    if (this.photoService.getPhotoCount() > 0) {
      await this.photoService.uploadPhotos(carId);
    }

    // Check docs only if active
    if (carData['status'] === 'active' && !this.editMode()) {
      setTimeout(() => {
        this.checkMissingDocuments(carId).catch(() => {});
      }, 2000);
    }

    await this.router.navigate(['/cars/my-cars']);
  }

  private handleSubmissionError(error: unknown): void {
    console.error('❌ Failed to publish car:', error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error['message']);
    }

    // Show user-friendly error message
    let errorTitle = 'Error al guardar';
    let errorMessage = 'Por favor intenta nuevamente.';

    if (error instanceof Error) {
      if (error['message'].includes('Marca y modelo son requeridos')) {
        errorTitle = 'Información incompleta';
        errorMessage = 'Por favor completa la marca y el modelo del vehículo.';
      } else if (error['message']) {
        errorMessage = error['message'];
      }
    }

    this.notificationManager['error'](errorTitle, errorMessage);
  }

  /**
   * Go back to previous page
   */
  async goBack(): Promise<void> {
    await this.router.navigate(['/cars/my-cars']);
  }

  /**
   * Verifica documentos faltantes y notifica al usuario
   */
  private async checkMissingDocuments(carId: string): Promise<void> {
    try {
      const missingDocs = await this.documentsService.getMissingDocuments(carId);

      if (missingDocs.length > 0) {
        const car = await this.carsService.getCarById(carId);
        if (!car) return;

        const carName =
          car['title'] || `${car['brand'] || ''} ${car['model'] || ''}`.trim() || 'tu auto';
        const documentsUrl = `/cars/${carId}/documents`;

        // Notificar sobre cada documento faltante
        for (const docKind of missingDocs) {
          const documentType = this.documentsService.getDocumentKindLabel(docKind);
          this.carOwnerNotifications.notifyMissingDocument(documentType, carName, documentsUrl);
          // Pequeña pausa entre notificaciones
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } catch {
      // Silently fail
    }
  }
}
