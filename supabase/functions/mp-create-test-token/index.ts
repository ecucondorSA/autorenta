import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

/**
 * Edge Function para generar cardTokens de prueba de Mercado Pago
 * Útil para testing sin tener que integrar SDK en frontend
 *
 * SOLO PARA DESARROLLO/TESTING - NO USAR EN PRODUCCIÓN
 */

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;

// HARDCODED Public Key de Sandbox para testing
// TODO: Mover a secret cuando tengas la tuya propia
const MP_PUBLIC_KEY = 'TEST-xxxx'; // Reemplazar con tu Public Key de Sandbox

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

    // Llamar a la API de Mercado Pago para crear token
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      }
    );

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('Mercado Pago token error:', errorData);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create test token',
          details: errorData,
        }),
        {
          status: mpResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const tokenData = await mpResponse.json();
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
