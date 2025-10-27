import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || 'https://obxvffplochgeiclibng.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no encontrada');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Verificando cron jobs configurados...\n');

// Query para ver cron jobs
const { data, error } = await supabase
  .rpc('exec_sql', { 
    query: `SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname LIKE '%binance%';` 
  });

if (error) {
  console.error('❌ Error:', error);
  console.log('\n💡 Intentando query directo...\n');
  
  // Intentar con query directo
  const { data: jobs, error: err2 } = await supabase
    .from('cron.job')
    .select('*');
    
  if (err2) {
    console.error('❌ Error 2:', err2);
  } else {
    console.log('✅ Jobs encontrados:', jobs);
  }
} else {
  console.log('✅ Cron jobs:', data);
}

// Verificar última actualización de exchange_rates
console.log('\n📊 Verificando última actualización de exchange_rates...\n');

const { data: rates, error: ratesError } = await supabase
  .from('exchange_rates')
  .select('pair, platform_rate, last_updated')
  .eq('is_active', true)
  .order('last_updated', { ascending: false })
  .limit(1);

if (ratesError) {
  console.error('❌ Error:', ratesError);
} else if (rates && rates.length > 0) {
  const rate = rates[0];
  const lastUpdated = new Date(rate.last_updated);
  const now = new Date();
  const diffMinutes = Math.floor((now - lastUpdated) / 1000 / 60);
  
  console.log('Último rate actualizado:');
  console.log(`  - Par: ${rate.pair}`);
  console.log(`  - Rate: ${rate.platform_rate}`);
  console.log(`  - Última actualización: ${lastUpdated.toLocaleString()}`);
  console.log(`  - Hace: ${diffMinutes} minutos`);
  
  if (diffMinutes > 15) {
    console.log('\n⚠️  La tasa NO se ha actualizado en los últimos 15 minutos');
    console.log('❌ El cron job probablemente NO está corriendo');
  } else {
    console.log('\n✅ La tasa se actualizó recientemente');
  }
} else {
  console.log('❌ No se encontraron tasas en la tabla');
}
