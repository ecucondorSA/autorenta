import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import type { FilterState, QuickFilter } from '../../../../core/models/marketplace.model';
import { QUICK_FILTERS } from '../../../../core/models/marketplace.model';
import { GestureService } from '../../../../core/services/gesture.service';

/**
 * BottomSheetFiltersComponent - Mobile-optimized filter sheet
 *
 * Features:
 * - Swipe to close gesture
 * - Snap points (collapsed, half, full)
 * - Touch-friendly controls
 * - Real-time filter count
 */
@Component({
  selector: 'app-bottom-sheet-filters',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Backdrop -->
    @if (isOpen()) {
      <div class="sheet-backdrop" (click)="close()" @fadeIn></div>
    }

    <!-- Sheet -->
    <div
      #sheet
      class="bottom-sheet"
      [class.open]="isOpen()"
      [style.transform]="'translateY(' + sheetPosition() + 'px)'"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd()"
    >
      <!-- Handle -->
      <div class="sheet-handle">
        <div class="handle-bar"></div>
      </div>

      <!-- Header -->
      <header class="sheet-header">
        <h3 class="sheet-title">Filtros</h3>
        @if (activeFilterCount() > 0) {
          <button type="button" class="clear-btn" (click)="clearAll()">
            Limpiar ({{ activeFilterCount() }})
          </button>
        }
      </header>

      <!-- Content -->
      <div class="sheet-content">
        <!-- Quick Filters -->
        <section class="filter-section">
          <h4 class="section-label">Filtros rápidos</h4>
          <div class="quick-filters-grid">
            @for (filter of quickFilters; track filter.id) {
              <button
                type="button"
                class="quick-filter-btn"
                [class.active]="isQuickFilterActive(filter.id)"
                (click)="toggleQuickFilter(filter.id)"
              >
                <span class="filter-icon">{{ filter.icon }}</span>
                <span class="filter-label">{{ filter.label }}</span>
              </button>
            }
          </div>
        </section>

        <!-- Price Range -->
        <section class="filter-section">
          <h4 class="section-label">Precio por día</h4>
          <div class="price-range">
            <div class="price-input-group">
              <label for="price-min">Mínimo</label>
              <div class="price-input">
                <span class="currency">$</span>
                <input
                  type="number"
                  id="price-min"
                  [value]="filters.priceRange?.min ?? ''"
                  (input)="onPriceMinChange($event)"
                  placeholder="0"
                />
              </div>
            </div>
            <span class="price-separator">-</span>
            <div class="price-input-group">
              <label for="price-max">Máximo</label>
              <div class="price-input">
                <span class="currency">$</span>
                <input
                  type="number"
                  id="price-max"
                  [value]="filters.priceRange?.max ?? ''"
                  (input)="onPriceMaxChange($event)"
                  placeholder="∞"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Transmission -->
        <section class="filter-section">
          <h4 class="section-label">Transmisión</h4>
          <div class="toggle-group">
            <button
              type="button"
              class="toggle-btn"
              [class.active]="isTransmissionActive('automatic')"
              (click)="toggleTransmission('automatic')"
            >
              Automático
            </button>
            <button
              type="button"
              class="toggle-btn"
              [class.active]="isTransmissionActive('manual')"
              (click)="toggleTransmission('manual')"
            >
              Manual
            </button>
          </div>
        </section>

        <!-- Vehicle Type -->
        <section class="filter-section">
          <h4 class="section-label">Tipo de vehículo</h4>
          <div class="vehicle-types-grid">
            @for (type of vehicleTypes; track type.id) {
              <button
                type="button"
                class="vehicle-type-btn"
                [class.active]="isVehicleTypeActive(type.id)"
                (click)="toggleVehicleType(type.id)"
              >
                <span class="type-icon">{{ type.icon }}</span>
                <span class="type-label">{{ type.label }}</span>
              </button>
            }
          </div>
        </section>
      </div>

      <!-- Footer -->
      <footer class="sheet-footer">
        <button type="button" class="btn-secondary" (click)="close()">
          Cancelar
        </button>
        <button type="button" class="btn-primary" (click)="apply()">
          Ver {{ resultCount }} autos
        </button>
      </footer>
    </div>
  `,
  styles: [
    `
      .sheet-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 998;
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .bottom-sheet {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--bg-primary);
        border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
        z-index: 999;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        transform: translateY(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        touch-action: none;

        &.open {
          transform: translateY(0);
        }

        :host-context(.dark) & {
          background: var(--bg-secondary);
        }
      }

      .sheet-handle {
        display: flex;
        justify-content: center;
        padding: var(--space-3) 0;
        cursor: grab;

        &:active {
          cursor: grabbing;
        }
      }

      .handle-bar {
        width: 40px;
        height: 4px;
        background: var(--neutral-300);
        border-radius: var(--radius-full);

        :host-context(.dark) & {
          background: var(--neutral-600);
        }
      }

      .sheet-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 var(--space-4) var(--space-4);
        border-bottom: 1px solid var(--border-secondary);
      }

      .sheet-title {
        font-size: var(--text-lg);
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      }

      .clear-btn {
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-full);
        border: none;
        background: var(--primary-100);
        color: var(--primary-600);
        font-size: var(--text-sm);
        font-weight: 500;
        cursor: pointer;

        :host-context(.dark) & {
          background: var(--primary-900);
          color: var(--primary-300);
        }
      }

      .sheet-content {
        flex: 1;
        overflow-y: auto;
        padding: var(--space-4);
        -webkit-overflow-scrolling: touch;
      }

      .filter-section {
        margin-bottom: var(--space-6);

        &:last-child {
          margin-bottom: 0;
        }
      }

      .section-label {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--text-secondary);
        margin: 0 0 var(--space-3);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Quick Filters */
      .quick-filters-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-2);
      }

      .quick-filter-btn {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-secondary);
        background: transparent;
        color: var(--text-secondary);
        font-size: var(--text-sm);
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: var(--bg-secondary);
        }

        &.active {
          background: var(--primary-50);
          border-color: var(--primary-500);
          color: var(--primary-700);

          :host-context(.dark) & {
            background: var(--primary-900);
            color: var(--primary-300);
          }
        }
      }

      .filter-icon {
        font-size: var(--text-base);
      }

      /* Price Range */
      .price-range {
        display: flex;
        align-items: flex-end;
        gap: var(--space-3);
      }

      .price-input-group {
        flex: 1;

        label {
          display: block;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          margin-bottom: var(--space-1);
        }
      }

      .price-input {
        display: flex;
        align-items: center;
        border: 1px solid var(--border-secondary);
        border-radius: var(--radius-lg);
        overflow: hidden;
        background: var(--bg-primary);

        :host-context(.dark) & {
          background: var(--bg-tertiary);
        }
      }

      .currency {
        padding: var(--space-3);
        color: var(--text-tertiary);
        background: var(--bg-secondary);
        border-right: 1px solid var(--border-secondary);
      }

      .price-input input {
        flex: 1;
        padding: var(--space-3);
        border: none;
        background: transparent;
        color: var(--text-primary);
        font-size: var(--text-base);
        min-width: 0;

        &::placeholder {
          color: var(--text-tertiary);
        }

        &:focus {
          outline: none;
        }
      }

      .price-separator {
        color: var(--text-tertiary);
        font-size: var(--text-lg);
      }

      /* Toggle Group */
      .toggle-group {
        display: flex;
        gap: var(--space-2);
      }

      .toggle-btn {
        flex: 1;
        padding: var(--space-3);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-secondary);
        background: transparent;
        color: var(--text-secondary);
        font-size: var(--text-sm);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        &.active {
          background: var(--primary-500);
          border-color: var(--primary-500);
          color: white;
        }
      }

      /* Vehicle Types */
      .vehicle-types-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-2);
      }

      .vehicle-type-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-3);
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-secondary);
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;

        &.active {
          background: var(--primary-50);
          border-color: var(--primary-500);
          color: var(--primary-700);

          :host-context(.dark) & {
            background: var(--primary-900);
            color: var(--primary-300);
          }
        }
      }

      .type-icon {
        font-size: var(--text-xl);
      }

      .type-label {
        font-size: var(--text-xs);
        white-space: nowrap;
      }

      /* Footer */
      .sheet-footer {
        display: flex;
        gap: var(--space-3);
        padding: var(--space-4);
        border-top: 1px solid var(--border-secondary);
        background: var(--bg-primary);

        :host-context(.dark) & {
          background: var(--bg-secondary);
        }
      }

      .btn-secondary,
      .btn-primary {
        flex: 1;
        padding: var(--space-4);
        border-radius: var(--radius-lg);
        font-size: var(--text-base);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .btn-secondary {
        background: transparent;
        border: 1px solid var(--border-secondary);
        color: var(--text-secondary);

        &:hover {
          background: var(--bg-secondary);
        }
      }

      .btn-primary {
        background: var(--primary-500);
        border: none;
        color: white;

        &:hover {
          background: var(--primary-600);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetFiltersComponent implements OnInit, OnDestroy {
  @ViewChild('sheet', { static: true }) sheetRef!: ElementRef<HTMLDivElement>;

  @Input() filters: FilterState = {
    dateRange: null,
    priceRange: null,
    vehicleTypes: null,
    immediateOnly: false,
    transmission: null,
  };

  @Input() resultCount = 0;

  @Output() filtersChange = new EventEmitter<FilterState>();
  @Output() closed = new EventEmitter<void>();

  readonly quickFilters: QuickFilter[] = QUICK_FILTERS;

  readonly vehicleTypes = [
    { id: 'sedan', label: 'Sedán', icon: '🚗' },
    { id: 'suv', label: 'SUV', icon: '🚙' },
    { id: 'pickup', label: 'Pickup', icon: '🛻' },
    { id: 'van', label: 'Van', icon: '🚐' },
    { id: 'coupe', label: 'Coupé', icon: '🏎️' },
    { id: 'hatchback', label: 'Hatchback', icon: '🚕' },
  ];

  readonly isOpen = signal(false);
  readonly sheetPosition = signal(0);
  readonly activeFilterCount = signal(0);

  private activeQuickFilters = new Set<string>();
  private touchStartY = 0;
  private currentY = 0;

  ngOnInit(): void {
    this.updateFilterCount();
  }

  ngOnDestroy(): void {
    // Required for Angular lifecycle - component cleanup handled by signals
    void 0;
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
    this.sheetPosition.set(0);
    this.closed.emit();
  }

  apply(): void {
    this.filtersChange.emit(this.filters);
    this.close();
  }

  clearAll(): void {
    this.filters = {
      dateRange: null,
      priceRange: null,
      vehicleTypes: null,
      immediateOnly: false,
      transmission: null,
    };
    this.activeQuickFilters.clear();
    this.updateFilterCount();
  }

  // Quick filters
  toggleQuickFilter(id: string): void {
    if (this.activeQuickFilters.has(id)) {
      this.activeQuickFilters.delete(id);
    } else {
      this.activeQuickFilters.add(id);
    }

    if (id === 'immediate') {
      this.filters = {
        ...this.filters,
        immediateOnly: this.activeQuickFilters.has('immediate'),
      };
    }

    this.updateFilterCount();
  }

  isQuickFilterActive(id: string): boolean {
    return this.activeQuickFilters.has(id);
  }

  // Transmission
  toggleTransmission(type: string): void {
    const current = this.filters.transmission || [];
    if (current.includes(type)) {
      this.filters = {
        ...this.filters,
        transmission: current.filter((t) => t !== type),
      };
    } else {
      this.filters = {
        ...this.filters,
        transmission: [...current, type],
      };
    }
    this.updateFilterCount();
  }

  isTransmissionActive(type: string): boolean {
    return this.filters.transmission?.includes(type) ?? false;
  }

  // Vehicle types
  toggleVehicleType(type: string): void {
    const current = this.filters.vehicleTypes || [];
    if (current.includes(type)) {
      this.filters = {
        ...this.filters,
        vehicleTypes: current.filter((t) => t !== type),
      };
    } else {
      this.filters = {
        ...this.filters,
        vehicleTypes: [...current, type],
      };
    }
    this.updateFilterCount();
  }

  isVehicleTypeActive(type: string): boolean {
    return this.filters.vehicleTypes?.includes(type) ?? false;
  }

  // Price range
  onPriceMinChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    this.filters = {
      ...this.filters,
      priceRange: {
        min: isNaN(value) ? 0 : value,
        max: this.filters.priceRange?.max ?? 999999,
      },
    };
    this.updateFilterCount();
  }

  onPriceMaxChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    this.filters = {
      ...this.filters,
      priceRange: {
        min: this.filters.priceRange?.min ?? 0,
        max: isNaN(value) ? 999999 : value,
      },
    };
    this.updateFilterCount();
  }

  // Touch gestures
  onTouchStart(event: TouchEvent): void {
    this.touchStartY = event.touches[0].clientY;
    this.currentY = 0;
  }

  onTouchMove(event: TouchEvent): void {
    const deltaY = event.touches[0].clientY - this.touchStartY;
    if (deltaY > 0) {
      this.currentY = deltaY;
      this.sheetPosition.set(deltaY);
    }
  }

  onTouchEnd(): void {
    if (this.currentY > 100) {
      this.close();
    } else {
      this.sheetPosition.set(0);
    }
  }

  private updateFilterCount(): void {
    let count = 0;
    if (this.filters.priceRange) count++;
    if (this.filters.transmission?.length) count++;
    if (this.filters.vehicleTypes?.length) count++;
    if (this.filters.immediateOnly) count++;
    count += this.activeQuickFilters.size;
    this.activeFilterCount.set(count);
  }
}
