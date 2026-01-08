import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

/**
 * HostSupportInfoPanelComponent
 *
 * Panel informativo para anfitriones que publican autos
 * Incluye tips, calculadora de ganancias y documentación
 *
 * Características:
 * - Accordion con tips de anfitrión
 * - Calculadora de ganancias interactiva
 * - Enlaces a documentación legal
 * - Tarifas recomendadas por categoría
 * - Collapsible para no interferir con el formulario
 */
@Component({
  selector: 'app-host-support-info-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div
      class="bg-surface-raised rounded-xl border border-border-default p-6 mb-6 transition-colors"
    >
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 mb-4">
        <div class="flex items-start gap-3 flex-1">
          <div class="flex-shrink-0 w-10 h-10 bg-cta-default text-cta-text text-xl">💡</div>
          <div class="flex-1 stack-xs">
            <h3 class="h4 text-text-primary">Guía para Anfitriones</h3>
            <p class="text-sm text-text-secondary">
              Todo lo que necesitás saber para tener éxito en AutoRenta
            </p>
          </div>
        </div>

        <button
          type="button"
          (click)="togglePanel()"
          class="flex-shrink-0 text-cta-default hover:text-warning-strong transition-colors"
          [attr.aria-label]="isExpanded() ? 'Ocultar guía' : 'Mostrar guía'"
        >
          <svg
            class="w-6 h-6 transition-transform"
            [class.rotate-180]="isExpanded()"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      <!-- Expanded Content -->
      @if (isExpanded()) {
        <div class="stack-lg">
          <!-- Quick Stats -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-surface-raised rounded-lg p-4 border border-border-default">
              <div class="h4 text-cta-default">+40%</div>
              <div class="text-xs text-text-secondary">Más reservas con fotos de calidad</div>
            </div>
            <div class="bg-surface-raised rounded-lg p-4 border border-border-default">
              <div class="h4 text-warning-strong">15-25%</div>
              <div class="text-xs text-text-secondary">Comisión de la plataforma</div>
            </div>
            <div class="bg-surface-raised rounded-lg p-4 border border-border-default">
              <div class="h4 text-cta-default">24-48h</div>
              <div class="text-xs text-text-secondary">Tiempo de revisión</div>
            </div>
          </div>
          <!-- Tabs -->
          <div class="border-b border-border-default overflow-x-auto scrollbar-hide">
            <nav class="flex gap-2 sm:gap-4 min-w-max" aria-label="Tabs">
              <button
                type="button"
                (click)="activeTab.set('tips')"
                [ngClass]="getTabClasses('tips')"
                class="py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap"
              >
                <span class="hidden sm:inline">📚 Tips y Obligaciones</span>
                <span class="sm:hidden">📚 Tips</span>
              </button>
              <button
                type="button"
                (click)="activeTab.set('calculator')"
                [ngClass]="getTabClasses('calculator')"
                class="py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap"
              >
                💰 Calculadora
              </button>
              <button
                type="button"
                (click)="activeTab.set('pricing')"
                [ngClass]="getTabClasses('pricing')"
                class="py-2 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap"
              >
                <span class="hidden sm:inline">💵 Precios Sugeridos</span>
                <span class="sm:hidden">💵 Precios</span>
              </button>
            </nav>
          </div>
          <!-- Tab Content -->
          <div class="stack-md">
            <!-- Tips Tab -->
            @if (activeTab() === 'tips') {
              <div class="stack-sm">
                <!-- Accordion Items -->
                <div
                  class="bg-surface-raised rounded-lg border border-border-default overflow-hidden"
                >
                  <button
                    type="button"
                    (click)="toggleAccordion('obligations')"
                    class="w-full flex items-center justify-between p-4 text-left hover:bg-surface-hover transition-colors"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-xl">📋</span>
                      <span class="font-semibold text-text-primary"
                        >Obligaciones del Anfitrión</span
                      >
                    </div>
                    <svg
                      class="w-5 h-5 transition-transform"
                      [class.rotate-180]="openAccordion() === 'obligations'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  @if (openAccordion() === 'obligations') {
                    <div class="p-4 pt-0 text-sm text-text-secondary space-y-2">
                      <ul class="list-disc list-inside space-y-1">
                        <li>Mantener el auto en excelentes condiciones de funcionamiento</li>
                        <li>Contar con seguro vigente que cubra alquiler a terceros</li>
                        <li>Verificación técnica (VTV) al día</li>
                        <li>Responder consultas en menos de 24 horas</li>
                        <li>Entregar el auto limpio y con tanque lleno</li>
                        <li>Cumplir con horarios de entrega y devolución acordados</li>
                      </ul>
                    </div>
                  }
                </div>
                <div
                  class="bg-surface-raised rounded-lg border border-border-default overflow-hidden"
                >
                  <button
                    type="button"
                    (click)="toggleAccordion('maintenance')"
                    class="w-full flex items-center justify-between p-4 text-left hover:bg-surface-hover transition-colors"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-xl">🔧</span>
                      <span class="font-semibold text-text-primary">Mantenimiento Requerido</span>
                    </div>
                    <svg
                      class="w-5 h-5 transition-transform"
                      [class.rotate-180]="openAccordion() === 'maintenance'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  @if (openAccordion() === 'maintenance') {
                    <div class="p-4 pt-0 text-sm text-text-secondary stack-sm">
                      <ul class="list-disc list-inside stack-xs">
                        <li>
                          <strong>Antes de cada alquiler:</strong> Limpieza completa interior y
                          exterior
                        </li>
                        <li><strong>Cada 5,000 km:</strong> Cambio de aceite y filtros</li>
                        <li><strong>Cada 10,000 km:</strong> Revisión de frenos y alineación</li>
                        <li>
                          <strong>Mensual:</strong> Verificar presión de neumáticos y niveles de
                          fluidos
                        </li>
                        <li><strong>Anual:</strong> Verificación técnica vehicular (VTV)</li>
                        <li>
                          <strong>Recomendado:</strong> Kit de emergencia (matafuego, balizas,
                          herramientas)
                        </li>
                      </ul>
                    </div>
                  }
                </div>
                <div
                  class="bg-surface-raised rounded-lg border border-border-default overflow-hidden"
                >
                  <button
                    type="button"
                    (click)="toggleAccordion('insurance')"
                    class="w-full flex items-center justify-between p-4 text-left hover:bg-surface-hover transition-colors"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-xl">🛡️</span>
                      <span class="font-semibold text-text-primary">Seguros Necesarios</span>
                    </div>
                    <svg
                      class="w-5 h-5 transition-transform"
                      [class.rotate-180]="openAccordion() === 'insurance'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  @if (openAccordion() === 'insurance') {
                    <div class="p-4 pt-0 text-sm text-text-secondary stack-sm">
                      <div class="stack-sm">
                        <div class="bg-cta-default/5 p-3 rounded-lg border border-cta-default/20">
                          <p class="font-semibold text-cta-default">Seguro Obligatorio</p>
                          <p class="text-sm">
                            Responsabilidad civil contra terceros con cobertura de alquiler a
                            terceros explícita en la póliza.
                          </p>
                        </div>
                        <div
                          class="bg-warning-light/5 p-3 rounded-lg border border-warning-light/20"
                        >
                          <p class="font-semibold text-warning-strong">Seguro Recomendado</p>
                          <p class="text-sm">
                            Todo riesgo con franquicia reducida. Protege tu inversión ante daños,
                            robo o accidentes.
                          </p>
                        </div>
                        <p class="text-xs italic text-text-secondary/70">
                          💡 Tip: Incluir el costo del seguro en el precio diario aumenta la
                          confianza del locatario.
                        </p>
                      </div>
                    </div>
                  }
                </div>
                <div
                  class="bg-surface-raised rounded-lg border border-border-default overflow-hidden"
                >
                  <button
                    type="button"
                    (click)="toggleAccordion('legal')"
                    class="w-full flex items-center justify-between p-4 text-left hover:bg-surface-hover transition-colors"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-xl">⚖️</span>
                      <span class="font-semibold text-text-primary">Documentación Legal</span>
                    </div>
                    <svg
                      class="w-5 h-5 transition-transform"
                      [class.rotate-180]="openAccordion() === 'legal'"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  @if (openAccordion() === 'legal') {
                    <div class="p-4 pt-0 text-sm text-text-secondary stack-sm">
                      <ul class="list-disc list-inside stack-xs">
                        <li>
                          <strong>Cédula verde/azul:</strong> Debe estar a tu nombre o tener
                          autorización notarial
                        </li>
                        <li>
                          <strong>Póliza de seguro:</strong> Con cláusula de alquiler a terceros
                        </li>
                        <li>
                          <strong>VTV vigente:</strong> No mayor a 1 año (vehículos de +3 años)
                        </li>
                        <li>
                          <strong>Contrato de alquiler:</strong> AutoRenta provee template estándar
                        </li>
                        <li>
                          <strong>AFIP/ARBA:</strong> Ingresos por alquiler son gravables (consultá
                          con contador)
                        </li>
                      </ul>
                    </div>
                  }
                </div>
              </div>
            }
            <!-- Calculator Tab -->
            @if (activeTab() === 'calculator') {
              <div class="bg-surface-raised rounded-lg p-6 border border-border-default stack-md">
                <h4 class="h4 text-text-primary">Calculadora de Ganancias</h4>
                <div class="stack-md">
                  <div class="stack-xs">
                    <label class="block text-sm font-medium text-text-primary">
                      Precio por día (USD)
                    </label>
                    <input
                      type="number"
                      [(ngModel)]="calcPricePerDay"
                      (ngModelChange)="updateCalculations()"
                      min="1"
                      class="w-full rounded-lg border border-border-muted bg-surface-base text-text-inverse px-4 py-2"
                      placeholder="50"
                    />
                  </div>
                  <div class="stack-xs">
                    <label class="block text-sm font-medium text-text-primary">
                      Días alquilados por mes (promedio)
                    </label>
                    <input
                      type="number"
                      [(ngModel)]="calcDaysPerMonth"
                      (ngModelChange)="updateCalculations()"
                      min="1"
                      max="30"
                      class="w-full rounded-lg border border-border-muted bg-surface-base text-text-inverse px-4 py-2"
                      placeholder="15"
                    />
                    <div class="flex gap-2">
                      <button
                        type="button"
                        (click)="setDaysPerMonth(10)"
                        class="px-3 py-1 text-xs bg-surface-raised rounded hover:bg-surface-hover"
                      >
                        10 días
                      </button>
                      <button
                        type="button"
                        (click)="setDaysPerMonth(15)"
                        class="px-3 py-1 text-xs bg-surface-raised rounded hover:bg-surface-hover"
                      >
                        15 días
                      </button>
                      <button
                        type="button"
                        (click)="setDaysPerMonth(20)"
                        class="px-3 py-1 text-xs bg-surface-raised rounded hover:bg-surface-hover"
                      >
                        20 días
                      </button>
                    </div>
                  </div>
                  <div class="border-t border-border-default pt-4 space-y-2">
                    <div class="flex justify-between text-sm">
                      <span class="text-text-secondary">Ingresos brutos</span>
                      <span class="font-semibold text-text-primary">USD {{ grossIncome() }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-text-secondary">Comisión AutoRenta (20%)</span>
                      <span class="font-semibold text-warning-strong"
                        >- USD {{ platformFee() }}</span
                      >
                    </div>
                    <div class="flex justify-between text-sm border-t border-border-default pt-2">
                      <span class="font-semibold text-text-primary">Ganancia neta</span>
                      <span class="font-bold text-cta-default text-lg">USD {{ netIncome() }}</span>
                    </div>
                    <div class="flex justify-between text-xs text-text-muted">
                      <span>Proyección anual</span>
                      <span>USD {{ annualIncome() }}</span>
                    </div>
                  </div>
                  <div
                    class="bg-warning-light/5 border border-warning-light/20 rounded-lg p-3 text-xs text-warning-strong"
                  >
                    ⚠️ <strong>Nota:</strong> Estos cálculos son estimativos. No incluyen gastos de
                    mantenimiento, combustible, seguro o impuestos.
                  </div>
                </div>
              </div>
            }
            <!-- Pricing Tab -->
            @if (activeTab() === 'pricing') {
              <div class="stack-md">
                <p class="text-sm text-text-secondary">
                  Precios sugeridos por categoría (USD por día). Basados en promedios de mercado en
                  Argentina.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="bg-surface-raised rounded-lg p-4 border border-border-default">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">🚗</span>
                      <h5 class="h5 text-text-primary">Compacto/Económico</h5>
                    </div>
                    <p class="text-xs text-text-muted">Ej: Chevrolet Onix, Fiat Cronos</p>
                    <div class="h4 text-cta-default">$25-35</div>
                    <p class="text-xs text-text-secondary">USD por día</p>
                  </div>
                  <div class="bg-surface-raised rounded-lg p-4 border border-border-default">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">🚙</span>
                      <h5 class="h5 text-text-primary">Sedán Mediano</h5>
                    </div>
                    <p class="text-xs text-text-muted">Ej: Toyota Corolla, Volkswagen Vento</p>
                    <div class="h4 text-warning-strong">$40-55</div>
                    <p class="text-xs text-text-secondary">USD por día</p>
                  </div>
                  <div class="bg-surface-raised rounded-lg p-4 border border-border-default">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">🚐</span>
                      <h5 class="h5 text-text-primary">SUV/Camioneta</h5>
                    </div>
                    <p class="text-xs text-text-muted">Ej: Ford Ranger, Chevrolet Tracker</p>
                    <div class="h4 text-cta-default">$60-85</div>
                    <p class="text-xs text-text-secondary">USD por día</p>
                  </div>
                  <div class="bg-surface-raised rounded-lg p-4 border border-border-default">
                    <div class="flex items-center gap-2">
                      <span class="text-xl">🏎️</span>
                      <h5 class="h5 text-text-primary">Premium/Lujo</h5>
                    </div>
                    <p class="text-xs text-text-muted">Ej: Audi A4, BMW Serie 3</p>
                    <div class="h4 text-warning-strong">$90-150+</div>
                    <p class="text-xs text-text-secondary">USD por día</p>
                  </div>
                </div>
                <div
                  class="bg-cta-default/5 border border-cta-default/20 rounded-lg p-4 text-sm stack-xs"
                >
                  <p class="font-semibold text-cta-default">💡 Tips de Pricing:</p>
                  <ul class="list-disc list-inside stack-xs text-text-secondary text-xs">
                    <li>Precio competitivo: Revisar autos similares en tu ciudad</li>
                    <li>Descuentos por semana (5-10%) y mes (15-20%) atraen más clientes</li>
                    <li>Temporada alta (verano/feriados): Aumentar 20-30%</li>
                    <li>Auto con poco kilometraje o modelo nuevo: Premium de 10-15%</li>
                  </ul>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class HostSupportInfoPanelComponent {
  readonly isExpanded = signal(true);
  readonly activeTab = signal<'tips' | 'calculator' | 'pricing'>('tips');
  readonly openAccordion = signal<string | null>(null);

  getTabClasses(tab: 'tips' | 'calculator' | 'pricing'): Record<string, boolean> {
    const isActive = this.activeTab() === tab;
    return {
      'border-cta-default text-cta-default': isActive,
      'border-transparent text-text-muted': !isActive,
    };
  }

  // Calculator signals
  calcPricePerDay = 50;
  calcDaysPerMonth = 15;

  readonly grossIncome = signal(750);
  readonly platformFee = signal(150);
  readonly netIncome = signal(600);
  readonly annualIncome = signal(7200);

  constructor() {
    this.updateCalculations();
  }

  togglePanel(): void {
    this.isExpanded.update((expanded) => !expanded);
  }

  toggleAccordion(section: string): void {
    if (this.openAccordion() === section) {
      this.openAccordion.set(null);
    } else {
      this.openAccordion.set(section);
    }
  }

  setDaysPerMonth(days: number): void {
    this.calcDaysPerMonth = days;
    this.updateCalculations();
  }

  updateCalculations(): void {
    const gross = this.calcPricePerDay * this.calcDaysPerMonth;
    const fee = Math.round(gross * 0.2); // 20% commission
    const net = gross - fee;
    const annual = net * 12;

    this.grossIncome.set(gross);
    this.platformFee.set(fee);
    this.netIncome.set(net);
    this.annualIncome.set(annual);
  }
}
