// Sync Booking to Google Calendar
// Creates/updates/deletes calendar events when bookings change

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:4200';

interface Booking {
  id: string;
  car_id: string;
  locatario_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  precio_total: number;
  status: string;
  google_calendar_event_id?: string;
}

interface Car {
  id: string;
  marca: string;
  modelo: string;
  year: number;
  user_id: string;
}

interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  reminders: { useDefault: boolean; overrides: Array<{ method: string; minutes: number }> };
  colorId?: string;
}

serve(async (req) => {
  const corsHeaders = {
    ...corsHeaders,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get request body
    const { booking_id, operation } = await req.json();

    if (!booking_id) {
      return new Response(JSON.stringify({ error: 'Missing booking_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, cars(*)')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate car data
    if (!booking.cars || typeof booking.cars !== 'object' || Array.isArray(booking.cars)) {
      return new Response(JSON.stringify({ error: 'Invalid car data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const carRecord = booking.cars as Record<string, unknown>;
    if (!carRecord.id || !carRecord.user_id) {
      return new Response(JSON.stringify({ error: 'Car missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const car = booking.cars as Car;

    // ========================================================================
    // Get Calendar Token for Car Owner (Locador)
    // ========================================================================
    const { data: locadorToken, error: locadorTokenError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', car.user_id)
      .eq('sync_enabled', true)
      .single();

    // ========================================================================
    // Get Calendar Token for Renter (Locatario)
    // ========================================================================
    const { data: locatarioToken, error: locatarioTokenError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', booking.locatario_id)
      .eq('sync_enabled', true)
      .single();

    // Check if we need to refresh tokens
    const locadorTokenValid = locadorToken && new Date(locadorToken.expires_at) > new Date();
    const locatarioTokenValid =
      locatarioToken && new Date(locatarioToken.expires_at) > new Date();

    if (!locadorTokenValid && !locatarioTokenValid) {
      return new Response(
        JSON.stringify({ error: 'No valid calendar tokens found for owner or renter' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================================================
    // Get or Create Car Calendar
    // ========================================================================
    let carCalendar;
    const { data: existingCarCalendar } = await supabase
      .from('car_google_calendars')
      .select('*')
      .eq('car_id', car.id)
      .single();

    if (existingCarCalendar) {
      carCalendar = existingCarCalendar;
    } else if (locadorTokenValid) {
      // Create new calendar for this car
      const calendarName = `AutoRenta - ${car.marca} ${car.modelo} (${car.year})`;
      const calendarDescription = `Bookings para ${car.marca} ${car.modelo}`;

      const createCalendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${locadorToken.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: calendarName,
            description: calendarDescription,
            timeZone: 'America/Argentina/Buenos_Aires',
          }),
        }
      );

      if (!createCalendarResponse.ok) {
        const error = await createCalendarResponse.text();
        console.error('Calendar creation failed:', error);
        throw new Error('Failed to create car calendar');
      }

      const newCalendar = await createCalendarResponse.json();

      // Save to database
      const { data: savedCalendar } = await supabase.from('car_google_calendars').insert({
        car_id: car.id,
        google_calendar_id: newCalendar.id,
        calendar_name: calendarName,
        calendar_description: calendarDescription,
        owner_id: car.user_id,
        sync_enabled: true,
      }).select().single();

      carCalendar = savedCalendar;
    }

    // ========================================================================
    // Build Calendar Event
    // ========================================================================
    const eventTitle = `🚗 Booking: ${car.marca} ${car.modelo}`;
    const bookingUrl = `${FRONTEND_URL}/bookings/${booking.id}`;

    const eventDescription = `
📅 Booking AutoRenta

🚗 Auto: ${car.marca} ${car.modelo} (${car.year})
📍 Booking ID: ${booking.id}
💰 Precio Total: $${booking.precio_total.toLocaleString('es-AR')}
📊 Estado: ${booking.status}

🔗 Ver detalles: ${bookingUrl}

---
Powered by AutoRenta
    `.trim();

    const calendarEvent: CalendarEvent = {
      summary: eventTitle,
      description: eventDescription,
      start: {
        dateTime: new Date(booking.fecha_inicio).toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: new Date(booking.fecha_fin).toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
    };

    // Color based on booking status
    const colorMap: Record<string, string> = {
      pending: '5', // Yellow
      approved: '10', // Green
      active: '9', // Blue
      completed: '8', // Gray
      cancelled: '11', // Red
    };
    calendarEvent.colorId = colorMap[booking.status] || '10';

    // ========================================================================
    // Sync to Car Owner's Calendar (Locador)
    // ========================================================================
    let locadorEventId = null;
    if (locadorTokenValid && carCalendar) {
      try {
        if (operation === 'delete' && booking.google_calendar_event_id) {
          // Delete event
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${carCalendar.google_calendar_id}/events/${booking.google_calendar_event_id}`,
            {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${locadorToken.access_token}` },
            }
          );
        } else if (booking.google_calendar_event_id) {
          // Update existing event
          const updateResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${carCalendar.google_calendar_id}/events/${booking.google_calendar_event_id}`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${locadorToken.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(calendarEvent),
            }
          );

          if (updateResponse.ok) {
            const updatedEvent = await updateResponse.json();
            locadorEventId = updatedEvent.id;
          }
        } else {
          // Create new event
          const createResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${carCalendar.google_calendar_id}/events`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${locadorToken.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(calendarEvent),
            }
          );

          if (createResponse.ok) {
            const createdEvent = await createResponse.json();
            locadorEventId = createdEvent.id;
          }
        }
      } catch (error) {
        console.error('Error syncing to locador calendar:', error);
      }
    }

    // ========================================================================
    // Sync to Renter's Calendar (Locatario)
    // ========================================================================
    if (locatarioTokenValid && locatarioToken.primary_calendar_id) {
      try {
        const locatarioEvent = {
          ...calendarEvent,
          summary: `🚗 Mi Booking: ${car.marca} ${car.modelo}`,
        };

        if (operation !== 'delete') {
          // Create/update in primary calendar
          await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${locatarioToken.primary_calendar_id}/events`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${locatarioToken.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(locatarioEvent),
            }
          );
        }
      } catch (error) {
        console.error('Error syncing to locatario calendar:', error);
      }
    }

    // ========================================================================
    // Update Booking with Event ID
    // ========================================================================
    if (locadorEventId && operation !== 'delete') {
      await supabase
        .from('bookings')
        .update({
          google_calendar_event_id: locadorEventId,
          calendar_synced_at: new Date().toISOString(),
        })
        .eq('id', booking_id);
    } else if (operation === 'delete') {
      await supabase
        .from('bookings')
        .update({
          google_calendar_event_id: null,
          calendar_synced_at: new Date().toISOString(),
        })
        .eq('id', booking_id);
    }

    // ========================================================================
    // Log Sync Operation
    // ========================================================================
    await supabase.from('calendar_sync_log').insert({
      booking_id: booking_id,
      car_id: car.id,
      user_id: car.user_id,
      operation: operation || 'sync',
      status: 'success',
      google_calendar_event_id: locadorEventId,
      sync_direction: 'to_google',
    });

    return new Response(
      JSON.stringify({
        success: true,
        event_id: locadorEventId,
        synced_to_locador: !!locadorTokenValid,
        synced_to_locatario: !!locatarioTokenValid,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in sync-booking-to-calendar:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }
});
