import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * Edge Function para generar cardTokens de prueba de Mercado Pago
 * Útil para testing sin tener que integrar SDK en frontend
 *
 * SOLO PARA DESARROLLO/TESTING - NO USAR EN PRODUCCIÓN
 *
 * NOTA: Esta función NO necesita Public Key porque usa directamente
 * el Access Token del backend para crear tokens de prueba.
 */

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;

interface CreateTokenRequest {
  cardType?: 'approved' | 'rejected' | 'insufficient_funds';
}

// Tarjetas de prueba de Mercado Pago Sandbox
const TEST_CARDS = {
  approved: {
    card_number: '5031755734530604', // Mastercard
    security_code: '123',
    expiration_month: 11,
    expiration_year: 2025,
    cardholder: {
      name: 'APRO',
      identification: {
        type: 'DNI',
        number: '12345678',
      },
    },
  },
  rejected: {
    card_number: '4074090000000004', // Visa
    security_code: '123',
    expiration_month: 11,
    expiration_year: 2025,
    cardholder: {
      name: 'OTHE',
      identification: {
        type: 'DNI',
        number: '12345678',
      },
    },
  },
  insufficient_funds: {
    card_number: '5031755734530604', // Mastercard
    security_code: '123',
    expiration_month: 11,
    expiration_year: 2025,
    cardholder: {
      name: 'FUND',
      identification: {
        type: 'DNI',
        number: '12345678',
      },
    },
  },
};

/**
 * Obtiene la Public Key desde el Access Token
 * Mercado Pago permite obtener información de la cuenta usando Access Token
 */
async function getPublicKeyFromAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to get user info:', response.status);
      return null;
    }

    const userData = await response.json();
    console.log('User ID:', userData.id);

    // La Public Key está en el formato: TEST-{user_id}-{timestamp}
    // O podemos obtenerla directamente de credentials endpoint
    const credsResponse = await fetch('https://api.mercadopago.com/v1/account/credentials', {
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    if (credsResponse.ok) {
      const creds = await credsResponse.json();
      console.log('Found credentials');
      // Buscar la public key en las credenciales
      if (creds.public_key) {
        return creds.public_key;
      }
      // O si viene en array
      if (Array.isArray(creds) && creds.length > 0) {
        return creds[0].public_key;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting public key:', error);
    return null;
  }
}

/**
 * Crea un cardToken usando directamente el Access Token
 * WORKAROUND: MP permite crear tokens con Access Token en modo test
 */
async function createCardTokenWithAccessToken(cardData: any): Promise<any> {
  try {
    // Intentar crear token directamente con Access Token
    const response = await fetch('https://api.mercadopago.com/v1/card_tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cardData),
    });

    if (response.ok) {
      return await response.json();
    }

    // Si falla, intentar con el endpoint público usando Public Key
    console.log('Direct token creation failed, trying with public key...');

    const publicKey = await getPublicKeyFromAccessToken();
    if (!publicKey) {
      throw new Error('Could not obtain public key');
    }

    console.log('Using public key:', publicKey.substring(0, 20) + '...');

    const publicResponse = await fetch(
      `https://api.mercadopago.com/v1/card_tokens?public_key=${publicKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      }
    );

    if (!publicResponse.ok) {
      const errorData = await publicResponse.json();
      throw new Error(JSON.stringify(errorData));
    }

    return await publicResponse.json();
  } catch (error) {
    console.error('Error creating card token:', error);
    throw error;
  }
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const body: CreateTokenRequest = await req.json().catch(() => ({}));
    const cardType = body.cardType || 'approved';

    const cardData = TEST_CARDS[cardType];

    console.log('Creating test token for card type:', cardType);

    // Crear token usando Access Token directamente
    const tokenData = await createCardTokenWithAccessToken(cardData);

    console.log('Test token created:', tokenData.id);

    return new Response(
      JSON.stringify({
        success: true,
        cardToken: tokenData.id,
        cardType: cardType,
        last4: tokenData.last_four_digits,
        expiresIn: '1 hour',
        warning: 'This is a TEST token for development only',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Fatal error in mp-create-test-token:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
