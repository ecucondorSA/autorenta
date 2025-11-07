/**
 * Edge Function: check-expiring-protectors
 *
 * Checks for Bonus Protectors that are expiring soon and sends notifications to users.
 *
 * Schedule: Daily at 9:00 AM (via cron job)
 *
 * Notification triggers:
 * - 7 days before expiry: "protector_expiring_soon"
 * - 1 day before expiry: "protector_expiring_tomorrow"
 * - On expiry day: "protector_expired"
 *
 * Epic: #82 - Bonus Protector Purchase Flow
 * Date: 2025-11-07
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpiringProtector {
  id: string;
  user_id: string;
  protection_level: number;
  remaining_protected_claims: number;
  purchased_at: string;
  expires_at: string;
  days_until_expiry: number;
}

interface NotificationResult {
  sent: number;
  errors: number;
  details: Array<{
    user_id: string;
    type: string;
    success: boolean;
    error?: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[check-expiring-protectors] Starting expiry check...');

    // Get all active protectors that haven't been fully used
    const { data: protectors, error: fetchError } = await supabase
      .from('driver_protection_addons')
      .select('*')
      .eq('status', 'ACTIVE')
      .gt('remaining_protected_claims', 0)
      .not('expires_at', 'is', null);

    if (fetchError) {
      console.error('[check-expiring-protectors] Error fetching protectors:', fetchError);
      throw fetchError;
    }

    if (!protectors || protectors.length === 0) {
      console.log('[check-expiring-protectors] No active protectors found');
      return new Response(
        JSON.stringify({ message: 'No active protectors to check', sent: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[check-expiring-protectors] Found ${protectors.length} active protectors`);

    const results: NotificationResult = {
      sent: 0,
      errors: 0,
      details: [],
    };

    const now = new Date();

    // Process each protector
    for (const protector of protectors) {
      try {
        const expiresAt = new Date(protector.expires_at);
        const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        console.log(`[check-expiring-protectors] Protector ${protector.id} expires in ${daysUntilExpiry} days`);

        let notificationType: string | null = null;
        let title: string = '';
        let body: string = '';

        // Determine notification type based on days until expiry
        if (daysUntilExpiry === 7) {
          notificationType = 'protector_expiring_soon';
          title = 'Tu Bonus Protector expira pronto';
          body = `Tu protección Nivel ${protector.protection_level} expira en 7 días. Renuévala para seguir protegido.`;
        } else if (daysUntilExpiry === 1) {
          notificationType = 'protector_expiring_tomorrow';
          title = 'Tu Bonus Protector expira mañana';
          body = `Tu protección Nivel ${protector.protection_level} expira mañana. No pierdas tu cobertura, renuévala hoy.`;
        } else if (daysUntilExpiry <= 0) {
          notificationType = 'protector_expired';
          title = 'Tu Bonus Protector ha expirado';
          body = `Tu protección Nivel ${protector.protection_level} ha expirado. Compra una nueva protección para volver a estar cubierto.`;

          // Update protector status to EXPIRED
          await supabase
            .from('driver_protection_addons')
            .update({ status: 'EXPIRED', updated_at: now.toISOString() })
            .eq('id', protector.id);
        }

        // Send notification if applicable
        if (notificationType) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: protector.user_id,
              title,
              body,
              type: notificationType,
              cta_link: '/protections',
              is_read: false,
              metadata: {
                protector_id: protector.id,
                protection_level: protector.protection_level,
                remaining_claims: protector.remaining_protected_claims,
                expires_at: protector.expires_at,
                days_until_expiry: daysUntilExpiry,
              },
            });

          if (notifError) {
            console.error(`[check-expiring-protectors] Error creating notification for ${protector.user_id}:`, notifError);
            results.errors++;
            results.details.push({
              user_id: protector.user_id,
              type: notificationType,
              success: false,
              error: notifError.message,
            });
          } else {
            console.log(`[check-expiring-protectors] Sent ${notificationType} notification to ${protector.user_id}`);
            results.sent++;
            results.details.push({
              user_id: protector.user_id,
              type: notificationType,
              success: true,
            });
          }
        }
      } catch (error) {
        console.error(`[check-expiring-protectors] Error processing protector ${protector.id}:`, error);
        results.errors++;
        results.details.push({
          user_id: protector.user_id,
          type: 'error',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[check-expiring-protectors] Completed. Sent: ${results.sent}, Errors: ${results.errors}`);

    return new Response(
      JSON.stringify({
        message: 'Protector expiry check completed',
        ...results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[check-expiring-protectors] Fatal error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
