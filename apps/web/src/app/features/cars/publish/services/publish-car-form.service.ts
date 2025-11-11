import { Injectable, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CarsService } from '../../../../core/services/cars.service';
import { CarBrand, CarModel } from '../../../../core/models';

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

  private readonly minYear = 1980;
  private readonly maxYear = new Date().getFullYear() + 1;

  // State
  readonly brands = signal<CarBrand[]>([]);
  readonly models = signal<CarModel[]>([]);
  readonly filteredModels = signal<CarModel[]>([]);
  readonly autofilledFromLast = signal(false);

  // Form instance
  private formInstance: FormGroup | null = null;

  /**
   * Initialize form with default values and validators
   */
  initForm(): FormGroup {
    this.formInstance = this.fb.group({
      // Vehicle
      brand_id: ['', Validators.required],
      model_id: ['', Validators.required],
      year: [
        new Date().getFullYear(),
        [Validators.required, Validators.min(this.minYear), Validators.max(this.maxYear)],
      ],
      color: ['', Validators.required],
      mileage: [null, [Validators.required, Validators.min(0)]],
      transmission: ['', Validators.required],
      fuel: ['', Validators.required],

      // Pricing
      pricing_strategy: ['dynamic'],
      price_per_day: [null, [Validators.required, Validators.min(1)]],
      currency: ['USD', Validators.required],
      value_usd: [null, [Validators.required, Validators.min(5000), Validators.max(500000)]],
      min_rental_days: [1, [Validators.required, Validators.min(1)]],
      max_rental_days: [30],
      deposit_required: [true],
      deposit_amount: [200],
      insurance_included: [false],
      auto_approval: [true],

      // Location
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
        this.formInstance.patchValue({
          transmission: lastCar.transmission,
          fuel: lastCar.fuel,
          color: lastCar.color,
          currency: lastCar.currency,
          pricing_strategy: 'custom',
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
        });

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

      this.formInstance.patchValue({
        brand_id: car.brand_id,
        model_id: car.model_id,
        pricing_strategy: 'custom',
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
      });

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
   * Check if dynamic pricing is enabled
   */
  isDynamicPricing(): boolean {
    if (!this.formInstance) return false;
    return this.formInstance.get('pricing_strategy')?.value === 'dynamic';
  }

  /**
   * Set pricing strategy
   */
  setPricingStrategy(mode: 'dynamic' | 'custom'): void {
    if (!this.formInstance) return;
    this.formInstance.get('pricing_strategy')?.setValue(mode);
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
      location_street,
      location_street_number,
      location_city,
      location_state,
      location_country,
    } = rawValue;

    // Get brand and model info
    const brand = this.brands().find((b) => b.id === brand_id);
    const model = this.models().find((m) => m.id === model_id);

    // Convert pricing_strategy (UI field) to uses_dynamic_pricing (DB field)
    const uses_dynamic_pricing = pricing_strategy === 'dynamic';

    // Return clean data for database
    return {
      // Vehicle fields
      brand_id,
      model_id,
      year,
      color,
      mileage,
      transmission,
      fuel,

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
      description: '',
      brand_text_backup: brand?.name || '',
      model_text_backup: model?.name || '',
      seats: model?.seats || 5,
      doors: model?.doors || 4,
      features: {},
      fuel_type: fuel,
      location_province: location_state,
      rating_avg: 0,
      rating_count: 0,
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
}
