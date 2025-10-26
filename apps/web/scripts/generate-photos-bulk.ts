/**
 * Script para generar fotos con IA para todos los autos sin fotos
 * 
 * Uso:
 *   npx tsx scripts/generate-photos-bulk.ts [--method stock-photos|cloudflare-ai] [--limit N]
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
config({ path: '.env.development.local' });

const SUPABASE_URL = process.env.NG_APP_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Usar service role para crear buckets y subir sin restricciones

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuración desde argumentos
const args = process.argv.slice(2);
const method = args.includes('--method') 
  ? args[args.indexOf('--method') + 1] as 'stock-photos' | 'cloudflare-ai'
  : 'stock-photos';
const limit = args.includes('--limit') 
  ? parseInt(args[args.indexOf('--limit') + 1]) 
  : 10; // Por defecto procesar 10 autos

interface Car {
  id: string;
  brand_text_backup: string;
  model_text_backup: string;
  year: number;
  color: string;
  transmission: string;
  fuel: string;
}

interface CarPhoto {
  id: string;
  car_id: string;
  photo_url: string;
}

/**
 * Obtiene todos los autos que NO tienen fotos
 */
async function getCarsWithoutPhotos(limitCount: number): Promise<Car[]> {
  console.log(`\n🔍 Buscando autos sin fotos (límite: ${limitCount})...`);

  // Obtener todos los IDs de autos que tienen fotos
  const { data: carsWithPhotos, error: photosError } = await supabase
    .from('car_photos')
    .select('car_id');

  if (photosError) {
    throw new Error(`Error obteniendo car_photos: ${photosError.message}`);
  }

  const carIdsWithPhotos = new Set(carsWithPhotos?.map(p => p.car_id) || []);

  // Obtener todos los autos
  const { data: allCars, error: carsError } = await supabase
    .from('cars')
    .select('id, brand_text_backup, model_text_backup, year, color, transmission, fuel')
    .eq('status', 'active');

  if (carsError) {
    throw new Error(`Error obteniendo cars: ${carsError.message}`);
  }

  // Filtrar autos sin fotos
  const carsWithoutPhotos = (allCars || []).filter(
    car => !carIdsWithPhotos.has(car.id)
  ).slice(0, limitCount);

  console.log(`✅ Encontrados ${carsWithoutPhotos.length} autos sin fotos`);
  return carsWithoutPhotos;
}

/**
 * Descarga una imagen desde URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error downloading image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Busca fotos de stock de Unsplash
 */
async function searchStockPhotos(car: Car, count: number = 3): Promise<string[]> {
  const query = `${car.brand_text_backup} ${car.model_text_backup} ${car.year} car`;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;

  // Unsplash requiere API key - usar acceso público limitado
  const response = await fetch(url, {
    headers: {
      'Authorization': 'Client-ID YOUR_UNSPLASH_ACCESS_KEY' // Necesitarás configurar esto
    }
  });

  if (!response.ok) {
    console.warn(`⚠️  No se pudieron buscar fotos de stock para ${car.brand_text_backup} ${car.model_text_backup}`);
    return [];
  }

  const data = await response.json();
  return data.results.map((photo: any) => photo.urls.regular);
}

/**
 * Genera fotos para un auto usando el método especificado
 */
async function generatePhotosForCar(car: Car, method: 'stock-photos' | 'cloudflare-ai'): Promise<void> {
  console.log(`\n📸 Generando fotos para: ${car.brand_text_backup} ${car.model_text_backup} ${car.year}`);
  console.log(`   Método: ${method}`);

  try {
    let photoUrls: Array<{ url: string; stored_path: string }> = [];

    if (method === 'stock-photos') {
      // Método 1: Usar fotos de stock de Unsplash
      photoUrls = await searchStockPhotos(car, 3);
      
      if (photoUrls.length === 0) {
        console.log(`   ⚠️  No se encontraron fotos de stock, generando con IA...`);
        // Fallback a Cloudflare AI
        method = 'cloudflare-ai';
      }
    }

    if (method === 'cloudflare-ai') {
      // Método 2: Generar con Cloudflare AI
      const angles = ['3/4-front', 'side', 'rear'] as const;
      
      for (const angle of angles) {
        console.log(`   🎨 Generando vista ${angle}...`);
        
        const response = await fetch('https://autorent-ai-car-generator.marques-eduardo95466020.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand: car.brand_text_backup,
            model: car.model_text_backup,
            year: car.year,
            color: car.color,
            angle: angle,
            style: 'showroom',
            num_steps: 4
          })
        });

        const data = await response.json();
        
        if (data.success && data.image) {
          // Convertir base64 a buffer
          const imageBuffer = Buffer.from(data.image, 'base64');
          
          // Subir a Supabase Storage
          const fileName = `car-${car.id}-${angle}-${Date.now()}.png`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('car-photos')
            .upload(fileName, imageBuffer, {
              contentType: 'image/png',
              upsert: false
            });

          if (uploadError) {
            console.error(`   ❌ Error subiendo ${angle}:`, uploadError.message);
            continue;
          }

          // Obtener URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('car-photos')
            .getPublicUrl(fileName);

          photoUrls.push({ url: publicUrl, stored_path: fileName });
          console.log(`   ✅ ${angle} generada y subida`);
        } else {
          console.error(`   ❌ Error generando ${angle}:`, data.error);
        }
      }
    } else {
      // Subir fotos de stock a Supabase Storage
      for (let i = 0; i < photoUrls.length; i++) {
        const photoUrl = photoUrls[i];
        console.log(`   📥 Descargando foto ${i + 1}/${photoUrls.length}...`);
        
        try {
          const imageBuffer = await downloadImage(photoUrl);
          
          const fileName = `car-${car.id}-stock-${i}-${Date.now()}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('car-photos')
            .upload(fileName, imageBuffer, {
              contentType: 'image/jpeg',
              upsert: false
            });

          if (uploadError) {
            console.error(`   ❌ Error subiendo foto ${i + 1}:`, uploadError.message);
            continue;
          }

          // Obtener URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('car-photos')
            .getPublicUrl(fileName);

          photoUrls[i] = publicUrl;
          console.log(`   ✅ Foto ${i + 1} subida`);
        } catch (error) {
          console.error(`   ❌ Error procesando foto ${i + 1}:`, error);
        }
      }
    }

    // Insertar referencias en car_photos
    if (photoUrls.length > 0) {
      const photoRecords = photoUrls.map((photo, index) => ({
        car_id: car.id,
        url: photo.url,
        stored_path: photo.stored_path,
        position: index,
        sort_order: index
      }));

      const { error: insertError } = await supabase
        .from('car_photos')
        .insert(photoRecords);

      if (insertError) {
        console.error(`   ❌ Error insertando referencias:`, insertError.message);
      } else {
        console.log(`   ✅ ${photoUrls.length} fotos guardadas en la base de datos`);
      }
    } else {
      console.log(`   ⚠️  No se pudieron generar fotos para este auto`);
    }

  } catch (error) {
    console.error(`   ❌ Error generando fotos:`, error);
  }
}

/**
 * Crea el bucket de car-photos si no existe
 */
async function ensureCarPhotosBucket(): Promise<void> {
  console.log('\n🪣 Verificando bucket car-photos...');
  
  const { data: buckets, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error listando buckets:', error);
    throw error;
  }
  
  const bucketExists = buckets?.some(b => b.id === 'car-photos');
  
  if (bucketExists) {
    console.log('✅ Bucket car-photos ya existe');
    return;
  }
  
  // Crear el bucket
  const { data, error: createError } = await supabase.storage.createBucket('car-photos', {
    public: true,
    fileSizeLimit: 10485760, // 10 MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  });
  
  if (createError) {
    console.error('Error creando bucket:', createError);
    throw createError;
  }
  
  console.log('✅ Bucket car-photos creado exitosamente');
}

/**
 * Main
 */
async function main() {
  console.log('\n🚀 GENERACIÓN MASIVA DE FOTOS CON IA');
  console.log('====================================');
  console.log(`Método: ${method}`);
  console.log(`Límite: ${limit} autos`);

  try {
    // 0. Asegurar que existe el bucket
    await ensureCarPhotosBucket();
    
    // 1. Obtener autos sin fotos
    const cars = await getCarsWithoutPhotos(limit);

    if (cars.length === 0) {
      console.log('\n✅ ¡Todos los autos ya tienen fotos!');
      return;
    }

    // 2. Generar fotos para cada auto
    console.log(`\n🔄 Procesando ${cars.length} autos...`);
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      console.log(`\n[${i + 1}/${cars.length}] Procesando...`);
      
      try {
        await generatePhotosForCar(car, method);
        successCount++;
      } catch (error) {
        console.error(`❌ Error procesando auto:`, error);
        failCount++;
      }

      // Pequeña pausa entre autos para no saturar la API
      if (i < cars.length - 1) {
        console.log('\n⏳ Esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 3. Resumen final
    console.log('\n\n====================================');
    console.log('📊 RESUMEN FINAL');
    console.log('====================================');
    console.log(`✅ Exitosos: ${successCount}`);
    console.log(`❌ Fallidos: ${failCount}`);
    console.log(`📁 Total procesados: ${cars.length}`);

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
