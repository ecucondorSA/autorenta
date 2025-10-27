import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RiskSnapshot,
  PaymentMode,
  FxSnapshot,
  formatArs,
  formatUsd,
} from '../../../../core/models/booking-detail-payment.model';

/**
 * Tabla que muestra la política de riesgo y garantías
 * Incluye: preautorización/crédito, franquicia daño/robo, franquicia vuelco
 */
@Component({
  selector: 'app-risk-policy-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-xl border border-pearl-gray/60 bg-white-pure shadow p-6 dark:border-neutral-800/70 dark:bg-anthracite transition-colors duration-300"
    >
      <h3 class="text-lg font-semibold text-smoke-black dark:text-ivory-luminous mb-4">
        Garantías y Responsabilidades
      </h3>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-neutral-800">
          <thead class="bg-gray-50 dark:bg-slate-deep/50">
            <tr>
              <th
                scope="col"
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-pearl-light/60 uppercase tracking-wider"
              >
                Concepto
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-pearl-light/60 uppercase tracking-wider"
              >
                Monto (USD)
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-pearl-light/60 uppercase tracking-wider"
              >
                Monto (ARS)
              </th>
            </tr>
          </thead>
          <tbody
            class="bg-white-pure dark:bg-anthracite divide-y divide-gray-200 dark:divide-neutral-800"
          >
            <!-- Row 1: Preautorización / Crédito de Seguridad -->
            <tr>
              <td class="px-4 py-4 text-sm">
                <div class="flex items-start space-x-2">
                  <svg
                    class="w-5 h-5 text-blue-500 dark:text-info-300 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <div>
                    <p class="font-medium text-smoke-black dark:text-ivory-luminous">
                      {{
                        paymentMode === 'card' ? 'Preautorización (Hold)' : 'Crédito de Seguridad'
                      }}
                    </p>
                    <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
                      {{
                        paymentMode === 'card'
                          ? 'Reembolsable si todo está OK'
                          : 'NO reembolsable; queda en wallet no retirable'
                      }}
                    </p>
                  </div>
                </div>
              </td>
              <td
                class="px-4 py-4 text-sm text-right font-medium text-smoke-black dark:text-ivory-luminous"
              >
                {{
                  formatUsd(
                    paymentMode === 'card'
                      ? riskSnapshot.holdEstimatedUsd
                      : riskSnapshot.creditSecurityUsd
                  )
                }}
              </td>
              <td
                class="px-4 py-4 text-sm text-right font-medium text-smoke-black dark:text-ivory-luminous"
              >
                {{ paymentMode === 'card' ? formatArs(riskSnapshot.holdEstimatedArs) : '—' }}
              </td>
            </tr>

            <!-- Row 2: Franquicia Daño/Robo -->
            <tr class="bg-gray-50 dark:bg-slate-deep/40">
              <td class="px-4 py-4 text-sm">
                <div class="flex items-start space-x-2">
                  <svg
                    class="w-5 h-5 text-orange-500 dark:text-warning-300 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p class="font-medium text-smoke-black dark:text-ivory-luminous">
                      Franquicia Daño/Robo
                    </p>
                    <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
                      Tu responsabilidad máxima por daños o robo
                    </p>
                  </div>
                </div>
              </td>
              <td
                class="px-4 py-4 text-sm text-right font-semibold text-orange-600 dark:text-warning-300"
              >
                {{ formatUsd(riskSnapshot.deductibleUsd) }}
              </td>
              <td
                class="px-4 py-4 text-sm text-right font-semibold text-orange-600 dark:text-warning-300"
              >
                {{ formatArs(riskSnapshot.deductibleUsd * fxSnapshot.rate) }}
              </td>
            </tr>

            <!-- Row 3: Franquicia por Vuelco (2×) -->
            <tr>
              <td class="px-4 py-4 text-sm">
                <div class="flex items-start space-x-2">
                  <svg
                    class="w-5 h-5 text-red-500 dark:text-error-300 flex-shrink-0 mt-0.5"
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
                  <div>
                    <p class="font-medium text-smoke-black dark:text-ivory-luminous">
                      Franquicia por Vuelco
                      <span class="text-red-600 dark:text-error-300">(2×)</span>
                    </p>
                    <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
                      Doble responsabilidad en caso de vuelco del vehículo
                    </p>
                  </div>
                </div>
              </td>
              <td
                class="px-4 py-4 text-sm text-right font-semibold text-red-600 dark:text-error-300"
              >
                {{ formatUsd(riskSnapshot.rolloverDeductibleUsd) }}
              </td>
              <td
                class="px-4 py-4 text-sm text-right font-semibold text-red-600 dark:text-error-300"
              >
                {{ formatArs(riskSnapshot.rolloverDeductibleUsd * fxSnapshot.rate) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Ejemplo de Cálculo -->
      <div
        class="mt-4 bg-blue-50 border border-blue-100 dark:bg-info-900/25 dark:border-info-700/40 rounded-lg p-4 transition-colors duration-300"
      >
        <h4 class="text-sm font-semibold text-blue-900 dark:text-info-100 mb-2">
          💡 Ejemplo de cálculo
        </h4>
        <div class="text-xs text-blue-800 dark:text-info-200 space-y-1">
          <p *ngIf="paymentMode === 'card'">
            • Si hay un daño de <strong>{{ formatArs(100000) }}</strong
            >, capturamos <strong>{{ formatArs(100000) }}</strong> del hold.
          </p>
          <p *ngIf="paymentMode === 'card'">
            • Si hay un daño de
            <strong>{{ formatArs(riskSnapshot.deductibleUsd * fxSnapshot.rate * 1.5) }}</strong>
            (mayor a tu franquicia), capturamos solo
            <strong>{{ formatArs(riskSnapshot.deductibleUsd * fxSnapshot.rate) }}</strong> (tu
            franquicia máxima).
          </p>
          <p *ngIf="paymentMode === 'wallet'">
            • Si hay un daño de <strong>{{ formatUsd(100) }}</strong
            >, se debita <strong>{{ formatUsd(100) }}</strong> de tu Crédito de Seguridad.
          </p>
          <p *ngIf="paymentMode === 'wallet'">
            • Si el daño excede el crédito, se aplicará waterfall: Crédito → Top-up → FGO (hasta
            {{ formatUsd(800) }}) → Recupero.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RiskPolicyTableComponent {
  @Input({ required: true }) riskSnapshot!: RiskSnapshot;
  @Input({ required: true }) paymentMode!: PaymentMode;
  @Input({ required: true }) fxSnapshot!: FxSnapshot;

  formatUsd = formatUsd;
  formatArs = formatArs;
}
