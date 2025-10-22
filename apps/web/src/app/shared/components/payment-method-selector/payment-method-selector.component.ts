import { Component, OnInit, Input, Output, EventEmitter, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { WalletService } from '../../../core/services/wallet.service';
import type { BookingPaymentMethod } from '../../../core/models/wallet.model';

/**
 * PaymentMethodSelectorComponent
 *
 * Componente para seleccionar el método de pago en el flujo de reservas.
 *
 * Permite elegir entre:
 * - 100% Tarjeta de crédito (Mercado Pago)
 * - 100% Wallet (si hay fondos suficientes)
 * - Pago mixto: Wallet + Tarjeta (si hay fondos parciales)
 *
 * Características:
 * - Validación automática de fondos disponibles
 * - Cálculo de montos parciales en tiempo real
 * - Visual feedback del balance del wallet
 * - Integración con WalletService
 *
 * Uso:
 * ```html
 * <app-payment-method-selector
 *   [totalAmount]="bookingTotal"
 *   (paymentMethodChange)="handlePaymentMethodChange($event)">
 * </app-payment-method-selector>
 * ```
 */
@Component({
  selector: 'app-payment-method-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './payment-method-selector.component.html',
  styleUrls: ['./payment-method-selector.component.css'],
})
export class PaymentMethodSelectorComponent implements OnInit {
  private readonly walletService = inject(WalletService);

  // ==================== INPUTS & OUTPUTS ====================

  /**
   * Monto total de la reserva (en USD)
   */
  @Input({ required: true }) totalAmount!: number;

  /**
   * Evento emitido cuando cambia el método de pago seleccionado
   */
  @Output() paymentMethodChange = new EventEmitter<{
    method: BookingPaymentMethod;
    walletAmount: number;
    cardAmount: number;
  }>();

  // ==================== SIGNALS ====================

  /**
   * Método de pago seleccionado
   */
  selectedMethod = signal<BookingPaymentMethod>('credit_card');

  /**
   * Monto a usar del wallet (solo para partial_wallet)
   */
  walletAmountToUse = signal<number>(0);

  /**
   * Balance del wallet (del servicio)
   */
  readonly availableBalance = this.walletService.availableBalance;

  /**
   * Estado de carga del balance
   */
  readonly isLoadingBalance = signal(false);

  /**
   * Expose Math for template
   */
  readonly Math = Math;

  // ==================== COMPUTED SIGNALS ====================

  /**
   * Indica si el usuario tiene fondos suficientes para pagar 100% con wallet
   */
  readonly hasSufficientFunds = computed(() => {
    return this.availableBalance() >= this.totalAmount;
  });

  /**
   * Indica si el usuario tiene fondos parciales
   */
  readonly hasPartialFunds = computed(() => {
    const balance = this.availableBalance();
    return balance > 0 && balance < this.totalAmount;
  });

  /**
   * Calcula el monto que se pagará con tarjeta
   */
  readonly cardAmount = computed(() => {
    if (this.selectedMethod() === 'credit_card') {
      return this.totalAmount;
    }
    if (this.selectedMethod() === 'wallet') {
      return 0;
    }
    // partial_wallet
    return this.totalAmount - this.walletAmountToUse();
  });

  /**
   * Calcula el porcentaje del total que representa el wallet amount
   */
  readonly walletPercentage = computed(() => {
    if (this.totalAmount === 0) return 0;
    return Math.round((this.walletAmountToUse() / this.totalAmount) * 100);
  });

  // ==================== LIFECYCLE ====================

  async ngOnInit(): Promise<void> {
    await this.loadBalance();

    // Auto-seleccionar el mejor método de pago
    this.autoSelectPaymentMethod();
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Carga el balance del wallet
   */
  async loadBalance(): Promise<void> {
    this.isLoadingBalance.set(true);
    try {
      await this.walletService.getBalance();
    } catch (err) {
      console.error('Error loading wallet balance:', err);
    } finally {
      this.isLoadingBalance.set(false);
    }
  }

  /**
   * Auto-selecciona el mejor método de pago basado en el balance
   */
  autoSelectPaymentMethod(): void {
    if (this.hasSufficientFunds()) {
      // Si tiene fondos suficientes, sugerir wallet
      this.selectMethod('wallet');
    } else if (this.hasPartialFunds()) {
      // Si tiene fondos parciales, sugerir pago mixto
      this.selectMethod('partial_wallet');
      // Usar todo el balance disponible
      this.walletAmountToUse.set(this.availableBalance());
    } else {
      // Sin fondos, usar tarjeta
      this.selectMethod('credit_card');
    }
  }

  /**
   * Selecciona un método de pago
   */
  selectMethod(method: BookingPaymentMethod): void {
    this.selectedMethod.set(method);

    // Ajustar wallet amount según el método
    if (method === 'wallet') {
      this.walletAmountToUse.set(this.totalAmount);
    } else if (method === 'credit_card') {
      this.walletAmountToUse.set(0);
    }
    // Para partial_wallet, mantener el valor actual

    this.emitChange();
  }

  /**
   * Actualiza el monto a usar del wallet (para partial_wallet)
   */
  updateWalletAmount(value: string): void {
    const numValue = parseFloat(value);
    const validValue = isNaN(numValue) ? 0 : numValue;

    // Limitar entre 0 y el mínimo entre balance disponible y total
    const maxWallet = Math.min(this.availableBalance(), this.totalAmount);
    const clampedValue = Math.max(0, Math.min(validValue, maxWallet));

    this.walletAmountToUse.set(clampedValue);
    this.emitChange();
  }

  /**
   * Establece el monto del wallet al máximo disponible
   */
  useMaxWallet(): void {
    const maxWallet = Math.min(this.availableBalance(), this.totalAmount);
    this.walletAmountToUse.set(maxWallet);
    this.emitChange();
  }

  /**
   * Emite el evento de cambio de método de pago
   */
  private emitChange(): void {
    const method = this.selectedMethod();
    let walletAmount = 0;
    let cardAmount = this.totalAmount;

    if (method === 'wallet') {
      walletAmount = this.totalAmount;
      cardAmount = 0;
    } else if (method === 'partial_wallet') {
      walletAmount = this.walletAmountToUse();
      cardAmount = this.totalAmount - walletAmount;
    }

    this.paymentMethodChange.emit({
      method,
      walletAmount,
      cardAmount,
    });
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
}
