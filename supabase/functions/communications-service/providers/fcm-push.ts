
import { IPushProvider, PushMessage, ProviderResult } from './interfaces.ts';
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

// Encapsulated FCM Logic (Moved from old function)
export class FcmProvider implements IPushProvider {
  private static cachedToken: { token: string; expiry: number } | null = null;
  private serviceAccount: any;

  constructor() {
    this.serviceAccount = this.loadServiceAccount();
  }

  private loadServiceAccount() {
    const b64 = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_B64');
    const plain = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    
    if (b64) {
      try {
        return JSON.parse(atob(b64));
      } catch (e) {
        console.error('[FCM] Failed to decode Service Account B64');
      }
    }
    if (plain) {
      try {
        return JSON.parse(plain);
      } catch (e) {
        console.error('[FCM] Failed to parse Service Account JSON');
      }
    }
    return null;
  }

  async sendPush(message: PushMessage): Promise<ProviderResult> {
    if (!this.serviceAccount) {
      console.error('[FCM] Service Account not configured');
      return { success: false, provider: 'fcm', error: 'Configuration missing' };
    }

    try {
      const accessToken = await this.getAccessToken();
      const projectId = this.serviceAccount.project_id;

      const fcmPayload = {
        message: {
          token: message.token,
          notification: {
            title: message.title,
            body: message.body,
          },
          data: message.data || {},
          android: {
            priority: message.priority === 'high' ? 'HIGH' : 'NORMAL',
          },
        }
      };

      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(fcmPayload),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[FCM] Error for token ${message.token.substring(0, 10)}...: ${errorText}`);
        return { 
          success: false, 
          provider: 'fcm', 
          error: `FCM Error ${res.status}: ${errorText}` 
        };
      }

      const data = await res.json();
      return { 
        success: true, 
        provider: 'fcm', 
        messageId: data.name 
      };

    } catch (err) {
      console.error('[FCM] Execution Error:', err);
      return { 
        success: false, 
        provider: 'fcm', 
        error: err instanceof Error ? err.message : String(err) 
      };
    }
  }

  // --- PRIVATE AUTH METHODS (Cleaned up from original) ---

  private async getAccessToken(): Promise<string> {
    if (FcmProvider.cachedToken && Date.now() < FcmProvider.cachedToken.expiry - 60000) {
      return FcmProvider.cachedToken.token;
    }

    const jwt = await this.createJWT();
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!res.ok) throw new Error('Failed to get FCM Access Token');
    const data = await res.json();

    FcmProvider.cachedToken = {
      token: data.access_token,
      expiry: Date.now() + (data.expires_in * 1000),
    };
    return data.access_token;
  }

  private async createJWT(): Promise<string> {
    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.serviceAccount.client_email,
      sub: this.serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    };

    const encoder = new TextEncoder();
    const headerB64 = this.base64UrlEncode(JSON.stringify(header));
    const payloadB64 = this.base64UrlEncode(JSON.stringify(payload));
    const input = `${headerB64}.${payloadB64}`;

    const privateKey = await this.importPrivateKey(this.serviceAccount.private_key);
    const signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      privateKey,
      encoder.encode(input)
    );

    return `${input}.${this.base64UrlEncode(new Uint8Array(signature))}`;
  }

  private base64UrlEncode(input: string | Uint8Array): string {
    const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
    const base64 = base64Encode(bytes);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private async importPrivateKey(pem: string): Promise<CryptoKey> {
    const pemContents = pem
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\s/g, '');
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    return await crypto.subtle.importKey(
      'pkcs8', binaryDer, 
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, 
      false, ['sign']
    );
  }
}
