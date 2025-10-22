/**
 * Script para verificar si la imagen tiene transparencia real
 */

import sharp from 'sharp';

const IMAGE_URL = 'https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png';

async function verifyTransparency() {
  console.log('🔍 Verificando transparencia de la imagen...\n');
  console.log(`URL: ${IMAGE_URL}\n`);

  // Descargar imagen
  const response = await fetch(IMAGE_URL);
  const imageBuffer = Buffer.from(await response.arrayBuffer());

  console.log(`✅ Imagen descargada: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`);

  // Analizar imagen con Sharp
  const metadata = await sharp(imageBuffer).metadata();

  console.log('📊 Metadata de la imagen:');
  console.log(`   Formato: ${metadata.format}`);
  console.log(`   Dimensiones: ${metadata.width}x${metadata.height}`);
  console.log(`   Canales: ${metadata.channels}`);
  console.log(`   Tiene canal alpha: ${metadata.hasAlpha ? 'SÍ ✅' : 'NO ❌'}`);
  console.log(`   Espacio de color: ${metadata.space}\n`);

  if (!metadata.hasAlpha) {
    console.log('❌ La imagen NO tiene canal alpha (transparencia)');
    return;
  }

  // Analizar estadísticas del canal alpha
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let transparentPixels = 0;
  let semiTransparentPixels = 0;
  let opaquePixels = 0;
  const totalPixels = info.width * info.height;

  // Contar píxeles por nivel de transparencia
  for (let i = 3; i < data.length; i += 4) {
    const alpha = data[i];
    if (alpha === 0) {
      transparentPixels++;
    } else if (alpha < 255) {
      semiTransparentPixels++;
    } else {
      opaquePixels++;
    }
  }

  console.log('📈 Análisis de transparencia:');
  console.log(`   Total píxeles: ${totalPixels.toLocaleString()}`);
  console.log(`   Completamente transparentes (alpha=0): ${transparentPixels.toLocaleString()} (${((transparentPixels / totalPixels) * 100).toFixed(1)}%)`);
  console.log(`   Semi-transparentes (0<alpha<255): ${semiTransparentPixels.toLocaleString()} (${((semiTransparentPixels / totalPixels) * 100).toFixed(1)}%)`);
  console.log(`   Completamente opacos (alpha=255): ${opaquePixels.toLocaleString()} (${((opaquePixels / totalPixels) * 100).toFixed(1)}%)\n`);

  const backgroundRatio = (transparentPixels / totalPixels) * 100;

  if (backgroundRatio > 50) {
    console.log(`✅ La imagen tiene ${backgroundRatio.toFixed(1)}% de fondo transparente - BIEN!`);
  } else if (backgroundRatio > 20) {
    console.log(`⚠️  La imagen tiene solo ${backgroundRatio.toFixed(1)}% de fondo transparente - Podría mejorarse`);
  } else {
    console.log(`❌ La imagen tiene muy poco fondo transparente (${backgroundRatio.toFixed(1)}%) - Problema!`);
  }

  // Analizar muestra del fondo (esquinas)
  console.log('\n🔬 Análisis de píxeles en las esquinas (fondo esperado):');

  const corners = [
    { name: 'Superior izquierda', x: 10, y: 10 },
    { name: 'Superior derecha', x: info.width - 10, y: 10 },
    { name: 'Inferior izquierda', x: 10, y: info.height - 10 },
    { name: 'Inferior derecha', x: info.width - 10, y: info.height - 10 },
  ];

  corners.forEach(corner => {
    const idx = (corner.y * info.width + corner.x) * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    const status = a === 0 ? '✅ Transparente' : `❌ Opaco/Semi (RGB: ${r},${g},${b}, A: ${a})`;
    console.log(`   ${corner.name}: ${status}`);
  });
}

verifyTransparency().catch(console.error);
