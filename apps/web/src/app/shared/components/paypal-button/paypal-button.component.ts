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
 *   (onApprove)="handleApproval($event)"
 *   (onError)="handleError($event)"
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

  @Output() onApprove = new EventEmitter<{ orderId: string; captureId: string }>();
  @Output() onError = new EventEmitter<Error>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() onLoading = new EventEmitter<boolean>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly gatewayService = inject(PayPalBookingGatewayService);

  isLoading = false;
  error: string | null = null;
  sdkLoaded = false;
  private paypalScript?: HTMLScriptElement;

  ngOnInit(): void {
    if (!this.bookingId) {
      this.error = 'Booking ID is required';
      this.onError.emit(new Error(this.error));
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
    if ((window as any).paypal) {
      this.sdkLoaded = true;
      this.renderPayPalButton();
      return;
    }

    this.isLoading = true;
    this.onLoading.emit(true);

    // Get client ID from environment or input
    const clientId = this.clientId || this.getPayPalClientId();

    if (!clientId) {
      this.error = 'PayPal Client ID not configured';
      this.onError.emit(new Error(this.error));
      this.isLoading = false;
      this.onLoading.emit(false);
      return;
    }

    // Create script tag
    this.paypalScript = document.createElement('script');
    this.paypalScript.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${this.currency}&intent=capture`;
    this.paypalScript.async = true;

    this.paypalScript.onload = () => {
      this.sdkLoaded = true;
      this.isLoading = false;
      this.onLoading.emit(false);
      this.renderPayPalButton();
    };

    this.paypalScript.onerror = () => {
      this.error = 'Failed to load PayPal SDK';
      this.onError.emit(new Error(this.error));
      this.isLoading = false;
      this.onLoading.emit(false);
    };

    document.head.appendChild(this.paypalScript);
  }

  /**
   * Render PayPal Smart Payment Buttons
   */
  private renderPayPalButton(): void {
    const paypal = (window as any).paypal;

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
        createOrder: async (data: any, actions: any) => {
          return this.createOrder();
        },

        // Handle approval
        onApprove: async (data: any, actions: any) => {
          return this.handleApproval(data.orderID);
        },

        // Handle errors
        onError: (err: any) => {
          console.error('PayPal button error:', err);
          this.error = 'Error processing PayPal payment';
          this.onError.emit(new Error(this.error));
        },

        // Handle cancellation
        onCancel: (data: any) => {
          console.log('PayPal payment cancelled', data);
          this.onCancel.emit();
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
      this.onLoading.emit(true);
      this.error = null;

      const response = await this.gatewayService
        .createBookingPreference(this.bookingId, this.useSplitPayment)
        .toPromise();

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to create PayPal order');
      }

      console.log('PayPal order created:', response.preference_id);

      this.isLoading = false;
      this.onLoading.emit(false);

      // Return order ID to PayPal SDK
      return response.preference_id;
    } catch (error) {
      this.isLoading = false;
      this.onLoading.emit(false);
      this.error = error instanceof Error ? error.message : 'Unknown error';
      this.onError.emit(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Handle order approval and capture
   */
  private async handleApproval(orderId: string): Promise<void> {
    try {
      this.isLoading = true;
      this.onLoading.emit(true);
      this.error = null;

      console.log('Capturing PayPal order:', orderId);

      const captureResponse = await this.gatewayService.captureOrder(orderId).toPromise();

      if (!captureResponse || !captureResponse.success) {
        throw new Error(captureResponse?.error || 'Failed to capture PayPal payment');
      }

      console.log('PayPal payment captured:', captureResponse.capture_id);

      this.isLoading = false;
      this.onLoading.emit(false);

      // Emit success to parent component
      this.onApprove.emit({
        orderId: captureResponse.order_id,
        captureId: captureResponse.capture_id,
      });
    } catch (error) {
      this.isLoading = false;
      this.onLoading.emit(false);
      this.error = error instanceof Error ? error.message : 'Failed to capture payment';
      this.onError.emit(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get PayPal Client ID from environment
   */
  private getPayPalClientId(): string {
    return environment.paypalClientId || '';
  }
}
