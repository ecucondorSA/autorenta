import { createClient } from '@supabase/supabase-js';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  GOOGLE_CALENDAR_API_KEY: string;
  GOOGLE_CALENDAR_ID: string;
  GOOGLE_CALENDAR_CLIENT_ID?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    date?: string; // YYYY-MM-DD for all-day events
    dateTime?: string; // ISO 8601 for timed events
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
}

interface GoogleCalendarEventsResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
  summary?: string;
  timeZone?: string;
}

interface GoogleCalendarWebhookPayload {
  headers: {
    'x-goog-channel-id'?: string;
    'x-goog-channel-token'?: string;
    'x-goog-resource-id'?: string;
    'x-goog-resource-uri'?: string;
    'x-goog-resource-state'?: string;
    'x-goog-message-number'?: string;
  };
}

const jsonResponse = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=UTF-8',
    },
  });

const getSupabaseAdminClient = (env: Env) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin credentials are missing.');
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (input, init) => fetch(input, init),
    },
  });
};

/**
 * Obtiene eventos de Google Calendar API
 */
async function fetchGoogleCalendarEvents(
  env: Env,
  timeMin?: string,
  timeMax?: string,
): Promise<GoogleCalendarEvent[]> {
  const calendarId = encodeURIComponent(env.GOOGLE_CALENDAR_ID);
  const apiKey = env.GOOGLE_CALENDAR_API_KEY;

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
  );
  url.searchParams.set('key', apiKey);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  if (timeMin) {
    url.searchParams.set('timeMin', timeMin);
  }
  if (timeMax) {
    url.searchParams.set('timeMax', timeMax);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Calendar API error: ${response.status} - ${error}`);
  }

  const data: GoogleCalendarEventsResponse = await response.json();
  return data.items || [];
}

/**
 * Sincroniza eventos de Google Calendar con la base de datos
 */
async function syncCalendarEvents(env: Env): Promise<{ synced: number; errors: number }> {
  const supabase = getSupabaseAdminClient(env);

  // Obtener eventos de los próximos 90 días
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const events = await fetchGoogleCalendarEvents(env, timeMin, timeMax);

    let synced = 0;
    let errors = 0;

    for (const event of events) {
      // Solo procesar eventos confirmados
      if (event.status !== 'confirmed') {
        continue;
      }

      const startDate = event.start.date || event.start.dateTime?.split('T')[0];
      const endDate = event.end.date || event.end.dateTime?.split('T')[0];

      if (!startDate || !endDate) {
        continue;
      }

      try {
        // Insertar o actualizar bloqueo de fechas en la base de datos
        // Asumiendo que tienes una tabla 'calendar_blocks' o similar
        const { error: dbError } = await supabase.from('calendar_blocks').upsert(
          {
            google_event_id: event.id,
            calendar_id: env.GOOGLE_CALENDAR_ID,
            start_date: startDate,
            end_date: endDate,
            summary: event.summary,
            description: event.description,
            location: event.location,
            html_link: event.htmlLink,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'google_event_id',
          },
        );

        if (dbError) {
          console.error(`Error syncing event ${event.id}:`, dbError);
          errors++;
        } else {
          synced++;
        }
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        errors++;
      }
    }

    return { synced, errors };
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

/**
 * Maneja webhooks de Google Calendar
 */
async function handleWebhook(
  request: Request,
  env: Env,
): Promise<Response> {
  const headers = Object.fromEntries(request.headers.entries());

  // Verificar que es un webhook válido de Google Calendar
  const channelId = headers['x-goog-channel-id'];
  const resourceState = headers['x-goog-resource-state'];

  if (!channelId) {
    return jsonResponse({ error: 'Invalid webhook' }, 400);
  }

  // Google Calendar envía diferentes tipos de notificaciones
  // 'sync' - Primera notificación cuando se crea el canal
  // 'exists' - Notificación cuando hay cambios
  if (resourceState === 'sync') {
    // Primera sincronización - obtener todos los eventos
    return jsonResponse({ message: 'Webhook channel created, syncing...' });
  }

  if (resourceState === 'exists') {
    // Hay cambios - sincronizar eventos
    try {
      const result = await syncCalendarEvents(env);
      return jsonResponse({
        message: 'Calendar synced',
        synced: result.synced,
        errors: result.errors,
      });
    } catch (error) {
      console.error('Error syncing calendar:', error);
      return jsonResponse(
        { error: 'Failed to sync calendar', details: String(error) },
        500,
      );
    }
  }

  return jsonResponse({ message: 'Webhook received' });
}

/**
 * Endpoint principal del Worker
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Webhook endpoint para Google Calendar
      if (path === '/webhook' && request.method === 'POST') {
        const response = await handleWebhook(request, env);
        // Agregar CORS headers
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // Endpoint para sincronización manual
      if (path === '/sync' && request.method === 'GET') {
        const result = await syncCalendarEvents(env);
        const response = jsonResponse({
          success: true,
          synced: result.synced,
          errors: result.errors,
          timestamp: new Date().toISOString(),
        });
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // Endpoint para obtener eventos
      if (path === '/events' && request.method === 'GET') {
        const timeMin = url.searchParams.get('timeMin') || undefined;
        const timeMax = url.searchParams.get('timeMax') || undefined;

        const events = await fetchGoogleCalendarEvents(env, timeMin, timeMax);
        const response = jsonResponse({
          success: true,
          events,
          count: events.length,
        });
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // Health check
      if (path === '/health' && request.method === 'GET') {
        return jsonResponse({
          status: 'ok',
          service: 'google-calendar-sync',
          timestamp: new Date().toISOString(),
        });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (error) {
      console.error('Worker error:', error);
      const response = jsonResponse(
        {
          error: 'Internal server error',
          message: error instanceof Error ? error.message : String(error),
        },
        500,
      );
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
  },

  /**
   * Cron job para sincronización automática
   * Configurar en Cloudflare Dashboard → Workers → Triggers → Cron Triggers
   */
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      syncCalendarEvents(env).then((result) => {
        console.log(`Calendar sync completed: ${result.synced} synced, ${result.errors} errors`);
      }),
    );
  },
};





