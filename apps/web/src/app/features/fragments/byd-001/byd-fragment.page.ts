import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import {
  FragmentAssetStats,
  FragmentInvestmentError,
  FragmentInvestmentService,
  FragmentPurchasePreview,
} from '@core/services/business/fragment-investment.service';
import { ToastService } from '@core/services/ui/toast.service';

const ASSET_CODE = 'BYD-001';
const MAX_FRAGMENTS_PER_WALLET = 200;

/** Projection row for the investment simulator table */
interface ProjectionRow {
  month: number;
  cumulativeDistributions: number;
  navEstimate: number;
  totalValue: number;
  targetReached: boolean;
}

/** Configurable assumptions for the projection model */
interface SimulatorAssumptions {
  avgMonthlyBookings: number;
  avgBookingPriceArs: number;
  rewardPoolRate: number;
  totalFragments: number;
  annualNavAppreciation: number;
  usdArsRate: number;
}

function calculateProjections(
  fragmentCount: number,
  fragmentPriceCents: number,
  targetUsd: number,
  assumptions: SimulatorAssumptions,
): { rows: ProjectionRow[]; monthsToTarget: number | null } {
  if (fragmentCount <= 0 || fragmentPriceCents <= 0) return { rows: [], monthsToTarget: null };

  const fragmentPriceUsd = fragmentPriceCents / 100;
  const monthlyNavRate = Math.pow(1 + assumptions.annualNavAppreciation, 1 / 12) - 1;
  const monthlyRevenuePerFragmentArs =
    (assumptions.avgMonthlyBookings * assumptions.avgBookingPriceArs * assumptions.rewardPoolRate) /
    assumptions.totalFragments;
  const monthlyRevenuePerFragmentUsd = monthlyRevenuePerFragmentArs / assumptions.usdArsRate;

  const rows: ProjectionRow[] = [];
  let monthsToTarget: number | null = null;
  let cumulativeDistributions = 0;
  const maxMonths = 36;

  for (let m = 1; m <= maxMonths; m++) {
    cumulativeDistributions += monthlyRevenuePerFragmentUsd * fragmentCount;
    const navEstimate = fragmentPriceUsd * fragmentCount * Math.pow(1 + monthlyNavRate, m);
    const totalValue = cumulativeDistributions + navEstimate;
    const targetTotal = targetUsd * fragmentCount;
    const reached = totalValue >= targetTotal;

    if (reached && monthsToTarget === null) monthsToTarget = m;

    // Show every 3 months + month 1 + target month
    if (m === 1 || m % 3 === 0 || (reached && rows[rows.length - 1]?.month !== m)) {
      rows.push({
        month: m,
        cumulativeDistributions,
        navEstimate,
        totalValue,
        targetReached: reached,
      });
    }

    if (reached && m % 3 !== 0 && m !== 1) {
      // Ensure target row is in table
      const last = rows[rows.length - 1];
      if (last.month !== m) {
        rows.push({ month: m, cumulativeDistributions, navEstimate, totalValue, targetReached: true });
      }
      break;
    }
  }

  return { rows, monthsToTarget };
}

@Component({
  selector: 'app-byd-fragment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="static-page">
      <!-- ═══════════════════════════════════════════ -->
      <!-- HERO                                        -->
      <!-- ═══════════════════════════════════════════ -->
      <section class="byd-hero">
        <h1>Sé dueño de una parte del<br /><span>futuro eléctrico</span></h1>
        <p class="hero-subtitle">
          Invertí desde USD $12.50 en un BYD Dolphin Mini y recibí ganancias por cada viaje completado.
          Propiedad fraccionada, transparente y 100% digital.
        </p>
        <img
          src="assets/images/fragments/byd-dolphin-mini-hero.png"
          alt="BYD Dolphin Mini — Inversión fraccionada AutoRenta"
          style="max-width: 480px; width: 100%; margin: 0 auto; border-radius: 1rem; display: block;"
          loading="eager"
        />
      </section>

      <!-- ═══════════════════════════════════════════ -->
      <!-- STATS BAR (live from DB)                    -->
      <!-- ═══════════════════════════════════════════ -->
      <div class="static-content">
        @if (fragmentStats(); as stats) {
          <div class="stats-bar">
            <div class="stat-item">
              <div class="stat-value accent">
                {{ stats.fragmentsSold }}/{{ stats.totalFragments }}
              </div>
              <div class="stat-label">Fragmentos vendidos</div>
              <div class="progress-container">
                <div class="progress-fill" [style.width.%]="progressPct()"></div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-value">
                {{ stats.fragmentPriceCents / 100 | currency: 'USD' : 'symbol' : '1.2-2' }}
              </div>
              <div class="stat-label">Precio por fragmento</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ stats.fragmentsAvailable }}</div>
              <div class="stat-label">Disponibles</div>
            </div>
            <div class="stat-item">
              <span class="status-badge" [class]="stats.status">{{ statusLabel() }}</span>
              <div class="stat-label" style="margin-top: 0.5rem;">Estado</div>
            </div>
          </div>
        } @else if (loading()) {
          <div class="stats-bar" style="justify-content: center;">
            <p style="color: #64748b;">Cargando datos en vivo...</p>
          </div>
        }

        <!-- ═══════════════════════════════════════════ -->
        <!-- INVESTMENT SIMULATOR                        -->
        <!-- ═══════════════════════════════════════════ -->
        <h2>Simulador de Inversión</h2>
        <div class="simulator-card">
          <h3>¿Cuánto pueden rendir tus fragmentos?</h3>

          <div class="simulator-inputs">
            <div class="simulator-field">
              <label for="sim-qty">Cantidad de fragmentos</label>
              <input
                id="sim-qty"
                type="number"
                min="1"
                [max]="maxQuantity()"
                [value]="simQuantity()"
                (input)="onSimQuantityChange($event)"
              />
            </div>
            <div class="simulator-field">
              <label for="sim-target">Valor objetivo por fragmento (USD)</label>
              <input
                id="sim-target"
                type="number"
                min="13"
                max="100"
                step="1"
                [value]="simTarget()"
                (input)="onSimTargetChange($event)"
              />
            </div>
          </div>

          @if (projectionResult().rows.length > 0) {
            <div class="simulator-result">
              @if (projectionResult().monthsToTarget; as months) {
                Tu inversión de
                <strong>
                  {{ simQuantity() * (fragmentStats()?.fragmentPriceCents ?? 1250) / 100
                    | currency: 'USD' : 'symbol' : '1.2-2' }}
                </strong>
                alcanzaría el objetivo en aproximadamente
                <strong>{{ months }} meses</strong>
              } @else {
                Con los supuestos actuales, el objetivo no se alcanza en 36 meses.
              }
            </div>

            <table class="projection-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Distribuciones acum.</th>
                  <th>NAV estimado</th>
                  <th>Valor total</th>
                </tr>
              </thead>
              <tbody>
                @for (row of projectionResult().rows; track row.month) {
                  <tr [class.target-reached]="row.targetReached">
                    <td>{{ row.month }}</td>
                    <td>{{ row.cumulativeDistributions | currency: 'USD' : 'symbol' : '1.2-2' }}</td>
                    <td>{{ row.navEstimate | currency: 'USD' : 'symbol' : '1.2-2' }}</td>
                    <td>{{ row.totalValue | currency: 'USD' : 'symbol' : '1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="simulator-result">
              <p style="color: #64748b;">Ingresá cantidad de fragmentos para ver la proyección.</p>
            </div>
          }

          <div class="assumptions-note">
            <strong>Supuestos del modelo:</strong>
            {{ assumptions().avgMonthlyBookings }} viajes/mes promedio ·
            {{ assumptions().avgBookingPriceArs | number: '1.0-0' }} ARS por viaje ·
            {{ assumptions().rewardPoolRate * 100 }}% reward pool ·
            {{ assumptions().annualNavAppreciation * 100 }}% apreciación NAV anual ·
            TC {{ assumptions().usdArsRate | number: '1.0-0' }} ARS/USD
            <br />
            <em>Proyección estimativa. Rendimientos pasados no garantizan rendimientos futuros.</em>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════ -->
        <!-- HOW IT WORKS                                -->
        <!-- ═══════════════════════════════════════════ -->
        <h2>¿Cómo funciona?</h2>
        <div class="steps-grid">
          <div class="step-card">
            <div class="step-number">1</div>
            <h4>Comprá fragmentos</h4>
            <p>Elegí cuántos fragmentos querés (desde 1 a 200) y pagá con MercadoPago en pesos argentinos.</p>
          </div>
          <div class="step-card">
            <div class="step-number">2</div>
            <h4>El auto opera</h4>
            <p>El BYD Dolphin Mini se alquila en la plataforma AutoRenta. Cada viaje genera ingresos reales.</p>
          </div>
          <div class="step-card">
            <div class="step-number">3</div>
            <h4>Recibí distribuciones</h4>
            <p>El 70% de los ingresos se reparte entre los holders proporcionalmente a sus fragmentos.</p>
          </div>
          <div class="step-card">
            <div class="step-number">4</div>
            <h4>NAV crece</h4>
            <p>El valor del vehículo se revalúa mensualmente. Tu fragmento puede valer más con el tiempo.</p>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════ -->
        <!-- VEHICLE CARD                                -->
        <!-- ═══════════════════════════════════════════ -->
        <h2>El Vehículo</h2>
        <div class="vehicle-showcase">
          <img
            src="assets/images/fragments/byd-dolphin-mini-lateral.png"
            alt="BYD Dolphin Mini — vista lateral en Buenos Aires"
            class="vehicle-img"
            loading="lazy"
            style="width: 100%; border-radius: 1rem; object-fit: cover;"
          />
          <div>
            <h3 style="color: #0f172a; margin-bottom: 1rem;">BYD Dolphin Mini 2025</h3>
            <dl class="vehicle-specs">
              <dt>Tipo</dt>
              <dd>Eléctrico 100%</dd>
              <dt>Autonomía</dt>
              <dd>~130 km (ciclo urbano)</dd>
              <dt>Valor de compra</dt>
              <dd>USD $25,000</dd>
              <dt>Fragmentos totales</dt>
              <dd>2,000</dd>
              <dt>Precio por fragmento</dt>
              <dd>USD $12.50</dd>
              <dt>Máximo por wallet</dt>
              <dd>200 (10%)</dd>
            </dl>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════ -->
        <!-- ROADMAP: 100 autos en 24 meses              -->
        <!-- ═══════════════════════════════════════════ -->
        <h2>Meta: 100 Autos en 24 Meses</h2>
        <img
          src="assets/images/fragments/fleet-roadmap.png"
          alt="Flota de 100 vehículos eléctricos — visión AutoRenta 2028"
          style="width: 100%; border-radius: 1rem; margin-bottom: 1.5rem;"
          loading="lazy"
        />
        <p>
          BYD-001 es solo el comienzo. Nuestra visión es construir una flota de 100 vehículos
          eléctricos fraccionados, democratizando la inversión en movilidad sustentable.
        </p>

        <div class="roadmap-timeline">
          <div class="roadmap-item">
            <h4>Q1 2026 — BYD-001 (ahora)</h4>
            <p>Primer vehículo fraccionado. 2,000 fragmentos a USD $12.50. Ronda de inversión abierta.</p>
          </div>
          <div class="roadmap-item future">
            <h4>Q3 2026 — 10 vehículos</h4>
            <p>Expansión a 10 autos eléctricos en Buenos Aires. Nuevos modelos y rangos de precio.</p>
          </div>
          <div class="roadmap-item future">
            <h4>Q1 2027 — 50 vehículos</h4>
            <p>Flota diversificada. Mercado secundario de fragmentos. Expansión a Córdoba y Mendoza.</p>
          </div>
          <div class="roadmap-item future">
            <h4>Q1 2028 — 100 vehículos</h4>
            <p>Meta de 100 autos fraccionados operando en Argentina. Modelo exportable a LATAM.</p>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════ -->
        <!-- PURCHASE CTA                                -->
        <!-- ═══════════════════════════════════════════ -->
        @if (fragmentStats(); as stats) {
          <div class="purchase-cta">
            <h3>Invertí en el futuro eléctrico</h3>
            <p style="opacity: 0.7; margin-bottom: 1rem;">
              Desde {{ stats.fragmentPriceCents / 100 | currency: 'USD' : 'symbol' : '1.2-2' }} por fragmento
            </p>

            <div class="quantity-selector">
              <label for="buy-qty">Cantidad:</label>
              <input
                id="buy-qty"
                type="number"
                min="1"
                [max]="maxQuantity()"
                [value]="quantity()"
                (input)="onQuantityInput($event)"
              />
            </div>

            <div class="cta-price">
              {{ purchasePreview().totalPriceUsd | currency: 'USD' : 'symbol' : '1.2-2' }}
            </div>

            @if (purchaseError()) {
              <p style="color: #f87171; margin-bottom: 1rem;">{{ purchaseError() }}</p>
            }

            <button
              type="button"
              class="btn-purchase"
              [disabled]="purchasePending() || !canPurchase()"
              (click)="startPurchase()"
            >
              @if (purchasePending()) {
                Redirigiendo al checkout...
              } @else if (isAuthenticated()) {
                Comprar {{ quantity() }} fragmento{{ quantity() > 1 ? 's' : '' }}
              } @else {
                Ingresar para comprar
              }
            </button>

            @if (!canPurchase() && !loading()) {
              <p style="opacity: 0.6; margin-top: 1rem; font-size: 0.875rem;">
                La ronda no está disponible para nuevas compras en este momento.
              </p>
            }
          </div>
        }

        <!-- ═══════════════════════════════════════════ -->
        <!-- LEGAL DISCLAIMER                            -->
        <!-- ═══════════════════════════════════════════ -->
        <p class="legal-disclaimer">
          AutoRenta no es un agente de bolsa ni un asesor financiero. La compra de fragmentos representa
          una participación en los ingresos operativos de un vehículo específico, no un valor negociable.
          Los rendimientos proyectados son estimativos y dependen de la demanda de alquiler, condiciones
          de mercado y estado del vehículo. Invertí solo lo que estés dispuesto a mantener a largo plazo.
        </p>
      </div>
    </div>
  `,
  styleUrls: [
    '../../static/investors/static-shared.css',
    './byd-fragment.page.css',
  ],
})
export class BydFragmentPage implements OnInit {
  private readonly investorsService = inject(FragmentInvestmentService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private lastHandledPaymentKey: string | null = null;

  readonly fragmentStats = signal<FragmentAssetStats | null>(null);
  readonly loading = signal(true);
  readonly purchaseError = signal<string | null>(null);
  readonly purchasePending = signal(false);

  readonly quantity = signal(1);
  readonly simQuantity = signal(1);
  readonly simTarget = signal(20);

  readonly assumptions = signal<SimulatorAssumptions>({
    avgMonthlyBookings: 20,
    avgBookingPriceArs: 45000,
    rewardPoolRate: 0.70,
    totalFragments: 2000,
    annualNavAppreciation: 0.05,
    usdArsRate: 1200,
  });

  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());

  readonly canPurchase = computed(() => {
    const stats = this.fragmentStats();
    return !!stats && stats.status === 'fundraising' && stats.fragmentsAvailable > 0;
  });

  readonly maxQuantity = computed(() => {
    const available = this.fragmentStats()?.fragmentsAvailable ?? MAX_FRAGMENTS_PER_WALLET;
    return Math.max(1, Math.min(MAX_FRAGMENTS_PER_WALLET, available));
  });

  readonly progressPct = computed(() => {
    const stats = this.fragmentStats();
    if (!stats || stats.totalFragments <= 0) return 0;
    return Math.min(100, Math.round((stats.fragmentsSold / stats.totalFragments) * 100));
  });

  readonly purchasePreview = computed<FragmentPurchasePreview>(() => {
    const stats = this.fragmentStats();
    return this.investorsService.buildPurchasePreview(this.quantity(), stats?.fragmentPriceCents ?? 0);
  });

  readonly statusLabel = computed(() => {
    switch (this.fragmentStats()?.status) {
      case 'fundraising': return 'Ronda abierta';
      case 'funded': return 'Pool completo';
      case 'operational': return 'Operativo';
      case 'retiring': return 'En retiro';
      case 'closed': return 'Cerrado';
      default: return '—';
    }
  });

  readonly projectionResult = computed(() => {
    const stats = this.fragmentStats();
    if (!stats) return { rows: [], monthsToTarget: null };
    return calculateProjections(
      this.simQuantity(),
      stats.fragmentPriceCents,
      this.simTarget(),
      this.assumptions(),
    );
  });

  ngOnInit(): void {
    void this.loadStats();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const payment = params.get('payment');
      if (!payment) return;

      const purchaseId = params.get('purchase_id') ?? '';
      const key = `${payment}:${purchaseId}`;
      if (this.lastHandledPaymentKey === key) return;

      this.lastHandledPaymentKey = key;
      this.handlePaymentCallback(payment);
      void this.loadStats();
    });
  }

  onQuantityInput(event: Event): void {
    const parsed = Number.parseInt((event.target as HTMLInputElement)?.value ?? '', 10);
    this.quantity.set(Number.isFinite(parsed) ? this.clamp(parsed) : 1);
    this.purchaseError.set(null);
  }

  onSimQuantityChange(event: Event): void {
    const parsed = Number.parseInt((event.target as HTMLInputElement)?.value ?? '', 10);
    this.simQuantity.set(Number.isFinite(parsed) ? this.clamp(parsed) : 1);
  }

  onSimTargetChange(event: Event): void {
    const parsed = Number.parseFloat((event.target as HTMLInputElement)?.value ?? '');
    if (Number.isFinite(parsed) && parsed > 0) {
      this.simTarget.set(Math.min(100, parsed));
    }
  }

  async startPurchase(): Promise<void> {
    if (this.purchasePending()) return;

    const session = await this.authService.ensureSession();
    if (!session) {
      await this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/fragments/byd-001' } });
      return;
    }

    if (!this.canPurchase()) {
      this.purchaseError.set('No hay fragmentos disponibles para compra en este momento.');
      return;
    }

    try {
      this.purchasePending.set(true);
      this.purchaseError.set(null);

      const preference = await this.investorsService.createFragmentPreference({
        assetCode: ASSET_CODE,
        quantity: this.clamp(this.quantity()),
      });

      if (typeof window !== 'undefined') {
        window.location.assign(preference.initPoint);
      }
    } catch (error) {
      const message = this.getPurchaseErrorMessage(error);
      this.purchaseError.set(message);
      this.toastService.error('Compra no iniciada', message);
    } finally {
      this.purchasePending.set(false);
    }
  }

  private async loadStats(): Promise<void> {
    this.loading.set(true);
    try {
      const stats = await this.investorsService.getFragmentAssetStats(ASSET_CODE);
      this.fragmentStats.set(stats);
    } catch {
      // Stats will remain null; page still renders static content
    } finally {
      this.loading.set(false);
    }
  }

  private clamp(value: number): number {
    return Math.min(this.maxQuantity(), Math.max(1, Math.trunc(value)));
  }

  private handlePaymentCallback(payment: string): void {
    if (payment === 'success') {
      this.toastService.success('Pago confirmado', 'Tu compra quedó registrada correctamente.');
    } else if (payment === 'pending') {
      this.toastService.info('Pago en proceso', 'Tu pago está pendiente de confirmación.');
    } else if (payment === 'failure') {
      this.toastService.warning('Pago no completado', 'No se pudo confirmar el pago. Intentá nuevamente.');
    }
  }

  private getPurchaseErrorMessage(error: unknown): string {
    if (!(error instanceof FragmentInvestmentError)) {
      return 'No pudimos iniciar la compra en este momento.';
    }
    switch (error.code) {
      case 'AUTH_REQUIRED': return 'Debés iniciar sesión para comprar fragmentos.';
      case 'ANTI_WHALE': return 'Excedés el máximo de 200 fragmentos por wallet.';
      case 'SOLD_OUT': return 'No hay suficientes fragmentos disponibles.';
      case 'NOT_FUNDRAISING': return 'La ronda de inversión ya no está disponible.';
      case 'NOT_FOUND':
      case 'ASSET_NOT_FOUND': return 'No encontramos este activo de inversión.';
      default: return error.message || 'No pudimos iniciar la compra en este momento.';
    }
  }
}
