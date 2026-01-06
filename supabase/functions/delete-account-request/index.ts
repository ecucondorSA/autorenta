// ============================================
// EDGE FUNCTION: delete-account-request
// Proposito: Solicitar eliminacion de cuenta por email
// Para usuarios que no pueden acceder a su cuenta
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface DeleteRequest {
  email: string;
  reason?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[Delete Account Request] Processing request');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let body: DeleteRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.email || !body.email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Valid email required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = body.email.toLowerCase().trim();

    console.log(`[Delete Account Request] Request for email: ${email}`);

    // Check if user exists
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('email', email)
      .single();

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (!profile) {
      console.log(`[Delete Account Request] User not found for email: ${email}`);
      // Log the attempt anyway for security
      await supabaseAdmin.from('audit_logs').insert({
        action: 'delete_account_request_not_found',
        details: {
          email,
          reason: body.reason,
          ip_address: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For'),
        },
      });

      // Return success anyway (no email enumeration)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Si existe una cuenta con ese email, recibiras un enlace de confirmacion',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate deletion token (valid 24h)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    await supabaseAdmin.from('account_deletion_requests').insert({
      user_id: profile.id,
      email,
      token,
      reason: body.reason || 'No especificado',
      expires_at: expiresAt.toISOString(),
      ip_address: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For'),
    });

    // Send confirmation email
    const deleteUrl = `https://autorentar.com/confirm-delete-account?token=${token}`;

    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Autorentar <no-reply@autorentar.com>',
            to: [email],
            subject: 'Confirma la eliminacion de tu cuenta - Autorentar',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                  .button { display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
                  .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
                  .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Solicitud de Eliminacion de Cuenta</h1>
                  </div>
                  <div class="content">
                    <p>Hola ${profile.full_name || 'Usuario'},</p>
                    <p>Recibimos una solicitud para eliminar tu cuenta de Autorentar asociada a este email.</p>

                    <div class="warning">
                      <strong>Advertencia:</strong> Esta accion es permanente e irreversible. Se eliminaran todos tus datos, vehiculos publicados, historial de reservas y saldo de wallet.
                    </div>

                    <p>Si deseas continuar con la eliminacion de tu cuenta, haz clic en el siguiente boton:</p>

                    <p style="text-align: center;">
                      <a href="${deleteUrl}" class="button">Confirmar Eliminacion de Cuenta</a>
                    </p>

                    <p><strong>Este enlace expira en 24 horas.</strong></p>

                    <p>Si no solicitaste eliminar tu cuenta, puedes ignorar este email. Tu cuenta permanecera segura.</p>

                    <p>Si tienes preguntas, contactanos en <a href="mailto:soporte@autorentar.com">soporte@autorentar.com</a></p>
                  </div>
                  <div class="footer">
                    <p>Este email fue enviado por Autorentar</p>
                    <p>Si no solicitaste esto, por favor ignora este mensaje.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error('[Delete Account Request] Failed to send email:', await emailResponse.text());
        }
      } catch (emailError) {
        console.error('[Delete Account Request] Email error:', emailError);
      }
    }

    // Log request for audit
    await supabaseAdmin.from('audit_logs').insert({
      user_id: profile.id,
      action: 'delete_account_request',
      details: {
        email,
        reason: body.reason,
        token_expires_at: expiresAt.toISOString(),
      },
      ip_address: req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For'),
    });

    console.log(`[Delete Account Request] Request processed for user ${profile.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Si existe una cuenta con ese email, recibiras un enlace de confirmacion',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Delete Account Request] Error:', errorMessage);

    return new Response(
      JSON.stringify({ error: 'Failed to process request', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/* ============================================
 * DOCUMENTACION
 * ============================================
 *
 * ## Proposito
 *
 * Permite a usuarios que no pueden acceder a su cuenta
 * solicitar la eliminacion enviando un email de confirmacion.
 *
 * ## Uso
 *
 * POST /functions/v1/delete-account-request
 * Headers:
 *   apikey: <supabase_anon_key>
 * Body:
 * {
 *   "email": "usuario@email.com",
 *   "reason": "Motivo opcional"
 * }
 *
 * ## Flujo
 *
 * 1. Usuario envia email
 * 2. Si existe cuenta, se envia email con link de confirmacion
 * 3. Link valido por 24 horas
 * 4. Al hacer clic, se ejecuta eliminacion
 *
 * ## Seguridad
 *
 * - No revela si el email existe (previene enumeracion)
 * - Token de un solo uso
 * - Expiracion de 24 horas
 * - IP logging para auditoria
 *
 * ## Tabla Requerida
 *
 * CREATE TABLE account_deletion_requests (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES profiles(id),
 *   email TEXT NOT NULL,
 *   token TEXT NOT NULL UNIQUE,
 *   reason TEXT,
 *   expires_at TIMESTAMPTZ NOT NULL,
 *   used_at TIMESTAMPTZ,
 *   ip_address TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * ============================================ */
