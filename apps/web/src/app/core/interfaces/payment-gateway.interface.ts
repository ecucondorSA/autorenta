import { Observable } from 'rxjs';

/**
 * Payment Provider Types
 * Supported payment providers in AutoRenta
 */
export type PaymentProvider = 'mercadopago' | 'paypal' | 'mock';

/**
 * Generic Payment Preference Response
 * Common interface for all payment providers
 */
export interface PaymentPreferenceResponse {
  success: boolean;
  preference_id: string; // Provider's order/preference ID
  init_point: string; // URL to redirect user for payment
  sandbox_init_point?: string; // Sandbox URL if applicable
  amount_usd?: number; // Amount in USD (if applicable)
  amount_ars?: number; // Amount in ARS (if applicable)
  exchange_rate?: number; // FX rate used for conversion
  currency: string; // Currency code (USD, ARS, etc.)
  provider: PaymentProvider; // Which provider handled this
  error?: string; // Error message if success = false
}

/**
 * Payment Gateway Interface
 *
 * Abstraction for payment provider integrations.
 * Enables multi-provider support (MercadoPago, PayPal) with a unified interface.
 *
 * Benefits:
 * - Provider-agnostic components
 * - Easy testing with mock implementations
 * - Centralized error handling
 * - Type-safe provider switching
 *
 * Example Usage:
 * ```typescript
 * const gateway = this.gatewayFactory.createGateway('paypal');
 * gateway.createBookingPreference(bookingId).subscribe({
 *   next: (response) => gateway.redirectToCheckout(response.init_point),
 *   error: (err) => console.error('Payment error:', err)
 * });
 * ```
 */
export interface PaymentGateway {
  /**
   * Payment provider identifier
   */
  readonly provider: PaymentProvider;

  /**
   * Creates a payment preference/order for a booking
   *
   * @param bookingId - ID of the booking to create payment for
   * @param useSplitPayment - Whether to use marketplace split payments (optional)
   * @returns Observable with payment preference details
   */
  createBookingPreference(
    bookingId: string,
    useSplitPayment?: boolean,
  ): Observable<PaymentPreferenceResponse>;

  /**
   * Validates if a payment preference is still active
   *
   * @param preferenceId - Provider's preference/order ID
   * @returns Promise resolving to true if preference is valid
   */
  isPreferenceValid(preferenceId: string): Promise<boolean>;

  /**
   * Redirects user to provider's checkout page
   *
   * @param checkoutUrl - Provider's checkout URL
   * @param openInNewTab - Whether to open in new tab (default: false)
   */
  redirectToCheckout(checkoutUrl: string, openInNewTab?: boolean): void;

  /**
   * Optional: Capture a payment after approval (PayPal specific)
   *
   * @param orderId - Provider's order ID
   * @returns Observable with capture result
   */
  captureOrder?(orderId: string): Observable<{ success: boolean; transactionId?: string; error?: string }>;
}

/**
 * Wallet Deposit Response
 * Common interface for wallet deposit operations
 */
export interface WalletDepositResponse {
  success: boolean;
  order_id: string; // Provider's order ID
  approval_url: string; // URL to redirect user for payment
  amount_usd: number; // Amount in USD
  currency: string; // Currency code
  transaction_id: string; // Internal wallet transaction ID
  provider: PaymentProvider;
  error?: string;
}

/**
 * Wallet Payment Gateway Interface
 *
 * Abstraction for wallet deposit operations across providers.
 */
export interface WalletPaymentGateway {
  /**
   * Payment provider identifier
   */
  readonly provider: PaymentProvider;

  /**
   * Creates a payment order for wallet deposit
   *
   * @param amountUSD - Amount to deposit in USD
   * @param transactionId - Internal wallet transaction ID
   * @returns Observable with deposit order details
   */
  createDepositOrder(amountUSD: number, transactionId: string): Observable<WalletDepositResponse>;

  /**
   * Verifies a wallet deposit was completed
   *
   * @param transactionId - Internal wallet transaction ID
   * @returns Promise resolving to true if deposit was successful
   */
  verifyDeposit(transactionId: string): Promise<boolean>;
}
