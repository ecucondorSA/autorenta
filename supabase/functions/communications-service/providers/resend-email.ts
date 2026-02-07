
import { IEmailProvider, EmailMessage, ProviderResult } from './interfaces.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const DEFAULT_FROM = 'AutoRenta <no-reply@autorentar.com>';

export class ResendProvider implements IEmailProvider {
  async sendEmail(message: EmailMessage): Promise<ProviderResult> {
    if (!RESEND_API_KEY) {
      console.error('[Resend] RESEND_API_KEY not configured');
      return { success: false, provider: 'resend', error: 'Configuration missing' };
    }

    try {
      console.log(`[Resend] Sending email to ${message.to}`);
      
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: message.from || DEFAULT_FROM,
          to: message.to,
          subject: message.subject,
          html: message.html,
          cc: message.cc,
          bcc: message.bcc,
          attachments: message.attachments,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('[Resend] API Error:', errorData);
        return { 
          success: false, 
          provider: 'resend', 
          error: errorData.message || 'Unknown Resend error' 
        };
      }

      const data = await res.json();
      return { 
        success: true, 
        provider: 'resend', 
        messageId: data.id 
      };

    } catch (err) {
      console.error('[Resend] Network Error:', err);
      return { 
        success: false, 
        provider: 'resend', 
        error: err instanceof Error ? err.message : String(err) 
      };
    }
  }
}
