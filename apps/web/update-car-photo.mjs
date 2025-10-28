import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Script para actualizar la foto original del Fiat Cronos
 * con la versión sin fondo que acabamos de procesar
 */

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CAR_ID = '8447c379-6b51-4b5e-8647-0f5de243f729';
const ORIGINAL_PATH = '22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1.webp';
const NO_BG_PATH = '22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png';

async function updateCarPhoto() {
  console.log('🔄 Actualizando foto del Fiat Cronos...\n');

  // 1. Obtener URL pública de la versión sin fondo
  const { data: noBgUrl } = supabase.storage
    .from('car-images')
    .getPublicUrl(NO_BG_PATH);

  console.log(`✅ Nueva URL sin fondo: ${noBgUrl.publicUrl}\n`);

  // 2. Actualizar el registro de la foto original en car_photos
  const { data: updateData, error: updateError } = await supabase
    .from('car_photos')
    .update({
      stored_path: NO_BG_PATH,
      url: noBgUrl.publicUrl,
    })
    .eq('car_id', CAR_ID)
    .eq('stored_path', ORIGINAL_PATH)
    .select();

  if (updateError) {
    console.error('❌ Error al actualizar foto:', updateError);
    throw updateError;
  }

  if (!updateData || updateData.length === 0) {
    console.log('⚠️  No se encontró la foto original para actualizar');

    // Verificar qué fotos existen
    const { data: photos } = await supabase
      .from('car_photos')
      .select('*')
      .eq('car_id', CAR_ID);

    console.log('\nFotos existentes para este auto:');
    photos?.forEach((photo, idx) => {
      console.log(`${idx + 1}. Path: ${photo.stored_path}`);
      console.log(`   URL: ${photo.url}`);
      console.log(`   Position: ${photo.position}\n`);
    });

    return;
  }

  console.log('✅ Foto actualizada exitosamente!');
  console.log(`   Registros actualizados: ${updateData.length}`);
  console.log(`   Nueva URL: ${noBgUrl.publicUrl}`);

  // 3. Eliminar el registro duplicado de la foto procesada (position 100)
  console.log('\n🧹 Limpiando foto duplicada...');

  const { error: deleteError } = await supabase
    .from('car_photos')
    .delete()
    .eq('car_id', CAR_ID)
    .eq('position', 100);

  if (deleteError) {
    console.warn('⚠️  No se pudo eliminar foto duplicada:', deleteError.message);
  } else {
    console.log('✅ Foto duplicada eliminada');
  }

  console.log('\n🎉 Proceso completado. La publicación del Fiat Cronos ahora muestra la foto sin fondo.');
}

// Ejecutar
updateCarPhoto().catch(console.error);
