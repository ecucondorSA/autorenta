import { Component, signal, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-statistics-widget',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div
      class="bg-gradient-to-br from-surface-raised to-surface-base rounded-3xl p-6 border border-border-subtle shadow-lg hover:shadow-xl transition-all duration-300"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-2xl bg-gradient-to-br from-cta-default to-cta-hover flex items-center justify-center shadow-lg"
          >
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-text-primary">Estadísticas</h3>
            <p class="text-sm text-text-secondary">Vista general de tu rendimiento</p>
          </div>
        </div>
        <button
          class="w-8 h-8 rounded-xl hover:bg-surface-hover flex items-center justify-center transition-colors group"
        >
          <svg
            class="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Reservas próximas -->
        <div class="group relative">
          <div
            class="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          ></div>
          <div
            class="relative bg-surface-secondary/50 rounded-2xl p-4 border border-border-subtle hover:border-blue-200 transition-all duration-300 hover:shadow-md"
          >
            <div class="flex items-center justify-between mb-3">
              <div
                class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center"
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div class="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded-full">
                —
              </div>
            </div>
            <div class="text-2xl font-black text-text-primary mb-1">{{ data().upcoming }}</div>
            <div class="text-xs text-text-secondary font-medium">Reservas próximas</div>
          </div>
        </div>

        <!-- Ingresos (30d) -->
        <div class="group relative">
          <div
            class="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          ></div>
          <div
            class="relative bg-surface-secondary/50 rounded-2xl p-4 border border-border-subtle hover:border-green-200 transition-all duration-300 hover:shadow-md"
          >
            <div class="flex items-center justify-between mb-3">
              <div
                class="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center"
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <div class="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full">
                —
              </div>
            </div>
            <div class="text-2xl font-black text-text-primary mb-1">
              {{ data().income30d.toLocaleString() }}
            </div>
            <div class="text-xs text-text-secondary font-medium">Ingresos (30d)</div>
          </div>
        </div>

        <!-- Ocupación -->
        <div class="group relative">
          <div
            class="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          ></div>
          <div
            class="relative bg-surface-secondary/50 rounded-2xl p-4 border border-border-subtle hover:border-purple-200 transition-all duration-300 hover:shadow-md"
          >
            <div class="flex items-center justify-between mb-3">
              <div
                class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center"
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
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div
                class="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-1 rounded-full"
              >
                —
              </div>
            </div>
            <div class="text-2xl font-black text-text-primary mb-1">{{ data().occupancy }}%</div>
            <div class="text-xs text-text-secondary font-medium">Ocupación</div>
            <div class="mt-2 bg-surface-base rounded-full h-1.5 overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                [style.width.%]="data().occupancy"
              ></div>
            </div>
          </div>
        </div>

        <!-- Cancelaciones -->
        <div class="group relative">
          <div
            class="absolute inset-0 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          ></div>
          <div
            class="relative bg-surface-secondary/50 rounded-2xl p-4 border border-border-subtle hover:border-red-200 transition-all duration-300 hover:shadow-md"
          >
            <div class="flex items-center justify-between mb-3">
              <div
                class="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div class="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded-full">
                —
              </div>
            </div>
            <div class="text-2xl font-black text-text-primary mb-1">{{ data().cancellations }}</div>
            <div class="text-xs text-text-secondary font-medium">Cancelaciones</div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="mt-6 pt-4 border-t border-border-subtle">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-text-primary">Acciones rápidas</span>
          <div class="flex gap-2">
            <button
              class="px-3 py-1.5 text-xs font-medium bg-surface-secondary hover:bg-surface-hover text-text-primary rounded-lg transition-colors"
            >
              Ver detalles
            </button>
            <button
              class="px-3 py-1.5 text-xs font-medium bg-cta-default hover:bg-cta-hover text-white rounded-lg transition-colors"
            >
              Nuevo auto
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [``],
})
export class StatisticsWidgetComponent {
  data = signal({ upcoming: 0, income30d: 0, occupancy: 0, cancellations: 0 });
}
