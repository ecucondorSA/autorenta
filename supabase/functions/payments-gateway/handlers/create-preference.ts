
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { MercadoPagoClient } from '../utils/mercadopago-client.ts';
import { requireEmailVerification } from '../../_shared/auth-utils.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'http://localhost:4200';
const MP_MARKETPLACE_ID = Deno.env.get('MERCADOPAGO_MARKETPLACE_ID');
const ENABLE_SPLIT_PAYMENTS = Deno.env.get('MERCADOPAGO_ENABLE_SPLIT_PAYMENTS') === 'true';

interface CreateBookingPreferenceRequest {
  booking_id: string;
  use_split_payment?: boolean;
}

export async function createBookingPreference(req: Request): Promise<Response> {
  const mpClient = new MercadoPagoClient('CreateBookingPreference');
  const corsHeaders = {
    'Content-Type': 'application/json',
    ...getCorsHeaders(req),
  };

  try {
    // 1. Auth & Validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const verificationResult = await requireEmailVerification(supabase);
    if (!verificationResult.isVerified) {
      return new Response(JSON.stringify({ error: verificationResult.error, code: 'EMAIL_NOT_VERIFIED' }), { status: 403, headers: corsHeaders });
    }

    const authenticated_user_id = verificationResult.user!.id;
    const { booking_id, use_split_payment = false }: CreateBookingPreferenceRequest = await req.json();

    if (!booking_id) return new Response(JSON.stringify({ error: 'Missing booking_id' }), { status: 400, headers: corsHeaders });

    // 2. Fetch Booking Data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`*, car:cars(id, title, owner_id, owner:users!cars_owner_id_fkey(id, mercadopago_collector_id, marketplace_approved))`)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404, headers: corsHeaders });

    // 3. Ownership Check
    if (booking.renter_id !== authenticated_user_id) {
      return new Response(JSON.stringify({ error: 'Unauthorized', code: 'OWNERSHIP_VIOLATION' }), { status: 403, headers: corsHeaders });
    }

    if (booking.status !== 'pending' && booking.status !== 'pending_payment') {
      return new Response(JSON.stringify({ error: `Invalid status: ${booking.status}`, code: 'INVALID_BOOKING_STATUS' }), { status: 400, headers: corsHeaders });
    }

    // 4. Currency Conversion (USD -> ARS)
    let amountARS: number;
    let amountUSD: number;
    let platformRate = 0;

    if (booking.currency === 'ARS') {
      amountARS = booking.total_amount;
      const { data: er } = await supabase.from('exchange_rates').select('rate').eq('pair', 'USDARS').limit(1).single();
      platformRate = er?.rate || 1015.0;
      amountUSD = Math.round((amountARS / platformRate) * 100) / 100;
    } else {
      amountUSD = booking.total_amount;
      const { data: er } = await supabase.from('exchange_rates').select('rate').eq('pair', 'USDARS').limit(1).single();
      platformRate = er?.rate || 1015.0;
      amountARS = Math.round(amountUSD * platformRate * 100) / 100;
    }

    // 5. Idempotency Check
    if (booking.mercadopago_preference_id) {
      const existingPref = await mpClient.getPreference(booking.mercadopago_preference_id);
      if (existingPref?.init_point) {
        return new Response(JSON.stringify({
          success: true,
          preference_id: existingPref.id,
          init_point: existingPref.init_point,
          sandbox_init_point: existingPref.sandbox_init_point,
          message: 'Using existing preference'
        }), { status: 200, headers: corsHeaders });
      }
    }

    // 6. User Profile & Customer Creation
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', booking.renter_id).single();
    let customerId = profile?.mercadopago_customer_id;

    if (!customerId) {
        // Create Customer Logic (Simplified)
        const fullName = profile?.full_name || 'Usuario AutoRenta';
        const [firstName, ...rest] = fullName.split(' ');
        const lastName = rest.join(' ') || 'User';
        const customerData = { email: profile?.email, first_name: firstName, last_name: lastName };
        
        const newCustomer = await mpClient.createCustomer(customerData);
        if (newCustomer?.id) {
            customerId = newCustomer.id.toString();
            await supabase.from('profiles').update({ mercadopago_customer_id: customerId }).eq('id', booking.renter_id);
        }
    }

    // 7. Marketplace Split Logic
    const owner = booking.car?.owner;
    const shouldSplit = ENABLE_SPLIT_PAYMENTS && use_split_payment && owner?.marketplace_approved && owner?.mercadopago_collector_id;
    let platformFee = 0;
    let ownerAmount = 0;

    if (shouldSplit) {
        if (!MP_MARKETPLACE_ID) {
            return new Response(JSON.stringify({ error: 'Marketplace not configured', code: 'MARKETPLACE_NOT_CONFIGURED' }), { status: 500, headers: corsHeaders });
        }
        const { data: splitData } = await supabase.rpc('calculate_payment_split', { p_total_amount_cents: Math.round(amountARS * 100) });
        if (splitData) {
            ownerAmount = splitData.owner_amount_cents / 100;
            platformFee = splitData.platform_fee_cents / 100;
        }
    } else if (use_split_payment) {
         // User wanted split but prerequisites not met
         return new Response(JSON.stringify({ 
             error: 'Owner onboarding required', 
             code: 'OWNER_ONBOARDING_REQUIRED', 
             message: 'El propietario no tiene cuenta vinculada.' 
         }), { status: 409, headers: corsHeaders });
    }

    // 8. Build Preference
    const carTitle = booking.car?.title || 'Vehículo';
    const preferenceData = {
      items: [{
        id: booking_id,
        title: `Alquiler de ${carTitle}`,
        quantity: 1,
        unit_price: amountARS,
        currency_id: 'ARS',
      }],
      payer: {
          email: profile?.email,
          ...(customerId && { id: customerId })
      },
      back_urls: {
        success: `${APP_BASE_URL}/bookings/success/${booking_id}?from_mp=true&payment=success`,
        failure: `${APP_BASE_URL}/bookings/success/${booking_id}?from_mp=true&payment=failure`,
        pending: `${APP_BASE_URL}/bookings/success/${booking_id}?from_mp=true&payment=pending`,
      },
      auto_return: 'approved',
      external_reference: booking_id,
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`, // Still points to old webhook for now
      payment_methods: shouldSplit ? {
          excluded_payment_types: [
              { id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }, { id: 'bank_transfer' }, { id: 'atm' }
          ],
          installments: 1
      } : {
          installments: 12
      },
      statement_descriptor: 'AUTORENTAR',
      expires: true,
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ...(shouldSplit && {
          marketplace: MP_MARKETPLACE_ID,
          marketplace_fee: platformFee,
          collector_id: parseInt(owner.mercadopago_collector_id),
      }),
      metadata: {
          booking_id,
          renter_id: booking.renter_id,
          car_id: booking.car_id,
          is_marketplace_split: shouldSplit,
          amount_usd: amountUSD,
          exchange_rate: platformRate
      }
    };

    // 9. Call MP API
    const mpData = await mpClient.createPreference(preferenceData);

    // 10. Update Booking
    await supabase.from('bookings').update({
        mercadopago_preference_id: mpData.id,
        mercadopago_init_point: mpData.init_point
    }).eq('id', booking_id);

    return new Response(JSON.stringify({
        success: true,
        preference_id: mpData.id,
        init_point: mpData.init_point,
        amount_ars: amountARS
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error creating preference:', error);
    return new Response(JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
    }), { status: 500, headers: corsHeaders });
  }
}
