import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageUpgrade } from '../../../../core/models/booking-detail-payment.model';

@Component({
  selector: 'app-coverage-upgrade-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-xl border border-pearl-gray/60 bg-white-pure shadow p-6 dark:border-neutral-800/70 dark:bg-anthracite transition-colors duration-300"
    >
      <h3 class="text-lg font-semibold text-smoke-black dark:text-ivory-luminous mb-4">
        Elegí tu nivel de protección
      </h3>

      <div class="space-y-3">
        <!-- Standard -->
        <label
          class="relative flex items-start p-4 border rounded-lg cursor-pointer bg-white-pure dark:bg-slate-deep/60 border-pearl-gray/70 dark:border-neutral-700 hover:border-accent-petrol/60 dark:hover:border-accent-petrol/60 hover:bg-gray-50 dark:hover:bg-slate-deep/50 transition-colors"
          [ngClass]="
            selectedUpgrade === 'standard'
              ? 'ring-2 ring-accent-petrol/60 bg-primary-50 dark:bg-accent-petrol/10 border-accent-petrol/60 shadow-card-hover'
              : ''
          "
        >
          <input
            type="radio"
            name="coverage"
            value="standard"
            [checked]="selectedUpgrade === 'standard'"
            (change)="onUpgradeChange('standard')"
            class="sr-only"
          />
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-smoke-black dark:text-ivory-luminous"
                >Protección estándar</span
              >
              <span class="text-sm font-semibold text-green-600 dark:text-green-400"
                >Incluido</span
              >
            </div>
            <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
              Protección básica incluida con tu reserva
            </p>
          </div>
          <div *ngIf="selectedUpgrade === 'standard'" class="ml-3">
            <svg
              class="w-5 h-5 text-primary-600 dark:text-accent-petrol"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </label>

        <!-- Premium 50 -->
        <label
          class="relative flex items-start p-4 border rounded-lg cursor-pointer bg-white-pure dark:bg-slate-deep/60 border-pearl-gray/70 dark:border-neutral-700 hover:border-accent-petrol/60 dark:hover:border-accent-petrol/60 hover:bg-gray-50 dark:hover:bg-slate-deep/50 transition-colors"
          [ngClass]="
            selectedUpgrade === 'premium50'
              ? 'ring-2 ring-accent-petrol/60 bg-primary-50 dark:bg-accent-petrol/10 border-accent-petrol/60 shadow-card-hover'
              : ''
          "
        >
          <input
            type="radio"
            name="coverage"
            value="premium50"
            [checked]="selectedUpgrade === 'premium50'"
            (change)="onUpgradeChange('premium50')"
            class="sr-only"
          />
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-smoke-black dark:text-ivory-luminous"
                >Cobertura Premium</span
              >
              <span class="text-sm font-semibold text-primary-600 dark:text-accent-petrol"
                >+10%</span
              >
            </div>
            <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
              Reduce a la mitad lo máximo que podrías pagar por daños
            </p>
          </div>
          <div *ngIf="selectedUpgrade === 'premium50'" class="ml-3">
            <svg
              class="w-5 h-5 text-primary-600 dark:text-accent-petrol"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </label>

        <!-- Zero -->
        <label
          class="relative flex items-start p-4 border rounded-lg cursor-pointer bg-white-pure dark:bg-slate-deep/60 border-pearl-gray/70 dark:border-neutral-700 hover:border-accent-petrol/60 dark:hover:border-accent-petrol/60 hover:bg-gray-50 dark:hover:bg-slate-deep/50 transition-colors"
          [ngClass]="
            selectedUpgrade === 'zero'
              ? 'ring-2 ring-accent-petrol/60 bg-primary-50 dark:bg-accent-petrol/10 border-accent-petrol/60 shadow-card-hover'
              : ''
          "
        >
          <input
            type="radio"
            name="coverage"
            value="zero"
            [checked]="selectedUpgrade === 'zero'"
            (change)="onUpgradeChange('zero')"
            class="sr-only"
          />
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-smoke-black dark:text-ivory-luminous"
                >Máxima protección</span
              >
              <span class="text-sm font-semibold text-primary-600 dark:text-accent-petrol"
                >+20%</span
              >
            </div>
            <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
              Cero responsabilidad por daños (nosotros nos encargamos)
            </p>
          </div>
          <div *ngIf="selectedUpgrade === 'zero'" class="ml-3">
            <svg
              class="w-5 h-5 text-primary-600 dark:text-accent-petrol"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </label>
      </div>

      <div
        class="mt-4 p-3 bg-blue-50 border border-blue-100 dark:bg-info-900/25 dark:border-info-700/40 rounded-lg transition-colors duration-300"
      >
        <div class="flex items-start gap-2">
          <svg class="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-xs text-blue-800 dark:text-info-200">
            El costo adicional se suma automáticamente al precio total de tu reserva.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class CoverageUpgradeSelectorComponent {
  @Input() selectedUpgrade: CoverageUpgrade = 'standard';
  @Output() upgradeChange = new EventEmitter<CoverageUpgrade>();

  onUpgradeChange(upgrade: CoverageUpgrade): void {
    this.selectedUpgrade = upgrade;
    this.upgradeChange.emit(upgrade);
  }
}
