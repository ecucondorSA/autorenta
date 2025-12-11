import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AnalyticsService } from '../../core/services/analytics.service';
import { NotificationManagerService } from '../../core/services/notification-manager.service';
import { WalletService } from '../../core/services/wallet.service';
import { injectSupabase } from '../../core/services/supabase-client.service';
import {
  MercadopagoPaymentBrickComponent,
  PaymentResult,
} from '../../shared/components/mercadopago-payment-brick/mercadopago-payment-brick.component';

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
  imports: [CommonModule, FormsModule, TranslateModule, MercadopagoPaymentBrickComponent],
  templateUrl: './deposit.page.html',
  styleUrls: ['./deposit.page.css'],
})
export class DepositPage implements OnInit {
  private readonly walletService = inject(WalletService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toastService = inject(NotificationManagerService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly supabase = injectSupabase();

  // Form state
  readonly arsAmount = signal<number>(0);
  readonly description = signal<string>('');
  readonly isProcessing = signal<boolean>(false);
  readonly formError = signal<string | null>(null);

  // Exchange rate
  readonly platformRate = signal<number | null>(null);
  readonly loadingRate = signal<boolean>(false);

  // Payment Brick state
  readonly showPaymentBrick = signal<boolean>(false);
  readonly paymentCompleted = signal<boolean>(false);
  readonly paymentPending = signal<boolean>(false);
  readonly preferenceId = signal<string | null>(null);
  readonly transactionId = signal<string | null>(null);

  // Computed USD amount (in cents)
  readonly usdAmount = computed(() => {
    const rate = this.platformRate();
    const ars = this.arsAmount();
    if (!rate || !ars) return 0;
    return Math.round((ars / rate) * 100); // Convert to cents
  });

  // Computed ARS amount in cents for Payment Brick
  readonly arsAmountCents = computed(() => {
    return Math.round(this.arsAmount() * 100);
  });

  // Min/max amounts (in ARS)
  readonly MIN_AMOUNT_ARS = 1000; // 1000 ARS
  readonly MAX_AMOUNT_ARS = 1000000; // 1,000,000 ARS

  ngOnInit(): void {
    // Track page view
    this.analyticsService.trackEvent('deposit_page_viewed', {
      source: this.route.snapshot.queryParams['source'] || 'direct',
    });

    // Load exchange rate
    void this.loadExchangeRate();
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
   * Update ARS amount
   */
  updateArsAmount(value: number): void {
    this.arsAmount.set(value);
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
      this.formError.set(`El monto mínimo es $${this.MIN_AMOUNT_ARS} ARS`);
      return false;
    }

    if (ars > this.MAX_AMOUNT_ARS) {
      this.formError.set(`El monto máximo es $${this.MAX_AMOUNT_ARS.toLocaleString()} ARS`);
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
      const amountCentsUsd = this.usdAmount(); // Ya está en cents

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
      console.log('✅ Deposit transaction created:', transactionId);

      // 3. Try to create MercadoPago preference with purpose: wallet_purchase
      // This enables account_money and consumer_credits in Payment Brick
      let preferenceId: string | null = null;

      try {
        const { data: prefData, error: prefError } = await this.supabase.functions.invoke(
          'mercadopago-create-preference',
          {
            body: {
              transaction_id: transactionId,
              amount: this.arsAmount(), // Amount in ARS for MercadoPago
              description: this.description() || 'Depósito a wallet AutoRentar',
            },
          },
        );

        if (!prefError && prefData?.preference_id) {
          preferenceId = prefData.preference_id;
          this.preferenceId.set(preferenceId);
          console.log('✅ MercadoPago preference created:', preferenceId);
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

      // Show the Payment Brick (with or without preferenceId)
      this.showPaymentBrick.set(true);
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

  /**
   * Handle successful payment from Payment Brick
   */
  onPaymentSuccess(result: PaymentResult): void {
    this.analyticsService.trackEvent('deposit_payment_approved', {
      amount_ars: this.arsAmount(),
      amount_usd: this.usdAmount(),
      payment_id: result.paymentId,
    });

    this.paymentCompleted.set(true);
    this.showPaymentBrick.set(false);

    this.toastService.success('¡Depósito exitoso!', 'Los fondos se acreditaron a tu wallet.');

    // Navigate to wallet after delay
    setTimeout(() => {
      void this.router.navigate(['/wallet']);
    }, 2000);
  }

  /**
   * Handle payment error from Payment Brick
   */
  onPaymentError(result: PaymentResult): void {
    this.analyticsService.trackEvent('deposit_payment_error', {
      amount_ars: this.arsAmount(),
      status: result.status,
      status_detail: result.statusDetail,
      message: result.message,
    });

    this.formError.set(result.message || 'El pago fue rechazado. Intenta con otro medio de pago.');
    this.toastService.error('Pago rechazado', this.formError()!);
  }

  /**
   * Handle pending payment from Payment Brick (offline methods)
   */
  onPaymentPending(result: PaymentResult): void {
    this.analyticsService.trackEvent('deposit_payment_pending', {
      amount_ars: this.arsAmount(),
      payment_id: result.paymentId,
      status: result.status,
    });

    this.paymentPending.set(true);
    this.showPaymentBrick.set(false);

    this.toastService.info('Pago pendiente', 'Los fondos se acreditarán cuando completes el pago.');
  }

  /**
   * Go back to amount selection
   */
  onBackToAmount(): void {
    this.showPaymentBrick.set(false);
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
      user_id: this.supabase.auth.getUser().then((u) => u.data.user?.id).catch(() => null),
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
          message: resolvedPayload.message || 'Deposit init failed',
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
