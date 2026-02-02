import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

interface QueueItem {
    id: string;
    event_type: string;
    payload: any;
    target_url: string;
    status: string;
    created_at: string;
}

serve(async (req) => {
    try {
        // 1. Setup Supabase Admin
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. Fetch Pending Items
        // We lock items by updating them to 'processing' first to avoid double processing if scaled
        // For simplicity in V1, we just fetch 'pending' and try to process.
        // Ideally we usage `pg_cron` to call this every minute.

        const { data: items, error } = await supabase
            .from('pending_webhook_events')
            .select('*')
            .eq('status', 'pending')
            .limit(50); // Batch size

        if (error) throw error;

        if (!items || items.length === 0) {
            return new Response(JSON.stringify({ processed: 0 }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let successCount = 0;
        let failCount = 0;

        console.log(`Processing ${items.length} items...`);

        // 3. Process each item
        for (const item of items) {
            try {
                console.log(`Processing item ${item.id} - ${item.event_type} -> ${item.target_url}`);

                // Call Target Edge Function
                // Convention: target_url is simple name 'process-new-message' -> map to full URL
                const fullUrl = `${supabaseUrl}/functions/v1/${item.target_url}`;

                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseKey}`
                    },
                    body: JSON.stringify(item.payload)
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Target function failed: ${response.status} - ${errText}`);
                }

                // Mark as Done
                await supabase
                    .from('pending_webhook_events')
                    .update({ status: 'done', processed_at: new Date().toISOString() })
                    .eq('id', item.id);

                successCount++;

            } catch (err) {
                console.error(`Failed to process item ${item.id}:`, err);
                // Mark as Failed (or retry logic later)
                await supabase
                    .from('pending_webhook_events')
                    .update({
                        status: 'failed',
                        processed_at: new Date().toISOString(),
                        // Store error if we added an error column, for now just status
                    })
                    .eq('id', item.id);

                failCount++;
            }
        }

        return new Response(JSON.stringify({
            processed: items.length,
            success: successCount,
            failed: failCount
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('Queue Worker Fatal Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
