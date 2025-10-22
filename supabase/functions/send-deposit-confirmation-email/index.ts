// Edge Function: send-deposit-confirmation-email
// Envía email de confirmación cuando un depósito es aprobado
//
// Triggered by: Database trigger on wallet_transactions UPDATE
// Provider: Resend (https://resend.com)
//
// Environment variables required:
// - RESEND_API_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface EmailPayload {
  transaction_id: string;
  user_id: string;
  amount: number;
  currency: string;
  user_email?: string;
  user_name?: string;
}

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const payload: EmailPayload = await req.json();
    console.log('📧 Received email request:', payload);

    // Validate payload
    if (!payload.transaction_id || !payload.user_id || !payload.amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: transaction_id, user_id, amount' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user email if not provided
    let userEmail = payload.user_email;
    let userName = payload.user_name;

    if (!userEmail) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Get user from auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
        payload.user_id
      );

      if (authError || !authUser) {
        console.error('❌ Error getting user:', authError);
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      userEmail = authUser.user.email;

      // Try to get user name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', payload.user_id)
        .single();

      if (profile) {
        userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      }
    }

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: 'User email not found' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Format amount
    const formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: payload.currency || 'USD',
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(payload.amount);

    // Send email via Resend
    if (!RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email skipped (API key not configured)',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Depósito Confirmado - AutoRenta</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Depósito Confirmado</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-top: 0;">
      Hola${userName ? ` ${userName}` : ''},
    </p>

    <p style="font-size: 16px;">
      ¡Excelente noticia! Tu depósito ha sido confirmado exitosamente.
    </p>

    <div style="background: #f7fafc; border-left: 4px solid #48bb78; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #718096;">Monto acreditado:</p>
      <p style="margin: 0; font-size: 32px; font-weight: bold; color: #48bb78;">${formattedAmount}</p>
    </div>

    <p style="font-size: 14px; color: #718096;">
      Tu balance ha sido actualizado y ya puedes usar estos fondos para reservar vehículos en AutoRenta.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://autorenta-web.pages.dev/wallet"
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Ver mi Wallet
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

    <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">
      ID de Transacción: ${payload.transaction_id}
    </p>

    <p style="font-size: 12px; color: #a0aec0; text-align: center; margin-top: 20px;">
      Si no realizaste este depósito, por favor contacta a nuestro soporte inmediatamente.
    </p>
  </div>

  <div style="text-align: center; margin-top: 30px; color: #a0aec0; font-size: 12px;">
    <p>© 2025 AutoRenta. Todos los derechos reservados.</p>
    <p style="margin-top: 10px;">
      <a href="https://autorenta-web.pages.dev" style="color: #667eea; text-decoration: none;">Visitar AutoRenta</a> |
      <a href="mailto:soporte@autorentar.com" style="color: #667eea; text-decoration: none;">Soporte</a>
    </p>
  </div>
</body>
</html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AutoRenta <noreply@autorentar.com>',
        to: [userEmail],
        subject: '✅ Depósito Confirmado - AutoRenta',
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('❌ Error sending email via Resend:', resendData);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send email',
          details: resendData,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Email sent successfully:', resendData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        email_id: resendData.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in send-deposit-confirmation-email:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
