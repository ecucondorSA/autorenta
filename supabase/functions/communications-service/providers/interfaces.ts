
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string; // base64
    type: string;
  }>;
}

export interface WhatsAppMessage {
  to: string; // +549...
  body: string;
  mediaUrl?: string[];
}

export interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
}

export interface ProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string; // 'resend', 'twilio', 'fcm', etc.
}

export interface IEmailProvider {
  sendEmail(message: EmailMessage): Promise<ProviderResult>;
}

export interface IWhatsAppProvider {
  sendWhatsApp(message: WhatsAppMessage): Promise<ProviderResult>;
}

export interface IPushProvider {
  sendPush(message: PushMessage): Promise<ProviderResult>;
}
