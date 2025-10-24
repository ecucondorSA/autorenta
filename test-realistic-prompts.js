/**
 * Test de prompts REALISTAS con INTERIOR MEJORADO
 * Genera 3 fotos: 3/4-front, side, interior
 * CON especificaciones de body_type y trim_level
 */

const angles = ['3/4-front', 'side', 'interior'];
const WORKER_URL = 'https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev';

async function generateRealisticPhotos() {
  console.log('🎨 Generando 3 fotos con prompts REALISTAS (body_type + trim_level)...\n');
  console.log('═'.repeat(70));

  const results = [];

  for (let i = 0; i < angles.length; i++) {
    const angle = angles[i];
    console.log(`\n📸 Foto ${i + 1}/3: Ángulo "${angle}"\n`);

    const requestBody = {
      brand: 'Honda',
      model: 'Civic',
      year: 2024,
      color: 'red',
      body_type: 'sedan',        // ✅ NUEVO: Especificar sedan
      trim_level: 'base',        // ✅ NUEVO: Especificar trim base (no deportivo)
      angle: angle,
      style: 'showroom',
      num_steps: 8,              // ✅ Max quality (8 steps)
    };

    console.log(`   Request body:`, JSON.stringify(requestBody, null, 2));
    console.log(`   Enviando request al worker...`);
    const startTime = Date.now();

    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        console.error(`   ❌ Error HTTP: ${response.status}`);
        const errorText = await response.text();
        console.error(`   Respuesta: ${errorText.substring(0, 200)}`);
        continue;
      }

      const result = await response.json();

      console.log(`   ✅ Generada en ${duration}ms`);

      if (result.metadata) {
        console.log(`\n   📋 Prompt usado:`);
        const prompt = result.metadata.prompt;
        // Mostrar primeros 300 caracteres del prompt
        console.log(`   "${prompt.substring(0, 300)}..."`);
        console.log(`\n   📏 Longitud del prompt: ${prompt.length} caracteres`);
        console.log(`   🎯 Modelo: ${result.metadata.model}`);
        console.log(`   ⚡ Steps: ${result.metadata.steps}`);

        // Verificar que el prompt incluye las nuevas especificaciones
        if (prompt.includes('sedan')) {
          console.log(`   ✅ Contiene "sedan"`);
        } else {
          console.log(`   ❌ NO contiene "sedan" (esperado)`);
        }

        if (prompt.includes('base trim')) {
          console.log(`   ✅ Contiene "base trim"`);
        } else {
          console.log(`   ❌ NO contiene "base trim" (esperado)`);
        }

        if (prompt.includes('factory specifications')) {
          console.log(`   ✅ Contiene "factory specifications"`);
        }

        // Verificar negative prompt
        if (prompt.includes('convertible')) {
          console.log(`   ✅ Negative prompt incluye "convertible"`);
        }
      }

      if (result.image) {
        console.log(`   ✅ Imagen generada (base64 de ${result.image.length} caracteres)`);
        results.push({
          angle,
          duration,
          promptLength: result.metadata?.prompt?.length || 0,
          imageSize: result.image.length,
          image: result.image,
          prompt: result.metadata?.prompt || '',
        });
      }

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }

    console.log('\n' + '─'.repeat(70));
  }

  console.log('\n═'.repeat(70));
  console.log('\n📊 RESUMEN DE GENERACIÓN:\n');

  results.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.angle.padEnd(15)} - ${r.duration}ms - Prompt: ${r.promptLength} chars - Imagen: ${(r.imageSize / 1024).toFixed(1)} KB`);
  });

  if (results.length > 0) {
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const avgPromptLength = results.reduce((sum, r) => sum + r.promptLength, 0) / results.length;

    console.log(`\n   📈 Promedio:`);
    console.log(`      - Tiempo: ${avgDuration.toFixed(0)}ms por foto`);
    console.log(`      - Prompt: ${avgPromptLength.toFixed(0)} caracteres`);
    console.log(`      - Total: ${results.length} fotos en ${(results.reduce((sum, r) => sum + r.duration, 0) / 1000).toFixed(1)}s`);
  }

  console.log('\n🎉 Generación completada!\n');

  return results;
}

generateRealisticPhotos().catch(console.error);
