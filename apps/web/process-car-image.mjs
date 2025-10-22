/**
 * Script para procesar imágenes de autos existentes en la base de datos
 * Remueve el fondo usando ONNX Runtime Node.js
 */

import { createClient } from '@supabase/supabase-js';
import ort from 'onnxruntime-node';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de Supabase
const SUPABASE_URL = 'https://obxvffplochgeiclibng.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDU1MzIzMiwiZXhwIjoyMDc2MTI5MjMyfQ.U9RM7cbT3f5NSRy21Ig02f6VvMEzO2PjFI7pbTg2crc';

// Usar service role key para bypass RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Remueve el fondo de una imagen usando RMBG-1.4
 */
async function removeBackground(imageBuffer) {
  console.log('[BackgroundRemoval] Loading RMBG-1.4 model...');

  const modelPath = join(__dirname, 'src/assets/models/rmbg-1.4.onnx');
  const session = await ort.InferenceSession.create(modelPath);

  console.log('[BackgroundRemoval] Processing image...');

  // 1. Resize y normalizar imagen a 1024x1024
  const inputSize = 1024;
  const resized = await sharp(imageBuffer)
    .resize(inputSize, inputSize, { fit: 'contain', background: { r: 0, g: 0, b: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2. Convertir a formato NCHW [1, 3, 1024, 1024]
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

  // Threshold agresivo para eliminar fondo gris
  const threshold = 0.5;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      // Mapear coordenadas a máscara 1024x1024
      const maskX = Math.floor((x / info.width) * inputSize);
      const maskY = Math.floor((y / info.height) * inputSize);
      const maskIdx = maskY * inputSize + maskX;
      const maskValue = mask[maskIdx];

      // Índices en buffers
      const srcIdx = (y * info.width + x) * 3;
      const dstIdx = (y * info.width + x) * 4;

      // Aplicar threshold: si maskValue < 0.5, completamente transparente
      const alphaValue = maskValue < threshold ? 0 : Math.round(maskValue * 255);

      // Copiar RGB + aplicar alpha con threshold
      rgbaBuffer[dstIdx] = imageData[srcIdx];       // R
      rgbaBuffer[dstIdx + 1] = imageData[srcIdx + 1]; // G
      rgbaBuffer[dstIdx + 2] = imageData[srcIdx + 2]; // B
      rgbaBuffer[dstIdx + 3] = alphaValue; // A con threshold
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

  console.log('[BackgroundRemoval] ✅ Background removed successfully');

  return outputBuffer;
}

/**
 * Procesa una foto específica de un auto
 */
async function processCarPhoto(carId, photoIndex = 0) {
  console.log(`\n📸 Procesando foto del auto ${carId}...`);

  // 1. Obtener foto del auto
  const { data: photos, error: photosError } = await supabase
    .from('car_photos')
    .select('*')
    .eq('car_id', carId)
    .order('position', { ascending: true });

  if (photosError) {
    console.error('❌ Error al obtener fotos:', photosError);
    throw photosError;
  }

  if (!photos || photos.length === 0) {
    console.error('❌ No se encontraron fotos para este auto');
    return;
  }

  if (photoIndex >= photos.length) {
    console.error(`❌ Índice ${photoIndex} fuera de rango. El auto tiene ${photos.length} fotos.`);
    return;
  }

  const photo = photos[photoIndex];
  console.log(`📥 Descargando foto: ${photo.url}`);

  // 2. Descargar imagen original
  const response = await fetch(photo.url);
  if (!response.ok) {
    console.error('❌ Error al descargar imagen');
    return;
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`✅ Imagen descargada (${(imageBuffer.length / 1024).toFixed(2)} KB)`);

  // 3. Procesar imagen (remover fondo)
  const processedBuffer = await removeBackground(imageBuffer);
  console.log(`✅ Imagen procesada (${(processedBuffer.length / 1024).toFixed(2)} KB)`);

  // 4. Subir imagen procesada (reemplazar la original pero con .png)
  const storedPath = photo.stored_path.replace(/\.(jpg|jpeg|png|webp)$/i, '-no-bg.png');

  console.log(`📤 Subiendo imagen procesada a: ${storedPath}`);

  const { error: uploadError } = await supabase.storage
    .from('car-images')
    .upload(storedPath, processedBuffer, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('❌ Error al subir imagen:', uploadError);
    throw uploadError;
  }

  // 5. Obtener URL pública
  const { data: publicUrlData } = supabase.storage
    .from('car-images')
    .getPublicUrl(storedPath);

  console.log(`✅ Imagen subida: ${publicUrlData.publicUrl}`);

  // 6. Actualizar registro en base de datos (crear nueva foto procesada)
  const { error: insertError } = await supabase
    .from('car_photos')
    .insert({
      car_id: carId,
      stored_path: storedPath,
      url: publicUrlData.publicUrl,
      position: photo.position + 100, // Posición alta para no interferir
      sort_order: photo.sort_order + 100,
    });

  if (insertError) {
    console.error('❌ Error al crear registro de foto:', insertError);
    throw insertError;
  }

  console.log('✅ Registro de foto procesada creado en base de datos');
  console.log(`\n🎉 Proceso completado. Nueva foto disponible en: ${publicUrlData.publicUrl}`);
}

/**
 * Buscar autos del Fiat Cronos
 */
async function findFiatCronos() {
  console.log('🔍 Buscando autos Fiat Cronos...\n');

  const { data: cars, error } = await supabase
    .from('cars')
    .select('*')
    .ilike('title', '%fiat%');

  if (error) {
    console.error('❌ Error al buscar autos:', error);
    throw error;
  }

  if (!cars || cars.length === 0) {
    console.log('❌ No se encontraron autos Fiat');
    return null;
  }

  console.log(`✅ Encontrados ${cars.length} auto(s):\n`);
  cars.forEach((car, idx) => {
    console.log(`${idx + 1}. ID: ${car.id}`);
    console.log(`   Título: ${car.title}\n`);
  });

  return cars;
}

// Ejecutar script
const main = async () => {
  try {
    // Buscar Fiat Cronos
    const cars = await findFiatCronos();

    if (!cars || cars.length === 0) {
      console.log('No hay autos para procesar.');
      return;
    }

    // Procesar primera foto del primer auto encontrado
    const carId = cars[0].id;
    console.log(`\n🚀 Procesando primera foto del auto: ${carId}`);

    await processCarPhoto(carId, 0);

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    process.exit(1);
  }
};

main();
