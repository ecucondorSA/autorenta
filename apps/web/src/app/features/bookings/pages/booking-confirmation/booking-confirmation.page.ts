import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentProvider } from '../../../../core/interfaces/payment-gateway.interface';
import { BookingsService } from '../../../../core/services/bookings.service';

type ConfirmationStatus = 'success' | 'pending' | 'error';

interface PaymentDetails {
  provider: PaymentProvider;
  orderId?: string;
  captureId?: string;
  preferenceId?: string;
  paymentId?: string;
}

/**
 * Booking Confirmation Page
 *
 * Página de confirmación después de completar un pago.
 * Soporta múltiples proveedores (MercadoPago, PayPal).
 *
 * Query Params:
 * - provider: 'mercadopago' | 'paypal'
 * - orderId: ID de la orden (PayPal)
 * - captureId: ID de la captura (PayPal)
 * - preferenceId: ID de la preferencia (MercadoPago)
 * - paymentId: ID del pago (MercadoPago)
 * - status: 'approved' | 'pending' | 'rejected' (MercadoPago)
 *
 * @example
 * Route: /bookings/:bookingId/confirmation?provider=paypal&orderId=xxx&captureId=yyy
 */
@Component({
  selector: 'app-booking-confirmation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-confirmation.page.html',
  styleUrls: ['./booking-confirmation.page.css'],
})
export class BookingConfirmationPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);

  // ==================== SIGNALS ====================

  /**
   * ID del booking
   */
  bookingId = signal<string>('');

  /**
   * Detalles del booking
   */
  booking = signal<any>(null);

  /**
   * Estado de la confirmación
   */
  status = signal<ConfirmationStatus>('pending');

  /**
   * Detalles del pago
   */
  paymentDetails = signal<PaymentDetails | null>(null);

  /**
   * Estado de carga
   */
  isLoading = signal<boolean>(true);

  /**
   * Mensaje de error
   */
  errorMessage = signal<string>('');

  /**
   * Timestamp de la confirmación
   */
  confirmedAt = signal<Date>(new Date());

  // ==================== COMPUTED SIGNALS ====================

  /**
   * ¿El pago fue exitoso?
   */
  readonly isSuccess = computed(() => {
    return this.status() === 'success';
  });

  /**
   * ¿El pago está pendiente?
   */
  readonly isPending = computed(() => {
    return this.status() === 'pending';
  });

  /**
   * ¿Hubo un error?
   */
  readonly isError = computed(() => {
    return this.status() === 'error';
  });

  /**
   * Nombre del proveedor para mostrar
   */
  readonly providerDisplayName = computed(() => {
    const provider = this.paymentDetails()?.provider;
    if (!provider) return '';

    switch (provider) {
      case 'mercadopago':
        return 'MercadoPago';
      case 'paypal':
        return 'PayPal';
      default:
        return provider;
    }
  });

  /**
   * Mensaje de confirmación
   */
  readonly confirmationMessage = computed(() => {
    const status = this.status();
    const provider = this.providerDisplayName();

    if (status === 'success') {
      return `¡Pago confirmado con ${provider}!`;
    } else if (status === 'pending') {
      return `Pago pendiente de confirmación`;
    } else {
      return `Error procesando el pago`;
    }
  });

  /**
   * ID de referencia del pago para mostrar
   */
  readonly paymentReferenceId = computed(() => {
    const details = this.paymentDetails();
    if (!details) return '';

    if (details.provider === 'paypal') {
      return details.orderId || details.captureId || '';
    } else {
      return details.paymentId || details.preferenceId || '';
    }
  });

  // ==================== LIFECYCLE ====================

  async ngOnInit(): Promise<void> {
    // Obtener booking ID de la ruta
    const id = this.route.snapshot.paramMap.get('bookingId');
    if (!id) {
      this.status.set('error');
      this.errorMessage.set('ID de booking no encontrado');
      this.isLoading.set(false);
      return;
    }

    this.bookingId.set(id);

    // Obtener parámetros de query
    const queryParams = this.route.snapshot.queryParams;
    this.extractPaymentDetails(queryParams);

    try {
      await this.loadBookingAndVerifyPayment();
    } catch (err) {
      this.status.set('error');
      this.errorMessage.set(err instanceof Error ? err.message : 'Error cargando la confirmación');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Extrae detalles del pago de los query params
   */
  private extractPaymentDetails(queryParams: unknown): void {
    const provider = (queryParams as any)['provider'] as PaymentProvider;
    const orderId = (queryParams as any)['orderId'];
    const captureId = (queryParams as any)['captureId'];
    const preferenceId = (queryParams as any)['preference_id'];
    const paymentId = (queryParams as any)['payment_id'];
    const mpStatus = (queryParams as any)['status'];

    if (!provider) {
      this.status.set('error');
      this.errorMessage.set('Proveedor de pago no especificado');
      return;
    }

    this.paymentDetails.set({
      provider,
      orderId,
      captureId,
      preferenceId,
      paymentId,
    });

    // Determinar estado inicial basado en query params
    if (provider === 'mercadopago' && mpStatus) {
      if (mpStatus === 'approved') {
        this.status.set('success');
      } else if (mpStatus === 'pending') {
        this.status.set('pending');
      } else {
        this.status.set('error');
        this.errorMessage.set('El pago fue rechazado o cancelado');
      }
    } else if (provider === 'paypal' && captureId) {
      // Si hay captureId, el pago fue capturado exitosamente
      this.status.set('success');
    } else if (provider === 'paypal' && orderId) {
      // Solo orderId, puede estar pendiente
      this.status.set('pending');
    }
  }

  /**
   * Carga el booking y verifica el estado del pago
   */
  private async loadBookingAndVerifyPayment(): Promise<void> {
    const bookingData = await this.bookingsService.getBookingById(this.bookingId());

    if (!bookingData) {
      throw new Error('Booking no encontrado');
    }

    this.booking.set(bookingData);

    // Verificar estado del booking
    if (bookingData.status === 'confirmed') {
      this.status.set('success');
    } else if (bookingData.status === 'pending_payment') {
      // El webhook puede tardar unos segundos
      this.status.set('pending');
      // Opcional: polling para verificar actualización
      this.startPollingBookingStatus();
    } else if (bookingData.status === 'cancelled') {
      this.status.set('error');
      this.errorMessage.set(`El booking está en estado "${bookingData.status}"`);
    }
  }

  /**
   * Inicia polling para verificar actualización del booking
   */
  private startPollingBookingStatus(): void {
    let attempts = 0;
    const maxAttempts = 10;
    const interval = 3000; // 3 segundos

    const pollInterval = setInterval(async () => {
      attempts++;

      try {
        const bookingData = await this.bookingsService.getBookingById(this.bookingId());

        if (bookingData && bookingData.status === 'confirmed') {
          this.status.set('success');
          this.booking.set(bookingData);
          clearInterval(pollInterval);
        } else if (attempts >= maxAttempts) {
          // Después de 30 segundos, dejar en pending
          clearInterval(pollInterval);
        }
      } catch (_error) {
        console.error('Error polling booking status:', _error);
        clearInterval(pollInterval);
      }
    }, interval);
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Navega a la página de detalles del booking
   */
  viewBookingDetails(): void {
    this.router.navigate(['/bookings', this.bookingId()]);
  }

  /**
   * Navega al inicio
   */
  goToHome(): void {
    this.router.navigate(['/']);
  }

  /**
   * Navega a la lista de bookings del usuario
   */
  goToMyBookings(): void {
    this.router.navigate(['/bookings']);
  }

  /**
   * Descarga recibo de pago
   */
  downloadReceipt(): void {
    const booking = this.booking();
    const payment = this.paymentDetails();

    if (!booking || !payment) {
      alert('No hay información disponible para generar el recibo');
      return;
    }

    const receiptHtml = this.generateReceiptHTML(booking, payment);

    // Crear blob y descargar
    const blob = new Blob([receiptHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recibo-${(booking as any).id}.html`;
    link.click();

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Genera HTML del recibo de pago
   */
  private generateReceiptHTML(booking: unknown, _payment: PaymentDetails): string {
    const confirmDate = this.formatDate(this.confirmedAt());
    const totalAmount = this.formatCurrency(
      (booking as any).total_price,
      (booking as any).currency || 'ARS',
    );

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo de Pago - ${(booking as any).id}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 2rem auto;
      padding: 2rem;
      background: #f9fafb;
    }
    .receipt {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    .header h1 {
      color: #1f2937;
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }
    .header p {
      color: #6b7280;
      margin: 0;
    }
    .section {
      margin-bottom: 1.5rem;
    }
    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #6b7280;
      font-weight: 500;
    }
    .detail-value {
      color: #1f2937;
      font-weight: 600;
    }
    .total-row {
      background: #f0fdf4;
      padding: 1rem;
      border-radius: 6px;
      margin-top: 1rem;
    }
    .total-row .detail-label {
      font-size: 1.125rem;
      color: #166534;
    }
    .total-row .detail-value {
      font-size: 1.5rem;
      color: #16a34a;
    }
    .footer {
      text-align: center;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 0.875rem;
    }
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background: #d1fae5;
      color: #065f46;
    }
    @media print {
      body {
        background: white;
        margin: 0;
        padding: 1rem;
      }
      .receipt {
        box-shadow: none;
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>🚗 AutoRenta</h1>
      <p>Recibo de Pago</p>
    </div>

    <div class="section">
      <h2 class="section-title">Información de la Reserva</h2>
      <div class="detail-row">
        <span class="detail-label">ID de Reserva:</span>
        <span class="detail-value">${(booking as any).id}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Vehículo:</span>
        <span class="detail-value">${(booking as any).car?.brand || ''} ${(booking as any).car?.model || ''}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Desde:</span>
        <span class="detail-value">${this.formatDate((booking as any).start_date)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Hasta:</span>
        <span class="detail-value">${this.formatDate((booking as any).end_date)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Estado:</span>
        <span class="status-badge">Confirmada</span>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Detalles del Pago</h2>
      <div class="detail-row">
        <span class="detail-label">Proveedor:</span>
        <span class="detail-value">${this.providerDisplayName()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">ID de Referencia:</span>
        <span class="detail-value">${this.paymentReferenceId()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Fecha de Pago:</span>
        <span class="detail-value">${confirmDate}</span>
      </div>
      <div class="total-row detail-row">
        <span class="detail-label">Total Pagado:</span>
        <span class="detail-value">${totalAmount}</span>
      </div>
    </div>

    <div class="footer">
      <p>Este recibo confirma el pago de tu reserva en AutoRenta.</p>
      <p>Para cualquier consulta, contacta a soporte&#64;autorentar.com</p>
      <p style="margin-top: 1rem; font-size: 0.75rem; color: #9ca3af;">
        Generado el ${this.formatDate(new Date())}
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Reintenta cargar la confirmación
   */
  async retry(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.loadBookingAndVerifyPayment();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error cargando la confirmación');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Formatea un monto como moneda
   */
  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat(currency === 'ARS' ? 'es-AR' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Formatea una fecha
   */
  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }
}
