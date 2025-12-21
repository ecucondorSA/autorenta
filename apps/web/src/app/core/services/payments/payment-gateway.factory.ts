import { Injectable, inject } from '@angular/core';
import {
  PaymentGateway,
  PaymentProvider,
  WalletPaymentGateway,
} from '@core/interfaces/payment-gateway.interface';
import { MercadoPagoBookingGatewayService } from '@core/services/payments/mercadopago-booking-gateway.service';
import { MercadoPagoWalletGatewayService } from '@core/services/payments/mercadopago-wallet-gateway.service';
import { PayPalBookingGatewayService } from '@core/services/payments/paypal-booking-gateway.service';
import { PayPalWalletGatewayService } from '@core/services/payments/paypal-wallet-gateway.service';

/**
 * Payment Gateway Factory
 *
 * Factory para crear instancias de payment gateways basado en el provider seleccionado.
 * Implementa el patrón Factory para desacoplar los componentes de los proveedores específicos.
 *
 * Ventajas:
 * - Centraliza la lógica de creación de gateways
 * - Facilita agregar nuevos providers sin modificar componentes
 * - Permite testing con mock providers
 * - Soporta cambio dinámico de provider en runtime
 *
 * Uso en componentes:
 * ```typescript
 * export class CheckoutComponent {
 *   private gatewayFactory = inject(PaymentGatewayFactory);
 *
 *   processPayment(provider: PaymentProvider) {
 *     const gateway = this.gatewayFactory.createBookingGateway(provider);
 *     gateway.createBookingPreference(this.bookingId).subscribe(...);
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class PaymentGatewayFactory {
  // Inject all available gateway services
  private readonly mercadoPagoBookingGateway = inject(MercadoPagoBookingGatewayService);
  private readonly mercadoPagoWalletGateway = inject(MercadoPagoWalletGatewayService);
  private readonly payPalBookingGateway = inject(PayPalBookingGatewayService);
  private readonly payPalWalletGateway = inject(PayPalWalletGatewayService);

  /**
   * Crea una instancia de gateway para pagos de bookings
   *
   * @param provider - Provider de pago (mercadopago, paypal, mock)
   * @returns Instancia de PaymentGateway para el provider especificado
   * @throws Error si el provider no está soportado
   */
  createBookingGateway(provider: PaymentProvider): PaymentGateway {
    switch (provider) {
      case 'mercadopago':
        return this.mercadoPagoBookingGateway;

      case 'paypal':
        return this.payPalBookingGateway;

      case 'mock':
        // Para testing: retorna un gateway mock
        return this.createMockBookingGateway();

      default:
        throw new Error(`Payment provider "${provider}" is not supported`);
    }
  }

  /**
   * Crea una instancia de gateway para depósitos de wallet
   *
   * @param provider - Provider de pago
   * @returns Instancia de WalletPaymentGateway
   * @throws Error si el provider no está soportado
   */
  createWalletGateway(provider: PaymentProvider): WalletPaymentGateway {
    switch (provider) {
      case 'mercadopago':
        return this.mercadoPagoWalletGateway;

      case 'paypal':
        return this.payPalWalletGateway;

      case 'mock':
        return this.createMockWalletGateway();

      default:
        throw new Error(`Wallet payment provider "${provider}" is not supported`);
    }
  }

  /**
   * Verifica si un provider está disponible para bookings
   *
   * @param provider - Provider a verificar
   * @returns true si el provider está soportado
   */
  isBookingProviderAvailable(provider: PaymentProvider): boolean {
    return ['mercadopago', 'paypal', 'mock'].includes(provider);
  }

  /**
   * Verifica si un provider está disponible para wallet
   *
   * @param provider - Provider a verificar
   * @returns true si el provider está soportado
   */
  isWalletProviderAvailable(provider: PaymentProvider): boolean {
    return ['mercadopago', 'paypal', 'mock'].includes(provider);
  }

  /**
   * Obtiene la lista de providers disponibles para bookings
   *
   * @returns Array de providers soportados
   */
  getAvailableBookingProviders(): PaymentProvider[] {
    return ['mercadopago', 'paypal'];
  }

  /**
   * Obtiene la lista de providers disponibles para wallet
   *
   * @returns Array de providers soportados
   */
  getAvailableWalletProviders(): PaymentProvider[] {
    return ['mercadopago', 'paypal'];
  }

  /**
   * Crea un gateway mock para testing de bookings
   * @private
   */
  private createMockBookingGateway(): PaymentGateway {
    return {
      provider: 'mock',
      createBookingPreference: (_bookingId: string) => {
        // Implementación mock para testing
        throw new Error('Mock gateway not implemented. Use real provider in production.');
      },
      isPreferenceValid: async () => true,
      redirectToCheckout: () => {
        console.warn('Mock gateway: redirectToCheckout called');
      },
    };
  }

  /**
   * Crea un gateway mock para testing de wallet
   * @private
   */
  private createMockWalletGateway(): WalletPaymentGateway {
    return {
      provider: 'mock',
      createDepositOrder: (_amountUSD: number, _transactionId: string) => {
        throw new Error('Mock wallet gateway not implemented. Use real provider in production.');
      },
      verifyDeposit: async () => true,
    };
  }
}
