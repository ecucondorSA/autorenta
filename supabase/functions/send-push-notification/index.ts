import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define the structure of the push notification payload
interface PushNotificationPayload {
  to: string; // The recipient's push token
  title: string;
  body: string;
  data?: { [key: string]: any };
}

// Main function to handle incoming requests (database webhooks)
serve(async (req) => {
  try {
    // 1. Create a Supabase client with the service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Extract the new notification record from the webhook payload
    const { record: notification } = await req.json();

    if (!notification) {
      throw new Error('No notification record found in payload');
    }

    console.log(`Processing notification ID: ${notification.id} for user: ${notification.user_id}`);

    // 3. Fetch the user's push tokens from the database
    // We assume a 'push_tokens' table exists that links users to their device tokens
    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from('push_tokens')
      .select('token')
      .eq('user_id', notification.user_id);

    if (tokenError) {
      throw new Error(`Error fetching push tokens: ${tokenError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      console.warn(`No push tokens found for user ${notification.user_id}. Skipping notification.`);
      return new Response(JSON.stringify({ message: 'No tokens for user' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 4. Get the FCM Server Key from Supabase secrets
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      throw new Error('FCM_SERVER_KEY is not set in Supabase secrets.');
    }

    // 5. Send a push notification for each token found
    const sendPromises = tokens.map(async ({ token }) => {
      const payload: PushNotificationPayload = {
        to: token,
        title: notification.title,
        body: notification.body,
        data: {
          cta_link: notification.cta_link, // Pass the link to the client
        },
      };

      console.log(`Sending notification to token: ${token}`);

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${fcmServerKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`FCM request failed with status ${response.status}:`, errorBody);
        // Don't throw here, just log the error to allow other tokens to be processed
      }
    });

    await Promise.all(sendPromises);

    console.log(`Successfully processed notification ${notification.id}`);

    return new Response(JSON.stringify({ message: 'Notifications sent' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('An unexpected error occurred:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
