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
import {
  VehicleScannerLiveComponent,
  VehicleScannerConfirmData,
} from '@shared/components/vehicle-scanner-live/vehicle-scanner-live.component';

/**
 * Vehicle brand selection question
 * Features brand search with logos and popular brands grid
 */
@Component({
  selector: 'app-vehicle-question',
  standalone: true,
  imports: [FormsModule, VehicleScannerLiveComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Live Scanner (fullscreen overlay) -->
    @if (showScanner()) {
      <app-vehicle-scanner-live
        (vehicleConfirmed)="onVehicleConfirmed($event)"
        (cancelled)="closeScanner()"
      />
    }

    <div class="space-y-6">
      <!-- Search input with camera button -->
      <div class="flex gap-3">
        <div class="relative flex-1">
          <!-- Search icon (always visible, inside input) -->
          <svg
            class="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none z-10"
            style="left: 12px;"
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
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch($event)"
            placeholder="Buscar marca..."
            class="w-full pr-12 py-4 bg-surface-raised border-2 border-border-default rounded-2xl text-lg focus:ring-0 focus:border-cta-default transition-all placeholder:text-text-muted"
            style="padding-left: 52px !important;"
            [class.border-cta-default]="isFocused()"
            (focus)="isFocused.set(true)"
            (blur)="onBlur()"
          />
          @if (searchQuery && !isLoading()) {
            <button
              type="button"
              (click)="clearSearch()"
              class="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-surface-secondary hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          }
          @if (isLoading()) {
            <div class="absolute right-4 top-1/2 -translate-y-1/2">
              <svg class="animate-spin h-5 w-5 text-cta-default" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          }
        </div>

        <!-- Camera button for AI recognition (opens live scanner) -->
        <button
          type="button"
          (click)="openScanner()"
          class="flex-shrink-0 w-14 h-14 bg-cta-default/10 hover:bg-cta-default/20 border-2 border-cta-default/30 hover:border-cta-default rounded-2xl flex items-center justify-center transition-all active:scale-95 hover:shadow-lg"
          title="Escanear auto con cámara"
        >
          <svg class="w-6 h-6 text-cta-default" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <!-- Recognition result message -->
      @if (recognitionMessage()) {
        <div class="flex items-center gap-2 p-3 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-lg text-sm">
          <svg class="w-5 h-5 text-blue-700 dark:text-blue-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-blue-800 dark:text-blue-100">{{ recognitionMessage() }}</span>
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
          <p class="text-xs font-semibold text-text-muted uppercase tracking-widest">Marcas populares</p>
          <div class="grid grid-cols-3 gap-3">
            @for (brand of popularBrands(); track brand.code; let i = $index) {
              <button
                type="button"
                (click)="selectBrand(brand)"
                class="flex flex-col items-center justify-center gap-2.5 p-4 bg-surface-base border-2 border-border-default rounded-2xl hover:border-cta-default hover:shadow-premium-md active:scale-[0.98] transition-all duration-200 group min-h-[100px]"
                [style.animation-delay.ms]="i * 50"
              >
                @if (getBrandLogo(brand.name); as logo) {
                  <img
                    [src]="logo"
                    [alt]="brand.name"
                    class="w-12 h-12 object-contain group-hover:scale-110 transition-transform duration-200"
                    loading="lazy"
                  />
                } @else {
                  <div class="w-12 h-12 bg-surface-secondary rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:bg-cta-default/10 transition-all duration-200">
                    <span class="text-xl font-bold text-text-muted group-hover:text-cta-default">{{ brand.name.charAt(0) }}</span>
                  </div>
                }
                <span class="text-xs font-semibold text-text-secondary group-hover:text-cta-default transition-colors text-center leading-tight line-clamp-1">
                  {{ brand.name }}
                </span>
              </button>
            }
          </div>
        </div>
      }

      <!-- Selected brand indicator -->
      @if (selectedBrand()) {
        <div class="flex items-center gap-3 p-4 bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl">
          <div class="w-10 h-10 bg-emerald-200 dark:bg-emerald-800 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-700 dark:text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="flex-1">
            <p class="text-sm text-emerald-800 dark:text-emerald-100">Marca seleccionada</p>
            <p class="font-semibold text-emerald-900 dark:text-white">{{ selectedBrand()?.name }}</p>
          </div>
          <button
            type="button"
            (click)="clearSelection()"
            class="text-emerald-700 dark:text-emerald-200 hover:text-emerald-900 dark:hover:text-white transition-colors"
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

  readonly initialValue = input<{ code: string; name: string } | null>(null);
  readonly brandSelected = output<{ code: string; name: string }>();

  // State
  searchQuery = '';
  readonly isFocused = signal(false);
  readonly isLoading = signal(false);
  readonly showScanner = signal(false);
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
   * Opens the fullscreen live scanner
   */
  openScanner(): void {
    this.showScanner.set(true);
  }

  /**
   * Closes the scanner
   */
  closeScanner(): void {
    this.showScanner.set(false);
  }

  /**
   * Handles vehicle confirmed from live scanner
   */
  onVehicleConfirmed(data: VehicleScannerConfirmData): void {
    this.showScanner.set(false);

    const recognizedBrandName = data.detection.brand;

    // Find matching brand in our FIPE list
    const matchingBrand = this.brands().find(
      (b) =>
        b.name.toLowerCase().includes(recognizedBrandName.toLowerCase()) ||
        recognizedBrandName.toLowerCase().includes(b.name.toLowerCase()),
    );

    if (matchingBrand) {
      this.selectBrand(matchingBrand);
      this.recognitionMessage.set(
        `✓ ${data.detection.brand} ${data.detection.model} (${data.detection.confidence}% confianza)`,
      );
    } else {
      // Set search query to help user find brand
      this.searchQuery = recognizedBrandName;
      this.showResults.set(true);
      this.recognitionMessage.set(
        `Detectado: ${data.detection.brand}. Seleccioná la marca correcta.`,
      );
    }

    // Clear message after 5 seconds
    setTimeout(() => {
      this.recognitionMessage.set(null);
    }, 5000);
  }
}
