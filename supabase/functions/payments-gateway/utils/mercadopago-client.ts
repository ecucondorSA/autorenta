
import { getMercadoPagoAccessToken, MP_API_BASE } from '../../_shared/mercadopago-token.ts';

/**
 * Cliente HTTP ligero para MercadoPago (SDK-free)
 */
export class MercadoPagoClient {
  private accessToken: string;

  constructor(context: string = 'PaymentsGateway') {
    this.accessToken = getMercadoPagoAccessToken(context);
  }

  async createPreference(preferenceData: any): Promise<any> {
    const response = await fetch(`${MP_API_BASE}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`MercadoPago API error: ${JSON.stringify(errorData)}`);
    }

    return response.json();
  }

  async createCustomer(customerData: any): Promise<any> {
    const response = await fetch(`${MP_API_BASE}/v1/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(customerData),
    });

    if (!response.ok) {
      // Don't throw here, creating customer is optional/enhancement
      console.warn('[MercadoPago] Failed to create customer:', await response.text());
      return null;
    }

    return response.json();
  }

  async getPreference(preferenceId: string): Promise<any> {
    const response = await fetch(`${MP_API_BASE}/checkout/preferences/${preferenceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  }
}
