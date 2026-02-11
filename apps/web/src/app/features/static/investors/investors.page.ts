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
  InvestorStats,
} from '@core/services/business/fragment-investment.service';
import { ToastService } from '@core/services/ui/toast.service';

const ASSET_CODE = 'BYD-001';
const MAX_FRAGMENTS_PER_WALLET = 200;

@Component({
  selector: 'app-investors',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="static-page">
      <section
        class="static-hero"
        style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);"
      >
        <h1>Información para Inversionistas</h1>
        <p>Participa en el crecimiento de AutoRenta</p>
      </section>

      <div class="static-content">
        <h2>Oportunidad de Mercado</h2>
        <p>
          El mercado de alquiler de autos entre particulares en Latinoamérica está valorado en miles
          de millones de dólares y crece año tras año. Autorentar está posicionada para capturar una
          porción significativa de este mercado en Argentina.
        </p>

        <h2>Métricas en Tiempo Real</h2>

        @if (loadingInvestorStats()) {
          <div class="card-grid skeleton">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="info-card">
                <h3>...</h3>
                <p>Cargando métricas...</p>
              </div>
            }
          </div>
        } @else if (investorStats(); as stats) {
          <div class="card-grid">
            <div class="info-card">
              <h3>{{ stats.activeCars }}+</h3>
              <p>Vehículos Activos</p>
            </div>
            <div class="info-card">
              <h3>{{ stats.totalGmvUsd | currency: 'USD' : 'symbol' : '1.0-0' }}</h3>
              <p>GMV Total (estimado USD)</p>
            </div>
            <div class="info-card">
              <h3>{{ stats.completedTrips }}</h3>
              <p>Viajes Completados</p>
            </div>
            <div class="info-card">
              <h3>{{ stats.totalUsers }}</h3>
              <p>Usuarios Registrados</p>
            </div>
          </div>
        } @else {
          <div class="info-card">
            <p>No pudimos cargar las métricas de plataforma.</p>
          </div>
        }

        @if (investorStatsError()) {
          <div class="info-card" style="border-color: #f59e0b;">
            <p>{{ investorStatsError() }}</p>
          </div>
        }

        <h2>Propiedad Fraccionada BYD-001</h2>

        @if (loadingFragmentStats()) {
          <div class="info-card">
            <h3>BYD Dolphin Mini</h3>
            <p>Cargando disponibilidad de fragmentos...</p>
          </div>
        } @else if (fragmentStats(); as fragment) {
          <div class="card-grid">
            <div class="info-card">
              <h3>Estado del Pool</h3>
              <p><strong>Activo:</strong> {{ fragment.assetCode }}</p>
              <p><strong>Estado:</strong> {{ statusLabel() }}</p>
              <p>
                <strong>Precio por fragmento:</strong>
                {{ fragment.fragmentPriceCents / 100 | currency: 'USD' : 'symbol' : '1.2-2' }}
              </p>
              <p><strong>Disponibles:</strong> {{ fragment.fragmentsAvailable }}</p>
              <p><strong>Vendidos:</strong> {{ fragment.fragmentsSold }}</p>
              <p><strong>Total:</strong> {{ fragment.totalFragments }}</p>

              <div class="mt-4">
                <p style="margin-bottom: 0.5rem;">
                  Progreso de colocación: <strong>{{ progressPct() }}%</strong>
                </p>
                <div
                  style="height: 10px; background: rgba(15, 23, 42, 0.08); border-radius: 999px; overflow: hidden;"
                >
                  <div
                    style="height: 100%; background: linear-gradient(90deg, #06b6d4, #0ea5e9); transition: width 250ms ease;"
                    [style.width.%]="progressPct()"
                  ></div>
                </div>
              </div>
            </div>

            <div class="info-card">
              <h3>Comprar Fragmentos</h3>
              <p>
                Máximo por wallet: <strong>200</strong> fragmentos (10% del total). Cada compra se
                procesa por Mercado Pago.
              </p>

              <label for="fragment-quantity" style="display: block; font-weight: 600; margin-top: 1rem;">
                Cantidad de fragmentos
              </label>
              <input
                id="fragment-quantity"
                type="number"
                min="1"
                [max]="maxQuantity()"
                [value]="quantity()"
                (input)="onQuantityInput($event)"
                style="width: 100%; margin-top: 0.5rem; border: 1px solid #d1d5db; border-radius: 0.75rem; padding: 0.75rem;"
              />

              <p style="margin-top: 1rem;">
                Total estimado:
                <strong>{{
                  purchasePreview().totalPriceUsd | currency: 'USD' : 'symbol' : '1.2-2'
                }}</strong>
              </p>

              @if (purchaseError()) {
                <p style="color: #b91c1c; margin-top: 0.75rem;">{{ purchaseError() }}</p>
              }

              <button
                type="button"
                class="cta-button w-full text-center"
                [disabled]="purchasePending() || !canPurchase()"
                [style.opacity]="purchasePending() || !canPurchase() ? 0.65 : 1"
                [style.cursor]="purchasePending() || !canPurchase() ? 'not-allowed' : 'pointer'"
                (click)="startPurchase()"
              >
                @if (purchasePending()) {
                  Redirigiendo al checkout...
                } @else if (isAuthenticated()) {
                  Comprar fragmentos
                } @else {
                  Ingresar para comprar
                }
              </button>

              @if (!canPurchase()) {
                <p style="margin-top: 0.75rem; color: #64748b;">
                  La ronda no está disponible para nuevas compras en este momento.
                </p>
              }
            </div>
          </div>
        }

        @if (fragmentStatsError()) {
          <div class="info-card" style="border-color: #f59e0b;">
            <h3>No pudimos cargar BYD-001</h3>
            <p>{{ fragmentStatsError() }}</p>
            <button type="button" class="cta-button" (click)="retryLoadFragments()">Reintentar</button>
          </div>
        }

        <h2>¿Por qué Autorentar?</h2>
        <ul>
          <li>Primer mover en Argentina con tecnología de punta</li>
          <li>Modelo de negocio probado (take rate por transacción)</li>
          <li>Equipo fundador con experiencia en tech y fintech</li>
          <li>Protección innovadora con AirCover (FGO)</li>
        </ul>

        <div class="cta-section">
          <h3>¿Interesado en invertir?</h3>
          <p>Contacta a nuestro equipo de relaciones con inversionistas</p>
          <p style="margin-top: 1rem;"><strong>investors&#64;autorentar.com.ar</strong></p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./static-shared.css'],
})
export class InvestorsPage implements OnInit {
  private readonly investorsService = inject(FragmentInvestmentService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private lastHandledPaymentKey: string | null = null;

  readonly investorStats = signal<InvestorStats | null>(null);
  readonly fragmentStats = signal<FragmentAssetStats | null>(null);

  readonly loadingInvestorStats = signal(true);
  readonly loadingFragmentStats = signal(true);

  readonly investorStatsError = signal<string | null>(null);
  readonly fragmentStatsError = signal<string | null>(null);
  readonly purchaseError = signal<string | null>(null);
  readonly purchasePending = signal(false);

  readonly quantity = signal(1);

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
      case 'fundraising':
        return 'Ronda abierta';
      case 'funded':
        return 'Pool completo';
      case 'retired':
        return 'Vehículo retirado';
      default:
        return 'Estado no disponible';
    }
  });

  ngOnInit(): void {
    void this.loadInvestorStats();
    void this.loadFragmentStats();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const payment = params.get('payment');
      if (!payment) return;

      const purchaseId = params.get('purchase_id') ?? '';
      const key = `${payment}:${purchaseId}`;
      if (this.lastHandledPaymentKey === key) {
        return;
      }

      this.lastHandledPaymentKey = key;
      this.handlePaymentCallback(payment);
      void this.loadFragmentStats();
    });
  }

  async retryLoadFragments(): Promise<void> {
    await this.loadFragmentStats();
  }

  onQuantityInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    const parsed = Number.parseInt(target?.value ?? '', 10);

    if (!Number.isFinite(parsed)) {
      this.quantity.set(1);
      return;
    }

    this.quantity.set(this.clampQuantity(parsed));
    this.purchaseError.set(null);
  }

  async startPurchase(): Promise<void> {
    if (this.purchasePending()) return;

    const session = await this.authService.ensureSession();
    if (!session) {
      await this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/investors' } });
      return;
    }

    if (!this.canPurchase()) {
      this.purchaseError.set('No hay fragmentos disponibles para compra en este momento.');
      return;
    }

    try {
      this.purchasePending.set(true);
      this.purchaseError.set(null);

      const quantity = this.clampQuantity(this.quantity());
      const preference = await this.investorsService.createFragmentPreference({
        assetCode: ASSET_CODE,
        quantity,
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

  private async loadInvestorStats(): Promise<void> {
    this.loadingInvestorStats.set(true);
    this.investorStatsError.set(null);

    try {
      const stats = await this.investorsService.getInvestorStats();
      this.investorStats.set(stats);
    } catch {
      this.investorStatsError.set('No pudimos cargar métricas de la plataforma');
    } finally {
      this.loadingInvestorStats.set(false);
    }
  }

  private async loadFragmentStats(): Promise<void> {
    this.loadingFragmentStats.set(true);
    this.fragmentStatsError.set(null);

    try {
      const stats = await this.investorsService.getFragmentAssetStats(ASSET_CODE);
      this.fragmentStats.set(stats);
      this.quantity.set(this.clampQuantity(this.quantity()));
    } catch (error) {
      this.fragmentStatsError.set(this.getFragmentErrorMessage(error));
    } finally {
      this.loadingFragmentStats.set(false);
    }
  }

  private clampQuantity(value: number): number {
    return Math.min(this.maxQuantity(), Math.max(1, Math.trunc(value)));
  }

  private handlePaymentCallback(payment: string): void {
    if (payment === 'success') {
      this.toastService.success('Pago confirmado', 'Tu compra quedó registrada correctamente.');
      return;
    }

    if (payment === 'pending') {
      this.toastService.info(
        'Pago en proceso',
        'Tu pago está pendiente de confirmación. Te notificaremos cuando se acredite.',
      );
      return;
    }

    if (payment === 'failure') {
      this.toastService.warning(
        'Pago no completado',
        'No se pudo confirmar el pago. Puedes intentarlo nuevamente.',
      );
    }
  }

  private getFragmentErrorMessage(error: unknown): string {
    if (error instanceof FragmentInvestmentError && error.code === 'ASSET_NOT_FOUND') {
      return 'No encontramos el activo BYD-001 en producción.';
    }

    return 'No pudimos cargar la disponibilidad de fragmentos.';
  }

  private getPurchaseErrorMessage(error: unknown): string {
    if (!(error instanceof FragmentInvestmentError)) {
      return 'No pudimos iniciar la compra en este momento.';
    }

    switch (error.code) {
      case 'AUTH_REQUIRED':
        return 'Debes iniciar sesión para comprar fragmentos.';
      case 'ANTI_WHALE':
        return 'Excedes el máximo de 200 fragmentos por wallet.';
      case 'SOLD_OUT':
        return 'No hay suficientes fragmentos disponibles.';
      case 'NOT_FUNDRAISING':
        return 'La ronda de inversión ya no está disponible.';
      case 'NOT_FOUND':
      case 'ASSET_NOT_FOUND':
        return 'No encontramos este activo de inversión.';
      default:
        return error.message || 'No pudimos iniciar la compra en este momento.';
    }
  }
}
