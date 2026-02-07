
import { IWhatsAppProvider, WhatsAppMessage, ProviderResult } from './interfaces.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886';

export class TwilioWhatsAppProvider implements IWhatsAppProvider {
  async sendWhatsApp(message: WhatsAppMessage): Promise<ProviderResult> {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.warn('[Twilio] Credentials missing. Logging message instead (Dev Mode).');
      console.log(`[Twilio-DEV] To: ${message.to}, Body: ${message.body}`);
      return { success: true, provider: 'twilio-dev', messageId: 'dev-mode' };
    }

    try {
      // Normalize phone number (ensure whatsapp: prefix)
      const to = message.to.startsWith('whatsapp:') ? message.to : `whatsapp:${message.to}`;
      const from = TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:') ? TWILIO_WHATSAPP_NUMBER : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;

      console.log(`[Twilio] Sending to ${to}`);

      const formData = new URLSearchParams();
      formData.append('From', from);
      formData.append('To', to);
      formData.append('Body', message.body);
      
      if (message.mediaUrl && message.mediaUrl.length > 0) {
        message.mediaUrl.forEach(url => formData.append('MediaUrl', url));
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Twilio] API Error:', errorText);
        return { 
          success: false, 
          provider: 'twilio', 
          error: `Twilio API Error: ${res.status}` 
        };
      }

      const data = await res.json();
      return { 
        success: true, 
        provider: 'twilio', 
        messageId: data.sid 
      };

    } catch (err) {
      console.error('[Twilio] Network Error:', err);
      return { 
        success: false, 
        provider: 'twilio', 
        error: err instanceof Error ? err.message : String(err) 
      };
    }
  }
}
