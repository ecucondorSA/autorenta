import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnChanges,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';

import { CarBrandsService } from '@core/services/cars/car-brands.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

export interface FipeAutocompleteOption {
  code: string;
  name: string;
}

/**
 * Generic autocomplete component for FIPE data (brands/models)
 * Similar to Mapbox address search UX
 */
@Component({
  selector: 'app-fipe-autocomplete',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="relative">
      <!-- Input field -->
      <div class="relative">
        <input
          type="text"
          [value]="searchQuery()"
          (input)="onSearchChange($any($event.target).value)"
          (focus)="onFocus()"
          (blur)="onBlur()"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [attr.data-testid]="dataTestId"
          role="combobox"
          [attr.aria-expanded]="showDropdown()"
          [attr.aria-controls]="dataTestId ? dataTestId + '-list' : null"
          class="block w-full px-4 py-3 bg-surface-raised border border-border-default rounded-lg shadow-sm focus:ring-2 focus:ring-cta-default focus:border-transparent transition-all duration-200 text-text-primary placeholder-text-muted"
          [class.border-cta-default]="isFocused()"
          [class.bg-surface-secondary]="disabled"
        />

        <!-- Loading spinner -->
        @if (isLoading) {
          <div class="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
            <svg
              class="animate-spin h-5 w-5 text-cta-default"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        }

        <!-- Clear button -->
        @if (searchQuery() && !disabled && !isLoading) {
          <button
            type="button"
            (click)="clearSelection(); $event.stopPropagation()"
            (mousedown)="$event.preventDefault()"
            class="absolute right-3 top-1/2 transform -translate-y-1/2 z-20 text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
            aria-label="Limpiar selección"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        }
      </div>

      <!-- Dropdown list -->
      @if (showDropdown() && filteredOptions().length > 0) {
        <div
          class="absolute z-50 w-full mt-2 bg-surface-raised border border-border-default rounded-lg shadow-lg max-h-64 overflow-y-auto"
          (mouseenter)="isHoveringDropdown.set(true)"
          (mouseleave)="onDropdownLeave()"
          [attr.id]="dataTestId ? dataTestId + '-list' : null"
          role="listbox"
        >
          @for (option of filteredOptions(); track option.code) {
            <button
              type="button"
              (mousedown)="selectOption(option)"
              class="w-full px-4 py-3 text-left hover:bg-surface-hover focus:bg-surface-hover focus:outline-none transition-colors border-b border-border-default last:border-b-0"
            >
              <div class="flex items-center gap-3">
                @if (getBrandLogoPath(option.name); as logoPath) {
                  <img
                    [src]="logoPath"
                    [alt]="option.name"
                    class="w-6 h-6 object-contain flex-shrink-0"
                    loading="lazy"
                  />
                }
                <span class="text-sm font-medium text-text-primary">{{ option.name }}</span>
              </div>
            </button>
          }
        </div>
      }

      <!-- No results message -->
      @if (showDropdown() && filteredOptions().length === 0 && searchQuery().length >= minChars) {
        <div
          class="absolute z-50 w-full mt-2 bg-surface-raised border border-border-default rounded-lg shadow-lg p-4"
        >
          <p class="text-sm text-text-secondary text-center">No se encontraron resultados</p>
        </div>
      }

      <!-- Helper text -->
      @if (helperText) {
        <p class="mt-2 text-sm text-text-muted">{{ helperText }}</p>
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
export class FipeAutocompleteComponent implements OnChanges {
  private readonly carBrandsService = inject(CarBrandsService);
  private readonly logger = inject(LoggerService).createChildLogger('FipeAutocomplete');

  @Input() placeholder = 'Escribe para buscar...';

  // ✅ FIX: Use signal for options to ensure computed updates when input changes
  private readonly _options = signal<FipeAutocompleteOption[]>([]);
  @Input() set options(value: FipeAutocompleteOption[]) {
    this.logger.debug('Options received', { count: value?.length ?? 0 });
    this._options.set(value);
  }

  @Input() disabled = false;
  @Input() isLoading = false;
  @Input() minChars = 2;
  @Input() helperText = '';
  @Input() selectedValue: FipeAutocompleteOption | null = null;
  @Input() dataTestId: string | null = null;
  @Input() showBrandLogos = false; // Enable brand logos in dropdown

  @Output() optionSelected = new EventEmitter<FipeAutocompleteOption>();
  @Output() searchQueryChanged = new EventEmitter<string>();

  readonly searchQuery = signal('');
  readonly isFocused = signal(false);
  readonly showDropdown = signal(false);
  readonly isHoveringDropdown = signal(false);

  filteredOptions = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const currentOptions = this._options();

    // If query is empty and minChars is 0, show all options (limit to 50)
    if (query.length === 0 && this.minChars === 0) {
      return currentOptions.slice(0, 50);
    }

    if (query.length < this.minChars) {
      return [];
    }

    return currentOptions
      .filter((option) => option.name.toLowerCase().includes(query))
      .slice(0, 50);
  });

  ngOnChanges(changes: import('@angular/core').SimpleChanges): void {
    if (changes['options']) {
      this._options.set(this.options || []);
    }

    // Sync searchQuery with selectedValue when it changes from parent
    if (changes['selectedValue'] && this.selectedValue) {
      this.searchQuery.set(this.selectedValue.name);
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.searchQueryChanged.emit(query);
    this.showDropdown.set(true);
  }

  onFocus(): void {
    this.isFocused.set(true);
    this.showDropdown.set(true);
  }

  onBlur(): void {
    this.isFocused.set(false);
    this.hideDropdownSoon();
  }

  selectOption(option: FipeAutocompleteOption): void {
    this.searchQuery.set(option.name);
    this.selectedValue = option;
    this.showDropdown.set(false);
    this.optionSelected.emit(option);
  }

  clearSelection(): void {
    this.searchQuery.set('');
    this.selectedValue = null;
    this.showDropdown.set(false);
    this.isFocused.set(false);
    // Emit null to indicate clearing
    this.optionSelected.emit({ code: '', name: '' });
    this.searchQueryChanged.emit('');
  }

  private hideDropdownSoon(): void {
    setTimeout(() => {
      if (!this.isHoveringDropdown()) {
        this.showDropdown.set(false);
      }
    }, 120);
  }

  onDropdownLeave(): void {
    this.isHoveringDropdown.set(false);
    this.hideDropdownSoon();
  }

  /**
   * Get brand logo path for a given brand name
   */
  getBrandLogoPath(brandName: string): string | null {
    if (!this.showBrandLogos) return null;
    return this.carBrandsService.getCarBrandLogoPath(brandName);
  }
}
