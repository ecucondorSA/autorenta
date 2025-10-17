import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PaymentsService } from '../../../core/services/payments.service';
import { BookingsService } from '../../../core/services/bookings.service';
import { Booking } from '../../../core/models';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  standalone: true,
  selector: 'app-checkout-page',
  imports: [CommonModule, MoneyPipe],
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

  constructor(
    private readonly route: ActivatedRoute,
    private readonly payments: PaymentsService,
    private readonly bookings: BookingsService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('bookingId');
    this.bookingId.set(id);
    if (id) {
      void this.loadBooking(id);
    }
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
