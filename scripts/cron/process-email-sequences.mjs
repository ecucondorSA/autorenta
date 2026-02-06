#!/usr/bin/env node

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

if (!resendApiKey) {
  console.error('RESEND_API_KEY not configured.');
  process.exit(1);
}

const headers = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${text}`);
  }
  if (!text) {
    return null;
  }
  return JSON.parse(text);
}

async function supabaseGet(path) {
  return fetchJson(`${supabaseUrl}/rest/v1/${path}`, { headers });
}

async function supabaseRpc(name, body = {}) {
  return fetchJson(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function supabaseUpdate(table, filter, body) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: {
      ...headers,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Update failed ${response.status}: ${text}`);
  }
}

function getDefaultTemplate(subject) {
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

async function advanceSequenceStep(subscriber, sequenceId, currentStep) {
  const steps = await supabaseGet(
    `email_sequence_steps?select=step_number&sequence_id=eq.${sequenceId}&is_active=eq.true&order=step_number.desc&limit=1`
  );

  const maxStep = steps?.[0]?.step_number ?? currentStep;

  const currentSequences = Array.isArray(subscriber.active_sequences)
    ? subscriber.active_sequences
    : [];

  const updatedSequences = currentSequences
    .map((seq) => {
      if (seq.sequence_id === sequenceId) {
        if (currentStep >= maxStep) {
          return null;
        }
        return {
          ...seq,
          current_step: currentStep + 1,
          started_at: new Date().toISOString(),
        };
      }
      return seq;
    })
    .filter(Boolean);

  await supabaseUpdate(
    'email_subscribers',
    `id=eq.${subscriber.id}`,
    {
      active_sequences: updatedSequences,
      updated_at: new Date().toISOString(),
    }
  );
}

async function main() {
  console.log('🔄 Procesando secuencias de email...');

  const subscribers = await supabaseGet(
    'email_subscribers?select=*&status=eq.active'
  );

  const activeSubscribers = (subscribers || []).filter((sub) => {
    return Array.isArray(sub.active_sequences) && sub.active_sequences.length > 0;
  });

  if (!activeSubscribers || activeSubscribers.length === 0) {
    console.log('No subscribers with active sequences');
    return;
  }

  let processed = 0;
  let sent = 0;
  const errors = [];

  for (const subscriber of activeSubscribers) {
    try {
      const nextEmails = await supabaseRpc('get_next_email_for_subscriber', {
        p_subscriber_id: subscriber.id,
      });

      if (!nextEmails || nextEmails.length === 0) {
        processed++;
        continue;
      }

      for (const step of nextEmails) {
        if (!step.delay_met) {
          continue;
        }

        let htmlContent = step.html_content || getDefaultTemplate(step.subject);

        const variables = {
          first_name: subscriber.first_name || 'Usuario',
          email: subscriber.email,
          user_type: subscriber.user_type || 'usuario',
        };

        for (const [key, value] of Object.entries(variables)) {
          htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

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
              'List-Unsubscribe': `<https://autorentar.com/unsubscribe?email=${encodeURIComponent(subscriber.email)}>`
            },
          }),
        });

        if (emailResponse.ok) {
          const emailResult = await emailResponse.json();

          await supabaseRpc('record_email_send', {
            p_subscriber_id: subscriber.id,
            p_sequence_id: step.sequence_id,
            p_step_id: step.step_id,
            p_to_email: subscriber.email,
            p_subject: step.subject,
            p_provider_message_id: emailResult.id,
          });

          await advanceSequenceStep(subscriber, step.sequence_id, step.step_number);

          sent++;
          console.log(
            `✅ Sent sequence email to ${subscriber.email} (step ${step.step_number})`
          );
        } else {
          const errorData = await emailResponse.json();
          console.error(`Failed to send to ${subscriber.email}:`, errorData);
          errors.push(`${subscriber.email}: ${JSON.stringify(errorData)}`);
        }
      }

      processed++;
    } catch (subError) {
      console.error(`Error processing subscriber ${subscriber.id}:`, subError);
      errors.push(
        `${subscriber.id}: ${subError instanceof Error ? subError.message : String(subError)}`
      );
    }
  }

  console.log(`✅ Procesados: ${processed} suscriptores`);
  console.log(`📧 Emails enviados: ${sent}`);
  if (errors.length > 0) {
    console.warn(`⚠️ Errores: ${errors.length}`);
  }
}

main().catch((error) => {
  console.error('Error in process-email-sequences:', error);
  process.exit(1);
});
