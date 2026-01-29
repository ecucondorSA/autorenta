import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface SequenceStep {
  sequence_id: string;
  step_id: string;
  step_number: number;
  subject: string;
  template_id: string | null;
  html_content: string | null;
  delay_met: boolean;
}

interface Subscriber {
  id: string;
  email: string;
  first_name: string | null;
  user_type: string;
  active_sequences: Array<{
    sequence_id: string;
    current_step: number;
    started_at: string;
  }>;
}

/**
 * Edge Function: Process Email Sequences
 *
 * Procesa secuencias de email pendientes:
 * 1. Obtiene suscriptores con secuencias activas
 * 2. Verifica si el delay del paso actual se cumplió
 * 3. Envía el email correspondiente
 * 4. Avanza al siguiente paso de la secuencia
 *
 * Debe ejecutarse via cron job (cada hora o cada 30 min)
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get subscribers with active sequences
    const { data: subscribers, error: subError } = await supabase
      .from('email_subscribers')
      .select('*')
      .eq('status', 'active')
      .not('active_sequences', 'eq', '[]');

    if (subError) {
      throw new Error(`Failed to fetch subscribers: ${subError.message}`);
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No subscribers with active sequences' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let sent = 0;
    const errors: string[] = [];

    for (const subscriber of subscribers as Subscriber[]) {
      try {
        // Get next email for this subscriber
        const { data: nextEmails, error: nextError } = await supabase
          .rpc('get_next_email_for_subscriber', { p_subscriber_id: subscriber.id });

        if (nextError || !nextEmails || nextEmails.length === 0) {
          continue;
        }

        for (const step of nextEmails as SequenceStep[]) {
          // Check if delay is met
          if (!step.delay_met) {
            continue;
          }

          // Get HTML content (from step or template)
          let htmlContent = step.html_content || getDefaultTemplate(step.subject);

          // Replace variables
          const variables: Record<string, string> = {
            first_name: subscriber.first_name || 'Usuario',
            email: subscriber.email,
            user_type: subscriber.user_type || 'usuario',
          };

          for (const [key, value] of Object.entries(variables)) {
            htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
          }

          // Send email via Resend
          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: 'AutoRenta <newsletter@autorentar.com>',
              to: [subscriber.email],
              subject: step.subject.replace('{{first_name}}', variables.first_name),
              html: htmlContent,
              headers: {
                'List-Unsubscribe': `<https://autorentar.com/unsubscribe?email=${encodeURIComponent(subscriber.email)}>`,
              },
            }),
          });

          if (emailResponse.ok) {
            const emailResult = await emailResponse.json();

            // Record send
            await supabase.rpc('record_email_send', {
              p_subscriber_id: subscriber.id,
              p_sequence_id: step.sequence_id,
              p_step_id: step.step_id,
              p_to_email: subscriber.email,
              p_subject: step.subject,
              p_provider_message_id: emailResult.id,
            });

            // Advance to next step in sequence
            await advanceSequenceStep(supabase, subscriber, step.sequence_id, step.step_number);

            sent++;
            console.log(`✅ Sent sequence email to ${subscriber.email} (step ${step.step_number})`);
          } else {
            const errorData = await emailResponse.json();
            console.error(`Failed to send to ${subscriber.email}:`, errorData);
            errors.push(`${subscriber.email}: ${JSON.stringify(errorData)}`);
          }
        }

        processed++;
      } catch (subError) {
        console.error(`Error processing subscriber ${subscriber.id}:`, subError);
        errors.push(`${subscriber.id}: ${subError instanceof Error ? subError.message : String(subError)}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        sent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-email-sequences:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Avanza al siguiente paso de la secuencia
 */
async function advanceSequenceStep(
  supabase: ReturnType<typeof createClient>,
  subscriber: Subscriber,
  sequenceId: string,
  currentStep: number
) {
  // Get total steps in sequence
  const { data: totalSteps } = await supabase
    .from('email_sequence_steps')
    .select('step_number')
    .eq('sequence_id', sequenceId)
    .eq('is_active', true)
    .order('step_number', { ascending: false })
    .limit(1)
    .single();

  const maxStep = totalSteps?.step_number || currentStep;

  // Update subscriber's active_sequences
  const updatedSequences = subscriber.active_sequences.map((seq) => {
    if (seq.sequence_id === sequenceId) {
      if (currentStep >= maxStep) {
        // Sequence completed - remove it
        return null;
      }
      return {
        ...seq,
        current_step: currentStep + 1,
        started_at: new Date().toISOString(), // Reset timer for next step
      };
    }
    return seq;
  }).filter(Boolean);

  await supabase
    .from('email_subscribers')
    .update({
      active_sequences: updatedSequences,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriber.id);
}

/**
 * Template HTML por defecto si no hay contenido personalizado
 */
function getDefaultTemplate(subject: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 2px solid #3b82f6;">
              <h1 style="margin: 0; color: #1f2937; font-size: 28px;">🚗 AutoRenta</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px;">
              <p style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">
                ¡Hola <strong>{{first_name}}</strong>!
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.6;">
                ${subject}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;" align="center">
              <a href="https://autorentar.com"
                 style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Visitar AutoRenta
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">
                <a href="{{unsubscribe_url}}" style="color: #6b7280;">Cancelar suscripción</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} AutoRenta
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
