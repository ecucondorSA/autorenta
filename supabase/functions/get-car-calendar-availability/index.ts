// Get Car Calendar Availability
// Queries Google Calendar for a specific car's availability

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface BlockedDate {
  date: string; // YYYY-MM-DD
  event_id: string;
  title: string;
  description?: string;
}

interface AvailabilityResponse {
  available: boolean;
  blocked_dates: string[];
  events: BlockedDate[];
  car_id: string;
  from: string;
  to: string;
  google_calendar_checked: boolean;
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const carId = url.searchParams.get('car_id');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    // Validate parameters
    if (!carId) {
      return new Response(JSON.stringify({ error: 'Missing car_id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!from || !to) {
      return new Response(JSON.stringify({ error: 'Missing from or to date parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // 1. Get car information and owner
    // ========================================================================
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('id, user_id, marca, modelo, year')
      .eq('id', carId)
      .single();

    if (carError || !car) {
      return new Response(JSON.stringify({ error: 'Car not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // 2. Check if car owner has Google Calendar connected
    // ========================================================================
    const { data: ownerToken, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', car.user_id)
      .eq('sync_enabled', true)
      .single();

    // If owner doesn't have Google Calendar connected, fall back to local DB check
    if (tokenError || !ownerToken) {
      console.log('Owner does not have Google Calendar connected, checking local DB only');

      // Query local bookings table
      const { data: bookings } = await supabase
        .from('bookings')
        .select('fecha_inicio, fecha_fin, status')
        .eq('car_id', carId)
        .in('status', ['approved', 'active'])
        .gte('fecha_fin', from)
        .lte('fecha_inicio', to);

      // Convert bookings to blocked dates
      const blockedDates = new Set<string>();
      if (bookings) {
        for (const booking of bookings) {
          const start = new Date(booking.fecha_inicio);
          const end = new Date(booking.fecha_fin);
          const current = new Date(start);

          while (current <= end) {
            blockedDates.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        }
      }

      const blockedDatesArray = Array.from(blockedDates);
      const available = blockedDatesArray.length === 0;

      return new Response(
        JSON.stringify({
          available,
          blocked_dates: blockedDatesArray,
          events: [],
          car_id: carId,
          from,
          to,
          google_calendar_checked: false,
        } as AvailabilityResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================================================
    // 3. Check if token is expired and refresh if needed
    // ========================================================================
    const tokenExpired = new Date(ownerToken.expires_at) < new Date();
    let accessToken = ownerToken.access_token;

    if (tokenExpired) {
      console.log('Token expired, refreshing...');

      // Refresh token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: ownerToken.refresh_token,
          client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!,
          client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        console.error('Token refresh failed');
        return new Response(JSON.stringify({ error: 'Failed to refresh Google Calendar token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newTokens = await refreshResponse.json();
      accessToken = newTokens.access_token;

      // Update token in database
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
      await supabase
        .from('google_calendar_tokens')
        .update({
          access_token: newTokens.access_token,
          expires_at: expiresAt.toISOString(),
        })
        .eq('user_id', car.user_id);
    }

    // ========================================================================
    // 4. Get car's Google Calendar ID
    // ========================================================================
    const { data: carCalendar } = await supabase
      .from('car_google_calendars')
      .select('google_calendar_id, calendar_name')
      .eq('car_id', carId)
      .single();

    // If no calendar exists for this car yet, return local DB check
    if (!carCalendar) {
      console.log('No Google Calendar found for this car, using local DB');

      const { data: bookings } = await supabase
        .from('bookings')
        .select('fecha_inicio, fecha_fin, status')
        .eq('car_id', carId)
        .in('status', ['approved', 'active'])
        .gte('fecha_fin', from)
        .lte('fecha_inicio', to);

      const blockedDates = new Set<string>();
      if (bookings) {
        for (const booking of bookings) {
          const start = new Date(booking.fecha_inicio);
          const end = new Date(booking.fecha_fin);
          const current = new Date(start);

          while (current <= end) {
            blockedDates.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        }
      }

      const blockedDatesArray = Array.from(blockedDates);
      const available = blockedDatesArray.length === 0;

      return new Response(
        JSON.stringify({
          available,
          blocked_dates: blockedDatesArray,
          events: [],
          car_id: carId,
          from,
          to,
          google_calendar_checked: false,
        } as AvailabilityResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================================================
    // 5. Query Google Calendar API for events
    // ========================================================================
    const timeMin = new Date(from).toISOString();
    const timeMax = new Date(to + 'T23:59:59').toISOString();

    const calendarUrl = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(carCalendar.google_calendar_id)}/events`
    );
    calendarUrl.searchParams.set('timeMin', timeMin);
    calendarUrl.searchParams.set('timeMax', timeMax);
    calendarUrl.searchParams.set('singleEvents', 'true');
    calendarUrl.searchParams.set('orderBy', 'startTime');

    const calendarResponse = await fetch(calendarUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!calendarResponse.ok) {
      const error = await calendarResponse.text();
      console.error('Google Calendar API error:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch Google Calendar events' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const calendarData = await calendarResponse.json();
    const events: BlockedDate[] = [];
    const blockedDates = new Set<string>();

    // Process events
    if (calendarData.items && calendarData.items.length > 0) {
      for (const event of calendarData.items) {
        // Skip cancelled events
        if (event.status === 'cancelled') continue;

        const startDate = event.start.date || event.start.dateTime?.split('T')[0];
        const endDate = event.end.date || event.end.dateTime?.split('T')[0];

        if (startDate && endDate) {
          // Add all dates in this event to blocked dates
          const start = new Date(startDate);
          const end = new Date(endDate);
          const current = new Date(start);

          while (current < end) {
            // Note: end date is exclusive in Google Calendar
            blockedDates.add(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }

          // Add to events array
          events.push({
            date: startDate,
            event_id: event.id,
            title: event.summary || 'Booking',
            description: event.description,
          });
        }
      }
    }

    const blockedDatesArray = Array.from(blockedDates);
    const available = blockedDatesArray.length === 0;

    // ========================================================================
    // 6. Return availability response
    // ========================================================================
    return new Response(
      JSON.stringify({
        available,
        blocked_dates: blockedDatesArray,
        events,
        car_id: carId,
        from,
        to,
        google_calendar_checked: true,
      } as AvailabilityResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-car-calendar-availability:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
