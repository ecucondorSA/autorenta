import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface WebhookPayload {
    type: 'INSERT';
    table: string;
    schema: string;
    record: {
        id: string;
        booking_id: string;
        sender_id: string;
        recipient_id: string;
        body: string;
        created_at: string;
        // ... other fields
    };
    old_record: null;
}

serve(async (req) => {
    try {
        const payload: WebhookPayload = await req.json();
        console.log('[Process Message] Payload received:', JSON.stringify(payload));

        if (payload.type !== 'INSERT' || payload.table !== 'messages') {
            return new Response('Ignored', { status: 200 });
        }

        const { record } = payload;
        const { sender_id, recipient_id, body, booking_id } = record;

        if (!recipient_id) {
            console.log('No recipient_id, ignoring');
            return new Response('No recipient', { status: 200 });
        }

        // Init Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // Must be service role to read profiles
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Get Sender Info (Name)
        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', sender_id)
            .single();

        const senderName = senderProfile?.full_name || 'Alguien';
        const messagePreview = body.length > 100 ? body.substring(0, 100) + '...' : body;

        // 2. Call Notify Multi-Channel
        // We only send Push for chat messages usually, maybe email if offline for too long (future improvement)

        // Check if recipient has push tokens active first? notify-multi-channel handles that check mostly (by failing gracefully)

        console.log(`Sending push to ${recipient_id} from ${senderName}`);

        const notifyResponse = await fetch(`${supabaseUrl}/functions/v1/notify-multi-channel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
                user_id: recipient_id,
                channels: ['push'], // For now only push for chat
                template_code: 'new_chat_message',
                variables: {
                    sender_name: senderName,
                    message_preview: messagePreview,
                    booking_id: booking_id || '',
                },
                // We override route/link in data via the template or notify logic? 
                // notify-multi-channel passes variables to send-push-notification.
                // send-push-notification puts `template_code` and `variables` in `data`.
                // The frontend interception of notification click needs to handle this.
            })
        });

        if (!notifyResponse.ok) {
            const err = await notifyResponse.text();
            console.error('Failed to invoke notify-multi-channel:', err);
            return new Response('Notify Failed', { status: 500 });
        }

        console.log('[Process Message] Success');

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('Error processing message:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
