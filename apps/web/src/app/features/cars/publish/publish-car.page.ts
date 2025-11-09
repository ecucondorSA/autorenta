import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { CarsService } from '@core/services/cars.service';
import { AuthService } from '@core/services/auth.service';
import { GeocodingService } from '@core/services/geocoding.service';
import { UploadImageComponent } from '@shared/components/upload-image/upload-image.component';
import type { FuelType, Transmission, CarStatus } from '@core/types/database.types';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

interface CarBrand {
  id: string;
  name: string;
}

interface CarModel {
  id: string;
  name: string;
  category: string;
}

@Component({
  selector: 'autorenta-publish-car-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UploadImageComponent, TranslateModule],
  templateUrl: './publish-car.page.html',
  styleUrl: './publish-car.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublishCarPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly carsService = inject(CarsService);
  private readonly authService = inject(AuthService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly router = inject(Router);

  readonly brands = signal<CarBrand[]>([]);
  readonly models = signal<CarModel[]>([]);
  readonly loadingBrands = signal(true);
  readonly loadingModels = signal(false);
  readonly maxYear = new Date().getFullYear() + 1;

  readonly form = this.fb.nonNullable.group({
    // Información básica
    title: ['', [Validators.required, Validators.minLength(10)]],
    description: ['', [Validators.required, Validators.minLength(30)]],

    // Marca y modelo
    brand_id: ['', Validators.required],
    brand: ['', Validators.required],
    model_id: ['', Validators.required],
    model: ['', Validators.required],
    year: [
      new Date().getFullYear(),
      [Validators.required, Validators.min(2000), Validators.max(new Date().getFullYear() + 1)],
    ],

    // Precio y condiciones
    price_per_day: [0, [Validators.required, Validators.min(10)]],
    currency: ['USD', Validators.required],
    value_usd: [
      null as number | null,
      [Validators.required, Validators.min(1000), Validators.max(1000000)],
    ],
    deposit_required: [true],
    deposit_amount: [0, [Validators.min(0)]],
    min_rental_days: [1, [Validators.required, Validators.min(1)]],
    max_rental_days: [30, [Validators.min(1)]],

    // Ubicación - Dirección
    location_street: ['', Validators.required],
    location_street_number: ['', Validators.required],
    location_neighborhood: [''],
    location_city: ['', Validators.required],
    location_state: ['', Validators.required],
    location_province: [''],
    location_country: ['Uruguay', Validators.required],
    location_postal_code: [''],
    location_formatted_address: [''],
    location_lat: [null as number | null],
    location_lng: [null as number | null],

    // Especificaciones
    seats: [4, [Validators.required, Validators.min(2), Validators.max(9)]],
    doors: [4, [Validators.min(2), Validators.max(6)]],
    transmission: ['automatic' as Transmission, Validators.required],
    fuel_type: ['nafta' as FuelType, Validators.required],
    mileage: [0, [Validators.required, Validators.min(0)]],

    // Formas de pago
    payment_methods: [['cash', 'transfer']],

    // Opciones de entrega
    delivery_options: [['pickup']],
    insurance_included: [false],

    // Términos
    terms_and_conditions: [''],

    status: ['draft' as CarStatus],
  });

  private readonly uploadingSignal = signal(false);
  private readonly selectedFilesSignal = signal<File[]>([]);
  private readonly formSubscriptions: Subscription[] = [];
  private hasManualValueUsdOverride = false;
  readonly suggestedVehicleValueUsd = signal<number | null>(null);
  readonly valuationAverageDays = this.carsService.getDefaultAverageRentalDays();
  readonly submitting = computed(() => this.uploadingSignal());
  readonly hasFiles = computed(() => this.selectedFilesSignal().length > 0);

  async ngOnInit(): Promise<void> {
    await this.loadBrands();

    // Watch for brand changes to load models
    this.form.get('brand_id')?.valueChanges.subscribe(async (brandId) => {
      if (brandId) {
        await this.loadModels(brandId);
        const brand = this.brands().find((b) => b.id === brandId);
        if (brand) {
          this.form.patchValue({ brand: brand.name });
        }
      } else {
        this.models.set([]);
        this.form.patchValue({ model_id: '', model: '' });
      }
    });

    // Watch for model changes
    this.form.get('model_id')?.valueChanges.subscribe((modelId) => {
      if (modelId) {
        const model = this.models().find((m) => m.id === modelId);
        if (model) {
          this.form.patchValue({ model: model.name });
        }
      }
    });

    // Watch deposit_required to enable/disable deposit_amount
    this.form.get('deposit_required')?.valueChanges.subscribe((required) => {
      const depositControl = this.form.get('deposit_amount');
      if (required) {
        depositControl?.setValidators([Validators.required, Validators.min(50)]);
      } else {
        depositControl?.clearValidators();
        depositControl?.patchValue(0);
      }
      depositControl?.updateValueAndValidity();
    });

    this.setupValueUsdSuggestion();
  }

  ngOnDestroy(): void {
    this.formSubscriptions.forEach((sub) => sub.unsubscribe());
  }

  private async loadBrands(): Promise<void> {
    this.loadingBrands.set(true);
    try {
      const brands = await this.carsService.getCarBrands();
      this.brands.set(brands);
    } catch (error) {
      /* Silenced */
    } finally {
      this.loadingBrands.set(false);
    }
  }

  private async loadModels(brandId: string): Promise<void> {
    this.loadingModels.set(true);
    try {
      const models = await this.carsService.getCarModels(brandId);
      this.models.set(models);
    } catch (error) {
      /* Silenced */
    } finally {
      this.loadingModels.set(false);
    }
  }

  onFilesSelected(fileList: FileList): void {
    this.selectedFilesSignal.set(Array.from(fileList));
  }

  togglePaymentMethod(method: string): void {
    const current = this.form.get('payment_methods')?.value || [];
    const updated = current.includes(method)
      ? current.filter((m: string) => m !== method)
      : [...current, method];
    this.form.patchValue({ payment_methods: updated });
  }

  toggleDeliveryOption(option: string): void {
    const current = this.form.get('delivery_options')?.value || [];
    const updated = current.includes(option)
      ? current.filter((o: string) => o !== option)
      : [...current, option];
    this.form.patchValue({ delivery_options: updated });
  }

  applySuggestedVehicleValue(): void {
    const suggestion = this.suggestedVehicleValueUsd();
    const control = this.form.get('value_usd');
    if (!control || suggestion === null) {
      return;
    }

    this.hasManualValueUsdOverride = false;
    control.setValue(suggestion, { emitEvent: false });
    control.markAsDirty();
    control.markAsTouched();
    control.updateValueAndValidity();
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const session = this.authService.session$();
    if (!session?.user) {
      return;
    }

    this.uploadingSignal.set(true);
    try {
      // Geocodificar la dirección antes de crear el auto
      await this.geocodeCurrentAddress();

      const formValue = this.form.getRawValue();
      const payload = {
        ...formValue,
        value_usd: formValue.value_usd != null ? Number(formValue.value_usd) : undefined,
      };
      const car = await this.carsService.createCar(payload);

      const files = this.selectedFilesSignal();
      for (let i = 0; i < files.length; i++) {
        try {
          await this.carsService.uploadPhoto(files[i], car.id, i);
        } catch (error) {
          /* Silenced */
        }
      }

      await this.router.navigate(['/cars/mine'], {
        queryParams: { published: 'true' },
      });
    } catch (error) {
      /* Silenced */
    } finally {
      this.uploadingSignal.set(false);
    }
  }

  private async geocodeCurrentAddress(): Promise<void> {
    const street = this.form.get('location_street')?.value;
    const streetNumber = this.form.get('location_street_number')?.value;
    const city = this.form.get('location_city')?.value;
    const state = this.form.get('location_state')?.value;
    const country = this.form.get('location_country')?.value;

    if (!street || !city) {
      return;
    }

    try {
      const result = await this.geocodingService.geocodeStructuredAddress(
        street,
        streetNumber || '',
        city,
        state || '',
        country || 'Uruguay',
      );

      this.form.patchValue({
        location_lat: result.latitude,
        location_lng: result.longitude,
        location_formatted_address: result.fullAddress,
      });
    } catch (error) {
      try {
        // Fallback: Try geocoding just the city
        const cityResult = await this.geocodingService.getCityCoordinates(
          city,
          country || 'Uruguay',
        );
        this.form.patchValue({
          location_lat: cityResult.latitude,
          location_lng: cityResult.longitude,
          location_formatted_address: cityResult.fullAddress,
        });
      } catch (cityError) {
        // Si falla todo, usar coordenadas aproximadas de Montevideo por defecto
        this.form.patchValue({
          location_lat: -34.9011,
          location_lng: -56.1645,
          location_formatted_address: `${street} ${streetNumber}, ${city}, ${country || 'Uruguay'}`,
        });
      }
    }
  }

  private getFormValidationErrors(): Record<string, unknown> {
    const errors: Record<string, unknown> = {};
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control?.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  private setupValueUsdSuggestion(): void {
    const priceControl = this.form.get('price_per_day');
    const valueControl = this.form.get('value_usd');

    if (!priceControl || !valueControl) {
      return;
    }

    const handlePriceChange = (rawValue: unknown): void => {
      const numericValue =
        typeof rawValue === 'string' ? parseFloat(rawValue) : (rawValue as number | null);

      if (!numericValue || Number.isNaN(numericValue) || numericValue <= 0) {
        this.suggestedVehicleValueUsd.set(null);
        if (!this.hasManualValueUsdOverride) {
          valueControl.setValue(null, { emitEvent: false });
          valueControl.updateValueAndValidity({ onlySelf: true });
        }
        return;
      }

      const suggestion = this.carsService.suggestVehicleValueUsd(numericValue);
      this.suggestedVehicleValueUsd.set(suggestion > 0 ? suggestion : null);

      if (!this.hasManualValueUsdOverride && suggestion > 0) {
        valueControl.setValue(suggestion, { emitEvent: false });
        valueControl.markAsPristine();
        valueControl.markAsUntouched();
        valueControl.updateValueAndValidity({ onlySelf: true });
      }
    };

    handlePriceChange(priceControl.value);

    const priceSub = priceControl.valueChanges.subscribe(handlePriceChange);
    this.formSubscriptions.push(priceSub);

    const valueSub = valueControl.valueChanges.subscribe((val) => {
      if (val === null || val === undefined) {
        this.hasManualValueUsdOverride = false;
        return;
      }
      this.hasManualValueUsdOverride = true;
    });
    this.formSubscriptions.push(valueSub);
  }
}
