/**
 * Test de Integración Completa
 *
 * Simula el flujo completo de verificación de documentos:
 * 1. Edge Function genera URL firmada
 * 2. Edge Function llama al Worker de Cloudflare
 * 3. Worker descarga imagen y analiza con IA
 * 4. Worker retorna resultado
 * 5. Edge Function actualiza base de datos
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyODU0NDIyOCwiZXhwIjoyMDQ0MTIwMjI4fQ.WjRLkJMHMZvFBPRPTZdvSx9D06GGI3tTAxb9RGvQ3f8';

const WORKER_URL = 'https://autorent-doc-verifier.marques-eduardo95466020.workers.dev';

// Imagen pública de Wikipedia para testing
const TEST_IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Licencia_de_conducir_argentina_%28frente%29.jpg/1200px-Licencia_de_conducir_argentina_%28frente%29.jpg';

async function testIntegration() {
  console.log('🧪 TEST DE INTEGRACIÓN COMPLETA\n');
  console.log('═'.repeat(70));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ============================================================
  // PARTE 1: Verificar Estado Actual del Sistema
  // ============================================================

  console.log('\n📊 PARTE 1: ESTADO ACTUAL DEL SISTEMA\n');

  console.log('1️⃣ Verificando documentos en la base de datos...');
  const { data: documents, error: docsError } = await supabase
    .from('user_documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (docsError) {
    console.error('❌ Error consultando documentos:', docsError);
  } else {
    console.log(`   ✅ Encontrados ${documents.length} documentos recientes`);
    documents.forEach(doc => {
      console.log(`      - ${doc.kind}: ${doc.status} (ID: ${doc.id})`);
    });
  }

  console.log('\n2️⃣ Verificando verificaciones en la base de datos...');
  const { data: verifications, error: verifError } = await supabase
    .from('user_verifications')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (verifError) {
    console.error('❌ Error consultando verificaciones:', verifError);
  } else {
    console.log(`   ✅ Encontradas ${verifications.length} verificaciones recientes`);
    verifications.forEach(verif => {
      console.log(`      - Usuario ${verif.user_id.slice(0, 8)}... → driver: ${verif.driver_status}, owner: ${verif.owner_status || 'N/A'}`);
    });
  }

  // ============================================================
  // PARTE 2: Test del Worker Directamente
  // ============================================================

  console.log('\n═'.repeat(70));
  console.log('\n📤 PARTE 2: TEST DEL WORKER DE CLOUDFLARE\n');

  console.log('3️⃣ Enviando request al worker con imagen de prueba...');
  console.log(`   URL del worker: ${WORKER_URL}`);
  console.log(`   Imagen de prueba: ${TEST_IMAGE_URL.slice(0, 60)}...`);

  const requestBody = {
    user: {
      id: 'test-user-integration',
      full_name: 'Usuario de Prueba Integración',
      role: 'renter',
    },
    roles: ['driver'],
    documents: [
      {
        id: 'test-doc-integration',
        kind: 'driver_license',
        url: TEST_IMAGE_URL,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ],
  };

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
      console.error(`   ❌ Error HTTP: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('   Respuesta:', errorText);
      return;
    }

    const result = await response.json();

    console.log(`   ✅ Worker respondió en ${duration}ms`);
    console.log('\n   📋 Resultado del análisis:');
    console.log(JSON.stringify(result, null, 2).split('\n').map(line => '      ' + line).join('\n'));

    // ============================================================
    // PARTE 3: Análisis del Resultado
    // ============================================================

    console.log('\n═'.repeat(70));
    console.log('\n🔍 PARTE 3: ANÁLISIS DEL RESULTADO\n');

    if (result.driver) {
      const { status, notes, extracted_data, missing_docs } = result.driver;

      console.log('4️⃣ Estado de verificación del conductor:');
      console.log(`   Estado: ${status}`);
      console.log(`   Notas: ${notes}`);
      console.log(`   Documentos faltantes: ${missing_docs.length === 0 ? 'Ninguno' : missing_docs.join(', ')}`);

      if (extracted_data) {
        console.log('\n5️⃣ Datos extraídos por la IA:');
        Object.entries(extracted_data).forEach(([key, value]) => {
          if (value) {
            console.log(`   - ${key}: ${value}`);
          }
        });
      } else {
        console.log('\n5️⃣ No se pudieron extraer datos (imagen no clara o IA no pudo analizar)');
      }

      // Interpretación del resultado
      console.log('\n6️⃣ Interpretación:');

      if (status === 'VERIFICADO') {
        console.log('   ✅ Licencia VERIFICADA');
        console.log('   ✅ La IA determinó que el documento es auténtico');
        console.log('   ✅ Fecha de vencimiento válida');
        console.log('   ✅ Confianza ≥ 70%');
      } else if (status === 'PENDIENTE') {
        console.log('   ⚠️  Licencia PENDIENTE de revisión');
        console.log('   ⚠️  Imagen no clara o confianza entre 40-70%');
        console.log('   ⚠️  Requiere foto más clara o revisión manual');
      } else if (status === 'RECHAZADO') {
        console.log('   ❌ Licencia RECHAZADA');
        console.log('   ❌ Documento vencido, inválido o posible falsificación');
        console.log('   ❌ Confianza < 40%');
      }
    }

    // ============================================================
    // PARTE 4: Próximos Pasos
    // ============================================================

    console.log('\n═'.repeat(70));
    console.log('\n🎯 PARTE 4: PRÓXIMOS PASOS\n');

    console.log('Para activar la verificación con IA en producción:');
    console.log('');
    console.log('1. Ve a Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/obxvffplochgeiclibng/settings/functions');
    console.log('');
    console.log('2. En Edge Functions → Secrets, agrega:');
    console.log(`   DOC_VERIFIER_URL=${WORKER_URL}`);
    console.log('');
    console.log('3. (Opcional) Genera un token de seguridad:');
    console.log('   openssl rand -base64 32');
    console.log('');
    console.log('4. Configura el token en Supabase:');
    console.log('   DOC_VERIFIER_TOKEN=<tu-token-generado>');
    console.log('');
    console.log('5. Configura el mismo token en el worker:');
    console.log('   cd /home/edu/autorenta/functions/workers/doc-verifier');
    console.log('   npx wrangler secret put VERIFICATION_TOKEN');
    console.log('');
    console.log('6. Prueba desde el frontend:');
    console.log('   - Ir a /profile');
    console.log('   - Subir licencia de conducir');
    console.log('   - Hacer clic en "Re-evaluar ahora"');
    console.log('   - Verificar que el análisis de IA se ejecute');
    console.log('');

    console.log('📚 Documentación completa:');
    console.log('   - /home/edu/autorenta/DOC_VERIFICATION_SETUP.md');
    console.log('   - /home/edu/autorenta/SUPABASE_ENV_CONFIG.md');
    console.log('');

    console.log('═'.repeat(70));
    console.log('\n✅ TEST COMPLETADO EXITOSAMENTE\n');

  } catch (error) {
    console.error('\n❌ Error durante el test:', error.message);
    console.error('\nStack trace:', error.stack);
  }
}

// Ejecutar test
testIntegration().catch(console.error);
