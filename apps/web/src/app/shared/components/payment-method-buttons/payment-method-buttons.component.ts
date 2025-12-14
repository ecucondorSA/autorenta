
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { WalletService } from '../../../core/services/wallet.service';
import { MoneyPipe } from '../../pipes/money.pipe';
import { IconComponent } from '../icon/icon.component';

export type PaymentMethod = 'credit_card' | 'wallet';

/**
 * Payment Method Buttons Component
 *
 * Displays two payment method options:
 * 1. Credit Card (MercadoPago) - Pre-authorization
 * 2. Wallet AutoRenta - Instant debit from balance
 *
 * Features:
 * - Shows real-time wallet balance
 * - Disables wallet option if insufficient funds
 * - Highlights recommended option
 * - Clear visual feedback
 *
 * @example
 * ```html
 * <app-payment-method-buttons
 *   [rentalAmount]="90"
 *   [depositAmount]="200"
 *   [disabled]="false"
 *   (methodSelected)="onPaymentMethodSelected($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-payment-method-buttons',
  standalone: true,
  imports: [TranslateModule, MoneyPipe, IconComponent],
  templateUrl: './payment-method-buttons.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodButtonsComponent implements OnInit {
  private readonly walletService = inject(WalletService);

  @Input() rentalAmount: number = 0;
  @Input() depositAmount: number = 0;
  @Input() disabled: boolean = false;

  @Output() readonly methodSelected = new EventEmitter<PaymentMethod>();

  readonly selectedMethod = signal<PaymentMethod | null>(null);
  readonly loadingBalance = signal(true);

  // Wallet balance from service
  readonly walletBalance = this.walletService.availableBalance;

  // Total amount needed
  readonly totalRequired = computed(() => this.rentalAmount + this.depositAmount);

  // Check if wallet has sufficient funds
  readonly hasSufficientFunds = computed(() => {
    const balance = this.walletBalance();
    const required = this.totalRequired();
    return balance >= required;
  });

  // Recommended method (wallet if sufficient funds, otherwise card)
  readonly recommendedMethod = computed<PaymentMethod>(() => {
    return this.hasSufficientFunds() ? 'wallet' : 'credit_card';
  });

  ngOnInit(): void {
    // Load wallet balance on init
    this.walletService.getBalance().subscribe({
      next: () => {
        this.loadingBalance.set(false);
      },
      error: (error) => {
        console.error('[PaymentMethodButtons] Error loading balance:', error);
        this.loadingBalance.set(false);
      },
    });
  }

  selectMethod(method: PaymentMethod): void {
    if (this.disabled) return;

    // Don't allow wallet if insufficient funds
    if (method === 'wallet' && !this.hasSufficientFunds()) {
      console.warn('[PaymentMethodButtons] Wallet selected but insufficient funds');
      // Still emit the selection to allow parent to handle the situation
      // Parent can show options to deposit or use card
      this.selectedMethod.set(method);
      this.methodSelected.emit(method);
      return;
    }

    this.selectedMethod.set(method);
    this.methodSelected.emit(method);
  }

  isSelected(method: PaymentMethod): boolean {
    return this.selectedMethod() === method;
  }

  isRecommended(method: PaymentMethod): boolean {
    return this.recommendedMethod() === method;
  }
}
