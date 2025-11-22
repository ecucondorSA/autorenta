/**
 * Genera 3 fotos y crea un HTML para visualizarlas
 */

const fs = require('fs');

const angles = ['3/4-front', 'side', 'interior'];
const WORKER_URL = 'https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev';

async function generateAndSavePhotos() {
  console.log('🎨 Generando 3 fotos y creando galería HTML...\n');

  const photos = [];

  for (let i = 0; i < angles.length; i++) {
    const angle = angles[i];
    console.log(`📸 Generando foto ${i + 1}/3: ${angle}...`);

    const requestBody = {
      brand: 'Honda',
      model: 'Civic',
      year: 2024,
      color: 'red',
      angle: angle,
      style: 'showroom',
      num_steps: 4,
    };

    try {
      const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error(`❌ Error: ${response.status}`);
        continue;
      }

      const result = await response.json();

      if (result.image) {
        console.log(`✅ Generada en ${result.metadata.duration_ms}ms`);
        photos.push({
          angle,
          image: result.image,
          prompt: result.metadata.prompt,
          duration: result.metadata.duration_ms,
        });
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  console.log(`\n📝 Creando archivo HTML con ${photos.length} fotos...\n`);

  // Función para formatear nombres de ángulos
  function formatAngle(angle) {
    const angleNames = {
      '3/4-front': 'Vista 3/4 Frontal (Hero Shot)',
      'side': 'Vista Lateral Completa',
      'interior': 'Interior (Driver\'s POV)'
    };
    return angleNames[angle] || angle;
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Honda Civic 2024 - Fotos Generadas con IA</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      color: white;
      text-align: center;
      margin-bottom: 10px;
      font-size: 2.5rem;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }

    .subtitle {
      color: rgba(255,255,255,0.9);
      text-align: center;
      margin-bottom: 40px;
      font-size: 1.1rem;
    }

    .stats {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .stats h2 {
      color: #333;
      margin-bottom: 15px;
      font-size: 1.3rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .stat-item {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 30px;
      margin-bottom: 40px;
    }

    .photo-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .photo-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }

    .photo-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
    }

    .photo-title {
      font-size: 1.3rem;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .photo-meta {
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .photo-image {
      width: 100%;
      height: auto;
      display: block;
      background: #f5f5f5;
    }

    .photo-footer {
      padding: 20px;
      background: #f9f9f9;
    }

    .prompt-title {
      font-size: 0.9rem;
      font-weight: bold;
      color: #666;
      margin-bottom: 10px;
    }

    .prompt-text {
      font-size: 0.85rem;
      color: #888;
      line-height: 1.6;
      max-height: 100px;
      overflow-y: auto;
      background: white;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
    }

    @media (max-width: 768px) {
      .gallery {
        grid-template-columns: 1fr;
      }

      h1 {
        font-size: 2rem;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚗 Honda Civic 2024</h1>
    <p class="subtitle">Fotos generadas con IA usando prompts mejorados • FLUX.1-schnell</p>

    <div class="stats">
      <h2>📊 Estadísticas de Generación</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${photos.length}</div>
          <div class="stat-label">Fotos Generadas</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${Math.round(photos.reduce((sum, p) => sum + p.duration, 0) / photos.length)}ms</div>
          <div class="stat-label">Tiempo Promedio</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${Math.round(photos.reduce((sum, p) => sum + p.prompt.length, 0) / photos.length)}</div>
          <div class="stat-label">Caracteres Prompt</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${(photos.reduce((sum, p) => sum + p.duration, 0) / 1000).toFixed(1)}s</div>
          <div class="stat-label">Tiempo Total</div>
        </div>
      </div>
    </div>

    <div class="gallery">
      ${photos.map((photo, index) => `
        <div class="photo-card">
          <div class="photo-header">
            <div class="photo-title">Foto ${index + 1}: ${formatAngle(photo.angle)}</div>
            <div class="photo-meta">Generada en ${photo.duration}ms</div>
          </div>
          <img src="data:image/png;base64,${photo.image}" alt="${photo.angle}" class="photo-image">
          <div class="photo-footer">
            <div class="prompt-title">📝 Prompt usado:</div>
            <div class="prompt-text">${photo.prompt}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="text-align: center; color: white; margin-top: 40px;">
      <p style="font-size: 0.9rem; opacity: 0.8;">
        Generado con Cloudflare AI • Modelo: FLUX.1-schnell • Steps: 4
      </p>
    </div>
  </div>

  <script>
    function formatAngle(angle) {
      const angleNames = {
        '3/4-front': 'Vista 3/4 Frontal (Hero Shot)',
        'side': 'Vista Lateral Completa',
        'interior': 'Interior (Driver\'s POV)'
      };
      return angleNames[angle] || angle;
    }
  </script>
</body>
</html>`;

  fs.writeFileSync('/home/edu/autorenta/generated-photos.html', html);

  console.log('✅ Archivo HTML creado: /home/edu/autorenta/generated-photos.html');
  console.log('\n🌐 Para ver las fotos, abre el archivo en tu navegador:');
  console.log('   file:///home/edu/autorenta/generated-photos.html');
  console.log('\n   O ejecuta: xdg-open /home/edu/autorenta/generated-photos.html\n');
}

generateAndSavePhotos().catch(console.error);
