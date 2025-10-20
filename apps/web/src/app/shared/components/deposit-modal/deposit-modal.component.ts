import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../../core/services/wallet.service';
import type { WalletPaymentProvider } from '../../../core/models/wallet.model';
import { FocusTrapDirective } from '../../directives/focus-trap.directive';
import { EscapeKeyDirective } from '../../directives/escape-key.directive';
import { TranslateModule } from '@ngx-translate/core';

/**
 * DepositModalComponent
 *
 * Modal para iniciar un proceso de depósito en el wallet.
 *
 * Características:
 * - Formulario con validación de monto ($10-$5,000)
 * - Selección de proveedor de pago (MercadoPago, Stripe, Transferencia)
 * - Redirección automática a URL de pago
 * - Manejo de errores con mensajes amigables
 * - Estados de carga
 *
 * Uso:
 * ```html
 * <app-deposit-modal
 *   *ngIf="showDepositModal"
 *   (close)="showDepositModal = false"
 *   (depositSuccess)="handleDepositSuccess($event)">
 * </app-deposit-modal>
 * ```
 */
@Component({
  selector: 'app-deposit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FocusTrapDirective, EscapeKeyDirective, TranslateModule],
  templateUrl: './deposit-modal.component.html',
  styleUrls: ['./deposit-modal.component.css'],
})
export class DepositModalComponent {
  private readonly walletService = inject(WalletService);

  /**
   * Datos para transferencia bancaria manual
   */
  readonly bankTransferDetails = {
    accountName: 'Autorentar Operaciones SRL',
    bank: 'Banco Galicia',
    alias: 'AUTORENTAR.PAGOS',
    cbu: '0170018740000000123456',
    concept: 'Crédito Autorentar',
    email: 'pagos@autorentar.com',
  };

  // ==================== OUTPUTS ====================

  /**
   * Evento emitido cuando el modal se cierra
   */
  @Output() closeModal = new EventEmitter<void>();

  /**
   * Evento emitido cuando el depósito se inicia exitosamente
   * Retorna la URL de pago
   */
  @Output() depositSuccess = new EventEmitter<string>();

  // ==================== FORM STATE ====================

  /**
   * Monto a depositar
   */
  amount = signal<number>(250);

  /**
   * Proveedor de pago seleccionado
   */
  provider = signal<WalletPaymentProvider>('mercadopago');

  /**
   * Descripción opcional del depósito
   */
  description = signal<string>('');

  // ==================== UI STATE ====================

  /**
   * Indica si está procesando el depósito
   */
  isProcessing = signal(false);

  /**
   * Error del formulario
   */
  formError = signal<string | null>(null);

  /**
   * URL de pago generada
   */
  paymentUrl = signal<string | null>(null);

  /**
   * Sugiere un cambio de método luego de un error
   */
  readonly fallbackSuggestion = signal<'none' | 'bank_transfer'>('none');

  // ==================== VALIDATION ====================

  /**
   * Límites de depósito
   */
  readonly MIN_DEPOSIT = 10;
  readonly MAX_DEPOSIT = 5000;

  /**
   * Proveedores disponibles
   */
  readonly availableProviders: Array<{ value: WalletPaymentProvider; label: string; description: string }> = [
    {
      value: 'mercadopago',
      label: 'Mercado Pago',
      description: 'Tarjeta de crédito/débito, Rapipago, Pago Fácil',
    },
    {
      value: 'stripe',
      label: 'Stripe',
      description: 'Tarjeta de crédito internacional',
    },
    {
      value: 'bank_transfer',
      label: 'Transferencia Bancaria',
      description: 'Transferencia o depósito directo',
    },
  ];

  // ==================== PUBLIC METHODS ====================

  /**
   * Cierra el modal
   */
  onClose(): void {
    this.closeModal.emit();
  }

  /**
   * Cierra el modal al hacer click en el overlay
   */
  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  /**
   * Valida el formulario
   */
  validateForm(): boolean {
    this.formError.set(null);

    const currentAmount = this.amount();

    // Validar que el monto sea un número
    if (isNaN(currentAmount) || currentAmount === null) {
      this.formError.set('Por favor ingresa un monto válido');
      return false;
    }

    // Validar monto mínimo
    if (currentAmount < this.MIN_DEPOSIT) {
      this.formError.set(`El depósito mínimo es $${this.MIN_DEPOSIT} USD`);
      return false;
    }

    // Validar monto máximo
    if (currentAmount > this.MAX_DEPOSIT) {
      this.formError.set(`El depósito máximo es $${this.MAX_DEPOSIT} USD`);
      return false;
    }

    return true;
  }

  /**
   * Maneja el envío del formulario
   */
  async onSubmit(): Promise<void> {
    if (!this.validateForm()) {
      return;
    }

    this.isProcessing.set(true);
    this.formError.set(null);
    this.walletService.resetError();
    this.fallbackSuggestion.set('none');

    try {
      const result = await this.walletService.initiateDeposit({
        amount: this.amount(),
        provider: this.provider(),
        description: this.description() || 'Depósito a wallet',
      });

      if (result.success && result.payment_url) {
        this.walletService.resetError();
        this.paymentUrl.set(result.payment_url);
        this.fallbackSuggestion.set('none');

        // Emitir evento de éxito
        this.depositSuccess.emit(result.payment_url);

        // Intentar abrir Mercado Pago inmediatamente
        this.openMercadoPago(result.payment_url);

        // Como fallback, mantener la redirección automática en la misma pestaña
        setTimeout(() => {
          this.openMercadoPago(result.payment_url, true);
        }, 2000);
      } else {
        this.formError.set(result.message || 'Error al iniciar el depósito');
      }
    } catch (error) {
      console.error('Error initiating deposit:', error);
      const walletError = this.extractWalletError(error);
      this.formError.set(this.getFriendlyErrorMessage(walletError, error));

      if (walletError?.code === 'MERCADOPAGO_ERROR') {
        this.provider.set('bank_transfer');
        this.fallbackSuggestion.set('bank_transfer');
      }

      this.walletService.resetError();
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Actualiza el monto
   */
  updateAmount(value: string): void {
    const numValue = parseFloat(value);
    this.amount.set(isNaN(numValue) ? 0 : numValue);
    this.formError.set(null);
  }

  /**
   * Actualiza el proveedor
   */
  updateProvider(value: string): void {
    this.provider.set(value as WalletPaymentProvider);
    if (value !== 'bank_transfer') {
      this.fallbackSuggestion.set('none');
    }
  }

  /**
   * Actualiza la descripción
   */
  updateDescription(value: string): void {
    this.description.set(value);
  }

  openMercadoPago(paymentUrl: string, forceSameTab = false): void {
    if (!paymentUrl) {
      return;
    }

    // MercadoPago redirige automáticamente a la app móvil si está instalada
    // No necesitamos lógica especial para móviles
    if (forceSameTab) {
      window.location.assign(paymentUrl);
      return;
    }

    const opened = window.open(paymentUrl, '_blank', 'noopener,noreferrer');

    if (!opened) {
      // Si el navegador bloquea la ventana emergente, redirigir en la misma pestaña
      window.location.assign(paymentUrl);
    }
  }

  /**
   * Formatea un número como moneda USD
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private getFriendlyErrorMessage(
    walletError: { code: string; message: string; details?: unknown } | null,
    rawError: unknown,
  ): string {
    if (walletError?.code === 'MERCADOPAGO_ERROR') {
      if (typeof walletError.details === 'object' && walletError.details) {
        const status = (walletError.details as any).status;
        if (status === 503) {
          return 'Mercado Pago está experimentando una interrupción momentánea (503). Reintentá en unos minutos o elegí otro método de pago, como transferencia bancaria.';
        }
      }
      if (walletError?.message?.toLowerCase().includes('collector configuration')) {
        return 'Mercado Pago no pudo iniciar el cobro por una configuración del cobrador. Probá nuevamente más tarde o seleccioná transferencia bancaria como alternativa.';
      }
      return 'No pudimos iniciar el pago con Mercado Pago. Reintentá en unos minutos o elegí otro método.';
    }

    if (walletError?.code === 'NETWORK_ERROR') {
      return 'No pudimos conectarnos al servicio de pagos. Verificá tu conexión y probá otra vez.';
    }

    if (walletError?.message) {
      return walletError.message;
    }

    if (rawError instanceof Error && rawError.message) {
      return rawError.message;
    }

    return 'Ocurrió un error inesperado al iniciar el depósito. Intenta nuevamente.';
  }

  private extractWalletError(error: unknown): { code: string; message: string; details?: unknown } | null {
    if (typeof error === 'object' && error !== null) {
      const maybeWalletError = error as { code?: unknown; message?: unknown; details?: unknown };
      if (typeof maybeWalletError.code === 'string' && typeof maybeWalletError.message === 'string') {
        return {
          code: maybeWalletError.code,
          message: maybeWalletError.message,
          details: maybeWalletError.details,
        };
      }
    }
    return null;
  }
}
