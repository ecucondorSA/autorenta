const sharp = require('sharp');
const fs = require('fs');

const inputPath = 'src/assets/humanized-car.jpg';
const outputPath = 'src/assets/humanized-car-optimized.jpg';
const TARGET_SIZE_KB = 500;
const MAX_DIMENSION = 1600;

async function processImage() {
  try {
    if (!fs.existsSync(inputPath)) {
      console.error(`❌ No se encuentra la imagen: ${inputPath}`);
      return;
    }

    const inputStats = fs.statSync(inputPath);
    console.log(`📦 Imagen Original: ${(inputStats.size / 1024).toFixed(2)} KB`);

    let quality = 85; // Calidad inicial
    let buffer;
    let isBelowTarget = false;

    console.log(`🔄 Optimizando (Meta: <${TARGET_SIZE_KB} KB, Max Dim: ${MAX_DIMENSION}px)...`);

    // Bucle de optimización
    while (!isBelowTarget && quality > 10) {
      buffer = await sharp(inputPath)
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside', // Mantiene aspect ratio, asegura que quepa en 1600x1600
          withoutEnlargement: true
        })
        .jpeg({ 
          quality: quality,
          mozjpeg: true // Mejor compresión
        })
        .toBuffer();

      const currentSizeKb = buffer.length / 1024;
      console.log(`   👉 Calidad ${quality}%: ${currentSizeKb.toFixed(2)} KB`);

      if (currentSizeKb <= TARGET_SIZE_KB) {
        isBelowTarget = true;
      } else {
        quality -= 10; // Reducir calidad agresivamente si nos pasamos
      }
    }

    fs.writeFileSync(outputPath, buffer);
    console.log('------------------------------------------------');
    console.log(`✅ ¡Procesamiento completado!`);
    console.log(`📂 Guardada en: ${outputPath}`);
    console.log(`📉 Tamaño Final: ${(buffer.length / 1024).toFixed(2)} KB`);
    console.log(`🔻 Reducción: ${((1 - buffer.length / inputStats.size) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('🚨 Error procesando imagen con Sharp:', error);
  }
}

processImage();
