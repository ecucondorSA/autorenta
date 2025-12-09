import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      class="rounded-xl border border-border-default/60 bg-surface-raised shadow p-6 dark:border-neutral-800/70 dark:bg-surface-raised transition-colors duration-300"
    >
      <h3 class="text-lg font-semibold text-text-primary dark:text-text-primary mb-4">
        Detalles de protección
      </h3>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-neutral-800">
          <thead class="bg-surface-base dark:bg-surface-secondary/50">
            <tr>
              <th
                scope="col"
                class="px-4 py-3 text-left text-xs font-medium text-text-secondary dark:text-text-secondary/60 uppercase tracking-wider"
              >
                Tipo de protección
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-text-secondary/60 uppercase tracking-wider"
              >
                Límite (USD)
              </th>
              <th
                scope="col"
                class="px-4 py-3 text-right text-xs font-medium text-text-secondary dark:text-text-secondary/60 uppercase tracking-wider"
              >
                Límite (ARS)
              </th>
            </tr>
          </thead>
          <tbody
            class="bg-surface-raised dark:bg-surface-raised divide-y divide-gray-200 dark:divide-neutral-800"
          >
            <!-- Row 1: Preautorización / Crédito de Seguridad -->
            <tr>
              <td class="px-4 py-4 text-sm">
                <div class="flex items-start space-x-2">
                  <svg
                    class="w-5 h-5 text-cta-default dark:text-cta-default flex-shrink-0 mt-0.5"
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
                    <p class="font-medium text-text-primary dark:text-text-primary">
                      {{
                        paymentMode === 'card' ? 'Protección con tarjeta' : 'Protección con wallet'
                      }}
                    </p>
                    <p class="text-xs text-text-secondary dark:text-text-secondary/70 mt-1">
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
                class="px-4 py-4 text-sm text-right font-medium text-text-primary dark:text-text-primary"
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
                class="px-4 py-4 text-sm text-right font-medium text-text-primary dark:text-text-primary"
              >
                {{ paymentMode === 'card' ? formatArs(riskSnapshot.holdEstimatedArs) : '—' }}
              </td>
            </tr>

            <!-- Row 2: Franquicia Daño/Robo -->
            <tr class="bg-surface-base dark:bg-surface-secondary/40">
              <td class="px-4 py-4 text-sm">
                <div class="flex items-start space-x-2">
                  <svg
                    class="w-5 h-5 text-warning-light dark:text-warning-300 flex-shrink-0 mt-0.5"
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
                    <p class="font-medium text-text-primary dark:text-text-primary">
                      Cobertura por daños o robo
                    </p>
                    <p class="text-xs text-text-secondary dark:text-text-secondary/70 mt-1">
                      Lo máximo que podrías pagar si hay daños o robo del vehículo
                    </p>
                  </div>
                </div>
              </td>
              <td
                class="px-4 py-4 text-sm text-right font-semibold text-warning-light dark:text-warning-300"
              >
                {{ formatUsd(riskSnapshot.deductibleUsd) }}
              </td>
              <td
                class="px-4 py-4 text-sm text-right font-semibold text-warning-light dark:text-warning-300"
              >
                {{ formatArs(riskSnapshot.deductibleUsd * fxSnapshot.rate) }}
              </td>
            </tr>

            <!-- Row 3: Franquicia por Vuelco (2×) -->
            <tr>
              <td class="px-4 py-4 text-sm">
                <div class="flex items-start space-x-2">
                  <svg
                    class="w-5 h-5 text-error-500 dark:text-error-300 flex-shrink-0 mt-0.5"
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
                    <p class="font-medium text-text-primary dark:text-text-primary">
                      Cobertura por vuelco
                      <span class="text-error-text">(límite mayor)</span>
                    </p>
                    <p class="text-xs text-text-secondary dark:text-text-secondary/70 mt-1">
                      Límite más alto si el auto se da vuelta (situaciones más graves)
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-4 text-sm text-right font-semibold text-error-text">
                {{ formatUsd(riskSnapshot.rolloverDeductibleUsd) }}
              </td>
              <td class="px-4 py-4 text-sm text-right font-semibold text-error-text">
                {{ formatArs(riskSnapshot.rolloverDeductibleUsd * fxSnapshot.rate) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Cómo funciona la protección -->
      <div
        class="mt-4 bg-cta-default/10 border border-cta-default/30 dark:bg-cta-default/25 dark:border-cta-default/40 rounded-lg p-4 transition-colors duration-300"
      >
        <h4
          class="text-sm font-semibold text-cta-default dark:text-cta-default mb-2 flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Cómo funciona
        </h4>
        <div class="text-xs text-cta-default dark:text-cta-default space-y-2">
          <div
            *ngIf="paymentMode === 'card'"
            class="bg-surface-raised/50 dark:bg-surface-base/30 rounded p-3"
          >
            <p class="font-medium mb-1">Con tarjeta:</p>
            <p>
              • Si hay un daño menor, solo se cobra lo necesario (hasta el límite de protección).
            </p>
            <p>• Si no hay problemas, se libera todo automáticamente al devolver el auto.</p>
          </div>
          <div
            *ngIf="paymentMode === 'wallet'"
            class="bg-surface-raised/50 dark:bg-surface-base/30 rounded p-3"
          >
            <p class="font-medium mb-1">Con wallet:</p>
            <p>• Solo se usa tu saldo bloqueado si hay gastos o daños.</p>
            <p>• Si hay problemas grandes, te ayudamos a resolverlo.</p>
          </div>
          <div
            class="bg-success-light/10 dark:bg-success-light/20 border border-success-light/40 dark:border-success-light/60 rounded p-3"
          >
            <p class="font-medium text-success-light dark:text-success-strong mb-1">
              ¿Qué está cubierto?
            </p>
            <p class="text-success-light dark:text-success-strong">
              Daños al vehículo, robo, combustible faltante, multas y peajes.
            </p>
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
