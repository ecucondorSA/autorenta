/**
 * Stagehand PoC - Scraping de precios FIPE
 *
 * Este es un proof of concept para evaluar si Stagehand
 * es útil para AUTORENTA.
 *
 * Caso de uso: Extraer precios de vehículos de la tabla FIPE
 */

import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

// Schema para los datos que queremos extraer
const VehiclePriceSchema = z.object({
  brand: z.string().describe('La marca del vehículo (ej: Toyota, Honda)'),
  model: z.string().describe('El modelo del vehículo'),
  year: z.string().describe('El año del vehículo'),
  price: z.string().describe('El precio en reales brasileños'),
});

async function main() {
  console.log('🚀 Iniciando Stagehand PoC...\n');

  // Medir tiempo de inicialización
  const startInit = Date.now();

  const stagehand = new Stagehand({
    env: 'LOCAL', // Ejecutar localmente, sin Browserbase cloud
    model: 'google/gemini-2.0-flash', // Usar Gemini 2.0 Flash
    headless: false, // Ver el navegador para debug
    verbose: 1,
    debugDom: true,
  });

  try {
    await stagehand.init();
    console.log(`✅ Stagehand inicializado en ${Date.now() - startInit}ms\n`);

    // En v3, accedemos a la página así:
    const page = stagehand.context.pages()[0];

    // === TEST 1: Navegación básica ===
    console.log('📍 Test 1: Navegando a Tabela FIPE...');
    const startNav = Date.now();
    await page.goto('https://veiculos.fipe.org.br/');
    console.log(`   Navegación completada en ${Date.now() - startNav}ms\n`);

    // === TEST 2: act() - Acción con lenguaje natural ===
    console.log('🎯 Test 2: Usando act() para seleccionar tipo de vehículo...');
    const startAct = Date.now();
    await stagehand.act('click on the "Carros" or "Carro" option to select cars');
    console.log(`   act() completado en ${Date.now() - startAct}ms\n`);

    // === TEST 3: observe() - Descubrir elementos ===
    console.log('👁️ Test 3: Usando observe() para encontrar selectores...');
    const startObserve = Date.now();
    const actions = await stagehand.observe('find all dropdown selectors or select elements on this page');
    console.log(`   observe() completado en ${Date.now() - startObserve}ms`);
    console.log(`   Elementos encontrados: ${actions.length}`);
    actions.slice(0, 3).forEach((action, i) => {
      console.log(`   ${i + 1}. ${action.description}`);
    });
    console.log('');

    // === TEST 4: Más acciones para navegar al resultado ===
    console.log('🔄 Test 4: Seleccionando marca...');
    const startAct2 = Date.now();
    await stagehand.act('select "Toyota" from the brand dropdown, or click on brand selector and choose Toyota');
    console.log(`   act() para marca completado en ${Date.now() - startAct2}ms\n`);

    // Esperar un momento para que cargue
    await page.waitForTimeout(2000);

    // === TEST 5: extract() - Extraer datos estructurados ===
    console.log('📊 Test 5: Usando extract() para obtener modelos disponibles...');
    const startExtract = Date.now();

    const ModelsSchema = z.object({
      models: z.array(z.string()).describe('Lista de modelos de vehículos disponibles'),
    });

    const result = await stagehand.extract(
      'Extract the list of available vehicle models from the model dropdown or selector',
      ModelsSchema,
    );

    console.log(`   extract() completado en ${Date.now() - startExtract}ms`);
    console.log(`   Modelos encontrados: ${result.models?.length || 0}`);
    if (result.models && result.models.length > 0) {
      console.log(`   Primeros 5: ${result.models.slice(0, 5).join(', ')}`);
    }
    console.log('');

    // === RESUMEN ===
    console.log('='.repeat(50));
    console.log('📈 RESUMEN DEL POC');
    console.log('='.repeat(50));
    console.log(`✅ Inicialización: Funcionó`);
    console.log(`✅ Navegación: Funcionó`);
    console.log(`✅ act(): Funcionó`);
    console.log(`✅ observe(): Encontró ${actions.length} elementos`);
    console.log(`✅ extract(): Extrajo ${result.models?.length || 0} modelos`);
    console.log('');
    console.log('💡 CONCLUSIÓN:');
    console.log('   Stagehand funciona correctamente con Gemini.');
    console.log('   Puede ser útil para scraping de FIPE y otros casos.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('\n🔚 Cerrando navegador...');
    await stagehand.close();
  }
}

main().catch(console.error);
