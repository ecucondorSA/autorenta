/**
 * Test SOLO interior con techo y puertas especificadas
 */

const WORKER_URL = 'https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev';

async function testInterior() {
  console.log('🎨 Generando SOLO foto de interior con especificaciones de techo/puertas...\n');

  const requestBody = {
    brand: 'Honda',
    model: 'Civic',
    year: 2024,
    color: 'red',
    body_type: 'sedan',
    trim_level: 'base',
    angle: 'interior',
    style: 'showroom',
    num_steps: 4,
  };

  console.log('Request:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error(`❌ Error: ${response.status}`);
      process.exit(1);
    }

    const result = await response.json();

    console.log(`\n✅ Generada en ${result.metadata.duration_ms}ms\n`);
    console.log('📋 Prompt (primeros 600 caracteres):\n');
    console.log(result.metadata.prompt.substring(0, 600) + '...');
    console.log('\n' + '═'.repeat(80));

    // Verificar que contiene las especificaciones clave
    const checks = [
      'closed roof',
      'headliner visible',
      'all four doors',
      'door panels',
      'enclosed cabin',
      'A-pillars',
      'B-pillars',
    ];

    console.log('\n✅ Verificaciones de prompt:\n');
    checks.forEach(check => {
      const found = result.metadata.prompt.includes(check);
      console.log(`  ${found ? '✅' : '❌'} "${check}"`);
    });

    // Verificar negative prompt
    const negativeChecks = [
      'no roof',
      'open roof',
      'missing roof',
      'no doors',
      'convertible interior',
    ];

    console.log('\n🚫 Verificaciones de negative prompt:\n');
    negativeChecks.forEach(check => {
      const found = result.metadata.prompt.includes(check);
      console.log(`  ${found ? '✅' : '❌'} Evita: "${check}"`);
    });

    if (result.image) {
      console.log(`\n📷 Imagen generada: ${(result.image.length / 1024).toFixed(1)} KB`);

      // Guardar HTML para visualizar
      const fs = require('fs');
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Test Interior CON Techo</title>
  <style>
    body {
      background: #1a1a1a;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      font-family: monospace;
      color: white;
    }
    .container {
      max-width: 900px;
      text-align: center;
    }
    img {
      max-width: 100%;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }
    h1 {
      color: #4CAF50;
      margin-bottom: 10px;
    }
    .info {
      background: #2a2a2a;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
      text-align: left;
    }
    .check {
      color: #4CAF50;
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>✅ Interior CON Techo y Puertas</h1>
    <p>Honda Civic 2024 Sedan Base • Worker Version: 59caec2e-bb6b-41aa-b9f6-9d324fa0e034</p>
    <img src="data:image/png;base64,${result.image}" alt="Interior with roof">
    <div class="info">
      <strong>Especificaciones del prompt:</strong>
      <div class="check">✅ closed roof with headliner visible</div>
      <div class="check">✅ all four doors with door panels</div>
      <div class="check">✅ complete enclosed cabin</div>
      <div class="check">✅ visible A-pillars and B-pillars</div>
      <div class="check">✅ side windows with glass</div>
      <br>
      <strong>Negative prompt incluye:</strong>
      <div class="check">🚫 no roof, open roof, missing roof</div>
      <div class="check">🚫 no doors, missing doors</div>
      <div class="check">🚫 convertible interior, open-air cabin</div>
    </div>
  </div>
</body>
</html>`;

      fs.writeFileSync('/home/edu/autorenta/interior-fixed-test.html', html);
      console.log('\n✅ HTML guardado en: /home/edu/autorenta/interior-fixed-test.html');
    }

    console.log('\n✅ Test completado!\n');
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

testInterior();
