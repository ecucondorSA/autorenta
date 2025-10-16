import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { CarsService } from '@core/services/cars.service';
import { AuthService } from '@core/services/auth.service';
import { GeocodingService } from '@core/services/geocoding.service';
import { UploadImageComponent } from '@shared/components/upload-image/upload-image.component';
import type { FuelType, Transmission, CarStatus } from '@core/types/database.types';

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
  imports: [CommonModule, ReactiveFormsModule, UploadImageComponent],
  templateUrl: './publish-car.page.html',
  styleUrl: './publish-car.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublishCarPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly carsService = inject(CarsService);
  private readonly authService = inject(AuthService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly router = inject(Router);

  readonly brands = signal<CarBrand[]>([]);
  readonly models = signal<CarModel[]>([]);
  readonly loadingBrands = signal(true);
  readonly loadingModels = signal(false);

  readonly form = this.fb.nonNullable.group({
    // Información básica
    title: ['', [Validators.required, Validators.minLength(10)]],
    description: ['', [Validators.required, Validators.minLength(30)]],

    // Marca y modelo
    brand_id: ['', Validators.required],
    brand: ['', Validators.required],
    model_id: ['', Validators.required],
    model: ['', Validators.required],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(2000), Validators.max(new Date().getFullYear() + 1)]],

    // Precio y condiciones
    price_per_day: [0, [Validators.required, Validators.min(10)]],
    currency: ['USD', Validators.required],
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
  readonly submitting = computed(() => this.uploadingSignal());
  readonly hasFiles = computed(() => this.selectedFilesSignal().length > 0);

  async ngOnInit(): Promise<void> {
    await this.loadBrands();

    // Watch for brand changes to load models
    this.form.get('brand_id')?.valueChanges.subscribe(async (brandId) => {
      if (brandId) {
        await this.loadModels(brandId);
        const brand = this.brands().find(b => b.id === brandId);
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
        const model = this.models().find(m => m.id === modelId);
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
  }

  private async loadBrands(): Promise<void> {
    this.loadingBrands.set(true);
    try {
      const brands = await this.carsService.getCarBrands();
      this.brands.set(brands);
    } catch (error) {
      console.error('Error loading brands:', error);
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
      console.error('Error loading models:', error);
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

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      console.log('Form errors:', this.getFormValidationErrors());
      return;
    }

    const session = this.authService.session$();
    if (!session?.user) {
      console.error('Usuario no autenticado para publicar auto');
      return;
    }

    this.uploadingSignal.set(true);
    try {
      // Geocodificar la dirección antes de crear el auto
      await this.geocodeCurrentAddress();

      const formValue = this.form.getRawValue();
      const car = await this.carsService.createCar(formValue);

      const files = this.selectedFilesSignal();
      for (let i = 0; i < files.length; i++) {
        try {
          await this.carsService.uploadPhoto(files[i], car.id, i);
        } catch (error) {
          console.error('No se pudo subir una de las fotos', error);
        }
      }

      await this.router.navigate(['/cars/mine'], {
        queryParams: { published: 'true' },
      });
    } catch (error) {
      console.error('No se pudo publicar el auto', error);
    } finally {
      this.uploadingSignal.set(false);
    }
  }

  private async geocodeCurrentAddress(): Promise<void> {
    const street = this.form.get('location_street')?.value;
    const streetNumber = this.form.get('location_street_number')?.value;
    const neighborhood = this.form.get('location_neighborhood')?.value;
    const city = this.form.get('location_city')?.value;
    const state = this.form.get('location_state')?.value;
    const country = this.form.get('location_country')?.value;

    if (!street || !city) {
      console.warn('[PublishCarPage] Street or city missing, cannot geocode');
      return;
    }

    console.log('[PublishCarPage] Geocoding address...');
    const result = await this.geocodingService.geocodeFromComponents({
      street,
      streetNumber,
      neighborhood,
      city,
      state,
      country,
    });

    if (result) {
      console.log('[PublishCarPage] Geocoding successful:', result);
      this.form.patchValue({
        location_lat: result.latitude,
        location_lng: result.longitude,
        location_formatted_address: result.formattedAddress,
      });
    } else {
      console.warn('[PublishCarPage] Geocoding failed, using default coordinates for', city);
      // Si falla el geocoding, usar coordenadas aproximadas de Montevideo por defecto
      this.form.patchValue({
        location_lat: -34.9011,
        location_lng: -56.1645,
        location_formatted_address: `${street} ${streetNumber}, ${city}, ${country}`,
      });
    }
  }

  private getFormValidationErrors(): any {
    const errors: any = {};
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control?.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }
}
