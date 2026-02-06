import { LoggerService } from '@core/services/infrastructure/logger.service';
import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';

/**
 * DepositPage
 *
 * Página dedicada para realizar depósitos a través de MercadoPago.
 * Flujo simple y directo de pago.
 *
 * Features:
 * - Conversión ARS -> USD en tiempo real
 * - Integración con MercadoPago SDK
 * - Validación de montos
 * - Redirección automática a checkout de MercadoPago
 *
 * Ruta: /wallet/deposit
 */
@Component({
  selector: 'app-deposit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './deposit.page.html',
  styleUrls: ['./deposit.page.css'],
})
export class DepositPage implements OnInit {
  private readonly logger = inject(LoggerService);
  private readonly walletService = inject(WalletService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(NotificationManagerService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly supabase = injectSupabase();

  // Form state (usuario ingresa en USD, convertimos a ARS para MP)
  usdAmountValue = 0;
  readonly usdAmountInput = signal<number>(0);
  readonly description = signal<string>('');
  readonly isProcessing = signal<boolean>(false);
  readonly formError = signal<string | null>(null);

  // Exchange rate
  readonly platformRate = signal<number | null>(null);
  readonly loadingRate = signal<boolean>(false);

  // Pago vía Checkout Pro (init_point)
  // Checkout Pro redirect flow
  readonly showPaymentRedirect = signal<boolean>(false);
  readonly paymentCompleted = signal<boolean>(false);
  readonly paymentPending = signal<boolean>(false);
  readonly preferenceId = signal<string | null>(null);
  readonly initPoint = signal<string | null>(null);
  readonly transactionId = signal<string | null>(null);

  // Monto ARS calculado a partir de USD ingresados
  readonly arsAmount = computed(() => {
    const rate = this.platformRate();
    const usd = this.usdAmountInput();
    if (!rate || !usd) return 0;
    return Math.round(usd * rate);
  });

  // Computed USD amount (in cents) para la RPC
  readonly usdAmount = computed(() => Math.round(this.usdAmountInput() * 100));

  // ARS en centavos para preferencia MP
  readonly arsAmountCents = computed(() => Math.round(this.arsAmount() * 100));

  // Límites (en ARS, se derivan a USD para validar entrada)
  readonly MIN_AMOUNT_ARS = 1000; // 1.000 ARS
  // Se eleva el máximo para permitir hasta 3M ARS (nuevo límite de MP in-app).
  readonly MAX_AMOUNT_ARS = 3_000_000; // 3.000.000 ARS

  get minAmountUsd(): number {
    const rate = this.platformRate();
    return rate ? this.MIN_AMOUNT_ARS / rate : 0;
  }

  get maxAmountUsd(): number {
    const rate = this.platformRate();
    return rate ? this.MAX_AMOUNT_ARS / rate : 0;
  }

  ngOnInit(): void {
    // Track page view
    this.analyticsService.trackEvent('deposit_page_viewed', {
      source: this.route.snapshot.queryParams['source'] || 'direct',
    });

    // Load exchange rate
    void this.loadExchangeRate();

    // Check for 'amount' query parameter to pre-fill debt payment
    const amountParam = this.route.snapshot.queryParams['amount'];
    if (amountParam) {
      const prefillAmount = parseFloat(amountParam);
      if (!isNaN(prefillAmount) && prefillAmount > 0) {
        this.usdAmountInput.set(prefillAmount);
        this.usdAmountValue = prefillAmount; // Update non-signal property for input binding
        this.description.set('Pago de deuda del wallet');
        this.formError.set(null); // Clear any initial form errors
      }
    }
  }

  /**
   * Load current exchange rate from backend
   */
  async loadExchangeRate(): Promise<void> {
    this.loadingRate.set(true);
    try {
      const { data, error } = await this.supabase
        .from('exchange_rates')
        .select('rate, last_updated')
        .eq('pair', 'USDARS')
        .eq('is_active', true)
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.rate) {
        this.platformRate.set(Number(data.rate));
      } else {
        this.platformRate.set(null);
        this.toastService.warning(
          'Sin cotización',
          'No encontramos la cotización actual. Intenta más tarde.',
        );
      }
    } catch (error) {
      console.error('Error loading exchange rate:', error);
      this.platformRate.set(null);
      this.toastService.error(
        'Error de cotización',
        'No pudimos obtener la cotización en tiempo real.',
      );
    } finally {
      this.loadingRate.set(false);
    }
  }

  /**
   * Alias for showPaymentRedirect (used in template)
   */
  readonly showPaymentBrick = this.showPaymentRedirect;

  /**
   * Update USD amount from input
   */
  updateUsdAmount(value: number): void {
    this.usdAmountInput.set(value);
    this.formError.set(null);
  }

  /**
   * Update ARS amount - converts to USD and updates input
   */
  updateArsAmount(value: number): void {
    const rate = this.platformRate();
    if (rate && rate > 0) {
      this.usdAmountInput.set(value / rate);
    }
    this.formError.set(null);
  }

  /**
   * Update description
   */
  updateDescription(value: string): void {
    this.description.set(value);
  }

  /**
   * Validate form
   */
  private validateForm(): boolean {
    const ars = this.arsAmount();

    if (!ars || ars <= 0) {
      this.formError.set('Ingresa un monto válido');
      return false;
    }

    if (ars < this.MIN_AMOUNT_ARS) {
      this.formError.set(`El monto mínimo es USD ${this.minAmountUsd.toFixed(2)}`);
      return false;
    }

    if (ars > this.MAX_AMOUNT_ARS) {
      this.formError.set(`El monto máximo es USD ${this.maxAmountUsd.toFixed(2)}`);
      return false;
    }

    return true;
  }

  /**
   * Submit deposit - Create preference and show Payment Brick
   */
  async onSubmit(): Promise<void> {
    if (!this.validateForm()) {
      return;
    }

    this.formError.set(null);
    this.isProcessing.set(true);

    try {
      // 1. Get current user ID
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // 2. Create pending deposit transaction
      // La función en producción espera: (p_user_id uuid, p_amount bigint, p_provider text)
      // p_amount es en centavos USD (bigint)
      const amountCentsUsd = this.usdAmount(); // centavos USD

      const { data: txData, error: txError } = await this.supabase.rpc('wallet_initiate_deposit', {
        p_user_id: user.id,
        p_amount: amountCentsUsd,
        p_provider: 'mercadopago',
      });

      if (txError) {
        console.error('Error creating deposit transaction:', txError);
        throw new Error('No pudimos iniciar el depósito. Intenta de nuevo.');
      }

      // La función retorna el transaction_id directamente (UUID)
      const transactionId = txData as string;
      this.transactionId.set(transactionId);
      this.logger.debug('✅ Deposit transaction created:', transactionId);

      // 3. Crear preferencia de MercadoPago (Checkout Pro) con purpose wallet_purchase
      let preferenceId: string | null = null;
      let initPoint: string | null = null;

      try {
        const { data: prefData, error: prefError } = await this.supabase.functions.invoke(
          'mercadopago-create-preference',
          {
            body: {
              transaction_id: transactionId,
              amount: this.arsAmount(), // Monto en ARS para MercadoPago
              description: this.description() || 'Depósito a wallet AutoRentar',
            },
          },
        );

        if (!prefError && prefData?.preference_id) {
          preferenceId = prefData.preference_id;
          initPoint = prefData.init_point || prefData.sandbox_init_point || null;
          this.preferenceId.set(preferenceId);
          this.initPoint.set(initPoint);
          this.logger.debug('✅ MercadoPago preference created:', preferenceId);
        } else {
          console.warn('⚠️ Could not create preference, continuing without it:', prefError);
        }
      } catch (prefErr) {
        console.warn('⚠️ Preference creation failed, continuing without it:', prefErr);
      }

      this.analyticsService.trackEvent('deposit_payment_brick_shown', {
        amount_ars: this.arsAmount(),
        amount_usd: this.usdAmount(),
        preference_id: preferenceId,
        transaction_id: transactionId,
      });

      // Redirigir a Checkout Pro (init_point)
      if (preferenceId && initPoint) {
        this.showPaymentRedirect.set(true);
        // Guardar analytics antes de salir
        this.analyticsService.trackEvent('deposit_checkoutpro_redirect', {
          amount_ars: this.arsAmount(),
          preference_id: preferenceId,
        });
        window.location.href = initPoint;
      } else {
        throw new Error('No pudimos generar el link de pago. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Error in deposit submission:', error);
      const friendlyMessage =
        'No pudimos iniciar tu depósito. Podés intentarlo de nuevo y, si persiste, envíanos el detalle para revisarlo en minutos.';
      this.formError.set(friendlyMessage);

      const payload = this.buildFeedbackPayload(
        'init_deposit',
        error,
        this.transactionId(),
        this.preferenceId(),
      );

      await this.toastService.show({
        title: 'No pudimos iniciar tu depósito',
        message: `${friendlyMessage}`,
        type: 'error',
        priority: 'high',
        duration: 12000,
        actions: [
          {
            label: 'Copiar detalle',
            icon: 'copy-outline',
            command: () => void this.copyFeedback(payload),
          },
          {
            label: 'Enviar a soporte',
            icon: 'send-outline',
            styleClass: 'cta',
            command: () => void this.sendFeedback(payload),
          },
        ],
      });
    } finally {
      this.isProcessing.set(false);
    }
  }

  // Con Checkout Pro la confirmación llega vía webhook/DB; la UI solo redirige.

  /**
   * Go back to amount selection
   */
  onBackToAmount(): void {
    // legacy cleanup (no brick)
    this.formError.set(null);
  }

  /**
   * Cancel and return to wallet
   */
  onCancel(): void {
    this.analyticsService.trackEvent('deposit_cancelled', {
      amount_ars: this.arsAmount(),
    });

    void this.router.navigate(['/wallet']);
  }

  /**
   * Format currency helper
   */
  formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  /**
   * Build a detailed payload for admin feedback
   */
  private buildFeedbackPayload(
    stage: 'init_deposit' | 'mp_preference',
    error: unknown,
    transactionId?: string | null,
    preferenceId?: string | null,
  ): Record<string, unknown> {
    const errorMessage =
      error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';

    return {
      stage,
      message: errorMessage,
      user_id: this.supabase.auth
        .getUser()
        .then((u) => u.data.user?.id)
        .catch(() => null),
      amount_ars: this.arsAmount(),
      amount_usd_cents: this.usdAmount(),
      transaction_id: transactionId,
      preference_id: preferenceId,
      route: this.router.url,
      timestamp: new Date().toISOString(),
      platform_rate: this.platformRate(),
      device: navigator.userAgent,
    };
  }

  /**
   * Copy payload to clipboard for user
   */
  private async copyFeedback(payload: Record<string, unknown>): Promise<void> {
    const resolvedPayload = await this.resolveAsyncFields(payload);
    const text = JSON.stringify(resolvedPayload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      this.toastService.success('Detalle copiado', 'Pegalo en el chat o envíanoslo.');
    } catch {
      this.toastService.warning('No se pudo copiar', 'Intenta manualmente: ' + text.slice(0, 140));
    }
  }

  /**
   * Send payload to incident webhook for admins
   */
  private async sendFeedback(payload: Record<string, unknown>): Promise<void> {
    const resolvedPayload = await this.resolveAsyncFields(payload);
    try {
      await this.supabase.functions.invoke('incident-webhook', {
        body: {
          source: 'custom',
          severity: 'high',
          title: 'wallet_deposit_init_failed',
          message: resolvedPayload['message'] || 'Deposit init failed',
          metadata: resolvedPayload,
        },
      });
      this.toastService.success('Enviado a soporte', 'Gracias por ayudarnos a revisarlo.');
    } catch (err) {
      console.error('Error sending feedback', err);
      this.toastService.warning(
        'No se pudo enviar',
        'Copia el detalle y compártelo por chat. Intentaremos de nuevo.',
      );
    }
  }

  /**
   * Resolve any async values in payload (promises) before using
   */
  private async resolveAsyncFields(obj: Record<string, unknown>): Promise<Record<string, unknown>> {
    const entries = await Promise.all(
      Object.entries(obj).map(async ([k, v]) => {
        if (v instanceof Promise) {
          try {
            const val = await v;
            return [k, val];
          } catch {
            return [k, null];
          }
        }
        return [k, v];
      }),
    );
    return Object.fromEntries(entries);
  }
}
