/**
 * TikTok Events API - Supabase Edge Function
 *
 * Envía eventos de servidor a TikTok Pixel de manera segura.
 * El access token se mantiene en el servidor y no se expone al cliente.
 *
 * Endpoint: /functions/v1/tiktok-events
 * Method: POST
 *
 * @see https://business-api.tiktok.com/portal/docs?id=1771101027431425
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TIKTOK_PIXEL_ID = 'D4AHBBBC77U2U4VHPCO0';
const TIKTOK_API_VERSION = 'v1.3';
const TIKTOK_API_BASE_URL = 'https://business-api.tiktok.com';

// Event types supported
type TikTokEventType =
  | 'ViewContent'
  | 'AddToWishlist'
  | 'Search'
  | 'AddPaymentInfo'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'PlaceAnOrder'
  | 'CompleteRegistration'
  | 'Purchase';

interface TikTokEventData {
  event: TikTokEventType;
  event_id?: string;
  event_time: number;
  user: {
    email?: string;
    phone?: string;
    external_id?: string;
    ip?: string;
    user_agent?: string;
    ttclid?: string;
  };
  properties?: {
    value?: number;
    currency?: string;
    content_id?: string;
    content_type?: string;
    content_name?: string;
    search_string?: string;
    url?: string;
    contents?: Array<{
      content_id: string;
      content_name?: string;
      quantity?: number;
      price?: number;
    }>;
  };
}

interface TikTokAPIPayload {
  pixel_code: string;
  event: string;
  event_id?: string;
  timestamp: string;
  context: {
    user: {
      external_id?: string;
      email?: string;
      phone?: string;
    };
    user_agent?: string;
    ip?: string;
  };
  properties: Record<string, unknown>;
}

/**
 * Hash data using SHA256 (TikTok requires hashed PII)
 */
async function hashSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Send event to TikTok Events API
 */
async function sendTikTokEvent(
  eventData: TikTokEventData,
  accessToken: string
): Promise<{ success: boolean; message?: string; tiktokResponse?: unknown }> {
  try {
    // Hash PII data (email, phone)
    const hashedEmail = eventData.user.email
      ? await hashSHA256(eventData.user.email)
      : undefined;

    const hashedPhone = eventData.user.phone
      ? await hashSHA256(eventData.user.phone)
      : undefined;

    // Build TikTok API payload
    const payload: TikTokAPIPayload = {
      pixel_code: TIKTOK_PIXEL_ID,
      event: eventData.event,
      event_id: eventData.event_id || crypto.randomUUID(),
      timestamp: new Date(eventData.event_time).toISOString(),
      context: {
        user: {
          external_id: eventData.user.external_id,
          email: hashedEmail,
          phone: hashedPhone,
        },
        user_agent: eventData.user.user_agent,
        ip: eventData.user.ip,
      },
      properties: {
        ...eventData.properties,
        contents: eventData.properties?.contents || [],
      },
    };

    // Remove undefined values
    Object.keys(payload.context.user).forEach(key => {
      if (payload.context.user[key as keyof typeof payload.context.user] === undefined) {
        delete payload.context.user[key as keyof typeof payload.context.user];
      }
    });

    // Send to TikTok API
    const url = `${TIKTOK_API_BASE_URL}/open_api/${TIKTOK_API_VERSION}/event/track/`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
      body: JSON.stringify({
        event_source: 'web',
        event_source_id: TIKTOK_PIXEL_ID,
        data: [payload],
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('TikTok API error:', responseData);
      return {
        success: false,
        message: `TikTok API error: ${response.status}`,
        tiktokResponse: responseData,
      };
    }

    console.log('TikTok event sent successfully:', eventData.event);
    return {
      success: true,
      tiktokResponse: responseData,
    };
  } catch (error) {
    console.error('Error sending TikTok event:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get TikTok access token from environment
    const accessToken = Deno.env.get('TIKTOK_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('TIKTOK_ACCESS_TOKEN not configured');
    }

    // Parse request body
    const eventData: TikTokEventData = await req.json();

    // Validate required fields
    if (!eventData.event) {
      return new Response(
        JSON.stringify({ error: 'Event type is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!eventData.event_time) {
      eventData.event_time = Date.now();
    }

    // Get user IP from request headers if not provided
    if (!eventData.user.ip) {
      eventData.user.ip = req.headers.get('x-forwarded-for') ||
                          req.headers.get('x-real-ip') ||
                          'unknown';
    }

    // Get user agent if not provided
    if (!eventData.user.user_agent) {
      eventData.user.user_agent = req.headers.get('user-agent') || 'unknown';
    }

    // Send event to TikTok
    const result = await sendTikTokEvent(eventData, accessToken);

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
