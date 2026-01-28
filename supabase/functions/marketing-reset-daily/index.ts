import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Cron job para resetear contadores diarios de marketing
 * 
 * Ejecutar diariamente a las 00:00 ART con GitHub Actions scheduled workflow
 * o con Supabase Edge Functions cron
 */
serve(async (req) => {
    try {
        console.log('[Marketing Reset Daily] Starting daily reset...');

        // Verificar autorización (opcional: cron key)
        const authHeader = req.headers.get('authorization');
        const cronKey = Deno.env.get('CRON_SECRET_KEY');

        if (cronKey && authHeader !== `Bearer ${cronKey}`) {
            console.error('[Marketing Reset Daily] Unauthorized');
            return new Response('Unauthorized', { status: 401 });
        }

        // Ejecutar función de reset
        const { error: resetError } = await supabase.rpc('reset_marketing_daily_counters');

        if (resetError) {
            console.error('[Marketing Reset Daily] Error resetting counters:', resetError);
            return new Response(
                JSON.stringify({ error: 'Failed to reset counters', details: resetError }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('[Marketing Reset Daily] Counters reset successfully');

        // Limpiar alertas resueltas antiguas (>30 días)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { error: cleanupError } = await supabase
            .from('marketing_alerts')
            .delete()
            .eq('resolved', true)
            .lt('resolved_at', thirtyDaysAgo.toISOString());

        if (cleanupError) {
            console.error('[Marketing Reset Daily] Error cleaning alerts:', cleanupError);
            // No es crítico, continuar
        } else {
            console.log('[Marketing Reset Daily] Old alerts cleaned');
        }

        // Generar reporte diario
        const { data: personas, error: personasError } = await supabase
            .from('marketing_personas')
            .select('*');

        const { data: contentStats, error: contentError } = await supabase
            .from('marketing_content')
            .select('status, created_at')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        const report = {
            date: new Date().toISOString().split('T')[0],
            personas: {
                total: personas?.length || 0,
                active: personas?.filter(p => p.is_active).length || 0,
                shadowbanned: personas?.filter(p => p.is_shadowbanned).length || 0,
            },
            content_last_24h: {
                total: contentStats?.length || 0,
                posted: contentStats?.filter(c => c.status === 'posted').length || 0,
                failed: contentStats?.filter(c => c.status === 'failed').length || 0,
                pending: contentStats?.filter(c => c.status === 'pending').length || 0,
            },
        };

        console.log('[Marketing Reset Daily] Daily report:', report);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Daily reset completed',
                report,
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    } catch (error) {
        console.error('[Marketing Reset Daily] Fatal error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
