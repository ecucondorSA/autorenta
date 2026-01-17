import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

/**
 * Edge Function: Trigger Re-engagement
 *
 * Busca usuarios inactivos y los agrega a la secuencia de re-engagement.
 * Debe ejecutarse diariamente via cron.
 *
 * Criterios de inactividad:
 * - Sin actividad en la plataforma por más de 30 días
 * - No está ya en la secuencia de re-engagement
 * - Status activo (no unsubscribed/bounced)
 */
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get re-engagement sequence ID
    const { data: sequence, error: seqError } = await supabase
      .from('email_sequences')
      .select('id')
      .eq('slug', 're-engagement')
      .eq('is_active', true)
      .single();

    if (seqError || !sequence) {
      return new Response(
        JSON.stringify({ error: 'Re-engagement sequence not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find inactive subscribers using the view
    const { data: inactiveUsers, error: inactiveError } = await supabase
      .from('v_inactive_subscribers')
      .select('id, email, first_name, days_inactive, active_sequences')
      .gte('days_inactive', 30)
      .limit(100); // Process in batches

    if (inactiveError) {
      throw new Error(`Failed to fetch inactive users: ${inactiveError.message}`);
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, added: 0, message: 'No inactive users found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let added = 0;
    let skipped = 0;

    for (const user of inactiveUsers) {
      // Check if already in re-engagement sequence
      const activeSeqs = user.active_sequences || [];
      const alreadyInSequence = activeSeqs.some(
        (seq: { sequence_id: string }) => seq.sequence_id === sequence.id
      );

      if (alreadyInSequence) {
        skipped++;
        continue;
      }

      // Add to re-engagement sequence
      const { error: addError } = await supabase.rpc('add_subscriber_to_sequence', {
        p_subscriber_id: user.id,
        p_sequence_slug: 're-engagement',
      });

      if (addError) {
        console.error(`Failed to add ${user.email} to re-engagement:`, addError);
        continue;
      }

      added++;
      console.log(`✅ Added ${user.email} to re-engagement (${user.days_inactive} days inactive)`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        added,
        skipped,
        total_inactive: inactiveUsers.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in trigger-reengagement:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
