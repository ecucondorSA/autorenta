import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { from } from 'rxjs';
import { finalize } from 'rxjs/operators';

// Core imports
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { MercadoPagoScriptService } from '../../../core/services/mercado-pago-script.service';
import { MercadoPagoPaymentService } from '../../../core/services/mercadopago-payment.service';
import { ToastService } from '../../../core/services/toast.service';
import { WalletService } from '../../../core/services/wallet.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { MercadopagoCardFormComponent } from '../../../shared/components/mercadopago-card-form/mercadopago-card-form.component';
import { WalletBalanceCardComponent } from '../../../shared/components/wallet-balance-card/wallet-balance-card.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

// Types
import type { Database } from '../../../../types/supabase.types';
type Booking = Database['public']['Views']['my_bookings']['Row'];
type Car = Database['public']['Tables']['cars']['Row'];

interface PaymentOption {
  id: 'wallet' | 'deposit' | 'card';
  label: string;
  description: string;
  icon: string;
  available: boolean;
}

@Component({
  selector: 'app-booking-payment',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MercadopagoCardFormComponent,
    WalletBalanceCardComponent,
    LoadingStateComponent,
    ButtonComponent,
    MoneyPipe,
    DatePipe,
  ],
  templateUrl: './booking-payment.page.html',
  styleUrls: ['./booking-payment.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingPaymentPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly bookingService = inject(BookingsService);
  private readonly walletService = inject(WalletService);
  private readonly mercadopagoService = inject(MercadoPagoPaymentService);
  private readonly mercadoPagoScriptService = inject(MercadoPagoScriptService);
  private readonly toastService = inject(ToastService);

  // State
  readonly loading = signal(true);
  readonly processing = signal(false);
  readonly booking = signal<Booking | null>(null);
  readonly car = signal<Car | null>(null);
  readonly paymentMethod = signal<'wallet' | 'credit_card'>('credit_card');
  readonly showPaymentOptions = signal(false);
  readonly selectedOption = signal<PaymentOption['id'] | null>(null);

  // Computed values
  readonly walletBalance = this.walletService.availableBalance;

  readonly depositAmount = computed(() => {
    const bookingData = this.booking();
    if (!bookingData) return 0;
    return (bookingData.deposit_amount_cents || 0) / 100;
  });

  readonly totalAmount = computed(() => {
    const bookingData = this.booking();
    if (!bookingData) return 0;
    return (bookingData.total_amount || 0) + this.depositAmount();
  });

  readonly hasSufficientFunds = computed(() => {
    const balance = this.walletBalance();
    const required = this.totalAmount();
    return balance >= required;
  });

  readonly paymentOptions = computed<PaymentOption[]>(() => {
    const balance = this.walletBalance();


    return [
      {
        id: 'wallet',
        label: 'Usar saldo actual',
        description: `Balance disponible: $${balance.toFixed(2)}`,
        icon: '🏦',
        available: this.hasSufficientFunds(),
      },
      {
        id: 'deposit',
        label: 'Depositar fondos en wallet',
        description: 'Carga tu wallet con MercadoPago',
        icon: '💰',
        available: true,
      },
      {
        id: 'card',
        label: 'Pagar con tarjeta',
        description: 'Pago directo con tarjeta de crédito/débito',
        icon: '💳',
        available: true,
      },
    ];
  });

  constructor() {
    // Effect to handle payment method changes
    effect(() => {
      const method = this.paymentMethod();
      const hasFunds = this.hasSufficientFunds();

      // If wallet selected but no funds, show options
      if (method === 'wallet' && !hasFunds) {
        this.showPaymentOptions.set(true);
      } else {
        this.showPaymentOptions.set(false);
      }
    });
  }

  ngOnInit(): void {
    const bookingId = this.route.snapshot.paramMap.get('bookingId');
    const queryMethod = this.route.snapshot.queryParamMap.get('paymentMethod') as 'wallet' | 'credit_card';

    if (!bookingId) {
      this.toastService.error('Error de reserva', 'ID de reserva no válido');
      this.router.navigate(['/']);
      return;
    }

    // Set payment method from query params or session
    if (queryMethod) {
      this.paymentMethod.set(queryMethod);
    } else {
      const sessionMethod = sessionStorage.getItem('payment_method') as 'wallet' | 'credit_card';
      if (sessionMethod) {
        this.paymentMethod.set(sessionMethod);
      }
    }

    this.loadBookingData(bookingId);
    this.loadWalletBalance();

    // Preload MercadoPago SDK if using credit card
    if (this.paymentMethod() === 'credit_card') {
      this.mercadoPagoScriptService.preloadSDK().catch(error => {
        console.warn('[BookingPayment] Failed to preload MercadoPago SDK:', error);
      });
    }
  }

  private loadBookingData(bookingId: string): void {
    this.loading.set(true);

    from(this.bookingService.getBookingById(bookingId))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (booking) => {
          if (!booking) {
            this.toastService.error('Reserva no encontrada', 'No se pudo encontrar la reserva solicitada');
            this.router.navigate(['/']);
            return;
          }

          this.booking.set(booking as unknown as Booking);

          // Load car data if available
          if (booking.car) {
            this.car.set(booking.car as Car);
          }
        },
        error: (error) => {
          console.error('[BookingPayment] Error loading booking:', error);
          this.toastService.error('Error de carga', 'No se pudo cargar la información de la reserva');
          this.router.navigate(['/']);
        },
      });
  }

  private loadWalletBalance(): void {
    this.walletService.getBalance().subscribe({
      error: (error) => {
        console.error('[BookingPayment] Error loading wallet balance:', error);
      },
    });
  }

  selectPaymentOption(optionId: PaymentOption['id']): void {
    this.selectedOption.set(optionId);

    switch (optionId) {
      case 'wallet':
        this.processWalletPayment();
        break;
      case 'deposit':
        this.navigateToDeposit();
        break;
      case 'card':
        this.paymentMethod.set('credit_card');
        this.showPaymentOptions.set(false);
        break;
    }
  }

  processWalletPayment(): void {
    const bookingData = this.booking();
    if (!bookingData) return;

    if (!this.hasSufficientFunds()) {
      this.toastService.error('Fondos insuficientes', 'No tienes saldo suficiente en tu wallet');
      return;
    }

    this.processing.set(true);

    // Lock funds for the booking
    const depositUsd = (bookingData.deposit_amount_cents || 0) / 100;
    this.walletService.lockRentalAndDeposit(
      bookingData.id,
      bookingData.total_amount || 0,
      depositUsd
    ).pipe(
      finalize(() => this.processing.set(false))
    ).subscribe({
      next: () => {
        this.toastService.success('Pago procesado', 'Tu pago ha sido procesado exitosamente');
        this.router.navigate(['/bookings', bookingData.id, 'success']);
      },
      error: (error) => {
        console.error('[BookingPayment] Wallet payment error:', error);
        this.toastService.error('Error de pago', 'No se pudo procesar el pago con wallet');
      },
    });
  }

  onCardTokenGenerated(tokenData: { cardToken: string; last4: string }): void {
    const bookingData = this.booking();
    if (!bookingData) return;

    this.processing.set(true);

    // Process card payment with the generated token
    from(this.mercadopagoService.processBookingPayment({
      booking_id: bookingData.id,
      card_token: tokenData.cardToken,
      issuer_id: '',
      installments: 1,
    })).pipe(
      finalize(() => this.processing.set(false))
    ).subscribe({
      next: (result) => {
        if (result.status === 'approved') {
          this.toastService.success('Pago aprobado', 'Tu pago ha sido procesado exitosamente');
          this.router.navigate(['/bookings', bookingData.id, 'success']);
        } else if (result.status === 'in_process') {
          this.toastService.info('Pago en proceso', 'Tu pago está siendo verificado');
          this.router.navigate(['/bookings', bookingData.id, 'pending']);
        } else {
          this.toastService.error('Pago rechazado', 'El pago fue rechazado por el procesador');
        }
      },
      error: (error) => {
        console.error('[BookingPayment] Card payment error:', error);
        this.toastService.error('Error de pago', 'No se pudo procesar el pago con tarjeta');
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCardPaymentError(error: any): void {
    console.error('[BookingPayment] Card form error:', error);
    this.toastService.error('Error de tarjeta', error.message || 'Error al procesar la tarjeta');
  }

  navigateToDeposit(): void {
    const bookingData = this.booking();
    if (!bookingData) return;

    // Save booking ID to return after deposit
    sessionStorage.setItem('pending_booking_payment', bookingData.id);

    // Navigate to wallet deposit page
    this.router.navigate(['/wallet/deposit'], {
      queryParams: {
        amount: this.totalAmount(),
        returnUrl: `/bookings/${bookingData.id}/payment`,
      },
    });
  }

  goBack(): void {
    const bookingData = this.booking();
    if (bookingData?.car_id) {
      this.router.navigate(['/cars', bookingData.car_id]);
    } else {
      this.router.navigate(['/']);
    }
  }
}
