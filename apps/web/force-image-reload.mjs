/**
 * Script para forzar la recarga de la imagen del Fiat
 * agregando un parámetro de timestamp a la URL
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CAR_ID = '8447c379-6b51-4b5e-8647-0f5de243f729';
const IMAGE_PATH = '22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png';

async function main() {
  console.log('🔄 Actualizando URL de imagen con cache-busting...\n');

  // 1. Obtener URL pública con timestamp
  const { data: publicUrlData } = supabase.storage
    .from('car-images')
    .getPublicUrl(IMAGE_PATH);

  // Agregar timestamp para cache-busting
  const timestamp = Date.now();
  const newUrl = `${publicUrlData.publicUrl}?t=${timestamp}`;

  console.log(`Nueva URL: ${newUrl}\n`);

  // 2. Actualizar registro en car_photos
  const { data, error } = await supabase
    .from('car_photos')
    .update({
      url: newUrl,
    })
    .eq('car_id', CAR_ID)
    .eq('stored_path', IMAGE_PATH)
    .select();

  if (error) {
    console.error('❌ Error al actualizar:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No se encontró la foto para actualizar');
    return;
  }

  console.log('✅ Foto actualizada en la base de datos');
  console.log(`   Registros actualizados: ${data.length}`);
  console.log('\n🎉 La imagen ahora se recargará sin caché en el navegador.');
}

main().catch(console.error);
