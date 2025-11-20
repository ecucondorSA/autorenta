import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';

// Services
import { AuthService } from '../../../core/services/auth.service';
import { FxService } from '../../../core/services/fx.service';
import { PdfGeneratorService } from '../../../core/services/pdf-generator.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { MercadoPagoBookingGateway } from '../checkout/support/mercadopago-booking.gateway';

// Models
import { Car } from '../../../core/models';
import { FxSnapshot } from '../../../core/models/booking-detail-payment.model';

// Extended FxSnapshot with dual rates
interface DualRateFxSnapshot extends FxSnapshot {
  binanceRate: number; // Raw Binance rate (no margin) - for price conversions
  platformRate: number; // Binance + 10% margin - for guarantees only
}

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
  private pdfGenerator = inject(PdfGeneratorService);

  // State
  readonly car = signal<Car | null>(null);
  readonly fxSnapshot = signal<DualRateFxSnapshot | null>(null);
  readonly loading = signal(false);
  readonly processingPayment = signal(false);
  readonly error = signal<string | null>(null);

  // Constants
  readonly PRE_AUTH_AMOUNT_USD = 600;

  // Computed - Rental days
  readonly rentalDays = computed(() => {
    const input = this.bookingInput();
    if (!input) return 0;
    const diffTime = input.endDate.getTime() - input.startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays); // At least 1 day
  });

  // Computed - Rental cost in ARS
  readonly rentalCostArs = computed(() => {
    const car = this.car();
    const days = this.rentalDays();
    const fx = this.fxSnapshot();

    if (!car || !fx || days === 0) return 0;

    const dailyRate = car.price_per_day;

    // Handle different currencies
    if (car.currency === 'ARS' || !car.currency) {
      // Already in ARS, just multiply by days
      return dailyRate * days;
    } else if (car.currency === 'USD') {
      // Convert USD to ARS using Binance rate (NO margin)
      // User explicitly said: "al pasar de pesos a dolares, se utiliza el precio normal de binance SIN LOS 10%"
      return dailyRate * fx.binanceRate * days;
    } else if (car.currency === 'BRL' || car.currency === 'UYU') {
      // For other currencies, convert to USD first, then to ARS
      // For now, just log warning - proper implementation requires BRL/UYU rates
      console.warn(`⚠️ Currency ${car.currency} not fully supported yet. Showing as ARS.`);
      return dailyRate * days;
    }

    return dailyRate * days;
  });

  // Computed - Total guarantee + rental in ARS
  readonly totalArs = computed(() => {
    const fx = this.fxSnapshot();
    if (!fx) return 0;

    // Guarantee uses platform_rate (with 10% margin for volatility protection)
    const guaranteeArs = this.PRE_AUTH_AMOUNT_USD * fx.platformRate;

    // Rental cost already handles currency conversion correctly
    // (uses binanceRate for USD cars, direct ARS for ARS cars)
    const rentalArs = this.rentalCostArs();

    return guaranteeArs + rentalArs;
  });

  readonly bookingInput = signal<{
    carId: string;
    startDate: Date;
    endDate: Date;
  } | null>(null);

  /**
   * Check if car has any features to display
   */
  hasCarFeatures(): boolean {
    const features = this.getCarFeatures();
    return features.length > 0;
  }

  /**
   * Parse car features from JSONB to displayable array
   */
  getCarFeatures(): string[] {
    const car = this.car();
    if (!car || !car.features) return [];

    try {
      const features = typeof car.features === 'string' ? JSON.parse(car.features) : car.features;

      if (typeof features !== 'object' || features === null) return [];

      // Convert object keys with true values to array
      // Example: { "air_conditioning": true, "bluetooth": true } => ["Aire Acondicionado", "Bluetooth"]
      const featureMap: Record<string, string> = {
        air_conditioning: 'Aire Acondicionado',
        bluetooth: 'Bluetooth',
        gps: 'GPS',
        backup_camera: 'Cámara de Retroceso',
        parking_sensors: 'Sensores de Estacionamiento',
        cruise_control: 'Control de Crucero',
        leather_seats: 'Asientos de Cuero',
        sunroof: 'Techo Solar',
        heated_seats: 'Asientos Calefaccionados',
        usb_charger: 'Cargador USB',
        aux_input: 'Entrada Auxiliar',
        apple_carplay: 'Apple CarPlay',
        android_auto: 'Android Auto',
        abs: 'ABS',
        airbags: 'Airbags',
        alarm: 'Alarma',
        central_locking: 'Cierre Centralizado',
        power_windows: 'Ventanas Eléctricas',
        power_mirrors: 'Espejos Eléctricos',
        fog_lights: 'Luces Antiniebla',
        alloy_wheels: 'Llantas de Aleación',
      };

      return Object.entries(features)
        .filter(([_, value]) => value === true || value === 'true')
        .map(
          ([key]) =>
            featureMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        )
        .sort();
    } catch (error) {
      console.error('Error parsing car features:', error);
      return [];
    }
  }

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

    // Initial load
    await this.fetchAndSetRate();
    this.loading.set(false);

    // Poll every 30 seconds
    const intervalId = setInterval(() => {
      this.fetchAndSetRate();
    }, 30000);

    // Cleanup interval on destroy
    this.destroy$.subscribe(() => clearInterval(intervalId));
  }

  private async fetchAndSetRate(): Promise<void> {
    try {
      // Fetch BOTH rates from exchange service
      const platformRate = await this.fxService.getCurrentRateAsync('USD', 'ARS'); // With 10% margin (for guarantees)
      const binanceRate = await this.fxService.getBinanceRateAsync(); // Raw Binance (for price conversions)

      const snapshot: DualRateFxSnapshot = {
        rate: platformRate, // Keep 'rate' as platform_rate for backward compatibility with template
        binanceRate, // Raw Binance rate (no margin)
        platformRate, // Binance + 10% margin (guarantees only)
        timestamp: new Date(),
        fromCurrency: 'USD',
        toCurrency: 'ARS',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isExpired: false,
        variationThreshold: 0.1,
      };

      this.fxSnapshot.set(snapshot);
      console.log(`🔄 Tasas actualizadas en UI:
        💰 Binance (precios): ${binanceRate.toFixed(2)} ARS/USD
        🛡️ Platform (garantías): ${platformRate.toFixed(2)} ARS/USD (+10%)`);
    } catch (err) {
      console.error('Error updating FX rate:', err);
      // Don't clear error signal here to avoid flashing error on transient failures if we already have a rate
      if (!this.fxSnapshot()) {
        this.error.set('No se pudo obtener la cotización actualizada.');
      }
    }
  }

  async downloadPdf(): Promise<void> {
    const input = this.bookingInput();
    const car = this.car();

    if (!input || !car) {
      console.error('Cannot generate PDF: missing booking or car data');
      return;
    }

    try {
      // Generate filename based on car and date
      const carName = `${car.brand}-${car.model}`.replace(/\s+/g, '-');
      const date = new Date().toISOString().split('T')[0];
      const filename = `reserva-${carName}-${date}.pdf`;

      // Generate PDF from the content element
      await this.pdfGenerator.generateFromElement('#pdf-content', {
        filename,
        format: 'a4',
        orientation: 'portrait',
        scale: 2, // High quality
        quality: 0.95,
      });

      console.log(`✅ PDF generado: ${filename}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.error.set('No se pudo generar el PDF. Por favor, intente nuevamente.');
    }
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
          total_cents: this.PRE_AUTH_AMOUNT_USD * 100, // Store in cents USD
          total_amount: this.PRE_AUTH_AMOUNT_USD, // Store decimal amount
          currency: 'USD',
          payment_mode: 'card',
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
    } catch (err) {
      console.error('Payment error:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al iniciar el pago');
    } finally {
      this.processingPayment.set(false);
    }
  }
}
