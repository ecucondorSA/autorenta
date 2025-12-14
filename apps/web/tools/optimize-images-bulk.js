const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const TARGET_DIRS = ['src/assets', 'public'];
const TARGET_EXTS = ['jpg', 'jpeg', 'png'];
const MIN_SIZE_KB = 100; // Solo optimizar imágenes mayores a 100KB

async function optimizeImages() {
  console.log('🚀 Iniciando optimización masiva de imágenes...');
  
  let totalSaved = 0;
  let filesProcessed = 0;

  for (const dir of TARGET_DIRS) {
    const pattern = `${dir}/**/*.{${TARGET_EXTS.join(',')}}`;
    const files = glob.sync(pattern);

    for (const file of files) {
      try {
        const stats = fs.statSync(file);
        const sizeKb = stats.size / 1024;

        if (sizeKb < MIN_SIZE_KB) continue;

        const buffer = await sharp(file)
          .resize({ width: 1920, withoutEnlargement: true }) // Limitar ancho max
          .webp({ quality: 80 }) // Convertir a WebP
          .toBuffer();

        const newSizeKb = buffer.length / 1024;
        const savings = sizeKb - newSizeKb;

        if (savings > 10) { // Solo si ahorra > 10KB
          const newPath = file.replace(/\.(png|jpe?g)$/i, '.webp');
          fs.writeFileSync(newPath, buffer);
          
          // Opcional: Eliminar original si se desea reemplazo total
          // fs.unlinkSync(file); 
          
          console.log(`✅ ${file} -> ${path.basename(newPath)}`);
          console.log(`   📉 ${sizeKb.toFixed(0)}KB -> ${newSizeKb.toFixed(0)}KB (Ahorro: ${savings.toFixed(0)}KB)`);
          
          totalSaved += savings;
          filesProcessed++;
        }
      } catch (err) {
        console.error(`❌ Error en ${file}:`, err.message);
      }
    }
  }

  console.log('\n📊 Resumen Final:');
  console.log(`   Archivos optimizados: ${filesProcessed}`);
  console.log(`   Espacio ahorrado: ${(totalSaved / 1024).toFixed(2)} MB`);
}

optimizeImages();
