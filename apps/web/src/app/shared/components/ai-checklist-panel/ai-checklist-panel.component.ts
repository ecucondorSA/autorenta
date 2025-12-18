import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Booking, Car, VehicleChecklist } from '../../../core/models';
import { GeminiService } from '../../../core/services/gemini.service';

/**
 * Panel de Checklist de Inspeccion IA
 *
 * Genera un checklist de inspeccion personalizado para el vehiculo
 * especifico del booking, considerando marca, modelo y ano.
 *
 * @example
 * ```html
 * <app-ai-checklist-panel
 *   [booking]="booking()"
 *   [inspectionType]="'check_in'"
 *   [isExpanded]="expandedPanel() === 'checklist'"
 *   (toggle)="togglePanel('checklist')"
 * />
 * ```
 */
@Component({
  selector: 'app-ai-checklist-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="ai-panel border-b border-border-muted last:border-b-0">
      <!-- Header -->
      <button
        type="button"
        class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-surface-base/50"
        (click)="toggle.emit()"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10">
            <svg
              class="h-4 w-4 text-orange-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-text-primary">
              Checklist de {{ inspectionType() === 'check_in' ? 'Recepcion' : 'Devolucion' }}
            </h3>
            <p class="text-xs text-text-secondary">Inspeccion personalizada del vehiculo</p>
          </div>
        </div>
        <svg
          class="h-5 w-5 text-text-muted transition-transform"
          [class.rotate-180]="isExpanded()"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <!-- Content -->
      <div
        class="overflow-hidden transition-all duration-300"
        [class.max-h-0]="!isExpanded()"
        [class.max-h-[800px]]="isExpanded()"
        [class.overflow-y-auto]="isExpanded()"
      >
        <div class="space-y-4 px-4 pb-4">
          <!-- Loading -->
          @if (loading()) {
            <div class="flex flex-col items-center justify-center py-8">
              <svg class="h-8 w-8 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p class="mt-2 text-sm text-text-secondary">
                Generando checklist para {{ vehicleName() }}...
              </p>
            </div>
          }

          <!-- Checklist -->
          @if (checklist()) {
            <div class="space-y-4">
              <!-- Progress -->
              <div class="flex items-center justify-between rounded-lg bg-orange-500/10 p-3">
                <span class="text-sm text-orange-700">
                  {{ completedCount() }}/{{ totalCount() }} items verificados
                </span>
                <button
                  type="button"
                  class="text-xs text-orange-600 hover:underline"
                  (click)="regenerate()"
                >
                  Regenerar
                </button>
              </div>

              <!-- Categories -->
              @for (category of checklist()!.categories; track category.name) {
                <div class="rounded-lg border border-border-muted">
                  <div class="flex items-center gap-2 border-b border-border-muted bg-surface-base p-3">
                    <span class="text-sm font-semibold text-text-primary">{{ category.name }}</span>
                    <span class="text-xs text-text-muted">
                      ({{ getCategoryCompletedCount(category.name) }}/{{ category.items.length }})
                    </span>
                  </div>
                  <div class="divide-y divide-border-muted">
                    @for (item of category.items; track item.id) {
                      <label
                        class="flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-surface-base/50"
                      >
                        <input
                          type="checkbox"
                          [checked]="checkedItems()[item.id]"
                          (change)="toggleItem(item.id)"
                          class="mt-0.5 h-4 w-4 rounded border-border-muted text-orange-500 focus:ring-orange-500"
                        />
                        <div class="flex-1">
                          <div class="flex items-center gap-2">
                            <span
                              class="text-sm"
                              [class.text-text-primary]="!checkedItems()[item.id]"
                              [class.text-text-muted]="checkedItems()[item.id]"
                              [class.line-through]="checkedItems()[item.id]"
                            >
                              {{ item.label }}
                            </span>
                            @if (item.critical) {
                              <span
                                class="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              >
                                CRITICO
                              </span>
                            }
                            @if (item.modelSpecific) {
                              <span
                                class="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              >
                                MODELO
                              </span>
                            }
                          </div>
                          @if (item.description) {
                            <p class="mt-0.5 text-xs text-text-muted">{{ item.description }}</p>
                          }
                        </div>
                      </label>
                    }
                  </div>
                </div>
              }

              <!-- Tips -->
              @if (checklist()!.tips.length > 0) {
                <div class="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                  <h4 class="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Tips para {{ vehicleName() }}
                  </h4>
                  <ul class="space-y-1 text-xs text-amber-800 dark:text-amber-300">
                    @for (tip of checklist()!.tips; track tip) {
                      <li>{{ tip }}</li>
                    }
                  </ul>
                </div>
              }
            </div>
          }

          <!-- Error -->
          @if (error()) {
            <div class="space-y-3">
              <div class="rounded-lg bg-error-bg p-3 text-sm text-error-strong">
                {{ error() }}
              </div>
              <button
                type="button"
                class="w-full rounded-lg bg-orange-500 py-2 text-sm font-medium text-white hover:bg-orange-600"
                (click)="generateChecklist()"
              >
                Reintentar
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AiChecklistPanelComponent {
  private readonly gemini = inject(GeminiService);

  /** Booking (opcional si se provee car) */
  readonly booking = input<Booking | null>(null);

  /** Car directo (opcional si se provee booking) */
  readonly car = input<Car | null>(null);

  readonly inspectionType = input<'check_in' | 'check_out'>('check_in');
  readonly isExpanded = input<boolean>(false);
  readonly toggle = output<void>();

  // State
  readonly checklist = signal<VehicleChecklist | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly checkedItems = signal<Record<string, boolean>>({});

  // Computed: obtiene datos del vehiculo desde car o booking
  private readonly vehicleData = computed(() => {
    const c = this.car();
    const b = this.booking();
    return {
      brand: c?.brand || b?.car_brand || b?.car?.brand || 'Auto',
      model: c?.model || b?.car_model || b?.car?.model || '',
      year: c?.year || b?.car_year || b?.car?.year || new Date().getFullYear(),
    };
  });

  readonly vehicleName = computed(() => {
    const v = this.vehicleData();
    return `${v.brand} ${v.model} ${v.year}`.trim() || 'Vehiculo';
  });

  readonly totalCount = () => {
    const c = this.checklist();
    if (!c) return 0;
    return c.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  };

  readonly completedCount = () => {
    return Object.values(this.checkedItems()).filter(Boolean).length;
  };

  getCategoryCompletedCount(categoryName: string): number {
    const c = this.checklist();
    if (!c) return 0;
    const category = c.categories.find((cat) => cat.name === categoryName);
    if (!category) return 0;
    return category.items.filter((item) => this.checkedItems()[item.id]).length;
  }

  constructor() {
    // Auto-generate when expanded and no checklist
    effect(() => {
      if (this.isExpanded() && !this.checklist() && !this.loading() && !this.error()) {
        this.generateChecklist();
      }
    });
  }

  toggleItem(itemId: string): void {
    this.checkedItems.update((items) => ({
      ...items,
      [itemId]: !items[itemId],
    }));
  }

  regenerate(): void {
    this.checklist.set(null);
    this.checkedItems.set({});
    this.generateChecklist();
  }

  async generateChecklist(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const v = this.vehicleData();

      const result = await this.gemini.generateVehicleChecklist({
        brand: v.brand,
        model: v.model,
        year: v.year,
        inspectionType: this.inspectionType(),
      });

      this.checklist.set(result);
    } catch {
      this.error.set('No pudimos generar el checklist. Intenta de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }
}
