/**
 * Script para re-procesar la imagen del Fiat desde la fuente original
 */

import { createClient } from '@supabase/supabase-js';
import ort from 'onnxruntime-node';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// URL de la imagen ORIGINAL (la .webp antes de procesar)
const ORIGINAL_URL = 'https://obxvffplochgeiclibng.supabase.co/storage/v1/object/public/car-images/22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1.webp';
const OUTPUT_PATH = '22222222-2222-2222-2222-222222222222/8447c379-6b51-4b5e-8647-0f5de243f729/e6d81e06-8013-4a28-9363-d75f512c28a1-no-bg.png';
const CAR_ID = '8447c379-6b51-4b5e-8647-0f5de243f729';

async function removeBackgroundAggressive(imageBuffer) {
  console.log('[BackgroundRemoval] Loading RMBG-1.4 model...');

  const modelPath = join(__dirname, 'src/assets/models/rmbg-1.4.onnx');
  const session = await ort.InferenceSession.create(modelPath);

  console.log('[BackgroundRemoval] Processing image...');

  // 1. Resize a 1024x1024
  const inputSize = 1024;
  const resized = await sharp(imageBuffer)
    .resize(inputSize, inputSize, { fit: 'contain', background: { r: 0, g: 0, b: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2. Convertir a formato NCHW
  const input = new Float32Array(1 * 3 * inputSize * inputSize);
  const pixelCount = inputSize * inputSize;

  for (let i = 0; i < resized.data.length; i += 3) {
    const idx = i / 3;
    const r = resized.data[i] / 255;
    const g = resized.data[i + 1] / 255;
    const b = resized.data[i + 2] / 255;

    input[idx] = r;
    input[pixelCount + idx] = g;
    input[2 * pixelCount + idx] = b;
  }

  // 3. Ejecutar inferencia
  console.log('[BackgroundRemoval] Running inference...');
  const inputTensor = new ort.Tensor('float32', input, [1, 3, inputSize, inputSize]);
  const results = await session.run({ input: inputTensor });

  // 4. Obtener máscara
  const mask = results.output.data;

  // 5. Aplicar máscara a imagen original
  const originalImage = await sharp(imageBuffer).raw().toBuffer({ resolveWithObject: true });
  const { data: imageData, info } = originalImage;

  // Crear buffer RGBA
  const rgbaBuffer = Buffer.alloc(info.width * info.height * 4);

  // PASO 1: Aplicar erosión a la máscara para eliminar píxeles residuales
  const erodedMask = new Float32Array(mask.length);
  const erosionRadius = 2; // Píxeles a erosionar

  for (let y = 0; y < inputSize; y++) {
    for (let x = 0; x < inputSize; x++) {
      const idx = y * inputSize + x;
      let minValue = mask[idx];

      // Buscar el valor mínimo en el área circundante
      for (let dy = -erosionRadius; dy <= erosionRadius; dy++) {
        for (let dx = -erosionRadius; dx <= erosionRadius; dx++) {
          const ny = y + dy;
          const nx = x + dx;

          if (ny >= 0 && ny < inputSize && nx >= 0 && nx < inputSize) {
            const nIdx = ny * inputSize + nx;
            minValue = Math.min(minValue, mask[nIdx]);
          }
        }
      }

      erodedMask[idx] = minValue;
    }
  }

  // PASO 2: Aplicar threshold más agresivo
  const threshold = 0.6; // Aumentado de 0.5 a 0.6 para eliminar más fondo

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      // Mapear coordenadas a máscara 1024x1024
      const maskX = Math.floor((x / info.width) * inputSize);
      const maskY = Math.floor((y / info.height) * inputSize);
      const maskIdx = maskY * inputSize + maskX;
      const maskValue = erodedMask[maskIdx]; // Usar máscara erosionada

      // Índices en buffers
      const srcIdx = (y * info.width + x) * 3;
      const dstIdx = (y * info.width + x) * 4;

      // Threshold agresivo + suavizado de bordes
      let alphaValue;
      if (maskValue < threshold) {
        alphaValue = 0; // Completamente transparente
      } else if (maskValue < threshold + 0.1) {
        // Zona de transición suave para anti-aliasing
        const fade = (maskValue - threshold) / 0.1;
        alphaValue = Math.round(fade * 255);
      } else {
        alphaValue = Math.round(maskValue * 255);
      }

      // Copiar RGB + aplicar alpha
      rgbaBuffer[dstIdx] = imageData[srcIdx];
      rgbaBuffer[dstIdx + 1] = imageData[srcIdx + 1];
      rgbaBuffer[dstIdx + 2] = imageData[srcIdx + 2];
      rgbaBuffer[dstIdx + 3] = alphaValue;
    }
  }

  // 6. Convertir a PNG
  const outputBuffer = await sharp(rgbaBuffer, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  }).png().toBuffer();

  console.log('[BackgroundRemoval] ✅ Background removed with threshold');

  return outputBuffer;
}

async function main() {
  console.log('🚀 Re-procesando imagen del Fiat Cronos con threshold agresivo\n');

  // 1. Descargar imagen ORIGINAL
  console.log(`📥 Descargando imagen original: ${ORIGINAL_URL}`);
  const response = await fetch(ORIGINAL_URL);

  if (!response.ok) {
    console.error('❌ Error al descargar imagen');
    return;
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`✅ Imagen descargada (${(imageBuffer.length / 1024).toFixed(2)} KB)`);

  // 2. Procesar con threshold agresivo
  const processedBuffer = await removeBackgroundAggressive(imageBuffer);
  console.log(`✅ Imagen procesada (${(processedBuffer.length / 1024).toFixed(2)} KB)`);

  // 3. Subir imagen procesada (sobrescribir la anterior)
  console.log(`📤 Subiendo imagen procesada a: ${OUTPUT_PATH}`);

  const { error: uploadError } = await supabase.storage
    .from('car-images')
    .upload(OUTPUT_PATH, processedBuffer, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true, // Sobrescribir la versión anterior
    });

  if (uploadError) {
    console.error('❌ Error al subir imagen:', uploadError);
    throw uploadError;
  }

  // 4. Obtener URL pública
  const { data: publicUrlData } = supabase.storage
    .from('car-images')
    .getPublicUrl(OUTPUT_PATH);

  console.log(`✅ Imagen subida: ${publicUrlData.publicUrl}`);

  console.log('\n🎉 Proceso completado. La nueva versión tiene fondo completamente transparente.');
  console.log('   Recarga la página en el navegador para ver los cambios.');
}

main().catch(console.error);
