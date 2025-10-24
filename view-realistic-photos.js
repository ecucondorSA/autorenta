/**
 * Genera 3 fotos REALISTAS y crea un HTML para visualizarlas
 * CON especificaciones: body_type=sedan, trim_level=base
 */

const fs = require('fs');

const angles = ['3/4-front', 'side', 'interior'];
const WORKER_URL = 'https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev';

async function generateAndSaveRealisticPhotos() {
  console.log('🎨 Generando 3 fotos REALISTAS y creando galería HTML...\n');

  const photos = [];

  for (let i = 0; i < angles.length; i++) {
    const angle = angles[i];
    console.log(`📸 Generando foto ${i + 1}/3: ${angle}...`);

    const requestBody = {
      brand: 'Honda',
      model: 'Civic',
      year: 2024,
      color: 'red',
      body_type: 'sedan',        // ✅ Especificar sedan (no convertible)
      trim_level: 'base',        // ✅ Especificar base (no Type R ni deportivo)
      angle: angle,
      style: 'showroom',
      num_steps: 8,              // ✅ Max quality (8 steps)
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

  console.log(`\n📝 Creando archivo HTML con ${photos.length} fotos REALISTAS...\n`);

  // Función para formatear nombres de ángulos
  function formatAngle(angle) {
    const angleNames = {
      '3/4-front': 'Vista 3/4 Frontal (Hero Shot) - SEDAN',
      'side': 'Vista Lateral Completa - SEDAN',
      'interior': 'Interior (Driver\'s POV) - BASE TRIM'
    };
    return angleNames[angle] || angle;
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Honda Civic 2024 Sedan Base - Fotos REALISTAS con IA</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
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
      margin-bottom: 20px;
      font-size: 1.1rem;
    }

    .improvements-banner {
      background: #16a085;
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .improvements-banner h2 {
      margin-bottom: 15px;
      font-size: 1.5rem;
    }

    .improvements-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }

    .improvement-item {
      background: rgba(255,255,255,0.1);
      padding: 12px;
      border-radius: 8px;
      border-left: 4px solid #f39c12;
    }

    .improvement-item strong {
      display: block;
      margin-bottom: 5px;
      color: #f39c12;
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
      background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
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
      background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
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
      max-height: 120px;
      overflow-y: auto;
      background: white;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e0e0e0;
    }

    .highlight {
      background: #f39c12;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: bold;
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

      .improvements-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚗 Honda Civic 2024 Sedan Base</h1>
    <p class="subtitle">Fotos REALISTAS con IA • Especificaciones de fábrica • FLUX.1-schnell</p>

    <div class="improvements-banner">
      <h2>✅ Correcciones Implementadas</h2>
      <div class="improvements-grid">
        <div class="improvement-item">
          <strong>🚙 Carrocería Especificada</strong>
          <span class="highlight">sedan</span> (no convertible)
        </div>
        <div class="improvement-item">
          <strong>⚙️ Trim Level</strong>
          <span class="highlight">base trim</span> (no deportivo)
        </div>
        <div class="improvement-item">
          <strong>🏭 Especificaciones</strong>
          <span class="highlight">factory specifications</span> (OEM)
        </div>
        <div class="improvement-item">
          <strong>🪑 Interior Mejorado</strong>
          <span class="highlight">prompt optimizado</span> (realista y detallado)
        </div>
        <div class="improvement-item">
          <strong>🚫 Negative Prompt</strong>
          Evita: convertible, aftermarket, racing
        </div>
        <div class="improvement-item">
          <strong>📏 Prompt Length</strong>
          ~1400 chars (+40% más detallado)
        </div>
      </div>
    </div>

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
            <div class="prompt-title">📝 Prompt usado (primeros 400 caracteres):</div>
            <div class="prompt-text">${photo.prompt.substring(0, 400)}...</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="text-align: center; color: white; margin-top: 40px;">
      <p style="font-size: 0.9rem; opacity: 0.8;">
        Generado con Cloudflare AI • Modelo: FLUX.1-schnell • Steps: 4<br>
        Worker Version: d0419b5a-417d-488f-9f7f-50349c1e0311
      </p>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync('/home/edu/autorenta/generated-realistic-photos.html', html);

  console.log('✅ Archivo HTML creado: /home/edu/autorenta/generated-realistic-photos.html');
  console.log('\n🌐 Para ver las fotos REALISTAS, ejecuta:');
  console.log('   xdg-open /home/edu/autorenta/generated-realistic-photos.html\n');
}

generateAndSaveRealisticPhotos().catch(console.error);
