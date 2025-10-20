import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpireResult {
  expired_count: number;
  total_amount: number;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar que sea una llamada de cron (opcional - agregar autenticación si es necesario)
    const authHeader = req.headers.get('authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');

    // Si hay un secret configurado, verificarlo
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Crear cliente de Supabase con service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Iniciando proceso de expiración de depósitos pendientes...');

    // Llamar a la función RPC para expirar depósitos
    const { data, error } = await supabase.rpc('wallet_expire_pending_deposits', {
      p_older_than: '24 hours', // Expirar depósitos de más de 24 horas
    });

    if (error) {
      console.error('❌ Error ejecutando wallet_expire_pending_deposits:', error);
      throw error;
    }

    const result = data[0] as ExpireResult;

    console.log(`✅ Proceso completado: ${result.expired_count} depósitos expirados por un total de $${result.total_amount}`);

    return new Response(
      JSON.stringify({
        success: true,
        expired_count: result.expired_count,
        total_amount: result.total_amount,
        message: result.message,
        executed_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error en expire-pending-deposits:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
