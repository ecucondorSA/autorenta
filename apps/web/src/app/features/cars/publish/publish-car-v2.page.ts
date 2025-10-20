import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CarsService } from '../../../core/services/cars.service';
import { GeocodingService } from '../../../core/services/geocoding.service';
import { BackgroundRemovalService } from '../../../core/services/background-removal.service';
import { Car, CarBrand, CarModel } from '../../../core/models';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-publish-car-v2',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-graphite-dark py-8 px-4 transition-colors duration-300 text-gray-900 dark:text-pearl-light">
      <div class="max-w-3xl mx-auto">
        <!-- Header -->
        <div class="bg-white dark:bg-anthracite rounded-lg shadow-sm dark:shadow-card p-6 mb-6 transition-colors">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-ivory-luminous mb-2">{{ editMode() ? 'Editar Auto' : 'Publicar Auto' }}</h1>
          <p class="text-gray-600 dark:text-pearl-light/75">{{ editMode() ? 'Modifica la información de tu vehículo' : 'Completa la información de tu vehículo' }}</p>

          <!-- Edit mode indicator -->
          <div *ngIf="editMode()" class="mt-4 bg-amber-50/90 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-400/50 rounded-lg p-3 flex items-start gap-2">
            <span class="text-amber-600 dark:text-amber-200 text-lg">✏️</span>
            <div class="flex-1">
              <p class="text-sm text-amber-800 dark:text-amber-100 font-medium">Modo edición</p>
              <p class="text-xs text-amber-600 dark:text-amber-100/80 mt-1">
                Estás editando un auto existente. Los cambios se guardarán al enviar el formulario.
              </p>
            </div>
          </div>

          <!-- Autofill indicator -->
          <div *ngIf="autofilledFromLast() && !editMode()" class="mt-4 bg-blue-50/90 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-400/40 rounded-lg p-3 flex items-start gap-2">
            <span class="text-blue-600 dark:text-blue-200 text-lg">ℹ️</span>
            <div class="flex-1">
              <p class="text-sm text-blue-800 dark:text-blue-100 font-medium">Datos autocompletados</p>
              <p class="text-xs text-blue-600 dark:text-blue-200/80 mt-1">
                Hemos rellenado algunos campos con los datos de tu última publicación para ahorrar tiempo.
                Solo modifica marca, modelo, año y fotos para el nuevo auto.
              </p>
            </div>
          </div>
        </div>

        <!-- Main Form -->
        <form [formGroup]="publishForm" (ngSubmit)="onSubmit()" class="space-y-6">

          <!-- 1. Vehículo -->
          <div class="publish-card bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">🚗</span>
              Información del Vehículo
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Brand -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">Marca *</label>
                <select formControlName="brand_id" (change)="onBrandChange()"
                        class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Selecciona una marca</option>
                  <option *ngFor="let brand of brands()" [value]="brand.id">{{ brand.name }}</option>
                </select>
              </div>

              <!-- Model -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">Modelo *</label>
                <select formControlName="model_id" (change)="onModelChange()"
                        [disabled]="!publishForm.get('brand_id')?.value"
                        class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100">
                  <option value="">Selecciona un modelo</option>
                  <option *ngFor="let model of filteredModels()" [value]="model.id">{{ model.name }}</option>
                </select>
                <p *ngIf="selectedModelInfo()" class="mt-1 text-xs text-gray-500">
                  {{ selectedModelInfo()?.category }} • {{ selectedModelInfo()?.seats }} asientos • {{ selectedModelInfo()?.doors }} puertas
                </p>
              </div>

              <!-- Year -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Año *</label>
                <input type="number" formControlName="year" [min]="minYear" [max]="maxYear" placeholder="2024"
                       class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <!-- Mileage -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Kilometraje *</label>
                <input type="number" formControlName="mileage" min="0" placeholder="50000"
                       class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <!-- Color -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Color *</label>
                <input type="text" formControlName="color" placeholder="Ej: Blanco, Negro"
                       class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <!-- Transmission -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Transmisión *</label>
                <select formControlName="transmission"
                        class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecciona</option>
                  <option value="manual">Manual</option>
                  <option value="automatic">Automática</option>
                </select>
              </div>

              <!-- Fuel -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Combustible *</label>
                <select formControlName="fuel"
                        class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecciona</option>
                  <option value="nafta">Nafta</option>
                  <option value="gasoil">Diesel</option>
                  <option value="electrico">Eléctrico</option>
                  <option value="hibrido">Híbrido</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 2. Precio -->
          <div class="publish-card bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">💰</span>
              Precio y Condiciones
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Price per day -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Precio por día *</label>
                <input type="number" formControlName="price_per_day" min="1" placeholder="50"
                       class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <!-- Currency -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Moneda *</label>
                <select formControlName="currency"
                        class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500">
                  <option value="USD">USD - Dólar</option>
                  <option value="ARS">ARS - Peso Argentino</option>
                  <option value="UYU">UYU - Peso Uruguayo</option>
                </select>
              </div>

              <!-- Min rental days -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Días mínimos *</label>
                <input type="number" formControlName="min_rental_days" min="1" placeholder="1"
                       class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <!-- Max rental days -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Días máximos</label>
                <input type="number" formControlName="max_rental_days" min="1" placeholder="30"
                       class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <p class="mt-1 text-xs text-gray-500">Dejar vacío = sin límite</p>
              </div>

              <!-- Deposit -->
              <div class="md:col-span-2 border-t border-gray-200 pt-4">
                <div class="flex items-center gap-3 mb-3">
                  <input type="checkbox" formControlName="deposit_required" id="deposit_required"
                         class="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500">
                  <label for="deposit_required" class="text-sm font-medium text-gray-700 cursor-pointer">
                    Requiere depósito de garantía
                  </label>
                </div>
                <div *ngIf="publishForm.get('deposit_required')?.value">
                  <input type="number" formControlName="deposit_amount" min="0" placeholder="200"
                         class="w-full md:w-1/2 rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <p class="mt-1 text-xs text-gray-500">Monto del depósito</p>
                </div>
              </div>

              <!-- Insurance -->
              <div class="md:col-span-2">
                <div class="flex items-center gap-3">
                  <input type="checkbox" formControlName="insurance_included" id="insurance_included"
                         class="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500">
                  <label for="insurance_included" class="text-sm font-medium text-gray-700 cursor-pointer">
                    El seguro está incluido en el precio
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Ubicación -->
          <div class="publish-card bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">📍</span>
              Ubicación
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Street -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">Calle *</label>
                <input type="text" formControlName="location_street" placeholder="Ej: Av. Corrientes"
                       class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <!-- Street number -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Número *</label>
                <input type="text" formControlName="location_street_number" placeholder="1234"
                       class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <!-- City -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Ciudad *</label>
                <input type="text" formControlName="location_city" placeholder="Ej: Buenos Aires"
                       class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <!-- State -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Provincia *</label>
                <input type="text" formControlName="location_state" placeholder="Ej: Buenos Aires"
                       class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              </div>

              <!-- Country -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">País *</label>
                <select formControlName="location_country"
                        class="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500">
                  <option value="AR">Argentina</option>
                  <option value="UY">Uruguay</option>
                  <option value="BR">Brasil</option>
                  <option value="CL">Chile</option>
                  <option value="PY">Paraguay</option>
                </select>
              </div>
            </div>

            <!-- GPS Location Button - Minimalist -->
            <div class="mt-4 flex items-center justify-between">
              <button type="button" (click)="useCurrentLocation()"
                      class="btn-secondary flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
                </svg>
                📍 Usar Mi Ubicación
              </button>
              <div *ngIf="manualCoordinates()" class="text-xs text-smoke-black">
                ✓ GPS activo
              </div>
            </div>
          </div>

          <!-- 4. Fotos -->
          <div class="publish-card bg-white rounded-lg shadow-sm p-6">
            <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span class="text-2xl">📸</span>
              Fotos ({{ uploadedPhotos().length }}/10)
            </h2>

            <div class="mb-4">
              <label class="cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition inline-flex items-center gap-2"
                     [class.opacity-50]="isProcessingPhotos()"
                     [class.cursor-not-allowed]="isProcessingPhotos()">
                <span *ngIf="!isProcessingPhotos()">➕ Agregar Fotos</span>
                <span *ngIf="isProcessingPhotos()" class="flex items-center gap-2">
                  <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </span>
                <input type="file" accept="image/*" multiple (change)="onPhotoSelected($event)" class="hidden" [disabled]="isProcessingPhotos()" />
              </label>
              <p class="mt-2 text-xs text-gray-500">
                Mínimo 3 fotos, máximo 10. Primera foto será la portada.
                <br>
                <span class="text-blue-600 font-medium">✨ Las fotos se procesarán automáticamente para remover el fondo</span>
              </p>
            </div>

            <div *ngIf="uploadedPhotos().length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div *ngFor="let photo of uploadedPhotos(); let i = index" class="relative group">
                <img [src]="photo.preview" [alt]="'Foto ' + (i + 1)" class="w-full h-32 object-cover rounded-lg border-2"
                     [class.border-blue-500]="i === 0" [class.border-gray-300]="i !== 0">
                <div *ngIf="i === 0" class="absolute top-2 left-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded">
                  PORTADA
                </div>
                <button type="button" (click)="removePhoto(i)"
                        class="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition">
                  ✕
                </button>
              </div>
            </div>

            <div *ngIf="uploadedPhotos().length < 3" class="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p class="text-sm text-yellow-800">
                ⚠️ Necesitas al menos 3 fotos para publicar. Actualmente tienes {{ uploadedPhotos().length }}.
              </p>
            </div>
          </div>

          <!-- Submit -->
          <div class="publish-card bg-white rounded-lg shadow-sm p-6 sticky bottom-0">
            <div class="flex justify-between items-center">
              <button type="button" (click)="goBack()" class="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Cancelar
              </button>
              <button type="submit" [disabled]="!canSubmit() || isSubmitting()"
                      class="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-semibold">
                <span *ngIf="!isSubmitting()">{{ editMode() ? 'Guardar cambios' : 'Publicar Auto' }}</span>
                <span *ngIf="isSubmitting()">{{ editMode() ? 'Guardando...' : 'Publicando...' }}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      :host-context(.dark) .publish-card {
        background-color: #1f2426;
        border-color: rgba(255, 255, 255, 0.08);
        color: #f7f5ee;
        transition: background-color 0.3s ease, border-color 0.3s ease;
      }

      :host-context(.dark) label,
      :host-context(.dark) .text-gray-600,
      :host-context(.dark) .text-gray-700,
      :host-context(.dark) .text-gray-900 {
        color: #f7f5ee;
      }

      :host-context(.dark) .text-gray-500 {
        color: rgba(247, 245, 238, 0.7);
      }

      :host-context(.dark) input,
      :host-context(.dark) select,
      :host-context(.dark) textarea {
        background-color: #1a1f21;
        border-color: rgba(255, 255, 255, 0.12);
        color: #f7f5ee;
      }

      :host-context(.dark) input:focus,
      :host-context(.dark) select:focus,
      :host-context(.dark) textarea:focus {
        border-color: rgba(122, 162, 170, 0.65);
        box-shadow: 0 0 0 2px rgba(44, 74, 82, 0.35);
      }

      :host-context(.dark) input::placeholder,
      :host-context(.dark) textarea::placeholder {
        color: rgba(247, 245, 238, 0.4);
      }

      :host-context(.dark) .bg-gray-100 {
        background-color: rgba(36, 42, 46, 0.9);
      }
    `,
  ],
})
export class PublishCarV2Page implements OnInit {
  private readonly fb: FormBuilder;
  private readonly carsService: CarsService;
  private readonly geocodingService: GeocodingService;
  private readonly bgRemovalService = inject(BackgroundRemovalService);
  private readonly router: Router;
  private readonly route: ActivatedRoute;

  readonly minYear = 1980;
  readonly maxYear = new Date().getFullYear() + 1;

  brands = signal<CarBrand[]>([]);
  models = signal<CarModel[]>([]);
  filteredModels = signal<CarModel[]>([]);
  uploadedPhotos = signal<Array<{ file: File; preview: string }>>([]);
  isSubmitting = signal(false);
  isProcessingPhotos = signal(false);
  autofilledFromLast = signal(false);
  editMode = signal(false);
  editingCarId = signal<string | null>(null);

  // Manual coordinates (simple approach)
  manualCoordinates = signal<{ latitude: number; longitude: number } | null>(null);

  publishForm!: FormGroup;

  selectedModelInfo = computed(() => {
    const modelId = this.publishForm?.get('model_id')?.value;
    if (!modelId) return null;
    return this.filteredModels().find(m => m.id === modelId);
  });

  generatedTitle = computed(() => {
    const brandId = this.publishForm?.get('brand_id')?.value;
    const modelId = this.publishForm?.get('model_id')?.value;
    const year = this.publishForm?.get('year')?.value;

    if (!brandId || !modelId || !year) return '';

    const brand = this.brands().find(b => b.id === brandId);
    const model = this.models().find(m => m.id === modelId);

    if (!brand || !model) return '';

    return `${brand.name} ${model.name} ${year}`;
  });

  constructor(
    fb: FormBuilder,
    carsService: CarsService,
    geocodingService: GeocodingService,
    router: Router,
    route: ActivatedRoute
  ) {
    this.fb = fb;
    this.carsService = carsService;
    this.geocodingService = geocodingService;
    this.router = router;
    this.route = route;
  }

  ngOnInit(): void {
    this.initForm();
    void this.loadData();

    // Check if we're in edit mode
    const editCarId = this.route.snapshot.queryParamMap.get('edit');
    if (editCarId) {
      this.editMode.set(true);
      this.editingCarId.set(editCarId);
      void this.loadCarForEditing(editCarId);
    } else {
      void this.loadLastPublicationData();
    }
  }

  private initForm(): void {
    this.publishForm = this.fb.group({
      // Vehicle
      brand_id: ['', Validators.required],
      model_id: ['', Validators.required],
      year: [new Date().getFullYear(), [Validators.required, Validators.min(this.minYear), Validators.max(this.maxYear)]],
      color: ['', Validators.required],
      mileage: [null, [Validators.required, Validators.min(0)]],
      transmission: ['', Validators.required],
      fuel: ['', Validators.required],

      // Pricing
      price_per_day: [null, [Validators.required, Validators.min(1)]],
      currency: ['USD', Validators.required],
      min_rental_days: [1, [Validators.required, Validators.min(1)]],
      max_rental_days: [30],
      deposit_required: [true],
      deposit_amount: [200],
      insurance_included: [false],

      // Location
      location_street: ['', Validators.required],
      location_street_number: ['', Validators.required],
      location_city: ['', Validators.required],
      location_state: ['', Validators.required],
      location_country: ['AR', Validators.required],
    });
  }

  private async loadData(): Promise<void> {
    try {
      const [brandsData, modelsData] = await Promise.all([
        this.carsService.getCarBrands(),
        this.carsService.getAllCarModels()
      ]);

      this.brands.set(brandsData as CarBrand[]);
      this.models.set(modelsData as CarModel[]);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar marcas y modelos. Por favor recarga la página.');
    }
  }

  private async loadLastPublicationData(): Promise<void> {
    try {
      const lastCar = await this.carsService.getUserLastCar();

      if (lastCar) {
        // Auto-completar campos comunes que no cambian entre autos
        this.publishForm.patchValue({
          transmission: lastCar.transmission,
          fuel: lastCar.fuel,
          color: lastCar.color,
          currency: lastCar.currency,
          min_rental_days: lastCar.min_rental_days,
          max_rental_days: lastCar.max_rental_days,
          deposit_required: lastCar.deposit_required,
          deposit_amount: lastCar.deposit_amount,
          insurance_included: lastCar.insurance_included,
          location_street: lastCar.location_street,
          location_street_number: lastCar.location_street_number,
          location_city: lastCar.location_city,
          location_state: lastCar.location_state,
          location_country: lastCar.location_country,
        });

        this.autofilledFromLast.set(true);
        console.log('✅ Formulario autocompletado desde última publicación');
      }
    } catch {
      // Silently fail - not critical
      console.log('No previous car found for autofill');
    }
  }

  private async loadCarForEditing(carId: string): Promise<void> {
    try {
      const car = await this.carsService.getCarById(carId);
      if (!car) {
        alert('Auto no encontrado');
        await this.router.navigate(['/cars/my']);
        return;
      }

      // Pre-fill form with car data
      this.publishForm.patchValue({
        brand_id: car.brand_id,
        model_id: car.model_id,
        year: car.year,
        color: car.color,
        mileage: car.mileage,
        transmission: car.transmission,
        fuel: car.fuel,
        price_per_day: car.price_per_day,
        currency: car.currency,
        min_rental_days: car.min_rental_days,
        max_rental_days: car.max_rental_days,
        deposit_required: car.deposit_required,
        deposit_amount: car.deposit_amount,
        insurance_included: car.insurance_included,
        location_street: car.location_street,
        location_street_number: car.location_street_number,
        location_city: car.location_city,
        location_state: car.location_state,
        location_country: car.location_country,
      });

      // Set coordinates if available
      if (car.location_lat && car.location_lng) {
        this.manualCoordinates.set({
          latitude: car.location_lat,
          longitude: car.location_lng
        });
      }

      // Trigger brand change to load models for the selected brand
      this.onBrandChange();

      console.log('✅ Formulario cargado con datos del auto para edición');
    } catch (error) {
      console.error('Error loading car for editing:', error);
      alert('Error al cargar el auto. Por favor intenta nuevamente.');
      await this.router.navigate(['/cars/my']);
    }
  }

  onBrandChange(): void {
    const brandId = this.publishForm.get('brand_id')?.value;

    if (!brandId) {
      this.filteredModels.set([]);
    } else {
      const filtered = this.models().filter(m => m.brand_id === brandId);
      this.filteredModels.set(filtered);
    }

    // Reset model selection when brand changes
    this.publishForm.patchValue({ model_id: '' });
  }

  onModelChange(): void {
    // Model info is displayed automatically via computed signal
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    if (this.uploadedPhotos().length + files.length > 10) {
      alert('Máximo 10 fotos permitidas');
      return;
    }

    this.isProcessingPhotos.set(true);

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          alert(`${file.name} no es una imagen válida`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name} supera el tamaño máximo de 5MB`);
          continue;
        }

        console.log(`[Upload] Processing ${file.name}...`);

        // 1. Remover fondo con ONNX
        let processedFile: File;
        try {
          console.log(`[Upload] Removing background from ${file.name}...`);
          const processedBlob = await this.bgRemovalService.removeBackground(file);
          processedFile = new File([processedBlob], file.name.replace(/\.[^.]+$/, '.png'), {
            type: 'image/png',
          });
          console.log(`✅ [Upload] Background removed from ${file.name}`);
        } catch (error) {
          console.warn(`⚠️ Background removal failed for ${file.name}, using original:`, error);
          processedFile = file; // Fallback: usar imagen original
        }

        // 2. Crear preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          this.uploadedPhotos.update((photos) => [...photos, { file: processedFile, preview }]);
        };
        reader.readAsDataURL(processedFile);
      }
    } finally {
      this.isProcessingPhotos.set(false);
      input.value = '';
    }
  }

  removePhoto(index: number): void {
    this.uploadedPhotos.update((photos) => photos.filter((_, i) => i !== index));
  }

  useCurrentLocation(): void {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        this.manualCoordinates.set(coords);
        console.log('📍 Ubicación actual capturada:', coords);

        // Perform reverse geocoding to auto-fill address fields
        try {
          console.log('🔄 Reverse geocoding coordinates...');
          const addressResult = await this.geocodingService.reverseGeocode(
            coords.latitude,
            coords.longitude
          );

          console.log('✅ Reverse geocoding result:', addressResult);

          // Auto-fill address fields from reverse geocoding
          this.publishForm.patchValue({
            location_street: addressResult.street || '',
            location_street_number: addressResult.streetNumber || '',
            location_city: addressResult.city || '',
            location_state: addressResult.state || '',
            location_country: addressResult.countryCode || 'AR',
          });

          console.log('✅ Formulario autocompletado con dirección desde GPS');
        } catch (reverseGeoError) {
          console.warn('⚠️ Reverse geocoding failed:', reverseGeoError);
          // Still keep the coordinates even if reverse geocoding fails
          alert('Coordenadas capturadas, pero no se pudo obtener la dirección automáticamente. Por favor ingresa la dirección manualmente.');
        }
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        alert('No se pudo obtener tu ubicación. Asegúrate de dar permiso al navegador.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  canSubmit(): boolean {
    // In edit mode, allow submission without photos (car already has photos)
    // In create mode, require at least 3 photos
    if (this.editMode()) {
      return this.publishForm.valid;
    } else {
      return this.publishForm.valid && this.uploadedPhotos().length >= 3;
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.canSubmit() || this.isSubmitting()) return;

    try {
      this.isSubmitting.set(true);

      const formValue = this.publishForm.value;

      // Get brand and model names for backup fields
      const brand = this.brands().find(b => b.id === formValue.brand_id);
      const model = this.models().find(m => m.id === formValue.model_id);
      const selectedModel = this.selectedModelInfo();

      if (!brand || !model) {
        alert('Error: Marca o modelo no encontrado');
        this.isSubmitting.set(false);
        return;
      }

      // ✅ GET COORDINATES: Manual > Geocoding > City Fallback
      let location_lat: number | undefined;
      let location_lng: number | undefined;

      // Priority 1: Use manual coordinates if user captured them
      const manualCoords = this.manualCoordinates();
      if (manualCoords) {
        location_lat = manualCoords.latitude;
        location_lng = manualCoords.longitude;
        console.log(`✅ Using manual coordinates: ${location_lat}, ${location_lng}`);
      } else {
        // Geocode if user didn't use the map
        console.log('🌍 Geocoding address...');
        try {
          const geocodingResult = await this.geocodingService.geocodeStructuredAddress(
            formValue.location_street,
            formValue.location_street_number,
            formValue.location_city,
            formValue.location_state,
            formValue.location_country
          );

          location_lat = geocodingResult.latitude;
          location_lng = geocodingResult.longitude;
          console.log(`✅ Geocoding success: ${location_lat}, ${location_lng}`);
        } catch (geocodingError) {
          console.warn('⚠️ Geocoding failed, trying city fallback...', geocodingError);

          // Fallback: Try geocoding just the city
          try {
            const cityResult = await this.geocodingService.getCityCoordinates(
              formValue.location_city,
              formValue.location_country
            );
            location_lat = cityResult.latitude;
            location_lng = cityResult.longitude;
            console.log(`✅ City fallback success: ${location_lat}, ${location_lng}`);
          } catch (cityError) {
            console.error('❌ City geocoding also failed:', cityError);
            alert('No se pudieron obtener las coordenadas de la dirección. Por favor verifica la ubicación.');
            this.isSubmitting.set(false);
            return;
          }
        }
      }

      const carData: Partial<Car> = {
        brand_id: formValue.brand_id,
        model_id: formValue.model_id,
        brand_text_backup: brand.name,  // Campo requerido NOT NULL
        model_text_backup: model.name,  // Campo requerido NOT NULL
        year: formValue.year,
        color: formValue.color,
        mileage: formValue.mileage,
        transmission: formValue.transmission,
        fuel: formValue.fuel,
        seats: selectedModel?.seats,  // Desde car_models
        doors: selectedModel?.doors,  // Desde car_models
        price_per_day: formValue.price_per_day,
        currency: formValue.currency,
        min_rental_days: formValue.min_rental_days,
        max_rental_days: formValue.max_rental_days,
        deposit_required: formValue.deposit_required,
        deposit_amount: formValue.deposit_amount,
        insurance_included: formValue.insurance_included,
        location_street: formValue.location_street,
        location_street_number: formValue.location_street_number,
        location_city: formValue.location_city,
        location_state: formValue.location_state,
        location_province: formValue.location_state,
        location_country: formValue.location_country,
        location_lat,  // ✅ NEW: Geocoded coordinates
        location_lng,  // ✅ NEW: Geocoded coordinates
        title: this.generatedTitle(),
        description: `${this.generatedTitle()} disponible para alquiler`,
        status: 'active',  // ✅ Changed from 'draft' to 'active' for immediate visibility
        cancel_policy: 'flex',
        features: {},
      };

      let resultCar: Car;

      // Check if we're editing or creating
      if (this.editMode() && this.editingCarId()) {
        // Update existing car
        resultCar = await this.carsService.updateCar(this.editingCarId()!, carData);
        console.log('✅ Auto actualizado exitosamente');
      } else {
        // Create new car
        resultCar = await this.carsService.createCar(carData);
        console.log('✅ Auto creado exitosamente');
      }

      // Upload new photos (only if there are any)
      if (this.uploadedPhotos().length > 0) {
        for (let i = 0; i < this.uploadedPhotos().length; i++) {
          const photo = this.uploadedPhotos()[i];
          await this.carsService.uploadPhoto(photo.file, resultCar.id, i);
        }
        console.log(`✅ ${this.uploadedPhotos().length} fotos subidas`);
      }

      const message = this.editMode()
        ? '¡Auto actualizado exitosamente!'
        : '¡Auto publicado exitosamente! Será revisado por nuestro equipo.';

      alert(message);
      await this.router.navigate(['/cars/my']);
    } catch (error) {
      console.error('Error publishing car:', error);
      alert('Error al publicar el auto. Por favor intenta nuevamente.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  goBack(): void {
    void this.router.navigate(['/cars']);
  }
}
