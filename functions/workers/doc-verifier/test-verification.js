/**
 * Test del Worker de Verificación de Documentos
 *
 * Este script genera una URL firmada de un documento real en Supabase
 * y la envía al worker de Cloudflare para análisis con IA.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyODU0NDIyOCwiZXhwIjoyMDQ0MTIwMjI4fQ.WjRLkJMHMZvFBPRPTZdvSx9D06GGI3tTAxb9RGvQ3f8';

const WORKER_URL = 'https://autorent-doc-verifier.marques-eduardo95466020.workers.dev';

// Documento de prueba (más reciente de la base de datos)
const TEST_DOCUMENT = {
  id: '9',
  user_id: 'b8cf21c8-c024-4067-9477-3cf7de1d5a60',
  kind: 'driver_license',
  storage_path: 'b8cf21c8-c024-4067-9477-3cf7de1d5a60/c21492be-5008-45b9-8a04-1596c127eb07-driver_license.png',
};

async function testVerification() {
  console.log('🧪 Iniciando test de verificación de documentos...\n');

  // 1. Crear cliente de Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('📝 Documento de prueba:');
  console.log(`   - ID: ${TEST_DOCUMENT.id}`);
  console.log(`   - Usuario: ${TEST_DOCUMENT.user_id}`);
  console.log(`   - Tipo: ${TEST_DOCUMENT.kind}`);
  console.log(`   - Path: ${TEST_DOCUMENT.storage_path}\n`);

  // 2. Generar URL firmada (válida por 1 hora)
  console.log('🔐 Generando URL firmada del documento...');

  const { data: signedData, error: signedError } = await supabase.storage
    .from('documents')
    .createSignedUrl(TEST_DOCUMENT.storage_path, 3600);

  if (signedError || !signedData) {
    console.error('❌ Error generando URL firmada:', signedError);
    return;
  }

  console.log('✅ URL firmada generada\n');

  // 3. Preparar request para el worker
  const requestBody = {
    user: {
      id: TEST_DOCUMENT.user_id,
      full_name: 'Usuario de Prueba',
      role: 'renter',
    },
    roles: ['driver'],
    documents: [
      {
        id: TEST_DOCUMENT.id,
        kind: TEST_DOCUMENT.kind,
        url: signedData.signedUrl,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ],
  };

  console.log('📤 Enviando documento al worker para análisis...');
  console.log(`   Worker URL: ${WORKER_URL}\n`);

  // 4. Llamar al worker
  const startTime = Date.now();

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Respuesta:', errorText);
      return;
    }

    const result = await response.json();

    console.log('✅ Análisis completado exitosamente\n');
    console.log('⏱️  Duración:', duration, 'ms\n');

    // 5. Mostrar resultados
    console.log('📊 RESULTADOS DEL ANÁLISIS:\n');
    console.log('═'.repeat(60));

    if (result.driver) {
      console.log('\n🚗 ROL: CONDUCTOR\n');
      console.log(`   Estado: ${result.driver.status}`);
      console.log(`   Notas: ${result.driver.notes}`);
      console.log(`   Documentos faltantes: ${result.driver.missing_docs.length === 0 ? 'Ninguno' : result.driver.missing_docs.join(', ')}`);

      if (result.driver.extracted_data) {
        console.log('\n   📋 Datos Extraídos:');
        const data = result.driver.extracted_data;
        if (data.name) console.log(`      - Nombre: ${data.name}`);
        if (data.document_number) console.log(`      - Número: ${data.document_number}`);
        if (data.expiry_date) console.log(`      - Vencimiento: ${data.expiry_date}`);
        if (data.issue_date) console.log(`      - Emisión: ${data.issue_date}`);
        if (data.category) console.log(`      - Categoría: ${data.category}`);
      }
    }

    if (result.owner) {
      console.log('\n🏠 ROL: PROPIETARIO\n');
      console.log(`   Estado: ${result.owner.status}`);
      console.log(`   Notas: ${result.owner.notes}`);
      console.log(`   Documentos faltantes: ${result.owner.missing_docs.length === 0 ? 'Ninguno' : result.owner.missing_docs.join(', ')}`);
    }

    console.log('\n' + '═'.repeat(60));

    // 6. Resumen
    console.log('\n✨ RESUMEN DEL TEST:\n');
    console.log(`   ✅ Worker funcionando correctamente`);
    console.log(`   ✅ Cloudflare AI respondiendo`);
    console.log(`   ✅ Análisis completado en ${duration}ms`);

    if (result.driver && result.driver.status === 'VERIFICADO') {
      console.log(`   ✅ Licencia VERIFICADA por la IA`);
    } else if (result.driver && result.driver.status === 'PENDIENTE') {
      console.log(`   ⚠️  Licencia requiere revisión`);
    } else if (result.driver && result.driver.status === 'RECHAZADO') {
      console.log(`   ❌ Licencia RECHAZADA por la IA`);
    }

    console.log('\n🎉 Test completado exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error en el test:', error.message);
    console.error('\nStack trace:', error.stack);
  }
}

// Ejecutar test
testVerification().catch(console.error);
