import {
  Component,
  inject,
  input,
  output,
  signal,
  computed,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PricingService, FipeModel } from '@core/services/payments/pricing.service';

/**
 * Model selection question
 * Loads models based on selected brand and year
 */
@Component({
  selector: 'app-model-question',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Context reminder -->
      <div class="text-center">
        <span class="inline-flex items-center gap-2 px-4 py-2 bg-surface-secondary rounded-full text-sm">
          <span class="font-semibold text-text-primary">{{ brandName() }}</span>
          <span class="text-text-muted">{{ year() }}</span>
        </span>
      </div>

      <!-- Search input -->
      <div class="relative">
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
          placeholder="Buscar modelo..."
          class="w-full pr-12 py-4 bg-surface-raised border-2 border-border-default rounded-2xl text-lg focus:ring-0 focus:border-cta-default transition-all placeholder:text-text-muted"
          style="padding-left: 52px !important;"
          [disabled]="isLoading()"
        />
        @if (searchQuery && !isLoading()) {
          <button
            type="button"
            (click)="clearSearch()"
            aria-label="Limpiar búsqueda"
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

      <!-- Loading state -->
      @if (isLoading()) {
        <div class="space-y-3">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="h-14 bg-surface-secondary rounded-xl animate-pulse"></div>
          }
        </div>
      }

      <!-- Models list -->
      @if (!isLoading() && filteredModels().length > 0) {
        <div class="space-y-2 max-h-80 overflow-y-auto">
          @for (model of filteredModels(); track model.code) {
            <button
              type="button"
              (click)="selectModel(model)"
              class="w-full p-4 flex items-center justify-between gap-2 bg-surface-raised border rounded-xl transition-all"
              [class.border-cta-default]="selectedModel()?.code === model.code"
              [class.bg-cta-default/5]="selectedModel()?.code === model.code"
              [class.shadow-md]="selectedModel()?.code === model.code"
              [class.border-border-default]="selectedModel()?.code !== model.code"
              [class.hover:border-cta-default/50]="selectedModel()?.code !== model.code"
            >
              <span class="font-medium text-text-primary text-left text-sm sm:text-base break-words line-clamp-2 flex-1 min-w-0">{{ model.name }}</span>
              @if (selectedModel()?.code === model.code) {
                <svg class="w-5 h-5 text-cta-default flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              }
            </button>
          }
        </div>
      }

      <!-- No results -->
      @if (!isLoading() && searchQuery.length >= 2 && filteredModels().length === 0) {
        <div class="text-center py-8 text-text-secondary">
          <p>No encontramos ese modelo</p>
          <p class="text-sm mt-1">Intentá con otro nombre</p>
        </div>
      }

      <!-- Empty state -->
      @if (!isLoading() && models().length === 0) {
        <div class="text-center py-8 text-text-secondary">
          <svg class="w-12 h-12 mx-auto mb-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No hay modelos disponibles para esta combinación</p>
          <p class="text-sm mt-1">Probá seleccionar otro año</p>
        </div>
      }

      <!-- Selected model indicator -->
      @if (selectedModel()) {
        <div class="flex items-center gap-3 p-4 bg-emerald-100 dark:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 rounded-xl">
          <div class="w-10 h-10 bg-emerald-200 dark:bg-emerald-800 rounded-full flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-emerald-700 dark:text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-emerald-800 dark:text-emerald-100">Modelo seleccionado</p>
            <p class="font-semibold text-emerald-900 dark:text-white text-sm sm:text-base break-words">{{ selectedModel()?.name }}</p>
          </div>
          <button
            type="button"
            (click)="clearSelection()"
            aria-label="Quitar selección"
            class="text-emerald-700 dark:text-emerald-200 hover:text-emerald-900 dark:hover:text-white transition-colors"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }

      <!-- Market value display -->
      @if (selectedModel()) {
        <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 border border-blue-200 dark:border-blue-700 rounded-xl">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              @if (isLoadingValue()) {
                <svg class="animate-spin h-5 w-5 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              } @else {
                <svg class="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            </div>
            <div class="flex-1">
              <p class="text-sm text-blue-800 dark:text-blue-100">Valor de mercado estimado</p>
              @if (isLoadingValue()) {
                <p class="font-semibold text-blue-900 dark:text-white">Calculando...</p>
              } @else if (marketValueUsd()) {
                <p class="font-semibold text-blue-900 dark:text-white text-lg">~US$ {{ formatMarketValue(marketValueUsd()!) }}</p>
              } @else {
                <p class="font-semibold text-blue-900 dark:text-white">No disponible</p>
              }
            </div>
          </div>
          <p class="text-xs text-blue-700 dark:text-blue-200 mt-2 ml-13">
            Basado en el mercado de vehículos similares
          </p>
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
export class ModelQuestionComponent implements OnInit, OnChanges {
  private readonly pricingService = inject(PricingService);

  readonly brandCode = input.required<string>();
  readonly brandName = input.required<string>();
  readonly year = input.required<number>();
  readonly initialValue = input<{ code: string; name: string } | null>(null);
  readonly modelSelected = output<{ code: string; name: string }>();
  readonly fipeValueLoaded = output<number>();

  // State
  searchQuery = '';
  readonly isLoading = signal(false);
  readonly isLoadingValue = signal(false);
  readonly models = signal<FipeModel[]>([]);
  readonly selectedModel = signal<FipeModel | null>(null);
  readonly marketValueUsd = signal<number | null>(null);

  readonly filteredModels = computed(() => {
    const query = this.searchQuery.toLowerCase().trim();
    const allModels = this.models();
    if (!query) return allModels;
    return allModels.filter((m) => m.name.toLowerCase().includes(query));
  });

  async ngOnInit(): Promise<void> {
    await this.loadModels();
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['brandCode'] || changes['year']) {
      await this.loadModels();
    }
  }

  private async loadModels(): Promise<void> {
    const brandCode = this.brandCode();

    if (!brandCode) return;

    this.isLoading.set(true);
    try {
      // ✅ FIX: Load all models without year filtering to avoid FIPE rate limiting (429)
      // Year availability is validated when fetching FIPE value after model selection
      const models = await this.pricingService.getFipeModels(brandCode);
      this.models.set(models);

      // Restore initial value if provided
      const initial = this.initialValue();
      if (initial) {
        const model = models.find((m) => m.code === initial.code);
        if (model) {
          this.selectedModel.set(model);
          // Don't set searchQuery - keep it empty to show all models
        }
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      this.models.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch(query: string): void {
    this.searchQuery = query;
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  clearSelection(): void {
    this.selectedModel.set(null);
    this.marketValueUsd.set(null);
  }

  async selectModel(model: FipeModel): Promise<void> {
    this.selectedModel.set(model);
    this.searchQuery = '';  // Clear search to show all models
    this.modelSelected.emit({ code: model.code, name: model.name });

    // Load FIPE value
    await this.loadFipeValue(model.code);
  }

  private async loadFipeValue(_modelCode: string): Promise<void> {
    this.isLoadingValue.set(true);
    this.marketValueUsd.set(null);

    try {
      const result = await this.pricingService.getFipeValueRealtime({
        brand: this.brandName(),
        model: this.selectedModel()?.name || '',
        year: this.year(),
        country: 'AR',
      });

      if (result?.data?.value_usd) {
        this.marketValueUsd.set(result.data.value_usd);
      }

      if (result?.data?.value_brl) {
        this.fipeValueLoaded.emit(result.data.value_brl);
      }
    } catch (error) {
      console.error('Failed to load market value:', error);
    } finally {
      this.isLoadingValue.set(false);
    }
  }

  formatMarketValue(value: number): string {
    return value.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  }
}
