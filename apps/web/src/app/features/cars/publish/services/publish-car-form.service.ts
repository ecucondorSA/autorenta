import { Injectable, inject, signal, computed, type Signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CarsService } from '@core/services/cars/cars.service';
import { CarBrand, CarModel, VehicleCategory } from '../../../../core/models';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { APP_CONSTANTS } from '@core/config/constants';

/**
 * Service for managing the publish car form
 *
 * Responsibilities:
 * - Form initialization and validation
 * - Brand and model filtering
 * - Auto-fill from last car
 * - Dynamic vs custom pricing logic
 */
@Injectable()
export class PublishCarFormService {
  private readonly fb = inject(FormBuilder);
  private readonly carsService = inject(CarsService);
  private readonly supabase = injectSupabase();

  private readonly minYear = 1980;
  private readonly maxYear = new Date().getFullYear(); // ✅ Changed: removed +1 to avoid future years

  // State
  readonly brands = signal<CarBrand[]>([]);
  readonly models = signal<CarModel[]>([]);
  readonly filteredModels = signal<CarModel[]>([]);
  readonly autofilledFromLast = signal(false);
  private readonly pricingStrategySignal = signal<'dynamic' | 'custom'>('dynamic');
  readonly categories = signal<VehicleCategory[]>([]);

  // Form instance
  private formInstance: FormGroup | null = null;

  /**
   * Initialize form with default values and validators
   */
  initForm(): FormGroup {
    this.formInstance = this.fb.group({
      // Vehicle - SOLO ESTOS SON REQUERIDOS
      brand_id: [null], // UUID - puede ser null si usamos FIPE
      model_id: [null], // UUID - puede ser null si usamos FIPE
      brand_text_backup: ['', Validators.required], // Texto backup para FIPE
      model_text_backup: ['', Validators.required], // Texto backup para FIPE
      year: [
        new Date().getFullYear(),
        [Validators.required, Validators.min(this.minYear), Validators.max(this.maxYear)],
      ],
      // Campos opcionales
      color: ['', Validators.required],
      mileage: [null, [Validators.required, Validators.min(0)]],
      transmission: ['', Validators.required],
      fuel: ['', Validators.required],

      // Descripción y disponibilidad
      description: ['', [Validators.required, Validators.minLength(40), Validators.maxLength(800)]],
      availability_start_date: [this.todayISO(), [Validators.required]],
      availability_end_date: [this.nextMonthISO(), [Validators.required]],
      
      // Reglas de Alquiler (Owner Preferences)
      mileage_limit: [200, [Validators.min(0)]], // 0 = Ilimitado
      extra_km_price: [5, [Validators.min(0)]],
      fuel_policy: ['full_to_full', Validators.required],
      allow_second_driver: [true],
      second_driver_cost: [10, [Validators.min(0)]],
      max_anticipation_days: [90, [Validators.min(1), Validators.max(365)]],

      // Pricing - Opcional (se calcula automáticamente si es dinámico)
      pricing_strategy: ['dynamic'],
      price_per_day: [null, [
        Validators.required,
        Validators.min(APP_CONSTANTS.MIN_DAILY_RATE_USD),
        Validators.max(APP_CONSTANTS.MAX_DAILY_RATE_USD),
      ]], // USD: $10-$500/day
      currency: ['USD', Validators.required],
      value_usd: [null, [Validators.required, Validators.min(5000), Validators.max(500000)]], // Opcional
      category_id: [null], // Opcional (se auto-categoriza)
      min_rental_days: [1, [Validators.required, Validators.min(1)]],
      max_rental_days: [30], // Opcional
      deposit_required: [true],
      deposit_amount: [200, [Validators.min(0)]], // Requerido condicionalmente, se maneja en el componente
      insurance_included: [false],
      auto_approval: [true],

      // Location - Opcional
      location_street: ['', Validators.required],
      location_street_number: ['', Validators.required],
      location_city: ['', Validators.required],
      location_state: ['', Validators.required],
      location_country: ['AR', Validators.required],
    });

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
   * Load brands and models from API
   */
  async loadBrandsAndModels(): Promise<void> {
    const [brandsData, modelsData] = await Promise.all([
      this.carsService.getCarBrands(),
      this.carsService.getAllCarModels(),
    ]);

    this.brands.set(brandsData as CarBrand[]);
    this.models.set(modelsData as CarModel[]);
  }

  /**
   * Filter models by selected brand
   */
  filterModelsByBrand(brandId: string): CarModel[] {
    if (!brandId) {
      this.filteredModels.set([]);
      return [];
    }

    const filtered = this.models().filter((m) => m.brand_id === brandId);
    this.filteredModels.set(filtered);
    return filtered;
  }

  /**
   * Get selected model info
   */
  getSelectedModelInfo(modelId: string): CarModel | null {
    if (!modelId) return null;
    return this.filteredModels().find((m) => m.id === modelId) || null;
  }

  /**
   * Auto-fill form from last published car
   */
  async autoFillFromLastCar(): Promise<void> {
    if (!this.formInstance) {
      throw new Error('Form not initialized');
    }

    try {
      const lastCar = await this.carsService.getUserLastCar();

      if (lastCar) {
        // Convert uses_dynamic_pricing (DB field) to pricing_strategy (UI field)
        const pricing_strategy = lastCar.uses_dynamic_pricing ? 'dynamic' : 'custom';

        this.formInstance.patchValue({
          transmission: lastCar.transmission,
          fuel: lastCar.fuel,
          color: lastCar.color,
          currency: lastCar.currency,
          pricing_strategy,
          min_rental_days: lastCar.min_rental_days,
          max_rental_days: lastCar.max_rental_days,
          deposit_required: lastCar.deposit_required,
          deposit_amount: lastCar.deposit_amount,
          insurance_included: lastCar.insurance_included,
          auto_approval: lastCar.auto_approval ?? true,
          location_street: lastCar.location_street,
          location_street_number: lastCar.location_street_number,
          location_city: lastCar.location_city,
          location_state: lastCar.location_state,
          location_country: lastCar.location_country,
          
          // Reglas
          mileage_limit: lastCar.mileage_limit ?? 200,
          extra_km_price: lastCar.extra_km_price ?? 5,
          fuel_policy: lastCar.fuel_policy ?? 'full_to_full',
          allow_second_driver: lastCar.allow_second_driver ?? true,
          second_driver_cost: lastCar.second_driver_cost ?? 10,
          max_anticipation_days: lastCar.max_anticipation_days ?? 90,
        });

        // Update signal for reactive UI
        this.pricingStrategySignal.set(pricing_strategy);

        this.autofilledFromLast.set(true);
      }
    } catch {
      // Silently fail - not critical
    }
  }

  /**
   * Load car data for editing
   */
  async loadCarForEditing(carId: string): Promise<boolean> {
    if (!this.formInstance) {
      throw new Error('Form not initialized');
    }

    try {
      const car = await this.carsService.getCarById(carId);
      if (!car) {
        return false;
      }

      // Convert uses_dynamic_pricing (DB field) to pricing_strategy (UI field)
      const pricing_strategy = car.uses_dynamic_pricing ? 'dynamic' : 'custom';

      this.formInstance.patchValue({
        brand_id: car.brand_id,
        model_id: car.model_id,
        pricing_strategy,
        year: car.year,
        color: car.color,
        mileage: car.mileage,
        transmission: car.transmission,
        fuel: car.fuel,
        price_per_day: car.price_per_day,
        currency: car.currency,
        value_usd: car.value_usd || null,
        min_rental_days: car.min_rental_days,
        max_rental_days: car.max_rental_days,
        deposit_required: car.deposit_required,
        deposit_amount: car.deposit_amount,
        insurance_included: car.insurance_included,
        auto_approval: car.auto_approval ?? true,
        location_street: car.location_street,
        location_street_number: car.location_street_number,
        location_city: car.location_city,
        location_state: car.location_state,
        location_country: car.location_country,

        // Reglas
        mileage_limit: car.mileage_limit ?? 200,
        extra_km_price: car.extra_km_price ?? 5,
        fuel_policy: car.fuel_policy ?? 'full_to_full',
        allow_second_driver: car.allow_second_driver ?? true,
        second_driver_cost: car.second_driver_cost ?? 10,
        max_anticipation_days: car.max_anticipation_days ?? 90,
      });

      // Update signal for reactive UI
      this.pricingStrategySignal.set(pricing_strategy);

      // Trigger brand change to load models
      if (car.brand_id) {
        this.filterModelsByBrand(car.brand_id);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if dynamic pricing is enabled (legacy method for compatibility)
   */
  isDynamicPricing(): boolean {
    if (!this.formInstance) return false;
    const value = this.formInstance.get('pricing_strategy')?.value;
    return value === 'dynamic';
  }

  /**
   * Get dynamic pricing state as signal (reactive)
   */
  isDynamicPricingSignal(): Signal<boolean> {
    return computed(() => this.pricingStrategySignal() === 'dynamic');
  }

  /**
   * Set pricing strategy
   */
  setPricingStrategy(mode: 'dynamic' | 'custom'): void {
    if (!this.formInstance) return;
    this.formInstance.get('pricing_strategy')?.setValue(mode);
    this.pricingStrategySignal.set(mode); // Update signal for reactive UI
  }

  /**
   * Generate car title from form data
   */
  generateTitle(): string {
    if (!this.formInstance) return '';

    const brandId = this.formInstance.get('brand_id')?.value;
    const modelId = this.formInstance.get('model_id')?.value;
    const year = this.formInstance.get('year')?.value;

    if (!brandId || !modelId || !year) return '';

    const brand = this.brands().find((b) => b.id === brandId);
    const model = this.models().find((m) => m.id === modelId);

    if (!brand || !model) return '';

    return `${brand.name} ${model.name} ${year}`;
  }

  /**
   * Get form data ready for submission
   */
  getFormData(): Record<string, unknown> {
    if (!this.formInstance) {
      throw new Error('Form not initialized');
    }

    const rawValue = this.formInstance.getRawValue();

    // Extract fields from form (pricing_strategy is UI-only, converted to uses_dynamic_pricing)
    const {
      brand_id,
      model_id,
      brand_text_backup,
      model_text_backup,
      year,
      color,
      mileage,
      transmission,
      fuel,
      pricing_strategy,
      price_per_day,
      currency,
      value_usd,
      min_rental_days,
      max_rental_days,
      deposit_required,
      deposit_amount,
      insurance_included,
      auto_approval,

      // Descripción y disponibilidad
      description,
      availability_start_date,
      availability_end_date,
      location_street,
      location_street_number,
      location_city,
      location_state,
      location_country,
      
      // Reglas de Alquiler
      mileage_limit,
      extra_km_price,
      fuel_policy,
      allow_second_driver,
      second_driver_cost,
      max_anticipation_days,
    } = rawValue;

    // Get brand and model info (solo si tenemos UUIDs)
    const brand = brand_id ? this.brands().find((b) => b.id === brand_id) : null;
    const model = model_id ? this.models().find((m) => m.id === model_id) : null;

    // Convert pricing_strategy (UI field) to uses_dynamic_pricing (DB field)
    const uses_dynamic_pricing = pricing_strategy === 'dynamic';

    // Return clean data for database
    return {
      // Vehicle fields
      // ✅ CRITICAL: brand_id y model_id son UUIDs, pueden ser null si usamos FIPE
      brand_id: brand_id || null,
      model_id: model_id || null,
      // ✅ CRITICAL: brand_text_backup y model_text_backup para FIPE
      brand_text_backup: brand_text_backup || brand?.name || '',
      model_text_backup: model_text_backup || model?.name || '',
      year,
      color,
      mileage,
      transmission,
      fuel,

      // Reglas de Alquiler
      mileage_limit: mileage_limit ?? 200,
      extra_km_price: extra_km_price ?? 5,
      fuel_policy: fuel_policy || 'full_to_full',
      allow_second_driver: allow_second_driver ?? true,
      second_driver_cost: second_driver_cost ?? 10,
      max_anticipation_days: max_anticipation_days ?? 90,

      // Pricing fields
      price_per_day,
      currency,
      value_usd,
      uses_dynamic_pricing, // ✅ NEW: Dynamic pricing opt-in
      min_rental_days,
      max_rental_days,
      deposit_required,
      deposit_amount,
      insurance_included,
      auto_approval,

      // Location fields
      location_street,
      location_street_number,
      location_city,
      location_state,
      location_country,

      // Generated/computed fields
      title: this.generateTitle() || 'Auto sin título',
      description,
      seats: model?.seats || 5,
      doors: model?.doors || 4,
      features: {},
      fuel_type: fuel,
      location_province: location_state,
      rating_avg: 0,
      rating_count: 0,
      availability_start_date: availability_start_date || this.todayISO(),
      availability_end_date: availability_end_date || null,
    };
  }

  /**
   * Validate form
   */
  isValid(): boolean {
    return this.formInstance?.valid ?? false;
  }

  /**
   * Get form errors
   */
  getErrors(): Record<string, unknown> | null {
    return this.formInstance?.errors ?? null;
  }

  /**
   * Obtener fecha de hoy en formato ISO (yyyy-MM-dd)
   */
  private todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Obtener fecha dentro de un mes para prellenar disponibilidad
   */
  private nextMonthISO(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().slice(0, 10);
  }
}
