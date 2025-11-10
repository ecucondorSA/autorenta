import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateRangePickerComponent } from '../date-range-picker/date-range-picker.component';
import type { CarMapLocation } from '../../../core/services/car-locations.service';

/**
 * Filter state interface
 */
export interface FilterState {
  dateRange: { start: Date; end: Date } | null;
  priceRange: { min: number; max: number } | null;
  vehicleTypes: string[] | null;
  immediateOnly: boolean;
  transmission?: string[] | null;
}

/**
 * Map Filters Component
 *
 * Floating filters panel for map view with:
 * - Date range picker
 * - Price range slider
 * - Vehicle type selector
 * - Immediate availability toggle
 *
 * Desktop: Top-left chips with popover
 * Mobile: Under searchbar with inline content
 */
@Component({
  selector: 'app-map-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, DateRangePickerComponent],
  templateUrl: './map-filters.component.html',
  styleUrls: ['./map-filters.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapFiltersComponent implements OnInit, OnDestroy {
  @Input() availableCars: CarMapLocation[] = [];
  @Input() userLocation?: { lat: number; lng: number };

  @Output() readonly filterChange = new EventEmitter<FilterState>();

  // Filter state signals
  readonly dateRange = signal<{ start: Date; end: Date } | null>(null);
  readonly priceRange = signal<{ min: number; max: number } | null>(null);
  readonly vehicleTypes = signal<string[]>([]);
  readonly immediateOnly = signal(false);
  readonly transmission = signal<string[]>([]);

  // UI state
  readonly openPanel = signal<'dates' | 'price' | 'type' | 'transmission' | null>(null);
  readonly isMobile = signal(false);

  // Computed values
  readonly priceMin = computed(() => {
    const prices = this.availableCars.map((c) => c.pricePerDay).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  });

  readonly priceMax = computed(() => {
    const prices = this.availableCars.map((c) => c.pricePerDay).filter((p) => p > 0);
    return prices.length > 0 ? Math.max(...prices) : 1000;
  });

  readonly availableTransmissions = computed(() => {
    const types = new Set<string>();
    this.availableCars.forEach((car) => {
      // Placeholder: agregar transmisión desde car object cuando esté disponible
      // Por ahora retorna set vacío
    });
    return Array.from(types).sort();
  });

  readonly vehicleTypeOptions = [
    { id: 'sedan', label: 'Sedán' },
    { id: 'suv', label: 'SUV' },
    { id: 'hatchback', label: 'Hatchback' },
    { id: 'pickup', label: 'Pick-up' },
    { id: 'van', label: 'Van' },
  ];

  readonly transmissionOptions = [
    { id: 'manual', label: 'Manual' },
    { id: 'automatic', label: 'Automático' },
  ];

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.dateRange()) count++;
    if (this.priceRange()) count++;
    if (this.vehicleTypes().length > 0) count++;
    if (this.immediateOnly()) count++;
    if (this.transmission().length > 0) count++;
    return count;
  });

  readonly currentFilter = computed<FilterState>(() => ({
    dateRange: this.dateRange(),
    priceRange: this.priceRange(),
    vehicleTypes: this.vehicleTypes().length > 0 ? this.vehicleTypes() : null,
    immediateOnly: this.immediateOnly(),
    transmission: this.transmission().length > 0 ? this.transmission() : null,
  }));

  ngOnInit(): void {
    this.detectMobile();
    window.addEventListener('resize', () => this.detectMobile());

    // Initialize price range with available cars' min/max
    if (this.availableCars.length > 0) {
      this.priceRange.set({
        min: this.priceMin(),
        max: this.priceMax(),
      });
    }

    // Load filters from sessionStorage if available
    this.loadFiltersFromStorage();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', () => this.detectMobile());
  }

  /**
   * Detect mobile screen size
   */
  private detectMobile(): void {
    this.isMobile.set(window.innerWidth < 640);
  }

  /**
   * Toggle filter panel
   */
  togglePanel(panel: 'dates' | 'price' | 'type' | 'transmission'): void {
    const current = this.openPanel();
    this.openPanel.set(current === panel ? null : panel);
  }

  /**
   * Close all panels
   */
  closePanel(): void {
    this.openPanel.set(null);
  }

  /**
   * Update date range filter (from DateRangePickerComponent)
   * DateRangePickerComponent emits DateRange { from, to } which are ISO strings
   */
  onDateRangePickerChange(range: { from: string | null; to: string | null }): void {
    if (range.from && range.to) {
      this.dateRange.set({
        start: new Date(range.from),
        end: new Date(range.to),
      });
    } else {
      this.dateRange.set(null);
    }
    this.emitFilterChange();
  }

  /**
   * Legacy: Update date range filter (for backwards compatibility)
   */
  onDateRangeChange(dates: { start: Date; end: Date } | null): void {
    this.dateRange.set(dates);
    this.emitFilterChange();
  }

  /**
   * Update price range
   */
  onPriceRangeChange(range: { min: number; max: number }): void {
    this.priceRange.set(range);
    this.emitFilterChange();
  }

  /**
   * Toggle vehicle type selection
   */
  toggleVehicleType(typeId: string): void {
    const current = this.vehicleTypes();
    const updated = current.includes(typeId)
      ? current.filter((t) => t !== typeId)
      : [...current, typeId];
    this.vehicleTypes.set(updated);
    this.emitFilterChange();
  }

  /**
   * Toggle transmission selection
   */
  toggleTransmission(transmissionId: string): void {
    const current = this.transmission();
    const updated = current.includes(transmissionId)
      ? current.filter((t) => t !== transmissionId)
      : [...current, transmissionId];
    this.transmission.set(updated);
    this.emitFilterChange();
  }

  /**
   * Toggle immediate availability filter
   */
  toggleImmediate(): void {
    this.immediateOnly.set(!this.immediateOnly());
    this.emitFilterChange();
  }

  /**
   * Clear all filters
   */
  clearAllFilters(): void {
    this.dateRange.set(null);
    this.vehicleTypes.set([]);
    this.immediateOnly.set(false);
    this.transmission.set([]);
    if (this.availableCars.length > 0) {
      this.priceRange.set({
        min: this.priceMin(),
        max: this.priceMax(),
      });
    }
    this.emitFilterChange();
    sessionStorage.removeItem('mapFilters');
  }

  /**
   * Format price for display
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }

  /**
   * Emit filter change event and save to storage
   */
  private emitFilterChange(): void {
    const filter = this.currentFilter();
    this.filterChange.emit(filter);
    this.saveFiltersToStorage(filter);
  }

  /**
   * Save filter state to sessionStorage
   */
  private saveFiltersToStorage(filter: FilterState): void {
    try {
      const serialized = {
        ...filter,
        dateRange: filter.dateRange
          ? {
              start: filter.dateRange.start.toISOString(),
              end: filter.dateRange.end.toISOString(),
            }
          : null,
      };
      sessionStorage.setItem('mapFilters', JSON.stringify(serialized));
    } catch (e) {
      console.warn('Failed to save filters to storage:', e);
    }
  }

  /**
   * Load filter state from sessionStorage
   */
  private loadFiltersFromStorage(): void {
    try {
      const stored = sessionStorage.getItem('mapFilters');
      if (stored) {
        const filter = JSON.parse(stored);
        if (filter.dateRange) {
          this.dateRange.set({
            start: new Date(filter.dateRange.start),
            end: new Date(filter.dateRange.end),
          });
        }
        if (filter.vehicleTypes) {
          this.vehicleTypes.set(filter.vehicleTypes);
        }
        if (filter.transmission) {
          this.transmission.set(filter.transmission);
        }
        if (filter.immediateOnly) {
          this.immediateOnly.set(filter.immediateOnly);
        }
        if (filter.priceRange) {
          this.priceRange.set(filter.priceRange);
        }
      }
    } catch (e) {
      console.warn('Failed to load filters from storage:', e);
    }
  }
}
