import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';

// Services
import { AuthService } from '../../../core/services/auth.service';
import { FxService } from '../../../core/services/fx.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { MercadoPagoBookingGateway } from '../checkout/support/mercadopago-booking.gateway';

// Models
import { Car } from '../../../core/models';
import { FxSnapshot } from '../../../core/models/booking-detail-payment.model';

@Component({
  selector: 'app-booking-detail-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-detail-payment.page.html',
  styleUrls: ['./booking-detail-payment.page.css'],
})
export class BookingDetailPaymentPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Injected services
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fxService = inject(FxService);
  private authService = inject(AuthService);
  private supabaseClient = inject(SupabaseClientService).getClient();
  private mpGateway = inject(MercadoPagoBookingGateway);

  // State
  readonly car = signal<Car | null>(null);
  readonly fxSnapshot = signal<FxSnapshot | null>(null);
  readonly loading = signal(false);
  readonly processingPayment = signal(false);
  readonly error = signal<string | null>(null);

  // Constants
  readonly PRE_AUTH_AMOUNT_USD = 600;

  // Computed
  readonly totalArs = computed(() => {
    const fx = this.fxSnapshot();
    if (!fx) return 0;
    return this.PRE_AUTH_AMOUNT_USD * fx.rate;
  });

  readonly bookingInput = signal<{
    carId: string;
    startDate: Date;
    endDate: Date;
  } | null>(null);

  async ngOnInit(): Promise<void> {
    // 1. Auth check
    const session = await this.authService.ensureSession();
    if (!session?.user) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    // 2. Load params
    this.loadParams();

    // 3. Load data
    await Promise.all([this.loadCarInfo(), this.loadFxSnapshot()]);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadParams(): void {
    const queryParams = this.route.snapshot.queryParamMap;
    const carId = queryParams.get('carId');
    const startDate = queryParams.get('startDate');
    const endDate = queryParams.get('endDate');

    if (!carId || !startDate || !endDate) {
      this.error.set('Faltan parámetros de reserva.');
      return;
    }

    this.bookingInput.set({
      carId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
  }

  private async loadCarInfo(): Promise<void> {
    const input = this.bookingInput();
    if (!input) return;

    try {
      const { data, error } = await this.supabaseClient
        .from('cars')
        .select('*')
        .eq('id', input.carId)
        .single();

      if (error) throw error;
      if (data) this.car.set(data as Car);
    } catch (err) {
      console.error('Error loading car:', err);
      this.error.set('Error al cargar información del vehículo');
    }
  }

  private async loadFxSnapshot(): Promise<void> {
    this.loading.set(true);
    try {
      // Try DB first
      let snapshot = await firstValueFrom(this.fxService.getFxSnapshot('USD', 'ARS'));

      // Fallback if needed
      if (!snapshot) {
        const rate = await this.fxService.getCurrentRateAsync('USD', 'ARS');
        snapshot = {
          rate,
          timestamp: new Date(),
          fromCurrency: 'USD',
          toCurrency: 'ARS',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isExpired: false,
          variationThreshold: 0.1,
        };
      }

      this.fxSnapshot.set(snapshot);
    } catch (err) {
      console.error('Error loading FX:', err);
      this.error.set('No se pudo obtener la cotización del día.');
    } finally {
      this.loading.set(false);
    }
  }

  downloadPdf(): void {
    window.print();
  }

  async payWithMercadoPago(): Promise<void> {
    const input = this.bookingInput();
    if (!input) return;

    this.processingPayment.set(true);
    try {
      // Create booking first (simplified for this flow)
      // Note: In a real flow we might want to create the booking record first
      // For now we assume we pass the carId/dates to the preference creation or use a temp ID
      // But the gateway expects a bookingId.
      // Let's try to create a pending booking first.

      const { data: booking, error: bookingError } = await this.supabaseClient
        .from('bookings')
        .insert({
          car_id: input.carId,
          renter_id: (await this.authService.getCurrentUser())?.id,
          start_at: input.startDate.toISOString(),
          end_at: input.endDate.toISOString(),
          status: 'pending_payment',
          total_amount_cents: this.PRE_AUTH_AMOUNT_USD * 100, // Store in cents USD
          currency: 'USD',
          payment_mode: 'card'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Get MP Preference
      const preference = await this.mpGateway.createPreference(booking.id);

      // Redirect to MP
      if (preference.initPoint) {
        window.location.href = preference.initPoint;
      } else {
        throw new Error('No se recibió link de pago');
      }

    } catch (err: any) {
      console.error('Payment error:', err);
      this.error.set(err.message || 'Error al iniciar el pago');
    } finally {
      this.processingPayment.set(false);
    }
  }


}
