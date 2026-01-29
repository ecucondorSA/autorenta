/**
 * PayPal API Helper
 * Shared utilities for PayPal Orders API v2 integration
 */

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'live';
  partnerAttributionId?: string;
}

export interface PayPalAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  app_id: string;
}

export interface PayPalOrderRequest {
  intent: 'CAPTURE';
  purchase_units: PayPalPurchaseUnit[];
  payment_source?: {
    paypal?: {
      experience_context?: {
        return_url: string;
        cancel_url: string;
        brand_name?: string;
        landing_page?: 'LOGIN' | 'BILLING' | 'NO_PREFERENCE';
        user_action?: 'CONTINUE' | 'PAY_NOW';
      };
    };
  };
  application_context?: {
    brand_name?: string;
    return_url?: string;
    cancel_url?: string;
    user_action?: 'CONTINUE' | 'PAY_NOW';
  };
}

export interface PayPalPurchaseUnit {
  reference_id: string;
  description?: string;
  custom_id?: string;
  soft_descriptor?: string;
  amount: {
    currency_code: string;
    value: string;
    breakdown?: {
      item_total?: { currency_code: string; value: string };
      shipping?: { currency_code: string; value: string };
      handling?: { currency_code: string; value: string };
      tax_total?: { currency_code: string; value: string };
      discount?: { currency_code: string; value: string };
    };
  };
  items?: PayPalItem[];
  payment_instruction?: {
    platform_fees?: Array<{
      amount: {
        currency_code: string;
        value: string;
      };
      payee?: {
        email_address?: string;
        merchant_id?: string;
      };
    }>;
    disbursement_mode?: 'INSTANT' | 'DELAYED';
  };
  payee?: {
    email_address?: string;
    merchant_id?: string;
  };
}

export interface PayPalItem {
  name: string;
  description?: string;
  sku?: string;
  unit_amount: {
    currency_code: string;
    value: string;
  };
  tax?: {
    currency_code: string;
    value: string;
  };
  quantity: string;
  category?: 'DIGITAL_GOODS' | 'PHYSICAL_GOODS' | 'DONATION';
}

export interface PayPalOrder {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
  create_time?: string;
  update_time?: string;
}

export interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    reference_id: string;
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
      }>;
    };
  }>;
}

export class PayPalAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'PayPalAPIError';
  }
}

/**
 * Get PayPal API base URL based on environment
 */
export function getPayPalAPIUrl(environment: 'sandbox' | 'live'): string {
  return environment === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

/**
 * Get OAuth 2.0 access token from PayPal
 * Tokens expire after ~9 hours, should be cached
 */
export async function getPayPalAccessToken(
  config: PayPalConfig
): Promise<string> {
  const auth = btoa(`${config.clientId}:${config.clientSecret}`);
  const apiUrl = getPayPalAPIUrl(config.environment);

  const response = await fetch(`${apiUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new PayPalAPIError(
      `Failed to get PayPal access token: ${error}`,
      response.status,
      error
    );
  }

  const data: PayPalAccessTokenResponse = await response.json();
  return data.access_token;
}

/**
 * Make authenticated request to PayPal API with idempotency support
 */
export async function paypalFetch<T = any>(
  config: PayPalConfig,
  accessToken: string,
  path: string,
  init: RequestInit = {},
  idempotencyKey?: string
): Promise<T> {
  const apiUrl = getPayPalAPIUrl(config.environment);
  const url = path.startsWith('http') ? path : `${apiUrl}${path}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };

  // Add Partner Attribution ID (BN code) if provided
  if (config.partnerAttributionId) {
    headers['PayPal-Partner-Attribution-Id'] = config.partnerAttributionId;
  }

  // Add idempotency key for POST requests
  if (idempotencyKey && init.method === 'POST') {
    headers['PayPal-Request-Id'] = idempotencyKey;
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new PayPalAPIError(
      `PayPal API error: ${error}`,
      response.status,
      error
    );
  }

  // Some PayPal endpoints return 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return await response.json();
}

/**
 * Create PayPal order
 */
export async function createPayPalOrder(
  config: PayPalConfig,
  accessToken: string,
  orderRequest: PayPalOrderRequest,
  idempotencyKey?: string
): Promise<PayPalOrder> {
  return await paypalFetch<PayPalOrder>(
    config,
    accessToken,
    '/v2/checkout/orders',
    {
      method: 'POST',
      body: JSON.stringify(orderRequest),
    },
    idempotencyKey
  );
}

/**
 * Get PayPal order details
 */
export async function getPayPalOrder(
  config: PayPalConfig,
  accessToken: string,
  orderId: string
): Promise<PayPalOrder> {
  return await paypalFetch<PayPalOrder>(
    config,
    accessToken,
    `/v2/checkout/orders/${orderId}`,
    {
      method: 'GET',
    }
  );
}

/**
 * Capture PayPal order (complete the payment)
 */
export async function capturePayPalOrder(
  config: PayPalConfig,
  accessToken: string,
  orderId: string,
  idempotencyKey?: string
): Promise<PayPalCaptureResponse> {
  return await paypalFetch<PayPalCaptureResponse>(
    config,
    accessToken,
    `/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    idempotencyKey
  );
}

/**
 * Verify PayPal webhook signature
 * Uses PayPal's webhook verification endpoint
 */
export async function verifyPayPalWebhookSignature(
  config: PayPalConfig,
  accessToken: string,
  webhookId: string,
  headers: Record<string, string>,
  body: any
): Promise<boolean> {
  try {
    const verificationRequest = {
      auth_algo: headers['paypal-auth-algo'] || headers['PAYPAL-AUTH-ALGO'],
      cert_url: headers['paypal-cert-url'] || headers['PAYPAL-CERT-URL'],
      transmission_id: headers['paypal-transmission-id'] || headers['PAYPAL-TRANSMISSION-ID'],
      transmission_sig: headers['paypal-transmission-sig'] || headers['PAYPAL-TRANSMISSION-SIG'],
      transmission_time: headers['paypal-transmission-time'] || headers['PAYPAL-TRANSMISSION-TIME'],
      webhook_id: webhookId,
      webhook_event: body,
    };

    const result = await paypalFetch<{ verification_status: string }>(
      config,
      accessToken,
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: JSON.stringify(verificationRequest),
      }
    );

    return result.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('PayPal webhook signature verification failed:', error);
    return false;
  }
}

/**
 * Get approval URL from order links
 */
export function getApprovalUrl(order: PayPalOrder): string | null {
  const approveLink = order.links.find(link => link.rel === 'approve' || link.rel === 'payer-action');
  return approveLink?.href || null;
}

/**
 * Convert cents to PayPal decimal format (e.g., 150000 cents -> "1500.00")
 */
export function centsToPayPalAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Convert PayPal decimal amount to cents (e.g., "1500.00" -> 150000)
 */
export function payPalAmountToCents(amount: string): number {
  return Math.round(parseFloat(amount) * 100);
}
