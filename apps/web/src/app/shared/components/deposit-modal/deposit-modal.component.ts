import { Component, EventEmitter, Output, inject, signal, effect, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { WalletService } from '../../../core/services/wallet.service';
import { ExchangeRateService } from '../../../core/services/exchange-rate.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import type { WalletPaymentProvider } from '../../../core/models/wallet.model';
import { FocusTrapDirective } from '../../directives/focus-trap.directive';
import { EscapeKeyDirective } from '../../directives/escape-key.directive';

@Component({
  selector: 'app-deposit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FocusTrapDirective, TranslateModule],
  templateUrl: './deposit-modal.component.html',
  styleUrls: ['./deposit-modal.component.css'],
})
export class DepositModalComponent implements OnInit {
  private readonly walletService = inject(WalletService);
  private readonly exchangeRateService = inject(ExchangeRateService);
  private readonly analyticsService = inject(AnalyticsService);

  readonly bankTransferDetails = {
    accountName: 'Autorentar Operaciones SRL',
    bank: 'Banco Galicia',
    alias: 'AUTORENTAR.PAGOS',
    cbu: '0170018740000000123456',
    concept: 'Crédito Autorentar',
    email: 'pagos@autorentar.com',
  };

  arsAmount = signal<number>(1000);
  usdAmount = signal<number>(0);
  platformRate = signal<number>(0);
  loadingRate = signal(false);

  @Input() preSelectedDepositType?: 'protected_credit' | 'withdrawable';

  @Output() closeModal = new EventEmitter<void>();
  @Output() depositSuccess = new EventEmitter<string>();

  provider = signal<WalletPaymentProvider>('mercadopago');
  description = signal<string>('');
  depositType = signal<'protected_credit' | 'withdrawable'>('withdrawable');

  isProcessing = signal(false);
  formError = signal<string | null>(null);
  paymentUrl = signal<string | null>(null);
  fallbackSuggestion = signal<'none' | 'bank_transfer'>('none');
  lastSubmitTime = signal<number>(0); // For double-click prevention

  readonly MIN_DEPOSIT_ARS = 100;
  readonly MAX_DEPOSIT_ARS = 1000000;
  readonly MIN_DEPOSIT_USD = 10; // Minimum $10 USD deposit

  constructor() {
    effect(() => {
      const ars = this.arsAmount();
      if (ars > 0) {
        this.updateConversionPreview(ars);
      }
    });
    this.loadExchangeRate();
  }

  ngOnInit(): void {
    // Pre-select deposit type if provided
    if (this.preSelectedDepositType) {
      this.depositType.set(this.preSelectedDepositType);
    }

    // Track modal opened
    this.analyticsService.trackEvent('wallet_deposit_modal_opened', {
      deposit_type: this.depositType(),
    });
  }

  readonly availableProviders: Array<{
    value: WalletPaymentProvider;
    label: string;
    description: string;
  }> = [
    {
      value: 'mercadopago',
      label: 'Mercado Pago',
      description: 'Tarjeta de crédito/débito, Rapipago, Pago Fácil',
    },
    { value: 'stripe', label: 'Stripe', description: 'Tarjeta de crédito internacional' },
    {
      value: 'bank_transfer',
      label: 'Transferencia Bancaria',
      description: 'Transferencia o depósito directo',
    },
  ];

  async loadExchangeRate(): Promise<void> {
    this.loadingRate.set(true);
    try {
      const rate = await this.exchangeRateService.getPlatformRate();
      this.platformRate.set(rate);
    } catch (__error) {
      this.platformRate.set(1748.01);
    } finally {
      this.loadingRate.set(false);
    }
  }

  async updateConversionPreview(ars: number): Promise<void> {
    if (!this.platformRate()) {
      await this.loadExchangeRate();
    }
    const usd = Math.round((ars / this.platformRate()) * 100) / 100;
    this.usdAmount.set(usd);
  }

  updateArsAmount(value: string): void {
    const numValue = parseFloat(value);
    this.arsAmount.set(isNaN(numValue) ? 0 : numValue);
  }

  onClose(): void {
    this.closeModal.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  validateForm(): boolean {
    this.formError.set(null);
    const currentArsAmount = this.arsAmount();
    const currentUsdAmount = this.usdAmount();

    // Validate ARS amount
    if (isNaN(currentArsAmount) || currentArsAmount <= 0) {
      this.formError.set('Por favor ingresa un monto válido en pesos argentinos.');
      return false;
    }
    if (currentArsAmount < this.MIN_DEPOSIT_ARS) {
      this.formError.set(
        `El depósito mínimo es $${this.MIN_DEPOSIT_ARS} ARS (aproximadamente USD ${Math.round(this.MIN_DEPOSIT_ARS / this.platformRate())}). Por favor ingresa un monto mayor.`,
      );
      return false;
    }
    if (currentArsAmount > this.MAX_DEPOSIT_ARS) {
      this.formError.set(
        `El depósito máximo es $${this.MAX_DEPOSIT_ARS.toLocaleString('es-AR')} ARS. Si necesitas depositar más, contacta a soporte.`,
      );
      return false;
    }

    // Validate USD conversion
    if (isNaN(currentUsdAmount) || currentUsdAmount <= 0) {
      this.formError.set(
        'Error al calcular la conversión a USD. Verifica tu conexión y reintenta en unos segundos.',
      );
      return false;
    }

    // Validate minimum USD amount
    if (currentUsdAmount < this.MIN_DEPOSIT_USD) {
      const minArsForUsd = Math.ceil(this.MIN_DEPOSIT_USD * this.platformRate());
      this.formError.set(
        `El depósito mínimo es USD ${this.MIN_DEPOSIT_USD}. Necesitas depositar al menos $${minArsForUsd.toLocaleString('es-AR')} ARS.`,
      );
      return false;
    }

    return true;
  }

  onSubmit(): void {
    if (!this.validateForm()) return;

    // Double-click prevention: Prevent submissions within 2 seconds
    const now = Date.now();
    if (now - this.lastSubmitTime() < 2000) {
      this.formError.set('Por favor espera un momento antes de reintentar.');
      return;
    }
    this.lastSubmitTime.set(now);

    this.isProcessing.set(true);
    this.formError.set(null);
    this.fallbackSuggestion.set('none');

    // Track deposit initiation
    const provider = this.provider();
    this.analyticsService.trackEvent('wallet_deposit_initiated', {
      deposit_amount: this.usdAmount(),
      deposit_type: this.depositType(),
      deposit_provider: provider !== 'internal' ? provider : undefined,
    });

    this.walletService
      .initiateDeposit({
        amount: this.usdAmount(),
        provider: this.provider(),
        description: this.description() || `Depósito de ${this.arsAmount()} ARS`,
        allowWithdrawal: this.depositType() === 'withdrawable',
      })
      .subscribe({
        next: (result) => {
          if (result.success && result.payment_url) {
            // Track successful initiation
            const provider = this.provider();
            this.analyticsService.trackEvent('wallet_deposit_completed', {
              deposit_amount: this.usdAmount(),
              deposit_type: this.depositType(),
              deposit_provider: provider !== 'internal' ? provider : undefined,
            });

            this.paymentUrl.set(result.payment_url);
            this.depositSuccess.emit(result.payment_url);
            this.openMercadoPago(result.payment_url);
          } else {
            // Track failed initiation
            const provider = this.provider();
            this.analyticsService.trackEvent('wallet_deposit_failed', {
              deposit_amount: this.usdAmount(),
              deposit_type: this.depositType(),
              deposit_provider: provider !== 'internal' ? provider : undefined,
              error_message: result.message || 'Unknown error',
            });

            this.formError.set(result.message || 'Error al iniciar el depósito');
          }
          this.isProcessing.set(false);
        },
        error: (error) => {
          // Track deposit failure
          const provider = this.provider();
          this.analyticsService.trackEvent('wallet_deposit_failed', {
            deposit_amount: this.usdAmount(),
            deposit_type: this.depositType(),
            deposit_provider: provider !== 'internal' ? provider : undefined,
            error_message: this.getFriendlyErrorMessage(error),
            failure_reason: (error as any).code || 'UNKNOWN_ERROR',
          });

          this.formError.set(this.getFriendlyErrorMessage(error));
          if ((error as any).code === 'MERCADOPAGO_ERROR') {
            this.provider.set('bank_transfer');
            this.fallbackSuggestion.set('bank_transfer');
          }
          this.isProcessing.set(false);
        },
      });
  }

  updateProvider(value: string): void {
    this.provider.set(value as WalletPaymentProvider);
    if (value !== 'bank_transfer') {
      this.fallbackSuggestion.set('none');
    }
  }

  updateDescription(value: string): void {
    this.description.set(value);
  }

  openMercadoPago(paymentUrl: string): void {
    if (!paymentUrl) return;
    const opened = window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.assign(paymentUrl);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  private getFriendlyErrorMessage(error: unknown): string {
    const err = error as any;
    if (err?.code === 'MERCADOPAGO_ERROR') {
      return 'No pudimos iniciar el pago con Mercado Pago. Reintentá en unos minutos o elegí otro método.';
    }
    if (err?.code === 'NETWORK_ERROR') {
      return 'No pudimos conectarnos al servicio de pagos. Verificá tu conexión y probá otra vez.';
    }
    return (
      err?.message || 'Ocurrió un error inesperado al iniciar el depósito. Intenta nuevamente.'
    );
  }
}
