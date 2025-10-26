import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://obxvffplochgeiclibng.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRpcFunction() {
  console.log('🔍 Verificando función RPC create_booking_atomic...\n');

  try {
    // Verificar si la función existe en information_schema
    const { data: functions, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_name', 'create_booking_atomic')
      .eq('routine_schema', 'public');

    if (error) {
      console.error('❌ Error consultando schema:', error);
      
      // Intentar ejecutar la función con datos dummy
      console.log('\n🧪 Intentando ejecutar la función (test de existencia)...');
      const { data: testData, error: testError } = await supabase.rpc('create_booking_atomic', {
        p_car_id: '00000000-0000-0000-0000-000000000000',
        p_renter_id: '00000000-0000-0000-0000-000000000000',
        p_start_date: new Date().toISOString(),
        p_end_date: new Date().toISOString(),
        p_total_amount: 0,
        p_currency: 'ARS',
        p_payment_mode: 'card',
        p_coverage_upgrade: null,
        p_authorized_payment_id: null,
        p_wallet_lock_id: null,
        p_risk_daily_price_usd: 0,
        p_risk_security_deposit_usd: 0,
        p_risk_vehicle_value_usd: 0,
        p_risk_driver_age: 30,
        p_risk_coverage_type: 'standard',
        p_risk_payment_mode: 'card',
        p_risk_total_usd: 0,
        p_risk_total_ars: 0,
        p_risk_exchange_rate: 0
      });

      if (testError) {
        if (testError.message.includes('function') && testError.message.includes('does not exist')) {
          console.log('❌ La función NO EXISTE en Supabase');
          console.log('\n📝 Necesitas ejecutar el archivo: database/fix-atomic-booking.sql');
          return false;
        } else {
          console.log('✅ La función EXISTE (error esperado con datos dummy)');
          console.log('Error:', testError.message);
          return true;
        }
      }

      console.log('✅ La función EXISTE y se ejecutó (resultado:', testData, ')');
      return true;
    }

    if (functions && functions.length > 0) {
      console.log('✅ Función encontrada:', functions);
      return true;
    } else {
      console.log('❌ Función no encontrada en el schema');
      return false;
    }

  } catch (err: any) {
    console.error('❌ Error inesperado:', err.message);
    return false;
  }
}

verifyRpcFunction().then(exists => {
  if (exists) {
    console.log('\n✅ TODO LISTO: La función RPC está disponible');
  } else {
    console.log('\n⚠️  ACCIÓN REQUERIDA: Ejecuta el script SQL en Supabase');
    console.log('   Archivo: database/fix-atomic-booking.sql');
  }
  process.exit(exists ? 0 : 1);
});
