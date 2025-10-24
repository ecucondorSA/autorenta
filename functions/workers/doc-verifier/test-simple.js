/**
 * Test Simple del Worker de Verificación
 *
 * Prueba el worker con una imagen de licencia de ejemplo de internet
 */

const WORKER_URL = 'https://autorent-doc-verifier.marques-eduardo95466020.workers.dev';

// Usar una imagen de licencia de ejemplo pública
// (Esta es una imagen de muestra para testing)
const TEST_IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Licencia_de_conducir_argentina_%28frente%29.jpg/1200px-Licencia_de_conducir_argentina_%28frente%29.jpg';

async function testWorker() {
  console.log('🧪 Test Simple del Worker de Verificación\n');
  console.log('═'.repeat(60));

  const requestBody = {
    user: {
      id: 'test-user-123',
      full_name: 'Usuario de Prueba',
      role: 'renter',
    },
    roles: ['driver'],
    documents: [
      {
        id: 'test-doc-456',
        kind: 'driver_license',
        url: TEST_IMAGE_URL,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    ],
  };

  console.log('\n📤 Enviando request al worker...');
  console.log(`   URL: ${WORKER_URL}`);
  console.log(`   Imagen: ${TEST_IMAGE_URL}\n`);

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

    console.log(`⏱️  Respuesta recibida en ${duration}ms\n`);

    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Respuesta:', errorText);
      return;
    }

    const result = await response.json();

    console.log('✅ Worker respondió exitosamente\n');
    console.log('═'.repeat(60));
    console.log('\n📊 RESULTADO DEL ANÁLISIS:\n');
    console.log(JSON.stringify(result, null, 2));
    console.log('\n' + '═'.repeat(60));

    // Interpretación
    if (result.driver) {
      console.log('\n✨ INTERPRETACIÓN:\n');
      console.log(`   Estado: ${result.driver.status}`);
      console.log(`   Nota: ${result.driver.notes}`);

      if (result.driver.extracted_data) {
        console.log('\n   📋 Datos extraídos por la IA:');
        Object.entries(result.driver.extracted_data).forEach(([key, value]) => {
          if (value) {
            console.log(`      - ${key}: ${value}`);
          }
        });
      }
    }

    console.log('\n🎉 Test completado!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testWorker();
