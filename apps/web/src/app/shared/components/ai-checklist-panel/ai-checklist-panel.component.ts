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
import { GeminiService } from '@core/services/ai/gemini.service';
import type { Booking, Car, VehicleChecklist } from '../../../core/models';

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
 *   (togglePanel)="togglePanel('checklist')"
 * />
 * ```
 */
@Component({
  selector: 'app-ai-checklist-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="relative group/panel">
      <!-- Animated gradient border when expanded -->
      @if (isExpanded()) {
        <div
          class="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 rounded-2xl opacity-75 blur-sm transition-opacity duration-500 animate-gradient-xy"
        ></div>
      }

      <!-- Main card -->
      <div
        class="relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300"
        [class.shadow-2xl]="isExpanded()"
      >
        <!-- Header -->
        <button
          type="button"
          class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
          (click)="togglePanel.emit()"
        >
          <div class="flex items-center gap-3">
            <!-- Icon with glow -->
            <div class="relative">
              @if (isExpanded()) {
                <div class="absolute inset-0 bg-teal-500/30 rounded-xl blur-md animate-pulse"></div>
              }
              <div
                class="relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300"
                [class.bg-gradient-to-br]="isExpanded()"
                [class.from-cyan-500]="isExpanded()"
                [class.to-teal-500]="isExpanded()"
                [class.bg-teal-500/10]="!isExpanded()"
                [class.shadow-lg]="isExpanded()"
              >
                <svg
                  class="h-5 w-5 transition-colors"
                  [class.text-white]="isExpanded()"
                  [class.text-teal-500]="!isExpanded()"
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
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900 flex items-center gap-2">
                Checklist de {{ inspectionType() === 'check_in' ? 'Recepción' : 'Devolución' }}
                <span
                  class="text-xs bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                >
                  AI
                </span>
              </h3>
              <p class="text-xs text-gray-500">Inspección personalizada para {{ vehicleName() }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- Mini progress when collapsed -->
            @if (!isExpanded() && checklist()) {
              <div class="flex items-center gap-1.5 mr-2">
                <div class="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-500"
                    [style.width.%]="totalCount() > 0 ? (completedCount() / totalCount()) * 100 : 0"
                  ></div>
                </div>
                <span class="text-xs font-medium text-gray-500"
                  >{{ completedCount() }}/{{ totalCount() }}</span
                >
              </div>
            }
            <svg
              class="h-5 w-5 text-gray-400 transition-transform duration-300"
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
          </div>
        </button>

        <!-- Content -->
        <div
          class="overflow-hidden transition-all duration-300"
          [class.max-h-0]="!isExpanded()"
          [class.max-h-[800px]]="isExpanded()"
          [class.overflow-y-auto]="isExpanded()"
        >
          <!-- Top gradient line -->
          <div class="h-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500"></div>

          <div class="space-y-4 p-5">
            <!-- Loading -->
            @if (loading()) {
              <div class="flex flex-col items-center justify-center py-10">
                <div class="relative">
                  <div
                    class="w-12 h-12 border-3 border-teal-200 border-t-teal-500 rounded-full animate-spin"
                  ></div>
                  <div
                    class="absolute inset-0 w-12 h-12 border-3 border-transparent border-b-cyan-500 rounded-full animate-spin"
                    style="animation-direction: reverse; animation-duration: 1.5s;"
                  ></div>
                </div>
                <p class="mt-4 text-sm font-medium text-gray-700">
                  Generando checklist personalizado...
                </p>
                <p class="text-xs text-gray-500 mt-1">Analizando {{ vehicleName() }}</p>
              </div>
            }

            <!-- Checklist -->
            @if (checklist()) {
              <div class="space-y-4">
                <!-- Progress Card -->
                <div
                  class="relative overflow-hidden bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-4 border border-teal-200/50"
                >
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <div
                        class="w-8 h-8 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center"
                      >
                        <svg
                          class="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <span class="text-sm font-bold text-gray-900">
                          {{ completedCount() }} de {{ totalCount() }}
                        </span>
                        <span class="text-xs text-gray-500 ml-1">verificados</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 hover:underline"
                      (click)="regenerate()"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Regenerar
                    </button>
                  </div>
                  <!-- Animated progress bar -->
                  <div class="h-3 bg-white/50 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                      [style.width.%]="
                        totalCount() > 0 ? (completedCount() / totalCount()) * 100 : 0
                      "
                    >
                      <div
                        class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer"
                      ></div>
                    </div>
                  </div>
                  @if (completedCount() === totalCount() && totalCount() > 0) {
                    <div class="mt-2 flex items-center gap-1.5 text-emerald-600">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
                      </svg>
                      <span class="text-xs font-bold">Inspeccion completa!</span>
                    </div>
                  }
                </div>

                <!-- Categories -->
                @for (category of checklist()!.categories; track category.name; let i = $index) {
                  <div class="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div
                      class="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200"
                    >
                      <div class="flex items-center gap-2">
                        <div
                          class="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          [class.bg-gradient-to-br]="true"
                          [class.from-cyan-500]="i % 3 === 0"
                          [class.to-teal-500]="i % 3 === 0"
                          [class.from-teal-500]="i % 3 === 1"
                          [class.to-emerald-500]="i % 3 === 1"
                          [class.from-emerald-500]="i % 3 === 2"
                          [class.to-cyan-500]="i % 3 === 2"
                        >
                          {{ i + 1 }}
                        </div>
                        <span class="text-sm font-bold text-gray-900">{{ category.name }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            class="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-500"
                            [style.width.%]="
                              category.items.length > 0
                                ? (getCategoryCompletedCount(category.name) /
                                    category.items.length) *
                                  100
                                : 0
                            "
                          ></div>
                        </div>
                        <span class="text-xs font-medium text-gray-500">
                          {{ getCategoryCompletedCount(category.name) }}/{{ category.items.length }}
                        </span>
                      </div>
                    </div>
                    <div class="divide-y divide-gray-100">
                      @for (item of category.items; track item.id) {
                        <label
                          [for]="'checklist-item-' + item.id"
                          class="flex cursor-pointer items-start gap-3 p-4 transition-all duration-200 hover:bg-gray-50"
                          [class.bg-emerald-50/50]="checkedItems()[item.id]"
                        >
                          <div class="relative mt-0.5">
                            <input
                              type="checkbox"
                              [id]="'checklist-item-' + item.id"
                              [name]="'checklist-item-' + item.id"
                              [checked]="checkedItems()[item.id]"
                              (change)="toggleItem(item.id)"
                              class="peer sr-only"
                            />
                            <div
                              class="w-5 h-5 border-2 rounded-md transition-all duration-200 flex items-center justify-center"
                              [class.border-gray-300]="!checkedItems()[item.id]"
                              [class.border-emerald-500]="checkedItems()[item.id]"
                              [class.bg-emerald-500]="checkedItems()[item.id]"
                            >
                              @if (checkedItems()[item.id]) {
                                <svg
                                  class="w-3 h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="3"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              }
                            </div>
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                              <span
                                class="text-sm transition-all duration-200"
                                [class.text-gray-900]="!checkedItems()[item.id]"
                                [class.text-gray-400]="checkedItems()[item.id]"
                                [class.line-through]="checkedItems()[item.id]"
                              >
                                {{ item.label }}
                              </span>
                              @if (item.critical) {
                                <span
                                  class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 uppercase"
                                >
                                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path
                                      d="M12 2L2 22h20L12 2zm0 4l7.53 14H4.47L12 6zm-1 6v4h2v-4h-2zm0 6v2h2v-2h-2z"
                                    />
                                  </svg>
                                  Critico
                                </span>
                              }
                              @if (item.modelSpecific) {
                                <span
                                  class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 uppercase"
                                >
                                  <svg
                                    class="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                  </svg>
                                  Modelo
                                </span>
                              }
                            </div>
                            @if (item.description) {
                              <p class="mt-1 text-xs text-gray-500">{{ item.description }}</p>
                            }
                          </div>
                        </label>
                      }
                    </div>
                  </div>
                }

                <!-- Tips -->
                @if (checklist()!.tips.length > 0) {
                  <div
                    class="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 p-4 border border-amber-200/50"
                  >
                    <div class="absolute top-2 right-2 w-8 h-8 opacity-20">
                      <svg fill="currentColor" class="text-amber-500" viewBox="0 0 24 24">
                        <path
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                    </div>
                    <div class="flex items-center gap-2 mb-3">
                      <div
                        class="w-7 h-7 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center"
                      >
                        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                      </div>
                      <h4 class="text-sm font-bold text-amber-800">
                        Tips para {{ vehicleName() }}
                      </h4>
                    </div>
                    <ul class="space-y-2">
                      @for (tip of checklist()!.tips; track tip) {
                        <li class="flex items-start gap-2 text-xs text-amber-800">
                          <svg
                            class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z"
                            />
                          </svg>
                          {{ tip }}
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            }

            <!-- Error -->
            @if (error()) {
              <div class="space-y-4">
                <div class="flex flex-col items-center py-6">
                  <div
                    class="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-3 ring-4 ring-red-100"
                  >
                    <svg
                      class="w-7 h-7 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p class="text-sm font-medium text-red-600 text-center mb-4">
                    {{ error() }}
                  </p>
                  <button
                    type="button"
                    class="relative overflow-hidden bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-all duration-300 shadow-lg hover:shadow-teal-500/25 flex items-center gap-2"
                    (click)="generateChecklist()"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Reintentar
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      @keyframes gradient-xy {
        0%,
        100% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
      }

      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }

      .animate-gradient-xy {
        animation: gradient-xy 3s ease infinite;
        background-size: 200% 200%;
      }

      .animate-shimmer {
        animation: shimmer 2s ease-in-out infinite;
      }
    `,
  ],
})
export class AiChecklistPanelComponent {
  private readonly gemini = inject(GeminiService);

  /** Booking (opcional si se provee car) */
  readonly booking = input<Booking | null>(null);

  /** Car directo (opcional si se provee booking) */
  readonly car = input<Car | null>(null);

  readonly inspectionType = input<'check_in' | 'check_out'>('check_in');
  readonly isExpanded = input<boolean>(false);
  readonly togglePanel = output<void>();

  // State
  readonly checklist = signal<VehicleChecklist | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly checkedItems = signal<Record<string, boolean>>({});

  // Computed: obtiene datos del vehículo desde car o booking
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
    return `${v.brand} ${v.model} ${v.year}`.trim() || 'Vehículo';
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
