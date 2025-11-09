import { Component, signal } from '@angular/core';
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
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="bg-gradient-to-r from-sand-light to-ivory-soft dark:from-slate-deep/50 dark:to-anthracite rounded-xl border border-pearl-gray dark:border-slate-deep p-6 mb-6 transition-colors">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 mb-4">
        <div class="flex items-start gap-3 flex-1">
          <div class="flex-shrink-0 w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center text-white text-xl">
            💡
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-gray-900 dark:text-ivory-luminous mb-1">
              Guía para Anfitriones
            </h3>
            <p class="text-sm text-charcoal-medium dark:text-pearl-light/75">
              Todo lo que necesitás saber para tener éxito en AutoRenta
            </p>
          </div>
        </div>

        <button
          type="button"
          (click)="togglePanel()"
          class="flex-shrink-0 text-sky-600 dark:text-sky-600/70 hover:text-beige-400 dark:hover:text-beige-400 transition-colors"
          [attr.aria-label]="isExpanded() ? 'Ocultar guía' : 'Mostrar guía'"
        >
          <svg class="w-6 h-6 transition-transform" [class.rotate-180]="isExpanded()" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>

      <!-- Expanded Content -->
      <div *ngIf="isExpanded()" class="space-y-6">
        <!-- Quick Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white-pure dark:bg-anthracite rounded-lg p-4 border border-pearl-gray dark:border-slate-deep">
            <div class="text-2xl font-bold text-sky-600 dark:text-sky-600/80">+40%</div>
            <div class="text-xs text-charcoal-medium dark:text-pearl-light/75 mt-1">Más reservas con fotos de calidad</div>
          </div>
          <div class="bg-white-pure dark:bg-anthracite rounded-lg p-4 border border-pearl-gray dark:border-slate-deep">
            <div class="text-2xl font-bold text-beige-400 dark:text-beige-400/90">15-25%</div>
            <div class="text-xs text-charcoal-medium dark:text-pearl-light/75 mt-1">Comisión de la plataforma</div>
          </div>
          <div class="bg-white-pure dark:bg-anthracite rounded-lg p-4 border border-pearl-gray dark:border-slate-deep">
            <div class="text-2xl font-bold text-sky-600 dark:text-sky-600/80">24-48h</div>
            <div class="text-xs text-charcoal-medium dark:text-pearl-light/75 mt-1">Tiempo de revisión</div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="border-b border-pearl-gray dark:border-slate-deep">
          <nav class="flex gap-4" aria-label="Tabs">
            <button
              type="button"
              (click)="activeTab.set('tips')"
              [class.border-accent-petrol]="activeTab() === 'tips'"
              [class.text-sky-600]="activeTab() === 'tips'"
              [class.dark:border-accent-petrol/70]="activeTab() === 'tips'"
              [class.dark:text-sky-600/70]="activeTab() === 'tips'"
              [class.border-transparent]="activeTab() !== 'tips'"
              [class.text-ash-gray dark:text-pearl-light/70]="activeTab() !== 'tips'"
              class="py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap"
            >
              📚 Tips y Obligaciones
            </button>
            <button
              type="button"
              (click)="activeTab.set('calculator')"
              [class.border-accent-petrol]="activeTab() === 'calculator'"
              [class.text-sky-600]="activeTab() === 'calculator'"
              [class.dark:border-accent-petrol/70]="activeTab() === 'calculator'"
              [class.dark:text-sky-600/70]="activeTab() === 'calculator'"
              [class.border-transparent]="activeTab() !== 'calculator'"
              [class.text-ash-gray dark:text-pearl-light/70]="activeTab() !== 'calculator'"
              class="py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap"
            >
              💰 Calculadora
            </button>
            <button
              type="button"
              (click)="activeTab.set('pricing')"
              [class.border-accent-petrol]="activeTab() === 'pricing'"
              [class.text-sky-600]="activeTab() === 'pricing'"
              [class.dark:border-accent-petrol/70]="activeTab() === 'pricing'"
              [class.dark:text-sky-600/70]="activeTab() === 'pricing'"
              [class.border-transparent]="activeTab() !== 'pricing'"
              [class.text-ash-gray dark:text-pearl-light/70]="activeTab() !== 'pricing'"
              class="py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap"
            >
              💵 Precios Sugeridos
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="mt-4">
          <!-- Tips Tab -->
          <div *ngIf="activeTab() === 'tips'" class="space-y-3">
            <!-- Accordion Items -->
            <div class="bg-white dark:bg-anthracite rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                (click)="toggleAccordion('obligations')"
                class="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl">📋</span>
                  <span class="font-semibold text-gray-900 dark:text-ivory-luminous">Obligaciones del Anfitrión</span>
                </div>
                <svg class="w-5 h-5 transition-transform" [class.rotate-180]="openAccordion() === 'obligations'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <div *ngIf="openAccordion() === 'obligations'" class="p-4 pt-0 text-sm text-gray-600 dark:text-pearl-light space-y-2">
                <ul class="list-disc list-inside space-y-1">
                  <li>Mantener el auto en excelentes condiciones de funcionamiento</li>
                  <li>Contar con seguro vigente que cubra alquiler a terceros</li>
                  <li>Verificación técnica (VTV) al día</li>
                  <li>Responder consultas en menos de 24 horas</li>
                  <li>Entregar el auto limpio y con tanque lleno</li>
                  <li>Cumplir con horarios de entrega y devolución acordados</li>
                </ul>
              </div>
            </div>

            <div class="bg-white dark:bg-anthracite rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                (click)="toggleAccordion('maintenance')"
                class="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl">🔧</span>
                  <span class="font-semibold text-gray-900 dark:text-ivory-luminous">Mantenimiento Requerido</span>
                </div>
                <svg class="w-5 h-5 transition-transform" [class.rotate-180]="openAccordion() === 'maintenance'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <div *ngIf="openAccordion() === 'maintenance'" class="p-4 pt-0 text-sm text-gray-600 dark:text-pearl-light space-y-2">
                <ul class="list-disc list-inside space-y-1">
                  <li><strong>Antes de cada alquiler:</strong> Limpieza completa interior y exterior</li>
                  <li><strong>Cada 5,000 km:</strong> Cambio de aceite y filtros</li>
                  <li><strong>Cada 10,000 km:</strong> Revisión de frenos y alineación</li>
                  <li><strong>Mensual:</strong> Verificar presión de neumáticos y niveles de fluidos</li>
                  <li><strong>Anual:</strong> Verificación técnica vehicular (VTV)</li>
                  <li><strong>Recomendado:</strong> Kit de emergencia (matafuego, balizas, herramientas)</li>
                </ul>
              </div>
            </div>

            <div class="bg-white dark:bg-anthracite rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                (click)="toggleAccordion('insurance')"
                class="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl">🛡️</span>
                  <span class="font-semibold text-gray-900 dark:text-ivory-luminous">Seguros Necesarios</span>
                </div>
                <svg class="w-5 h-5 transition-transform" [class.rotate-180]="openAccordion() === 'insurance'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <div *ngIf="openAccordion() === 'insurance'" class="p-4 pt-0 text-sm text-charcoal-medium dark:text-pearl-light space-y-2">
                <div class="space-y-3">
                  <div class="bg-sky-600/5 dark:bg-sky-600/10 p-3 rounded-lg border border-accent-petrol/20">
                    <p class="font-semibold text-sky-600 dark:text-sky-600/80 mb-1">Seguro Obligatorio</p>
                    <p class="text-sm">Responsabilidad civil contra terceros con cobertura de alquiler a terceros explícita en la póliza.</p>
                  </div>
                  <div class="bg-beige-400/5 dark:bg-beige-400/10 p-3 rounded-lg border border-accent-warm/20">
                    <p class="font-semibold text-beige-400 dark:text-beige-400/90 mb-1">Seguro Recomendado</p>
                    <p class="text-sm">Todo riesgo con franquicia reducida. Protege tu inversión ante daños, robo o accidentes.</p>
                  </div>
                  <p class="text-xs italic text-charcoal-medium dark:text-pearl-light/70">💡 Tip: Incluir el costo del seguro en el precio diario aumenta la confianza del locatario.</p>
                </div>
              </div>
            </div>

            <div class="bg-white dark:bg-anthracite rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                type="button"
                (click)="toggleAccordion('legal')"
                class="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <span class="text-xl">⚖️</span>
                  <span class="font-semibold text-gray-900 dark:text-ivory-luminous">Documentación Legal</span>
                </div>
                <svg class="w-5 h-5 transition-transform" [class.rotate-180]="openAccordion() === 'legal'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <div *ngIf="openAccordion() === 'legal'" class="p-4 pt-0 text-sm text-gray-600 dark:text-pearl-light space-y-2">
                <ul class="list-disc list-inside space-y-1">
                  <li><strong>Cédula verde/azul:</strong> Debe estar a tu nombre o tener autorización notarial</li>
                  <li><strong>Póliza de seguro:</strong> Con cláusula de alquiler a terceros</li>
                  <li><strong>VTV vigente:</strong> No mayor a 1 año (vehículos de +3 años)</li>
                  <li><strong>Contrato de alquiler:</strong> AutoRenta provee template estándar</li>
                  <li><strong>AFIP/ARBA:</strong> Ingresos por alquiler son gravables (consultá con contador)</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Calculator Tab -->
          <div *ngIf="activeTab() === 'calculator'" class="bg-white dark:bg-anthracite rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h4 class="text-lg font-semibold text-gray-900 dark:text-ivory-luminous mb-4">Calculadora de Ganancias</h4>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-pearl-light mb-2">
                  Precio por día (USD)
                </label>
                <input
                  type="number"
                  [(ngModel)]="calcPricePerDay"
                  (ngModelChange)="updateCalculations()"
                  min="1"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-4 py-2"
                  placeholder="50"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-pearl-light mb-2">
                  Días alquilados por mes (promedio)
                </label>
                <input
                  type="number"
                  [(ngModel)]="calcDaysPerMonth"
                  (ngModelChange)="updateCalculations()"
                  min="1"
                  max="30"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-4 py-2"
                  placeholder="15"
                />
                <div class="mt-2 flex gap-2">
                  <button type="button" (click)="setDaysPerMonth(10)" class="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">10 días</button>
                  <button type="button" (click)="setDaysPerMonth(15)" class="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">15 días</button>
                  <button type="button" (click)="setDaysPerMonth(20)" class="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">20 días</button>
                </div>
              </div>

              <div class="border-t border-pearl-gray dark:border-slate-deep pt-4 space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-charcoal-medium dark:text-pearl-light">Ingresos brutos</span>
                  <span class="font-semibold text-gray-900 dark:text-ivory-luminous">USD {{ grossIncome() }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-charcoal-medium dark:text-pearl-light">Comisión AutoRenta (20%)</span>
                  <span class="font-semibold text-beige-400 dark:text-beige-400/90">- USD {{ platformFee() }}</span>
                </div>
                <div class="flex justify-between text-sm border-t border-pearl-gray dark:border-slate-deep pt-2">
                  <span class="font-semibold text-gray-900 dark:text-ivory-luminous">Ganancia neta</span>
                  <span class="font-bold text-sky-600 dark:text-sky-600/80 text-lg">USD {{ netIncome() }}</span>
                </div>
                <div class="flex justify-between text-xs text-ash-gray dark:text-pearl-light/60">
                  <span>Proyección anual</span>
                  <span>USD {{ annualIncome() }}</span>
                </div>
              </div>

              <div class="bg-beige-400/5 dark:bg-beige-400/10 border border-accent-warm/20 rounded-lg p-3 text-xs text-beige-400 dark:text-beige-400/90">
                ⚠️ <strong>Nota:</strong> Estos cálculos son estimativos. No incluyen gastos de mantenimiento, combustible, seguro o impuestos.
              </div>
            </div>
          </div>

          <!-- Pricing Tab -->
          <div *ngIf="activeTab() === 'pricing'" class="space-y-4">
            <p class="text-sm text-charcoal-medium dark:text-pearl-light mb-4">
              Precios sugeridos por categoría (USD por día). Basados en promedios de mercado en Argentina.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-white-pure dark:bg-anthracite rounded-lg p-4 border border-pearl-gray dark:border-slate-deep">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-2xl">🚗</span>
                  <h5 class="font-semibold text-gray-900 dark:text-ivory-luminous">Compacto/Económico</h5>
                </div>
                <p class="text-xs text-ash-gray dark:text-pearl-light/60 mb-2">Ej: Chevrolet Onix, Fiat Cronos</p>
                <div class="text-2xl font-bold text-sky-600 dark:text-sky-600/80">$25-35</div>
                <p class="text-xs text-charcoal-medium dark:text-pearl-light/75 mt-1">USD por día</p>
              </div>

              <div class="bg-white-pure dark:bg-anthracite rounded-lg p-4 border border-pearl-gray dark:border-slate-deep">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-2xl">🚙</span>
                  <h5 class="font-semibold text-gray-900 dark:text-ivory-luminous">Sedán Mediano</h5>
                </div>
                <p class="text-xs text-ash-gray dark:text-pearl-light/60 mb-2">Ej: Toyota Corolla, Volkswagen Vento</p>
                <div class="text-2xl font-bold text-beige-400 dark:text-beige-400/90">$40-55</div>
                <p class="text-xs text-charcoal-medium dark:text-pearl-light/75 mt-1">USD por día</p>
              </div>

              <div class="bg-white-pure dark:bg-anthracite rounded-lg p-4 border border-pearl-gray dark:border-slate-deep">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-2xl">🚐</span>
                  <h5 class="font-semibold text-gray-900 dark:text-ivory-luminous">SUV/Camioneta</h5>
                </div>
                <p class="text-xs text-ash-gray dark:text-pearl-light/60 mb-2">Ej: Ford Ranger, Chevrolet Tracker</p>
                <div class="text-2xl font-bold text-sky-600 dark:text-sky-600/80">$60-85</div>
                <p class="text-xs text-charcoal-medium dark:text-pearl-light/75 mt-1">USD por día</p>
              </div>

              <div class="bg-white-pure dark:bg-anthracite rounded-lg p-4 border border-pearl-gray dark:border-slate-deep">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-2xl">🏎️</span>
                  <h5 class="font-semibold text-gray-900 dark:text-ivory-luminous">Premium/Lujo</h5>
                </div>
                <p class="text-xs text-ash-gray dark:text-pearl-light/60 mb-2">Ej: Audi A4, BMW Serie 3</p>
                <div class="text-2xl font-bold text-beige-400 dark:text-beige-400/90">$90-150+</div>
                <p class="text-xs text-charcoal-medium dark:text-pearl-light/75 mt-1">USD por día</p>
              </div>
            </div>

            <div class="bg-sky-600/5 dark:bg-sky-600/10 border border-accent-petrol/20 rounded-lg p-4 text-sm">
              <p class="font-semibold text-sky-600 dark:text-sky-600/80 mb-2">💡 Tips de Pricing:</p>
              <ul class="list-disc list-inside space-y-1 text-charcoal-medium dark:text-pearl-light text-xs">
                <li>Precio competitivo: Revisar autos similares en tu ciudad</li>
                <li>Descuentos por semana (5-10%) y mes (15-20%) atraen más clientes</li>
                <li>Temporada alta (verano/feriados): Aumentar 20-30%</li>
                <li>Auto con poco kilometraje o modelo nuevo: Premium de 10-15%</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class HostSupportInfoPanelComponent {
  readonly isExpanded = signal(true);
  readonly activeTab = signal<'tips' | 'calculator' | 'pricing'>('tips');
  readonly openAccordion = signal<string | null>(null);

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
