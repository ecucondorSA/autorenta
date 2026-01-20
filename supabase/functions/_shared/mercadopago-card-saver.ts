/**
 * Helper para guardar tarjetas en MercadoPago Customers API
 *
 * Permite renovar pre-autorizaciones sin pedir la tarjeta otra vez
 */

const MP_API_BASE = 'https://api.mercadopago.com/v1';

interface SaveCardResult {
  success: boolean;
  card_id?: string;
  customer_id?: string;
  error?: string;
}

interface CardInfo {
  id: string;
  last_four_digits: string;
  expiration_month: number;
  expiration_year: number;
  cardholder: {
    name: string;
  };
  payment_method: {
    id: string; // visa, master, amex
  };
}

/**
 * Guarda una tarjeta en MercadoPago asociada a un customer
 *
 * @param customerId - ID del customer en MercadoPago
 * @param cardToken - Token de tarjeta generado por el frontend
 * @param mpAccessToken - Access token de MercadoPago
 */
export async function saveCardToCustomer(
  customerId: string,
  cardToken: string,
  mpAccessToken: string
): Promise<SaveCardResult> {
  try {
    console.log(`[CardSaver] Saving card to customer ${customerId}...`);

    const response = await fetch(`${MP_API_BASE}/customers/${customerId}/cards`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: cardToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[CardSaver] Error saving card:', errorData);

      // Si el error es que la tarjeta ya existe, obtener las tarjetas existentes
      if (errorData.cause?.[0]?.code === 'card_already_exists' ||
          errorData.message?.includes('already exists')) {
        console.log('[CardSaver] Card already exists, fetching existing cards...');
        return await getExistingCard(customerId, mpAccessToken);
      }

      return {
        success: false,
        error: errorData.message || 'Error guardando tarjeta',
      };
    }

    const cardData: CardInfo = await response.json();
    console.log(`[CardSaver] Card saved successfully: ${cardData.id}`);

    return {
      success: true,
      card_id: cardData.id,
      customer_id: customerId,
    };
  } catch (error) {
    console.error('[CardSaver] Exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene la primera tarjeta activa de un customer
 */
async function getExistingCard(
  customerId: string,
  mpAccessToken: string
): Promise<SaveCardResult> {
  try {
    const response = await fetch(`${MP_API_BASE}/customers/${customerId}/cards`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: 'No se pudieron obtener las tarjetas' };
    }

    const cards: CardInfo[] = await response.json();

    if (cards.length === 0) {
      return { success: false, error: 'No hay tarjetas guardadas' };
    }

    // Retornar la primera tarjeta activa
    const card = cards[0];
    return {
      success: true,
      card_id: card.id,
      customer_id: customerId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo tarjetas',
    };
  }
}

/**
 * Obtiene información detallada de una tarjeta
 */
export async function getCardInfo(
  customerId: string,
  cardId: string,
  mpAccessToken: string
): Promise<CardInfo | null> {
  try {
    const response = await fetch(`${MP_API_BASE}/customers/${customerId}/cards/${cardId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Crea un pago usando una tarjeta guardada (customer + card_id)
 * Usado para renovar pre-autorizaciones
 */
export async function createPaymentWithSavedCard(
  customerId: string,
  cardId: string,
  amount: number,
  description: string,
  externalReference: string,
  mpAccessToken: string,
  capture: boolean = false // false = pre-autorización
): Promise<{
  success: boolean;
  payment_id?: number;
  status?: string;
  status_detail?: string;
  error?: string;
}> {
  try {
    console.log(`[CardSaver] Creating payment with saved card ${cardId} for customer ${customerId}...`);

    // Obtener info de la tarjeta para el payment_method_id
    const cardInfo = await getCardInfo(customerId, cardId, mpAccessToken);
    if (!cardInfo) {
      return { success: false, error: 'No se pudo obtener información de la tarjeta' };
    }

    const payload = {
      transaction_amount: Number(amount.toFixed(2)),
      description: description,
      installments: 1,
      payment_method_id: cardInfo.payment_method.id,
      payer: {
        type: 'customer',
        id: customerId,
      },
      card_id: cardId,
      external_reference: externalReference,
      capture: capture,
      metadata: {
        type: capture ? 'payment' : 'preauth',
        is_renewal: true,
      },
    };

    const response = await fetch(`${MP_API_BASE}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `renewal-${externalReference}-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CardSaver] Payment failed:', data);
      return {
        success: false,
        error: data.message || 'Error creando pago',
      };
    }

    console.log(`[CardSaver] Payment created: ${data.id}, status: ${data.status}`);

    return {
      success: true,
      payment_id: data.id,
      status: data.status,
      status_detail: data.status_detail,
    };
  } catch (error) {
    console.error('[CardSaver] Exception creating payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Cancela/libera una pre-autorización
 */
export async function cancelPreauthorization(
  paymentId: string,
  mpAccessToken: string
): Promise<boolean> {
  try {
    console.log(`[CardSaver] Canceling pre-auth ${paymentId}...`);

    const response = await fetch(`${MP_API_BASE}/payments/${paymentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[CardSaver] Cancel failed:', errorData);
      return false;
    }

    console.log(`[CardSaver] Pre-auth ${paymentId} cancelled successfully`);
    return true;
  } catch (error) {
    console.error('[CardSaver] Exception canceling pre-auth:', error);
    return false;
  }
}
