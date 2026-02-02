// ============================================
// EDGE FUNCTION: notify-multi-channel
// Propósito: Endpoint unificado para que n8n envíe notificaciones
//            a múltiples canales (push, email, whatsapp)
// Llamado por: n8n workflows
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders } from '../_shared/cors.ts';

interface MultiChannelRequest {
  user_id: string;
  channels: ('push' | 'email' | 'whatsapp')[];
  template_code: string;
  variables: Record<string, string>;
  // Optional: override recipient info
  recipient_email?: string;
  recipient_phone?: string;
  recipient_name?: string;
}

interface NotificationResult {
  channel: string;
  success: boolean;
  message_id?: string;
  error?: string;
}

// Template definitions for each channel
const TEMPLATES: Record<string, { subject: string; body: string; push_title: string; push_body: string }> = {
  booking_created: {
    subject: 'Nueva solicitud de reserva - {{car_name}}',
    body: 'Hola {{recipient_name}}, has creado una solicitud de reserva para {{car_name}} del {{start_date}} al {{end_date}}. Total: {{total_price}}.',
    push_title: 'Reserva creada',
    push_body: 'Tu solicitud para {{car_name}} está pendiente de pago.',
  },
  payment_completed: {
    subject: 'Pago recibido - {{car_name}}',
    body: 'Hola {{recipient_name}}, hemos recibido tu pago de {{total_price}} para la reserva de {{car_name}}. El propietario revisará tu solicitud pronto.',
    push_title: 'Pago recibido',
    push_body: 'Tu pago de {{total_price}} fue procesado correctamente.',
  },
  booking_confirmed: {
    subject: '¡Reserva confirmada! - {{car_name}}',
    body: 'Hola {{recipient_name}}, tu reserva de {{car_name}} ha sido confirmada. Fechas: {{start_date}} - {{end_date}}. ¡Prepárate para tu viaje!',
    push_title: '¡Reserva confirmada!',
    push_body: '{{car_name}} te espera del {{start_date}} al {{end_date}}.',
  },
  booking_rejected: {
    subject: 'Reserva no aprobada - {{car_name}}',
    body: 'Hola {{recipient_name}}, lamentablemente el propietario no pudo aprobar tu reserva de {{car_name}}. Tu pago será reembolsado.',
    push_title: 'Reserva no aprobada',
    push_body: 'La reserva de {{car_name}} no fue aprobada. Se procesará tu reembolso.',
  },
  booking_started: {
    subject: '¡Tu reserva comenzó! - {{car_name}}',
    body: 'Hola {{recipient_name}}, tu reserva de {{car_name}} ha comenzado. Disfruta tu viaje y recuerda devolverlo antes del {{end_date}}.',
    push_title: '¡Reserva iniciada!',
    push_body: 'Disfruta {{car_name}}. Devolución: {{end_date}}.',
  },
  return_reminder: {
    subject: 'Recordatorio de devolución - {{car_name}}',
    body: 'Hola {{recipient_name}}, recuerda que debes devolver {{car_name}} el {{end_date}}. Por favor inicia el proceso de devolución en la app.',
    push_title: 'Devolución pendiente',
    push_body: 'Devuelve {{car_name}} antes del {{end_date}}.',
  },
  booking_completed: {
    subject: '¡Reserva completada! - {{car_name}}',
    body: 'Hola {{recipient_name}}, tu reserva de {{car_name}} ha finalizado. ¡Gracias por usar AutoRenta! ¿Podrías dejarnos una reseña?',
    push_title: '¡Reserva completada!',
    push_body: 'Gracias por usar AutoRenta. ¿Nos dejas una reseña?',
  },
  booking_cancelled: {
    subject: 'Reserva cancelada - {{car_name}}',
    body: 'Hola {{recipient_name}}, la reserva de {{car_name}} ha sido cancelada. Si tienes preguntas, contáctanos.',
    push_title: 'Reserva cancelada',
    push_body: 'La reserva de {{car_name}} fue cancelada.',
  },
  dispute_opened: {
    subject: 'Disputa abierta - {{car_name}}',
    body: 'Hola {{recipient_name}}, se ha abierto una disputa para la reserva de {{car_name}}. Nuestro equipo revisará el caso y te contactará.',
    push_title: 'Disputa abierta',
    push_body: 'Se abrió una disputa para {{car_name}}. Revisaremos tu caso.',
  },
  dispute_resolved: {
    subject: 'Disputa resuelta - {{car_name}}',
    body: 'Hola {{recipient_name}}, la disputa de tu reserva de {{car_name}} ha sido resuelta. Revisa los detalles en la app.',
    push_title: 'Disputa resuelta',
    push_body: 'La disputa de {{car_name}} ha sido resuelta.',
  },
  payment_failed: {
    subject: 'Problema con tu pago - {{car_name}}',
    body: 'Hola {{recipient_name}}, hubo un problema procesando tu pago para {{car_name}}. Por favor intenta nuevamente o usa otro método de pago.',
    push_title: 'Pago fallido',
    push_body: 'No pudimos procesar tu pago. Intenta nuevamente.',
  },
  transfer_completed: {
    subject: 'Transferencia realizada - {{amount}}',
    body: 'Hola {{recipient_name}}, hemos transferido {{amount}} a tu cuenta bancaria. El dinero debería estar disponible en 24-48 horas.',
    push_title: 'Transferencia enviada',
    push_body: 'Transferimos {{amount}} a tu cuenta.',
  },
  new_chat_message: {
    subject: 'Nuevo mensaje de {{sender_name}}',
    body: '{{message_preview}}',
    push_title: '{{sender_name}}',
    push_body: '{{message_preview}}',
  },
};

// Replace template variables
function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return rendered;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const request: MultiChannelRequest = await req.json();
    console.log('[Notify Multi-Channel] Request:', JSON.stringify(request, null, 2));

    const { user_id, channels, template_code, variables } = request;

    if (!user_id || !channels || !template_code) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, channels, template_code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get template
    const template = TEMPLATES[template_code];
    if (!template) {
      console.warn(`[Notify Multi-Channel] Unknown template: ${template_code}, using generic`);
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user profile if not provided
    let recipientEmail = request.recipient_email;
    let recipientPhone = request.recipient_phone;
    let recipientName = request.recipient_name;

    if (!recipientEmail || !recipientPhone || !recipientName) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, phone, full_name')
        .eq('id', user_id)
        .single();

      if (profile) {
        recipientEmail = recipientEmail || profile.email;
        recipientPhone = recipientPhone || profile.phone;
        recipientName = recipientName || profile.full_name;
      }
    }

    // Add recipient name to variables
    const enrichedVariables = {
      ...variables,
      recipient_name: recipientName || 'Usuario',
    };

    const results: NotificationResult[] = [];

    // Send to each channel
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'push': {
            // Call send-push-notification function
            const pushTitle = template ? renderTemplate(template.push_title, enrichedVariables) : template_code;
            const pushBody = template ? renderTemplate(template.push_body, enrichedVariables) : JSON.stringify(variables);

            const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                user_id,
                title: pushTitle,
                body: pushBody,
                data: { template_code, ...variables },
              }),
            });

            const pushResult = await pushResponse.json();
            results.push({
              channel: 'push',
              success: pushResponse.ok,
              message_id: pushResult.message_id,
              error: pushResult.error,
            });
            break;
          }

          case 'email': {
            if (!recipientEmail) {
              results.push({ channel: 'email', success: false, error: 'No email address' });
              break;
            }

            // Determine which email function to call based on template
            const emailFunctionMap: Record<string, string> = {
              booking_confirmed: 'send-booking-confirmation-email',
              booking_cancelled: 'send-booking-cancellation-email',
              return_reminder: 'send-booking-reminder-email',
              // Add more mappings as needed
            };

            const emailFunction = emailFunctionMap[template_code] || 'send-marketing-email';
            const subject = template ? renderTemplate(template.subject, enrichedVariables) : template_code;
            const body = template ? renderTemplate(template.body, enrichedVariables) : JSON.stringify(variables);

            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/${emailFunction}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                to: recipientEmail,
                subject,
                body,
                template_code,
                variables: enrichedVariables,
              }),
            });

            const emailResult = await emailResponse.json();
            results.push({
              channel: 'email',
              success: emailResponse.ok,
              message_id: emailResult.message_id,
              error: emailResult.error,
            });
            break;
          }

          case 'whatsapp': {
            if (!recipientPhone) {
              results.push({ channel: 'whatsapp', success: false, error: 'No phone number' });
              break;
            }

            const whatsappBody = template ? renderTemplate(template.body, enrichedVariables) : JSON.stringify(variables);

            // Call whatsapp-followup function for general messages
            const waResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-followup`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                phone: recipientPhone,
                message: whatsappBody,
                template_code,
              }),
            });

            const waResult = await waResponse.json();
            results.push({
              channel: 'whatsapp',
              success: waResponse.ok,
              message_id: waResult.message_id,
              error: waResult.error,
            });
            break;
          }
        }
      } catch (channelError) {
        console.error(`[Notify Multi-Channel] Error on ${channel}:`, channelError);
        results.push({
          channel,
          success: false,
          error: channelError.message,
        });
      }
    }

    const allSuccess = results.every((r) => r.success);
    const anySuccess = results.some((r) => r.success);

    console.log('[Notify Multi-Channel] Results:', JSON.stringify(results, null, 2));

    return new Response(
      JSON.stringify({
        success: anySuccess,
        all_success: allSuccess,
        results,
      }),
      {
        status: allSuccess ? 200 : anySuccess ? 207 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Notify Multi-Channel] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
