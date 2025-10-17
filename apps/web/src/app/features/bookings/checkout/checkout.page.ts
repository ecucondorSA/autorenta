import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentsService } from '../../../core/services/payments.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { WalletService } from '../../../core/services/wallet.service';
import { Booking } from '../../../core/models';
import { BookingPaymentMethod } from '../../../core/models/wallet.model';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { PaymentMethodSelectorComponent } from '../../../shared/components/payment-method-selector/payment-method-selector.component';

@Component({
  standalone: true,
  selector: 'app-checkout-page',
  imports: [CommonModule, MoneyPipe, PaymentMethodSelectorComponent],
  templateUrl: './checkout.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPage implements OnInit {
  readonly bookingId = signal<string | null>(null);
  readonly intentId = signal<string | null>(null);
  readonly status = signal<string>('requires_payment_method');
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly booking = signal<Booking | null>(null);

  // Wallet payment state
  readonly selectedPaymentMethod = signal<BookingPaymentMethod>('credit_card');
  readonly walletAmountToUse = signal<number>(0);
  readonly cardAmountToUse = signal<number>(0);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly payments: PaymentsService,
    private readonly bookings: BookingsService,
    private readonly wallet: WalletService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('bookingId');
    this.bookingId.set(id);
    if (id) {
      void this.loadBooking(id);
    }
  }

  /**
   * Maneja el cambio de método de pago seleccionado
   */
  onPaymentMethodChange(event: {
    method: BookingPaymentMethod;
    walletAmount: number;
    cardAmount: number;
  }): void {
    this.selectedPaymentMethod.set(event.method);
    this.walletAmountToUse.set(event.walletAmount);
    this.cardAmountToUse.set(event.cardAmount);

    console.log('Payment method changed:', event);
  }

  /**
   * Procesa el pago según el método seleccionado
   */
  async processPayment(): Promise<void> {
    if (!this.bookingId() || !this.booking()) return;

    this.loading.set(true);
    this.message.set(null);

    try {
      const method = this.selectedPaymentMethod();
      const bookingId = this.bookingId()!;
      const totalAmount = this.booking()!.total_amount;

      // Caso 1: Pago 100% con wallet
      if (method === 'wallet') {
        await this.processWalletPayment(bookingId, totalAmount);
      }
      // Caso 2: Pago mixto (wallet + tarjeta)
      else if (method === 'partial_wallet') {
        await this.processPartialWalletPayment(
          bookingId,
          this.walletAmountToUse(),
          this.cardAmountToUse()
        );
      }
      // Caso 3: Pago 100% con tarjeta (Mercado Pago)
      else {
        await this.processCreditCardPayment(bookingId, totalAmount);
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      this.message.set(
        err instanceof Error ? err.message : 'Error al procesar el pago'
      );
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Procesa pago 100% con wallet
   */
  private async processWalletPayment(bookingId: string, amount: number): Promise<void> {
    // Paso 1: Bloquear fondos del wallet
    const lockResult = await this.wallet.lockFunds({
      booking_id: bookingId,
      amount,
      description: 'Pago de reserva con wallet',
    });

    if (!lockResult.success) {
      throw new Error(lockResult.message);
    }

    // Paso 2: Actualizar booking con wallet payment info
    await this.bookings.updateBooking(bookingId, {
      payment_method: 'wallet',
      wallet_amount_used: amount,
      card_amount_used: 0,
    });

    this.status.set('paid_with_wallet');
    this.message.set(`Pago exitoso con wallet. $${amount} bloqueados hasta finalizar la reserva.`);

    // Redirigir a confirmación después de 2 segundos
    setTimeout(() => {
      void this.router.navigate(['/bookings', bookingId]);
    }, 2000);
  }

  /**
   * Procesa pago mixto (wallet + tarjeta)
   */
  private async processPartialWalletPayment(
    bookingId: string,
    walletAmount: number,
    cardAmount: number
  ): Promise<void> {
    // Paso 1: Bloquear fondos del wallet
    if (walletAmount > 0) {
      const lockResult = await this.wallet.lockFunds({
        booking_id: bookingId,
        amount: walletAmount,
        description: 'Pago parcial de reserva con wallet',
      });

      if (!lockResult.success) {
        throw new Error(lockResult.message);
      }
    }

    // Paso 2: Crear payment intent para el resto con Mercado Pago
    const intent = await this.payments.createIntent(bookingId);
    this.intentId.set(intent.id);

    // Paso 3: Actualizar booking con payment info
    await this.bookings.updateBooking(bookingId, {
      payment_method: 'partial_wallet',
      wallet_amount_used: walletAmount,
      card_amount_used: cardAmount,
    });

    // Paso 4: Redirigir a Mercado Pago para pagar el resto
    this.status.set('redirecting_to_mercadopago');
    this.message.set(
      `$${walletAmount} bloqueados de tu wallet. Redirigiendo a Mercado Pago para pagar $${cardAmount}...`
    );

    // TODO: Obtener init_point de Mercado Pago y redirigir
    // Por ahora, simular el pago
    setTimeout(() => {
      this.status.set('paid_partial');
      this.message.set('Pago mixto completado exitosamente');
    }, 2000);
  }

  /**
   * Procesa pago 100% con tarjeta (Mercado Pago)
   */
  private async processCreditCardPayment(bookingId: string, amount: number): Promise<void> {
    // Crear payment intent
    const intent = await this.payments.createIntent(bookingId);
    this.intentId.set(intent.id);
    this.status.set(intent.status);

    // Actualizar booking
    await this.bookings.updateBooking(bookingId, {
      payment_method: 'credit_card',
      wallet_amount_used: 0,
      card_amount_used: amount,
    });

    this.message.set('Redirigiendo a Mercado Pago...');

    // TODO: Obtener init_point de Mercado Pago y redirigir
    // Por ahora, mostrar mensaje
    setTimeout(() => {
      this.status.set('awaiting_payment');
      this.message.set('Esperando confirmación de pago de Mercado Pago');
    }, 1500);
  }

  async createIntent(): Promise<void> {
    if (!this.bookingId()) return;
    this.loading.set(true);
    try {
      const intent = await this.payments.createIntent(this.bookingId()!);
      this.intentId.set(intent.id);
      this.status.set(intent.status);
    } catch (err) {
      console.error(err);
      this.message.set('No pudimos iniciar el pago.');
    } finally {
      this.loading.set(false);
    }
  }

  async simulatePayment(): Promise<void> {
    if (!this.intentId()) return;
    this.loading.set(true);
    try {
      await this.payments.markAsPaid(this.intentId()!);
      const intent = await this.payments.getStatus(this.intentId()!);
      this.status.set(intent?.status ?? 'approved');
      this.message.set('Pago simulado correctamente.');
    } catch (err) {
      console.error(err);
      this.message.set('Falló la simulación de pago.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadBooking(bookingId: string): Promise<void> {
    try {
      const booking = await this.bookings.getBookingById(bookingId);
      this.booking.set(booking);
    } catch (err) {
      console.error(err);
      this.message.set('No pudimos cargar la reserva.');
    }
  }
}
