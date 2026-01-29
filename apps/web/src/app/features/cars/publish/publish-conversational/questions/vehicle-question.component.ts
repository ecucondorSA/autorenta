import {
  Component,
  inject,
  signal,
  computed,
  input,
  output,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PricingService, FipeBrand } from '@core/services/payments/pricing.service';
import { CarBrandsService } from '@core/services/cars/car-brands.service';
import { VehicleRecognitionService } from '@core/services/ai/vehicle-recognition.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/**
 * Vehicle brand selection question
 * Features brand search with logos and popular brands grid
 */
@Component({
  selector: 'app-vehicle-question',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Search input with camera button -->
      <div class="flex gap-2">
        <div class="relative flex-1">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch($event)"
            placeholder="Buscar marca..."
            class="w-full px-4 py-4 bg-surface-raised border border-border-default rounded-xl text-lg focus:ring-2 focus:ring-cta-default focus:border-transparent transition-all"
            [class.pl-12]="!searchQuery"
            [class.border-cta-default]="isFocused()"
            (focus)="isFocused.set(true)"
            (blur)="onBlur()"
          />
          @if (!searchQuery) {
            <svg
              class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
          @if (searchQuery && !isLoading() && !isRecognizing()) {
            <button
              type="button"
              (click)="clearSearch()"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          }
          @if (isLoading() || isRecognizing()) {
            <div class="absolute right-4 top-1/2 -translate-y-1/2">
              <svg class="animate-spin h-5 w-5 text-cta-default" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          }
        </div>

        <!-- Camera button for AI recognition -->
        <button
          type="button"
          (click)="openCameraForRecognition()"
          [disabled]="isRecognizing()"
          class="flex-shrink-0 w-14 h-14 bg-cta-default/10 hover:bg-cta-default/20 border border-cta-default/30 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
          title="Escanear auto con cámara"
        >
          @if (isRecognizing()) {
            <svg class="animate-spin h-6 w-6 text-cta-default" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          } @else {
            <svg class="w-6 h-6 text-cta-default" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        </button>
      </div>

      <!-- Recognition result message -->
      @if (recognitionMessage()) {
        <div class="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
          <svg class="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-blue-700 dark:text-blue-300">{{ recognitionMessage() }}</span>
        </div>
      }

      <!-- Search results -->
      @if (showResults() && filteredBrands().length > 0) {
        <div class="bg-surface-raised border border-border-default rounded-xl shadow-lg max-h-64 overflow-y-auto">
          @for (brand of filteredBrands(); track brand.code) {
            <button
              type="button"
              (click)="selectBrand(brand)"
              class="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-hover transition-colors border-b border-border-default last:border-b-0"
            >
              @if (getBrandLogo(brand.name); as logo) {
                <img [src]="logo" [alt]="brand.name" class="w-8 h-8 object-contain" loading="lazy" />
              } @else {
                <div class="w-8 h-8 bg-surface-secondary rounded-full flex items-center justify-center">
                  <span class="text-sm font-bold text-text-muted">{{ brand.name.charAt(0) }}</span>
                </div>
              }
              <span class="font-medium text-text-primary">{{ brand.name }}</span>
            </button>
          }
        </div>
      }

      <!-- No results -->
      @if (showResults() && searchQuery.length >= 2 && filteredBrands().length === 0 && !isLoading()) {
        <div class="text-center py-8 text-text-secondary">
          <p>No encontramos esa marca</p>
          <p class="text-sm mt-1">Intentá con otro nombre</p>
        </div>
      }

      <!-- Popular brands grid -->
      @if (!showResults()) {
        <div class="space-y-4">
          <p class="text-sm font-medium text-text-muted uppercase tracking-wider">Marcas populares</p>
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
            @for (brand of popularBrands(); track brand.code) {
              <button
                type="button"
                (click)="selectBrand(brand)"
                class="flex flex-col items-center gap-2 p-4 bg-surface-raised border border-border-default rounded-xl hover:border-cta-default hover:shadow-md transition-all group"
              >
                @if (getBrandLogo(brand.name); as logo) {
                  <img
                    [src]="logo"
                    [alt]="brand.name"
                    class="w-10 h-10 object-contain group-hover:scale-110 transition-transform"
                    loading="lazy"
                  />
                } @else {
                  <div class="w-10 h-10 bg-surface-secondary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span class="text-lg font-bold text-text-muted">{{ brand.name.charAt(0) }}</span>
                  </div>
                }
                <span class="text-xs font-medium text-text-secondary group-hover:text-cta-default transition-colors">
                  {{ brand.name }}
                </span>
              </button>
            }
          </div>
        </div>
      }

      <!-- Selected brand indicator -->
      @if (selectedBrand()) {
        <div class="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <div class="w-10 h-10 bg-emerald-100 dark:bg-emerald-800 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm text-emerald-700 dark:text-emerald-400">Marca seleccionada</p>
            <p class="font-semibold text-emerald-900 dark:text-emerald-200">{{ selectedBrand()?.name }}</p>
          </div>
          <button
            type="button"
            (click)="clearSelection()"
            class="text-emerald-600 hover:text-emerald-800 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
export class VehicleQuestionComponent implements OnInit {
  private readonly pricingService = inject(PricingService);
  private readonly carBrandsService = inject(CarBrandsService);
  private readonly vehicleRecognition = inject(VehicleRecognitionService);

  readonly initialValue = input<{ code: string; name: string } | null>(null);
  readonly brandSelected = output<{ code: string; name: string }>();

  // State
  searchQuery = '';
  readonly isFocused = signal(false);
  readonly isLoading = signal(false);
  readonly isRecognizing = signal(false);
  readonly recognitionMessage = signal<string | null>(null);
  readonly showResults = signal(false);
  readonly brands = signal<FipeBrand[]>([]);
  readonly selectedBrand = signal<FipeBrand | null>(null);

  // Popular brands (hardcoded for quick display - must match FIPE API names exactly)
  private readonly POPULAR_BRAND_NAMES = [
    'Fiat',
    'Ford',
    'Toyota',
    'Honda',
    'Renault',
    'Hyundai',
    'Nissan',
    'Peugeot',
    'VW - VolksWagen',
    'GM - Chevrolet',
    'Kia Motors',
    'BMW',
    'Audi',
    'Mercedes-Benz',
    'Mazda',
    'Jeep',
    'Citroën',
    'Mitsubishi',
    'Suzuki',
  ];

  readonly popularBrands = computed(() => {
    const allBrands = this.brands();
    return this.POPULAR_BRAND_NAMES.map((name) => allBrands.find((b) => b.name === name)).filter(
      (b): b is FipeBrand => b !== undefined,
    );
  });

  readonly filteredBrands = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    if (query.length < 2) return [];
    return this.brands()
      .filter((b) => b.name.toLowerCase().includes(query))
      .slice(0, 10);
  });

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    try {
      const brands = await this.pricingService.getFipeBrands();
      this.brands.set(brands);

      // Restore initial value if provided
      const initial = this.initialValue();
      if (initial) {
        const brand = brands.find((b) => b.code === initial.code);
        if (brand) {
          this.selectedBrand.set(brand);
          this.searchQuery = brand.name;
        }
      }
    } catch (error) {
      console.error('Failed to load brands:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    this.showResults.set(query.length >= 2);
  }

  onBlur(): void {
    this.isFocused.set(false);
    // Delay hiding results to allow click to register
    setTimeout(() => {
      if (!this.isFocused()) {
        this.showResults.set(false);
      }
    }, 200);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.showResults.set(false);
  }

  selectBrand(brand: FipeBrand): void {
    this.selectedBrand.set(brand);
    this.searchQuery = brand.name;
    this.showResults.set(false);
    this.brandSelected.emit({ code: brand.code, name: brand.name });
  }

  clearSelection(): void {
    this.selectedBrand.set(null);
    this.searchQuery = '';
  }

  getBrandLogo(brandName: string): string | null {
    return this.carBrandsService.getCarBrandLogoPath(brandName);
  }

  /**
   * Opens camera to take a photo and recognize the vehicle brand
   */
  async openCameraForRecognition(): Promise<void> {
    this.isRecognizing.set(true);
    this.recognitionMessage.set(null);

    try {
      // Check if we're on a native platform
      const isNative = Capacitor.isNativePlatform();

      let base64Data: string;

      if (isNative) {
        // Use Capacitor Camera on native
        const photo = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
          width: 1024,
          height: 768,
        });

        if (!photo.base64String) {
          throw new Error('No se pudo capturar la imagen');
        }
        base64Data = photo.base64String;
      } else {
        // Use file input on web
        base64Data = await this.captureFromWebInput();
      }

      // Recognize vehicle
      this.recognitionMessage.set('Analizando imagen...');
      const result = await this.vehicleRecognition.recognizeFromBase64(base64Data);

      if (result.success && result.vehicle.brand !== 'Desconocido') {
        // Find matching brand in our list
        const recognizedBrandName = result.vehicle.brand;
        const matchingBrand = this.brands().find(
          (b) =>
            b.name.toLowerCase().includes(recognizedBrandName.toLowerCase()) ||
            recognizedBrandName.toLowerCase().includes(b.name.toLowerCase()),
        );

        if (matchingBrand) {
          this.selectBrand(matchingBrand);
          this.recognitionMessage.set(
            `✓ Detectado: ${result.vehicle.brand} (${result.vehicle.confidence}% confianza)`,
          );
        } else {
          // Set search query to help user find brand
          this.searchQuery = recognizedBrandName;
          this.showResults.set(true);
          this.recognitionMessage.set(
            `Detectado: ${result.vehicle.brand}. Seleccioná la marca correcta.`,
          );
        }
      } else {
        this.recognitionMessage.set('No se pudo identificar la marca. Intentá con otra foto.');
      }
    } catch (error) {
      console.error('Camera recognition error:', error);
      this.recognitionMessage.set('Error al capturar imagen. Intentá de nuevo.');
    } finally {
      this.isRecognizing.set(false);

      // Clear message after 5 seconds
      setTimeout(() => {
        this.recognitionMessage.set(null);
      }, 5000);
    }
  }

  /**
   * Capture image from web file input (fallback for non-native)
   */
  private captureFromWebInput(): Promise<string> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use rear camera on mobile browsers

      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No se seleccionó ninguna imagen'));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get pure base64
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Error al leer la imagen'));
        reader.readAsDataURL(file);
      };

      input.click();
    });
  }
}
