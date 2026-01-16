import { Component, ChangeDetectionStrategy, computed } from '@angular/core';
import { CalendarWidgetComponent } from './widgets/calendar.component';
import { PayoutsWidgetComponent } from './widgets/payouts.component';
import { StatisticsWidgetComponent } from './widgets/statistics.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatisticsWidgetComponent, CalendarWidgetComponent, PayoutsWidgetComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-surface-base via-surface-secondary/30 to-surface-base">
      <!-- Hero Header -->
      <div class="bg-gradient-to-r from-cta-default via-cta-hover to-cta-default text-white">
        <div class="max-w-7xl mx-auto px-6 py-12">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl lg:text-4xl font-black mb-2">¡Bienvenido de vuelta!</h1>
              <p class="text-cta-text/80 text-lg">Aquí tienes un resumen de tu actividad en AutoRentAr</p>
            </div>
            <div class="hidden lg:flex items-center gap-4">
              <div class="text-right">
                <div class="text-2xl font-black">{{ currentDate() }}</div>
                <div class="text-cta-text/60">{{ currentTime() }}</div>
              </div>
              <div class="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-6 py-8">
        <!-- Stats Overview -->
        <div class="mb-8">
          <app-statistics-widget></app-statistics-widget>
        </div>

        <!-- Main Grid -->
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <!-- Calendar Section - Takes 2 columns on xl screens -->
          <div class="xl:col-span-2">
            <div class="bg-surface-raised rounded-3xl p-6 border border-border-subtle shadow-lg">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 class="text-xl font-bold text-text-primary">Calendario de Reservas</h2>
                    <p class="text-sm text-text-secondary">Gestiona tus reservas y disponibilidad</p>
                  </div>
                </div>
                <button class="px-4 py-2 text-sm font-medium bg-surface-secondary hover:bg-surface-hover text-text-primary rounded-xl transition-colors">
                  Ver calendario completo
                </button>
              </div>
              <app-calendar-widget></app-calendar-widget>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Payouts Widget -->
            <div class="bg-surface-raised rounded-3xl p-6 border border-border-subtle shadow-lg">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                  </svg>
                </div>
                <h3 class="font-bold text-text-primary">Pagos y Ganancias</h3>
              </div>
              <app-payouts-widget></app-payouts-widget>
            </div>

            <!-- Quick Actions -->
            <div class="bg-surface-raised rounded-3xl p-6 border border-border-subtle shadow-lg">
              <h3 class="font-bold text-text-primary mb-4 flex items-center gap-2">
                <svg class="w-5 h-5 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
                Acciones Rápidas
              </h3>
              <div class="space-y-3">
                <button class="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-cta-default to-cta-hover text-white font-semibold hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                  Publicar nuevo auto
                </button>
                <button class="w-full flex items-center gap-3 p-3 rounded-2xl bg-surface-secondary hover:bg-surface-hover text-text-primary font-medium transition-all duration-200 hover:shadow-md">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Gestionar autos
                </button>
                <button class="w-full flex items-center gap-3 p-3 rounded-2xl bg-surface-secondary hover:bg-surface-hover text-text-primary font-medium transition-all duration-200 hover:shadow-md">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Ver reservas
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [``],
})
export class DashboardPage {
  currentDate = computed(() =>
    new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  );

  currentTime = computed(() =>
    new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  );
}
