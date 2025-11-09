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
      <h3 class="text-lg font-semibold text-gray-900 dark:text-ivory-luminous mb-4">
        Detalles de protección
      </h3>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-neutral-800">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th
                scope="col"
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-pearl-light/60 uppercase tracking-wider"
              >
                Tipo de protección
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-pearl-light/60 uppercase tracking-wider"
              >
                Límite (USD)
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-pearl-light/60 uppercase tracking-wider"
              >
                Límite (ARS)
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
                    class="w-5 h-5 text-sky-500 dark:text-info-300 flex-shrink-0 mt-0.5"
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
                    <p class="font-medium text-gray-900 dark:text-ivory-luminous">
                      {{
                        paymentMode === 'card' ? 'Protección con tarjeta' : 'Protección con wallet'
                      }}
                    </p>
                    <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
                      {{
                        paymentMode === 'card'
                          ? 'Se libera automáticamente si no hay problemas'
                          : 'Queda bloqueado hasta que termines el alquiler'
                      }}
                    </p>
                  </div>
                </div>
              </td>
              <td
                class="px-4 py-4 text-sm text-right font-medium text-gray-900 dark:text-ivory-luminous"
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
                class="px-4 py-4 text-sm text-right font-medium text-gray-900 dark:text-ivory-luminous"
              >
                {{ paymentMode === 'card' ? formatArs(riskSnapshot.holdEstimatedArs) : '—' }}
              </td>
            </tr>

            <!-- Row 2: Franquicia Daño/Robo -->
            <tr class="bg-gray-50 dark:bg-gray-700/40">
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
                    <p class="font-medium text-gray-900 dark:text-ivory-luminous">
                      Cobertura por daños o robo
                    </p>
                    <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
                      Lo máximo que podrías pagar si hay daños o robo del vehículo
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
                    <p class="font-medium text-gray-900 dark:text-ivory-luminous">
                      Cobertura por vuelco
                      <span class="text-red-600 dark:text-error-300">(límite mayor)</span>
                    </p>
                    <p class="text-xs text-charcoal-medium dark:text-pearl-light/70 mt-1">
                      Límite más alto si el auto se da vuelta (situaciones más graves)
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

      <!-- Cómo funciona la protección -->
      <div
        class="mt-4 bg-sky-50 border border-sky-100 dark:bg-info-900/25 dark:border-info-700/40 rounded-lg p-4 transition-colors duration-300"
      >
        <h4 class="text-sm font-semibold text-sky-700 dark:text-info-100 mb-2 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Cómo funciona
        </h4>
        <div class="text-xs text-sky-600 dark:text-info-200 space-y-2">
          <div *ngIf="paymentMode === 'card'" class="bg-white/50 dark:bg-gray-800/30 rounded p-3">
            <p class="font-medium mb-1">Con tarjeta:</p>
            <p>• Si hay un daño menor, solo se cobra lo necesario (hasta el límite de protección).</p>
            <p>• Si no hay problemas, se libera todo automáticamente al devolver el auto.</p>
          </div>
          <div *ngIf="paymentMode === 'wallet'" class="bg-white/50 dark:bg-gray-800/30 rounded p-3">
            <p class="font-medium mb-1">Con wallet:</p>
            <p>• Solo se usa tu saldo bloqueado si hay gastos o daños.</p>
            <p>• Si hay problemas grandes, te ayudamos a resolverlo.</p>
          </div>
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/60 rounded p-3">
            <p class="font-medium text-green-800 dark:text-green-200 mb-1">¿Qué está cubierto?</p>
            <p class="text-green-700 dark:text-green-300">Daños al vehículo, robo, combustible faltante, multas y peajes.</p>
          </div>
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
