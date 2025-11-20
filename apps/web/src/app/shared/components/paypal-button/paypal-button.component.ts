import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PayPalBookingGatewayService } from '../../../core/services/paypal-booking-gateway.service';
import { environment } from '../../../../environments/environment';

// PayPal SDK types
interface PayPalWindow extends Window {
  paypal?: {
    Buttons: (config: unknown) => { render: (container: string) => void };
  };
}

declare const window: PayPalWindow;

/**
 * PayPal Button Component
 *
 * Integra el PayPal JS SDK para renderizar botones de pago inteligentes.
 * Maneja el flujo completo de pago: crear orden → aprobar → capturar.
 *
 * Features:
 * - PayPal Smart Payment Buttons
 * - Flujo de aprobación completo
 * - Manejo de errores
 * - Loading states
 * - Mobile responsive
 *
 * Usage:
 * ```html
 * <app-paypal-button
 *   [bookingId]="booking.id"
 *   [useSplitPayment]="true"
 *   (paymentApproved)="handleApproval($event)"
 *   (paymentError)="handleError($event)"
 * ></app-paypal-button>
 * ```
 */
@Component({
  selector: 'app-paypal-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paypal-button.component.html',
  styleUrls: ['./paypal-button.component.css'],
})
export class PayPalButtonComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() bookingId!: string;
  @Input() useSplitPayment = false;
  @Input() clientId?: string; // Optional: Override PayPal client ID
  @Input() currency = 'USD';
  @Input() disabled = false;

  @Output() paymentApproved = new EventEmitter<{ orderId: string; captureId: string }>();
  @Output() paymentError = new EventEmitter<Error>();
  @Output() paymentCancelled = new EventEmitter<void>();
  @Output() loadingChange = new EventEmitter<boolean>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly gatewayService = inject(PayPalBookingGatewayService);

  isLoading = false;
  error: string | null = null;
  sdkLoaded = false;
  private paypalScript?: HTMLScriptElement;

  ngOnInit(): void {
    if (!this.bookingId) {
      this.error = 'Booking ID is required';
      this.paymentError.emit(new Error(this.error));
      return;
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadPayPalSDK();
    }
  }

  ngOnDestroy(): void {
    // Cleanup: remove PayPal script
    if (this.paypalScript && this.paypalScript.parentNode) {
      this.paypalScript.parentNode.removeChild(this.paypalScript);
    }
  }

  /**
   * Load PayPal JS SDK
   */
  loadPayPalSDK(): void {
    // Check if already loaded
    if (window.paypal) {
      this.sdkLoaded = true;
      this.renderPayPalButton();
      return;
    }

    this.isLoading = true;
    this.loadingChange.emit(true);

    // Get client ID from environment or input
    const clientId = this.clientId || this.getPayPalClientId();

    if (!clientId) {
      this.error = 'PayPal Client ID not configured';
      this.paymentError.emit(new Error(this.error));
      this.isLoading = false;
      this.loadingChange.emit(false);
      return;
    }

    // Create script tag
    this.paypalScript = document.createElement('script');
    this.paypalScript.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${this.currency}&intent=capture`;
    this.paypalScript.async = true;

    this.paypalScript.onload = () => {
      this.sdkLoaded = true;
      this.isLoading = false;
      this.loadingChange.emit(false);
      this.renderPayPalButton();
    };

    this.paypalScript.onerror = () => {
      this.error = 'Failed to load PayPal SDK';
      this.paymentError.emit(new Error(this.error));
      this.isLoading = false;
      this.loadingChange.emit(false);
    };

    document.head.appendChild(this.paypalScript);
  }

  /**
   * Render PayPal Smart Payment Buttons
   */
  private renderPayPalButton(): void {
    const paypal = window.paypal;

    if (!paypal) {
      this.error = 'PayPal SDK not loaded';
      return;
    }

    const container = document.getElementById('paypal-button-container');
    if (!container) {
      console.error('PayPal button container not found');
      return;
    }

    // Clear existing buttons
    container.innerHTML = '';

    paypal
      .Buttons({
        // Create order on PayPal side
        createOrder: async (data: unknown, actions: unknown) => {
          return this.createOrder();
        },

        // Handle approval
        onApprove: async (data: { orderID: string }, _actions: unknown) => {
          return this.handleApproval(data.orderID);
        },

        // Handle errors
        onError: (err: unknown) => {
          console.error('PayPal button error:', err);
          this.error = 'Error processing PayPal payment';
          this.paymentError.emit(new Error(this.error));
        },

        // Handle cancellation
        onCancel: (data: unknown) => {
          console.log('PayPal payment cancelled', data);
          this.paymentCancelled.emit();
        },

        // Styling
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'paypal',
          height: 45,
        },
      })
      .render('#paypal-button-container');
  }

  /**
   * Create PayPal order via backend Edge Function
   */
  private async createOrder(): Promise<string> {
    try {
      this.isLoading = true;
      this.loadingChange.emit(true);
      this.error = null;

      const response = await this.gatewayService
        .createBookingPreference(this.bookingId, this.useSplitPayment)
        .toPromise();

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to create PayPal order');
      }

      console.log('PayPal order created:', response.preference_id);

      this.isLoading = false;
      this.loadingChange.emit(false);

      // Return order ID to PayPal SDK
      return response.preference_id;
    } catch (_error) {
      this.isLoading = false;
      this.loadingChange.emit(false);
      this.error = _error instanceof Error ? _error.message : 'Unknown error';
      this.paymentError.emit(_error instanceof Error ? _error : new Error(String(_error)));
      throw _error;
    }
  }

  /**
   * Handle order approval and capture
   */
  private async handleApproval(orderId: string): Promise<void> {
    try {
      this.isLoading = true;
      this.loadingChange.emit(true);
      this.error = null;

      console.log('Capturing PayPal order:', orderId);

      const captureResponse = await this.gatewayService.captureOrder(orderId).toPromise();

      if (!captureResponse || !captureResponse.success) {
        throw new Error(captureResponse?.error || 'Failed to capture PayPal payment');
      }

      console.log('PayPal payment captured:', captureResponse.capture_id);

      this.isLoading = false;
      this.loadingChange.emit(false);

      // Emit success to parent component
      this.paymentApproved.emit({
        orderId: captureResponse.order_id,
        captureId: captureResponse.capture_id,
      });
    } catch (_error) {
      this.isLoading = false;
      this.loadingChange.emit(false);
      this.error = _error instanceof Error ? _error.message : 'Failed to capture payment';
      this.paymentError.emit(_error instanceof Error ? _error : new Error(String(_error)));
    }
  }

  /**
   * Get PayPal Client ID from environment
   */
  private getPayPalClientId(): string {
    return environment.paypalClientId || '';
  }
}
