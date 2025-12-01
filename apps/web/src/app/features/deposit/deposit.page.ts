import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AnalyticsService } from '../../core/services/analytics.service';
import { NotificationManagerService } from '../../core/services/notification-manager.service';
import { WalletService } from '../../core/services/wallet.service';
import { injectSupabase } from '../../core/services/supabase-client.service';

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
  imports: [CommonModule, FormsModule, TranslateModule],
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

  // Computed USD amount
  readonly usdAmount = computed(() => {
    const rate = this.platformRate();
    const ars = this.arsAmount();
    if (!rate || !ars) return 0;
    return Math.round((ars / rate) * 100); // Convert to cents
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
        this.toastService.warning('Sin cotización', 'No encontramos la cotización actual. Intenta más tarde.');
      }
    } catch (error) {
      console.error('Error loading exchange rate:', error);
      this.platformRate.set(null);
      this.toastService.error('Error de cotización', 'No pudimos obtener la cotización en tiempo real.');
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
   * Submit deposit - Create MercadoPago preference and redirect
   */
  async onSubmit(): Promise<void> {
    if (!this.validateForm()) {
      return;
    }

    this.isProcessing.set(true);
    this.formError.set(null);

    try {
      // Create MercadoPago preference
      const result = await this.walletService.createDepositPreference({
        amount: this.usdAmount(),
        description: this.description() || 'Depósito a wallet AutoRentar',
      });

      if (result.success && result.init_point) {
        this.analyticsService.trackEvent('deposit_mercadopago_preference_created', {
          amount_ars: this.arsAmount(),
          amount_usd: this.usdAmount(),
          preference_id: result.preference_id,
        });

        // Redirect to MercadoPago checkout
        window.location.href = result.init_point;
      } else {
        throw new Error(result.message || 'Error al crear preferencia de pago');
      }
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      this.formError.set(errorObj.message || 'Error al procesar el depósito');
      this.toastService.error('Error', this.formError()!);

      this.analyticsService.trackEvent('deposit_error', {
        error: errorObj.message,
        amount_ars: this.arsAmount(),
      });
    } finally {
      this.isProcessing.set(false);
    }
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
}
