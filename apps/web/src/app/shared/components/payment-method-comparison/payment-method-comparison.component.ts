import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface GuaranteeBucket {
  label: string;
  range: string;
  holdArs: number;
  holdUsd: number;
}

@Component({
  selector: 'app-payment-method-comparison',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-2xl border border-border-default bg-surface-raised overflow-hidden">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-border-default bg-surface-secondary/30">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="font-semibold text-text-primary text-sm">Comparativa de Métodos de Pago</h3>
        </div>
      </div>

      <!-- Toggle Tabs -->
      <div class="flex border-b border-border-default">
        <button
          (click)="activeTab.set('comparison')"
          [class.border-b-2]="activeTab() === 'comparison'"
          [class.border-cta-default]="activeTab() === 'comparison'"
          [class.text-cta-default]="activeTab() === 'comparison'"
          [class.text-text-secondary]="activeTab() !== 'comparison'"
          class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Resumen
        </button>
        <button
          (click)="activeTab.set('guarantees')"
          [class.border-b-2]="activeTab() === 'guarantees'"
          [class.border-cta-default]="activeTab() === 'guarantees'"
          [class.text-cta-default]="activeTab() === 'guarantees'"
          [class.text-text-secondary]="activeTab() !== 'guarantees'"
          class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Garantías
        </button>
        <button
          (click)="activeTab.set('recommendation')"
          [class.border-b-2]="activeTab() === 'recommendation'"
          [class.border-cta-default]="activeTab() === 'recommendation'"
          [class.text-cta-default]="activeTab() === 'recommendation'"
          [class.text-text-secondary]="activeTab() !== 'recommendation'"
          class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Recomendación
        </button>
      </div>

      <!-- Content -->
      <div class="p-4">
        <!-- Comparison Tab -->
        @if (activeTab() === 'comparison') {
          <div class="space-y-4">
            <!-- Main Comparison Table -->
            <div class="overflow-x-auto -mx-4 px-4">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border-default">
                    <th class="text-left py-2 pr-2 text-text-secondary font-medium">Concepto</th>
                    <th class="text-center py-2 px-2">
                      <div class="flex items-center justify-center gap-1.5">
                        <svg class="w-4 h-4 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span class="text-text-primary font-semibold">Tarjeta</span>
                      </div>
                    </th>
                    <th class="text-center py-2 pl-2">
                      <div class="flex items-center justify-center gap-1.5">
                        <svg class="w-4 h-4 text-success-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span class="text-text-primary font-semibold">Wallet</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border-default">
                  <tr>
                    <td class="py-2.5 pr-2 text-text-secondary">Comisión</td>
                    <td class="py-2.5 px-2 text-center text-text-primary">15%</td>
                    <td class="py-2.5 pl-2 text-center text-text-primary">15%</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 pr-2 text-text-secondary">Garantía</td>
                    <td class="py-2.5 px-2 text-center">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success-default/10 text-success-default">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Reembolsable
                      </span>
                    </td>
                    <td class="py-2.5 pl-2 text-center">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning-dark">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        No reembolsable
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td class="py-2.5 pr-2 text-text-secondary">Confirmación</td>
                    <td class="py-2.5 px-2 text-center text-text-primary">1-2 min</td>
                    <td class="py-2.5 pl-2 text-center text-success-default font-medium">Instantánea</td>
                  </tr>
                  <tr>
                    <td class="py-2.5 pr-2 text-text-secondary">Requisito</td>
                    <td class="py-2.5 px-2 text-center text-text-primary text-xs">Tarjeta válida</td>
                    <td class="py-2.5 pl-2 text-center text-text-primary text-xs">Saldo previo</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Key Difference Alert -->
            <div class="p-3 rounded-lg bg-warning-light/30 border border-warning-default/20">
              <div class="flex gap-2">
                <svg class="w-5 h-5 text-warning-default flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-text-primary">Diferencia clave</p>
                  <p class="text-xs text-text-secondary mt-0.5">
                    Con <strong>Tarjeta</strong>, la garantía se libera al terminar sin daños.
                    Con <strong>Wallet</strong>, el Crédito de Seguridad queda en la plataforma permanentemente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        }

        <!-- Guarantees Tab -->
        @if (activeTab() === 'guarantees') {
          <div class="space-y-4">
            <!-- Credit Card Holds -->
            <div>
              <h4 class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <svg class="w-4 h-4 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Tarjeta (Hold - Preautorización)
              </h4>
              <div class="overflow-x-auto -mx-4 px-4">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-border-default">
                      <th class="text-left py-1.5 pr-2 text-text-secondary font-medium">Categoría</th>
                      <th class="text-right py-1.5 px-2 text-text-secondary font-medium">Hold ARS</th>
                      <th class="text-right py-1.5 pl-2 text-text-secondary font-medium">~USD</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border-default">
                    @for (bucket of guaranteeBuckets; track bucket.label) {
                      <tr [class.bg-cta-default/5]="isCurrentBucket(bucket)">
                        <td class="py-2 pr-2">
                          <div>
                            <span class="text-text-primary font-medium">{{ bucket.label }}</span>
                            <span class="text-text-secondary block">{{ bucket.range }}</span>
                          </div>
                        </td>
                        <td class="py-2 px-2 text-right text-text-primary font-medium">
                          {{ bucket.holdArs | number:'1.0-0' }}
                        </td>
                        <td class="py-2 pl-2 text-right text-text-secondary">
                          ~&#36;{{ bucket.holdUsd }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Wallet Security Credit -->
            <div>
              <h4 class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <svg class="w-4 h-4 text-success-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Wallet (Crédito de Seguridad)
              </h4>
              <div class="overflow-x-auto -mx-4 px-4">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-border-default">
                      <th class="text-left py-1.5 pr-2 text-text-secondary font-medium">Valor del Auto</th>
                      <th class="text-right py-1.5 pl-2 text-text-secondary font-medium">Crédito USD</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border-default">
                    <tr>
                      <td class="py-2 pr-2 text-text-primary">Hasta $20,000 USD</td>
                      <td class="py-2 pl-2 text-right">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning-dark">
                          $300 USD
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td class="py-2 pr-2 text-text-primary">Más de $20,000 USD</td>
                      <td class="py-2 pl-2 text-right">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-light text-warning-dark">
                          $500 USD
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="text-[10px] text-text-secondary mt-2 italic">
                * El Crédito de Seguridad NO es reembolsable. Queda en tu wallet para futuros alquileres.
              </p>
            </div>
          </div>
        }

        <!-- Recommendation Tab -->
        @if (activeTab() === 'recommendation') {
          <div class="space-y-3">
            <!-- For Frequent Users -->
            <div class="p-3 rounded-lg border border-border-default">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-success-default/10 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-success-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h5 class="text-sm font-semibold text-text-primary">Usuario Frecuente</h5>
                  <p class="text-xs text-text-secondary mt-0.5">
                    <strong class="text-success-default">Wallet recomendado</strong> - Pagás $300-$500 una vez y lo reutilizás en múltiples reservas.
                  </p>
                </div>
              </div>
            </div>

            <!-- For Occasional Users -->
            <div class="p-3 rounded-lg border border-border-default">
              <div class="flex items-start gap-3">
                <div class="w-8 h-8 rounded-lg bg-cta-default/10 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-cta-default" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h5 class="text-sm font-semibold text-text-primary">Usuario Ocasional</h5>
                  <p class="text-xs text-text-secondary mt-0.5">
                    <strong class="text-cta-default">Tarjeta recomendada</strong> - Recuperás el hold automáticamente al terminar sin daños.
                  </p>
                </div>
              </div>
            </div>

            <!-- Summary Table -->
            <div class="mt-4 p-3 rounded-lg bg-surface-secondary/50">
              <h5 class="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Resumen</h5>
              <div class="space-y-1.5 text-xs">
                <div class="flex justify-between">
                  <span class="text-text-secondary">Locatario frecuente</span>
                  <span class="text-success-default font-medium">Wallet</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary">Locatario ocasional</span>
                  <span class="text-cta-default font-medium">Tarjeta</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary">Mayor protección</span>
                  <span class="text-cta-default font-medium">Tarjeta</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-secondary">Confirmación rápida</span>
                  <span class="text-success-default font-medium">Wallet</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class PaymentMethodComparisonComponent {
  /** Car value in USD to highlight the appropriate bucket */
  readonly carValueUsd = input<number>(0);

  readonly activeTab = signal<'comparison' | 'guarantees' | 'recommendation'>('comparison');

  readonly guaranteeBuckets: GuaranteeBucket[] = [
    { label: 'Economy', range: '≤$10k USD', holdArs: 600000, holdUsd: 343 },
    { label: 'Standard', range: '$10k-$20k', holdArs: 800000, holdUsd: 458 },
    { label: 'Premium', range: '$20k-$40k', holdArs: 1200000, holdUsd: 686 },
    { label: 'Luxury', range: '$40k-$80k', holdArs: 1500000, holdUsd: 858 },
    { label: 'Ultra-luxury', range: '>$80k', holdArs: 2000000, holdUsd: 1144 },
  ];

  isCurrentBucket(bucket: GuaranteeBucket): boolean {
    const value = this.carValueUsd();
    if (!value) return false;

    switch (bucket.label) {
      case 'Economy':
        return value <= 10000;
      case 'Standard':
        return value > 10000 && value <= 20000;
      case 'Premium':
        return value > 20000 && value <= 40000;
      case 'Luxury':
        return value > 40000 && value <= 80000;
      case 'Ultra-luxury':
        return value > 80000;
      default:
        return false;
    }
  }
}
