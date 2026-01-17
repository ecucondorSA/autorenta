import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface MarketingEmailData {
  subscriberId: string;
  sequenceId?: string;
  stepId?: string;
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  previewText?: string;
  templateId?: string;
  variables?: Record<string, string>;
}

/**
 * Edge Function: Send Marketing Email
 *
 * Envía emails de marketing (secuencias, newsletter, re-engagement)
 * usando Resend y registra el envío en la base de datos.
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: API key de Resend
 * - SUPABASE_URL: URL de Supabase
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const emailData: MarketingEmailData = await req.json();

    // Validate required fields
    if (!emailData.subscriberId || !emailData.toEmail || !emailData.subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: subscriberId, toEmail, subject' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Replace variables in content if provided
    let finalHtml = emailData.htmlContent;
    if (emailData.variables) {
      for (const [key, value] of Object.entries(emailData.variables)) {
        finalHtml = finalHtml.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
    }

    // Add unsubscribe link
    const unsubscribeUrl = `https://autorentar.com/unsubscribe?email=${encodeURIComponent(emailData.toEmail)}`;
    finalHtml = finalHtml.replace('{{unsubscribe_url}}', unsubscribeUrl);

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'AutoRenta <newsletter@autorentar.com>',
        to: [emailData.toEmail],
        subject: emailData.subject,
        html: finalHtml,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Resend API error:', errorData);

      // Record failed send
      await supabase.rpc('record_email_send', {
        p_subscriber_id: emailData.subscriberId,
        p_sequence_id: emailData.sequenceId || null,
        p_step_id: emailData.stepId || null,
        p_to_email: emailData.toEmail,
        p_subject: emailData.subject,
        p_provider_message_id: null,
      });

      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailResult = await emailResponse.json();
    console.log('Marketing email sent:', emailResult.id);

    // Record successful send in database
    const { data: sendId, error: recordError } = await supabase.rpc('record_email_send', {
      p_subscriber_id: emailData.subscriberId,
      p_sequence_id: emailData.sequenceId || null,
      p_step_id: emailData.stepId || null,
      p_to_email: emailData.toEmail,
      p_subject: emailData.subject,
      p_provider_message_id: emailResult.id,
    });

    if (recordError) {
      console.error('Failed to record email send:', recordError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
        sendId: sendId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-marketing-email:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
