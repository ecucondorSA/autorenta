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
        Upgrade de Cobertura
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
                >Estándar (incluida)</span
              >
              <span class="text-sm font-semibold text-smoke-black dark:text-ivory-luminous"
                >Sin cargo</span
              >
            </div>
            <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
              Franquicia normal según valor del vehículo
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
                >Seguro Premium (-50%)</span
              >
              <span class="text-sm font-semibold text-primary-600 dark:text-accent-petrol"
                >+10%</span
              >
            </div>
            <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
              Reduce tu franquicia a la mitad
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
                >Franquicia Cero</span
              >
              <span class="text-sm font-semibold text-primary-600 dark:text-accent-petrol"
                >+20%</span
              >
            </div>
            <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
              Sin responsabilidad en daños (franquicia = 0)
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
        <p class="text-xs text-blue-800 dark:text-info-200">
          💡 El upgrade se aplica automáticamente a la franquicia estándar y por vuelco. El costo se
          suma al total de la reserva.
        </p>
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
