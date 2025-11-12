import { Component, Input, Output, EventEmitter, signal, computed, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule],
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
          class="block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          [class.border-blue-500]="isFocused()"
          [class.bg-gray-50]="disabled"
        />

        <!-- Loading spinner -->
        @if (isLoading) {
          <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg class="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        }

        <!-- Clear button -->
        @if (searchQuery() && !disabled) {
          <button
            type="button"
            (click)="clearSelection()"
            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        }
      </div>

      <!-- Dropdown list -->
      @if (showDropdown() && filteredOptions().length > 0) {
        <div class="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          @for (option of filteredOptions(); track option.code) {
            <button
              type="button"
              (mousedown)="selectOption(option)"
              class="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div class="text-sm font-medium text-gray-900">{{ option.name }}</div>
            </button>
          }
        </div>
      }

      <!-- No results message -->
      @if (showDropdown() && filteredOptions().length === 0 && searchQuery().length >= minChars) {
        <div class="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p class="text-sm text-gray-500 text-center">No se encontraron resultados</p>
        </div>
      }

      <!-- Helper text -->
      @if (helperText) {
        <p class="mt-2 text-sm text-gray-500">{{ helperText }}</p>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class FipeAutocompleteComponent implements OnChanges {
  @Input() placeholder = 'Escribe para buscar...';
  @Input() options: FipeAutocompleteOption[] = [];
  @Input() disabled = false;
  @Input() isLoading = false;
  @Input() minChars = 2;
  @Input() helperText = '';
  @Input() selectedValue: FipeAutocompleteOption | null = null;

  @Output() optionSelected = new EventEmitter<FipeAutocompleteOption>();
  @Output() searchQueryChanged = new EventEmitter<string>();

  readonly searchQuery = signal('');
  readonly isFocused = signal(false);
  readonly showDropdown = signal(false);

  filteredOptions = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    if (query.length < this.minChars) {
      return [];
    }

    // Filter options that contain the search query
    return this.options.filter((option: FipeAutocompleteOption) =>
      option.name.toLowerCase().includes(query)
    ).slice(0, 50); // Limit to 50 results for performance
  });

  ngOnChanges(): void {
    // Sync searchQuery with selectedValue when it changes from parent
    if (this.selectedValue) {
      this.searchQuery.set(this.selectedValue.name);
    }
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.searchQueryChanged.emit(query);

    if (query.length >= this.minChars) {
      this.showDropdown.set(true);
    } else {
      this.showDropdown.set(false);
    }
  }

  onFocus(): void {
    this.isFocused.set(true);
    if (this.searchQuery().length >= this.minChars) {
      this.showDropdown.set(true);
    }
  }

  onBlur(): void {
    this.isFocused.set(false);
    // Delay hiding dropdown to allow click on option
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 200);
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
    this.optionSelected.emit({ code: '', name: '' });
  }
}
